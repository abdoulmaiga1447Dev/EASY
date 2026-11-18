/**
 * Appel audio intégré (WebRTC) entre le chauffeur et le Superviseur Logistique,
 * rattaché à une demande de recharge.
 *
 * - Signalisation par Socket.IO : chaque socket s'authentifie (« fleet:auth ») et rejoint
 *   `user:<id>`. Les messages d'appel ne sont relayés qu'entre les participants autorisés.
 * - Le chauffeur appelle → tous les superviseurs du site sonnent, le premier qui décroche
 *   prend l'appel. Le Superviseur appelle → le chauffeur de la demande sonne.
 * - Sonnerie 45 s → « appel manqué ». Chaque appel laisse une trace dans le fil de la demande.
 * - Notification push à l'appelé (fait sonner le téléphone même application fermée).
 * - Serveurs ICE (STUN/TURN coturn) remis par GET /api/fleet/appels/config.
 */
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { Server as IOServer, Socket } from "socket.io";
import { authenticate, loadAuthContext, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { ACCESS_TOKEN_SECRET } from "../../lib/env";
import { RegistreAppels, SONNERIE_MS, serveursIce, dureeLisible, type Appel } from "../../lib/appel";
import { STATUTS_OUVERTS, type DemandeStatut } from "../../lib/demandeRecharge";
import { envoyerPush, clePubliquePush } from "../../lib/push";
import { recipients } from "./recharge";
import { wrap, serverError } from "./helpers";

const ERR = (fr: string) => ({ ok: false, error: fr });

/** Invitations en cours (renvoyées à un appelé qui se reconnecte depuis la notification). */
const invitations = new Map<string, unknown>();

/** Registre partagé (un seul processus serveur). */
export const registreAppels = new RegistreAppels();

export function registerFleetSockets(io: IOServer, prisma: PrismaClient, opts: { sonnerieMs?: number } = {}) {
  const sonnerieMs = opts.sonnerieMs ?? SONNERIE_MS;
  const minuteries = new Map<string, NodeJS.Timeout>();
  const versUsers = (ids: (string | null | undefined)[], event: string, payload: unknown) => {
    for (const id of new Set(ids.filter(Boolean) as string[])) io.to(`user:${id}`).emit(event, payload);
  };

  /** Trace l'appel dans le fil de la demande + prévient le fil en temps réel. */
  async function tracer(a: Appel) {
    const duree = a.debutLe && a.finLe ? Math.round((a.finLe - a.debutLe) / 1000) : 0;
    const texte = a.etat === "TERMINE" ? `Appel · ${dureeLisible(duree)}`
      : a.etat === "MANQUE" ? "Appel manqué"
      : a.etat === "REFUSE" ? "Appel refusé"
      : "Appel annulé";
    try {
      await prisma.demandeRechargeMessage.create({
        data: { demandeId: a.demandeId, auteurId: a.appelantId, type: "APPEL", texte, meta: { etat: a.etat, dureeSec: duree, decrocheParId: a.decrocheParId } },
      });
      const d = await prisma.demandeRecharge.findUnique({ where: { id: a.demandeId }, select: { driverId: true, siteId: true, statut: true } });
      if (d) {
        const sup = (await recipients(prisma, d.siteId, "recharge.superviser")).map((u) => u.id);
        versUsers([d.driverId, ...sup], "recharge:update", { demandeId: a.demandeId, statut: d.statut, type: "message" });
      }
    } catch (e) { console.error("[Appel] trace", e); }
  }

  async function terminer(a: Appel | null, raison: string) {
    if (!a) return;
    const t = minuteries.get(a.id); if (t) { clearTimeout(t); minuteries.delete(a.id); }
    invitations.delete(a.id);
    versUsers([a.appelantId, ...a.appelesIds], "call:ended", { callId: a.id, etat: a.etat, raison });
    await tracer(a);
  }

  io.on("connection", (socket: Socket) => {
    // --- Authentification : salle personnelle + appels qui sonnent encore pour lui ---
    socket.on("fleet:auth", (token: string) => {
      try {
        const decoded = jwt.verify(String(token || ""), ACCESS_TOKEN_SECRET) as any;
        if (!decoded?.userId) return;
        socket.data.userId = decoded.userId;
        socket.join(`user:${decoded.userId}`);
        // Appelé qui revient via la notification : l'appel sonne encore → on le lui renvoie.
        for (const a of registreAppels.sonnentPour(decoded.userId)) {
          const inv = invitations.get(a.id);
          if (inv) socket.emit("call:incoming", inv);
        }
      } catch {
        socket.emit("fleet:auth_error");
      }
    });

    const moi = (): string | null => socket.data.userId ?? null;

    // --- Lancer un appel depuis une demande ---
    socket.on("call:invite", async (p: { demandeId: string }, ack?: (r: any) => void) => {
      const reply = (r: any) => typeof ack === "function" && ack(r);
      try {
        const userId = moi();
        if (!userId) return reply(ERR("Session non authentifiée"));
        const ctx = await loadAuthContext(prisma, userId);
        if (!ctx) return reply(ERR("Session invalide"));
        const d = await prisma.demandeRecharge.findUnique({ where: { id: String(p?.demandeId || "") } });
        if (!d) return reply(ERR("Demande introuvable"));
        if (!STATUTS_OUVERTS.includes(d.statut as DemandeStatut)) return reply(ERR("Cette demande est close"));

        let appelesIds: string[];
        if (d.driverId === userId) {
          appelesIds = (await recipients(prisma, d.siteId, "recharge.superviser")).map((u) => u.id).filter((id) => id !== userId);
          if (!appelesIds.length) return reply(ERR("Aucun superviseur joignable"));
        } else if (hasPermission(ctx, "recharge.superviser") && canAccessSite(ctx, d.siteId)) {
          appelesIds = [d.driverId];
        } else {
          return reply(ERR("Vous ne pouvez pas appeler pour cette demande"));
        }

        const a = registreAppels.creer({ id: randomUUID(), demandeId: d.id, appelantId: userId, appelesIds }, Date.now());
        if (!a) return reply(ERR("Un appel est déjà en cours pour cette demande"));

        const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { immatriculation: true } });
        const invitation = { callId: a.id, demandeId: d.id, appelantId: userId, appelantNom: ctx.name, vehicule: vehicle?.immatriculation ?? null };
        invitations.set(a.id, invitation);
        versUsers(appelesIds, "call:incoming", invitation);
        void envoyerPush(prisma, appelesIds, {
          titre: `Appel de ${ctx.name}`, message: `Recharge ${vehicle?.immatriculation ?? ""} — ouvrez EASY pour répondre`,
          tag: `appel-${a.id}`, url: "/", type: "appel",
        });
        minuteries.set(a.id, setTimeout(async () => {
          minuteries.delete(a.id);
          const fini = registreAppels.finir(a.id, "MANQUE", Date.now());
          if (fini) {
            await terminer(fini, "Pas de réponse");
            void envoyerPush(prisma, appelesIds, { titre: "Appel manqué", message: `${ctx.name} a essayé de vous joindre (recharge ${vehicle?.immatriculation ?? ""}).`, tag: `appel-${a.id}`, url: "/" });
          }
        }, sonnerieMs));
        reply({ ok: true, callId: a.id });
      } catch (e) {
        console.error("[Appel] invite", e);
        reply(ERR("Erreur serveur"));
      }
    });

    // --- Décrocher (le premier qui décroche prend l'appel) ---
    socket.on("call:accept", (p: { callId: string }, ack?: (r: any) => void) => {
      const reply = (r: any) => typeof ack === "function" && ack(r);
      const userId = moi();
      const a = userId ? registreAppels.decrocher(String(p?.callId || ""), userId, Date.now()) : null;
      if (!a) return reply(ERR("Cet appel n'est plus disponible"));
      const t = minuteries.get(a.id); if (t) { clearTimeout(t); minuteries.delete(a.id); }
      invitations.delete(a.id);
      versUsers([a.appelantId], "call:accepted", { callId: a.id, parId: userId });
      // Les autres superviseurs arrêtent de sonner.
      versUsers(a.appelesIds.filter((id) => id !== userId), "call:taken", { callId: a.id });
      reply({ ok: true });
    });

    socket.on("call:reject", async (p: { callId: string }) => {
      const userId = moi();
      const a = userId ? registreAppels.get(String(p?.callId || "")) : undefined;
      if (!a || !a.appelesIds.includes(userId!)) return;
      // Plusieurs superviseurs : l'appel continue de sonner chez les autres.
      if (a.appelesIds.length > 1) {
        a.appelesIds = a.appelesIds.filter((id) => id !== userId);
        socket.emit("call:ended", { callId: a.id, etat: "REFUSE", raison: "Refusé" });
        return;
      }
      await terminer(registreAppels.finir(a.id, "REFUSE", Date.now()), "Appel refusé");
    });

    socket.on("call:cancel", async (p: { callId: string }) => {
      const a = registreAppels.get(String(p?.callId || ""));
      if (!a || a.appelantId !== moi()) return;
      await terminer(registreAppels.finir(a.id, "ANNULE", Date.now()), "Appel annulé");
    });

    socket.on("call:hangup", async (p: { callId: string }) => {
      const userId = moi();
      const a = registreAppels.get(String(p?.callId || ""));
      if (!a || !userId || (a.appelantId !== userId && a.decrocheParId !== userId)) return;
      await terminer(registreAppels.finir(a.id, "ANNULE", Date.now()), "Appel terminé");
    });

    // --- Signalisation WebRTC (offre, réponse, candidats ICE) : relayée au seul correspondant ---
    socket.on("call:signal", (p: { callId: string; data: unknown }) => {
      const userId = moi();
      const a = registreAppels.get(String(p?.callId || ""));
      if (!a || !userId || a.etat !== "EN_COURS") return;
      const autre = registreAppels.correspondant(a, userId);
      if (autre) versUsers([autre], "call:signal", { callId: a.id, data: p.data });
    });

    // --- Déconnexion : si l'utilisateur n'a plus aucun onglet ouvert, ses appels s'arrêtent ---
    socket.on("disconnect", async () => {
      const userId = moi();
      if (!userId) return;
      const restants = await io.in(`user:${userId}`).fetchSockets();
      if (restants.length) return;
      for (const a of registreAppels.actifsDe(userId)) {
        if (a.etat === "SONNE" && a.appelantId !== userId) continue; // l'appelé peut revenir via la notification
        await terminer(registreAppels.finir(a.id, "ANNULE", Date.now()), "Connexion perdue");
      }
    });
  });
}

/** Routes REST : configuration des appels + abonnements push. */
export function appelRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(["/api/fleet/appels", "/api/fleet/push"], authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // Serveurs ICE (identifiants TURN temporaires).
  r.get("/api/fleet/appels/config", wrap(async (req, res) => {
    res.json({ iceServers: serveursIce(process.env, actor(req).userId, Date.now()) });
  }));

  // Clé publique VAPID (null si les notifications push ne sont pas configurées).
  r.get("/api/fleet/push/cle", wrap(async (_req, res) => { res.json({ cle: clePubliquePush() }); }));

  // Enregistrer l'appareil pour recevoir les notifications.
  r.post("/api/fleet/push/abonnement", wrap(async (req, res) => {
    const b = req.body || {};
    const endpoint = String(b.endpoint || "");
    const p256dh = String(b.keys?.p256dh || ""), auth = String(b.keys?.auth || "");
    if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return res.status(400).json({ error: { fr: "Abonnement invalide", en: "Invalid subscription" } });
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 200);
    await prisma.pushAbonnement.upsert({
      where: { endpoint },
      create: { userId: actor(req).userId, endpoint, p256dh, auth, userAgent },
      update: { userId: actor(req).userId, p256dh, auth, userAgent },
    });
    res.status(201).json({ ok: true });
  }));

  r.delete("/api/fleet/push/abonnement", wrap(async (req, res) => {
    await prisma.pushAbonnement.deleteMany({ where: { endpoint: String(req.body?.endpoint || ""), userId: actor(req).userId } });
    res.json({ ok: true });
  }));

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Appel]", err);
    res.status(500).json({ error: serverError });
  });
  return r;
}
