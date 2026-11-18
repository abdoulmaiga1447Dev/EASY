/**
 * Recharge payée par le Superviseur (2026-11) — demandes + fil de discussion.
 *
 * 1. Le chauffeur demande une recharge pour son véhicule du jour.
 * 2. Le Superviseur Logistique la reçoit dans sa boîte (ordre d'arrivée) et indique la borne.
 * 3. Sur place, le chauffeur envoie le QR code de la borne + le tableau de bord (caméra en direct).
 * 4. Le Superviseur paie (montant + n° de transaction unique) → le chauffeur peut brancher.
 * 5. Le chauffeur envoie la photo du tableau de bord de fin → une RechargeRecord est créée.
 *
 * Anti-fraude : l'argent ne passe jamais par le chauffeur ; une photo déjà envoyée
 * (même empreinte) ou un n° de transaction déjà utilisé est refusé (« Anomalie détectée »).
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { normalizeDay } from "../../lib/assignment";
import { emitToUsers } from "../../lib/realtime";
import {
  STATUTS_OUVERTS, STATUTS_ACTION_SUPERVISEUR, peut, socValide, suggestionRecharge,
  normaliserRef, anomalieFin, type DemandeStatut,
} from "../../lib/demandeRecharge";
import { recipients } from "./recharge";
import { wrap, serverError, notFound } from "./helpers";

const ERR = (fr: string, en: string) => ({ error: { fr, en } });
const MEDIA_TYPES_PREUVE = ["DemandeRecharge", "RechargeRecord"];

export function demandeRechargeRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use("/api/fleet/recharge-demandes", authenticate(prisma));
  r.use("/api/fleet/me/recharge-demandes", authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;
  const estSuperviseur = (ctx: AuthContext) => hasPermission(ctx, "recharge.superviser");
  const estControleur = (ctx: AuthContext) => hasPermission(ctx, "recharge.controler");

  /** Superviseurs concernés par un site. */
  const superviseurs = async (siteId: string) => (await recipients(prisma, siteId, "recharge.superviser")).map((u) => u.id);
  /** Contrôleurs (Finance) concernés par un site. */
  const controleurs = async (siteId: string) => (await recipients(prisma, siteId, "recharge.controler")).map((u) => u.id);

  /** Alerte la Finance (contrôle indépendant du Superviseur qui paie). */
  async function alerterFinance(d: { id: string; siteId: string; vehicleId: string }, titre: string, raison: string) {
    const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { immatriculation: true } });
    const ids = await controleurs(d.siteId);
    for (const uid of ids) {
      await notify(prisma, { userId: uid, canal: "IN_APP", type: "recharge.controle", titre, message: `${vehicle?.immatriculation ?? "Véhicule"} : ${raison}` });
    }
    emitToUsers(ids, "recharge:controle", { demandeId: d.id });
  }

  /** Prévient en temps réel le chauffeur et les superviseurs du site. */
  async function diffuser(d: { id: string; driverId: string; siteId: string; statut: string }, type: string) {
    emitToUsers([d.driverId, ...(await superviseurs(d.siteId))], "recharge:update", { demandeId: d.id, statut: d.statut, type });
  }

  async function message(demandeId: string, auteurId: string | null, type: string, data: { texte?: string; mediaIds?: string[]; meta?: any } = {}) {
    return prisma.demandeRechargeMessage.create({
      data: { demandeId, auteurId, type, texte: data.texte ?? null, mediaIds: data.mediaIds ?? [], meta: data.meta ?? undefined },
    });
  }

  /** Charge une demande et vérifie que l'acteur y a accès (chauffeur concerné ou superviseur du site). */
  async function chargerDemande(ctx: AuthContext, id: string) {
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    if (!d) return { status: 404 as const, body: { error: notFound } };
    const ok = d.driverId === ctx.userId || ((estSuperviseur(ctx) || estControleur(ctx)) && canAccessSite(ctx, d.siteId));
    if (!ok) return { status: 403 as const, body: ERR("Accès refusé à cette demande", "Access denied") };
    return { d };
  }

  /**
   * Vérifie des photos de preuve : envoyées par l'acteur, pas encore rattachées, et jamais
   * utilisées ailleurs (même empreinte). Renvoie un message d'anomalie si refus.
   */
  async function verifierPhotos(ctx: AuthContext, ids: string[]): Promise<string | null> {
    const medias = await prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
    if (medias.length !== new Set(ids).size) return "Photo introuvable : reprenez la photo.";
    for (const m of medias) {
      if (m.uploadedById !== ctx.userId) return "Photo non valide : elle doit être prise depuis votre compte.";
      if (m.resourceType) return "Anomalie détectée : cette photo a déjà été utilisée.";
      if (m.sha256) {
        const doublon = await prisma.mediaAsset.findFirst({
          where: { sha256: m.sha256, id: { not: m.id }, resourceType: { in: MEDIA_TYPES_PREUVE } },
          select: { id: true },
        });
        if (doublon) return "Anomalie détectée : cette photo a déjà été envoyée pour une autre recharge.";
      }
    }
    if (new Set(medias.map((m) => m.sha256).filter(Boolean)).size !== medias.filter((m) => m.sha256).length) {
      return "Anomalie détectée : la même photo a été envoyée deux fois.";
    }
    return null;
  }

  const rattacher = (ids: string[], demandeId: string) =>
    prisma.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { resourceType: "DemandeRecharge", resourceId: demandeId } });

  /** Enrichit une demande pour l'affichage (véhicule, chauffeur, borne, messages). */
  async function detail(id: string, ctx?: AuthContext) {
    const d = await prisma.demandeRecharge.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!d) return null;
    const [vehicle, driver, borne] = await Promise.all([
      prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { immatriculation: true, marque: true, modele: true, capaciteBatterieKwh: true } }),
      prisma.user.findUnique({ where: { id: d.driverId }, select: { name: true, phone: true } }),
      d.borneId ? prisma.borneRecharge.findUnique({ where: { id: d.borneId } }) : Promise.resolve(null),
    ]);
    const auteurs = [...new Set(d.messages.map((m) => m.auteurId).filter(Boolean) as string[])];
    const users = await prisma.user.findMany({ where: { id: { in: auteurs } }, select: { id: true, name: true } });
    const nom = new Map(users.map((u) => [u.id, u.name]));
    const voitPreuve = !ctx || estSuperviseur(ctx) || estControleur(ctx);
    return {
      ...d,
      preuvePaiementMediaId: voitPreuve ? d.preuvePaiementMediaId : null,
      vehicule: vehicle,
      chauffeur: driver,
      borne,
      messages: d.messages.map((m) => ({ ...m, auteurNom: m.auteurId ? nom.get(m.auteurId) ?? null : null })),
    };
  }

  // =====================================================================================
  // Chauffeur
  // =====================================================================================

  // --- Demander une recharge (véhicule du jour) ---
  r.post(
    "/api/fleet/recharge-demandes",
    authorize("recharge.enregistrer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const day = normalizeDay(new Date().toISOString());
      // Véhicule du jour : celui indiqué (s'il est bien attribué au chauffeur aujourd'hui), sinon le dernier attribué.
      const where: any = { driverId: ctx.userId, date: day };
      if (req.body?.vehicleId) where.vehicleId = String(req.body.vehicleId);
      const assign = await prisma.assignment.findFirst({ where, orderBy: { createdAt: "desc" } });
      if (!assign) return res.status(403).json(ERR("Aucun véhicule ne vous est attribué aujourd'hui", "No vehicle assigned today"));

      const ouverte = await prisma.demandeRecharge.findFirst({ where: { vehicleId: assign.vehicleId, statut: { in: STATUTS_OUVERTS } } });
      if (ouverte) return res.status(409).json({ ...ERR("Une demande de recharge est déjà en cours pour ce véhicule", "A charging request is already open"), demandeId: ouverte.id });

      const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: assign.vehicleId }, select: { immatriculation: true, siteId: true } });
      if (!vehicle) return res.status(404).json(ERR("Véhicule introuvable", "Vehicle not found"));

      const d = await prisma.demandeRecharge.create({
        data: { vehicleId: assign.vehicleId, driverId: ctx.userId, siteId: vehicle.siteId, shift: assign.shift ?? null },
      });
      const texte = typeof req.body?.texte === "string" ? req.body.texte.trim().slice(0, 500) : "";
      await message(d.id, null, "SYSTEME", { texte: "Demande de recharge envoyée au Superviseur." });
      if (texte) await message(d.id, ctx.userId, "TEXTE", { texte });

      await writeAudit(prisma, ctx, { action: "recharge_demande.create", resourceType: "DemandeRecharge", resourceId: d.id, siteId: d.siteId });
      for (const uid of await superviseurs(d.siteId)) {
        await notify(prisma, { userId: uid, canal: "IN_APP", type: "recharge.demande", titre: "Nouvelle demande de recharge", message: `${ctx.name ?? "Un chauffeur"} demande une recharge pour ${vehicle.immatriculation}.` });
      }
      await diffuser(d, "nouvelle");
      res.status(201).json(await detail(d.id, ctx));
    })
  );

  // --- Ma demande en cours + historique ---
  r.get(
    "/api/fleet/me/recharge-demandes",
    authorize("recharge.enregistrer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const ouverte = await prisma.demandeRecharge.findFirst({ where: { driverId: ctx.userId, statut: { in: STATUTS_OUVERTS } }, orderBy: { createdAt: "desc" } });
      const historique = await prisma.demandeRecharge.findMany({
        where: { driverId: ctx.userId, statut: { in: ["TERMINEE", "ANNULEE"] } }, orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, statut: true, createdAt: true, montantPaye: true, socDebut: true, socFin: true, anomalie: true },
      });
      res.json({ ouverte: ouverte ? await detail(ouverte.id, ctx) : null, historique });
    })
  );

  // --- Sur place : photo du QR code de la borne + tableau de bord + % batterie ---
  r.post(
    "/api/fleet/recharge-demandes/:id/sur-place",
    authorize("recharge.enregistrer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      const d = got.d;
      if (d.driverId !== ctx.userId) return res.status(403).json(ERR("Seul le chauffeur de la demande peut envoyer ces photos", "Only the requesting driver"));
      if (!peut("surPlace", d.statut as DemandeStatut)) return res.status(409).json(ERR("Cette étape n'est plus possible pour cette demande", "Step not allowed"));

      const { qrMediaId, tableauMediaId } = req.body || {};
      const socDebut = socValide(req.body?.socDebut);
      if (!qrMediaId || !tableauMediaId) return res.status(400).json(ERR("Les deux photos sont obligatoires (QR code et tableau de bord)", "Both photos required"));
      if (socDebut === null) return res.status(400).json(ERR("Indiquez le % de batterie affiché (0 à 100)", "Battery % required"));
      const refus = await verifierPhotos(ctx, [String(qrMediaId), String(tableauMediaId)]);
      if (refus) {
        await notifierAnomalie(d, refus);
        return res.status(409).json({ ...ERR(refus, "Anomaly detected"), anomalie: true });
      }

      const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { capaciteBatterieKwh: true } });
      const borne = d.borneId ? await prisma.borneRecharge.findUnique({ where: { id: d.borneId }, select: { prixKwh: true } }) : null;
      const { kwhEstime, montantSuggere } = suggestionRecharge({ socDebut, capaciteBatterieKwh: vehicle?.capaciteBatterieKwh, prixKwh: borne?.prixKwh });

      await rattacher([String(qrMediaId), String(tableauMediaId)], d.id);
      const maj = await prisma.demandeRecharge.update({ where: { id: d.id }, data: { statut: "SUR_PLACE", socDebut, kwhEstime, montantSuggere } });
      await message(d.id, ctx.userId, "PHOTOS_ARRIVEE", { mediaIds: [String(qrMediaId), String(tableauMediaId)], meta: { socDebut, kwhEstime, montantSuggere } });
      await diffuser(maj, "statut");
      res.json(await detail(d.id, ctx));
    })
  );

  // --- Recharge terminée : photo du tableau de bord de fin + % batterie ---
  r.post(
    "/api/fleet/recharge-demandes/:id/terminer",
    authorize("recharge.enregistrer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      const d = got.d;
      if (d.driverId !== ctx.userId) return res.status(403).json(ERR("Seul le chauffeur de la demande peut terminer la recharge", "Only the requesting driver"));
      if (!peut("terminer", d.statut as DemandeStatut)) return res.status(409).json(ERR("La recharge ne peut être terminée qu'après le paiement", "Payment required first"));

      const { tableauFinMediaId } = req.body || {};
      const socFin = socValide(req.body?.socFin);
      if (!tableauFinMediaId) return res.status(400).json(ERR("La photo du tableau de bord est obligatoire", "Dashboard photo required"));
      if (socFin === null) return res.status(400).json(ERR("Indiquez le % de batterie affiché (0 à 100)", "Battery % required"));
      const refus = await verifierPhotos(ctx, [String(tableauFinMediaId)]);
      if (refus) {
        await notifierAnomalie(d, refus);
        return res.status(409).json({ ...ERR(refus, "Anomaly detected"), anomalie: true });
      }

      const anomalie = anomalieFin(d.socDebut, socFin);
      const [vehicle, borne] = await Promise.all([
        prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { kmActuel: true } }),
        d.borneId ? prisma.borneRecharge.findUnique({ where: { id: d.borneId } }) : Promise.resolve(null),
      ]);

      await rattacher([String(tableauFinMediaId)], d.id);
      const maj = await prisma.$transaction(async (tx) => {
        const up = await tx.demandeRecharge.update({ where: { id: d.id }, data: { statut: "TERMINEE", socFin, termineLe: new Date(), anomalie } });
        // Une seule recharge enregistrée par demande (contrôlé ici, la colonne n'est pas unique en base).
        const deja = await tx.rechargeRecord.findFirst({ where: { demandeId: d.id }, select: { id: true } });
        if (!deja) {
          await tx.rechargeRecord.create({
            data: {
              vehicleId: d.vehicleId, driverId: d.driverId, enregistreParId: d.payeParId ?? ctx.userId, siteId: d.siteId,
              shift: d.shift, typeCharge: borne?.type ?? "PARTENAIRE", borneId: borne?.id ?? null, lieu: borne?.nom ?? null,
              kwh: null, cout: d.montantPaye ?? 0, socDebut: d.socDebut ?? 0, socFin, kmAuMoment: vehicle?.kmActuel ?? null,
              justificatifMediaId: String(tableauFinMediaId), anomalieCoherence: anomalie, demandeId: d.id,
            },
          });
        }
        await tx.fleetVehicle.update({ where: { id: d.vehicleId }, data: { socDernierConnu: socFin } });
        return up;
      });
      await message(d.id, ctx.userId, "PHOTO_FIN", { mediaIds: [String(tableauFinMediaId)], meta: { socFin } });
      await message(d.id, null, "SYSTEME", { texte: anomalie ? `Recharge terminée — anomalie : la batterie n'a pas monté (${d.socDebut} % → ${socFin} %).` : `Recharge terminée (${d.socDebut} % → ${socFin} %).` });
      await writeAudit(prisma, ctx, { action: "recharge_demande.terminer", resourceType: "DemandeRecharge", resourceId: d.id, siteId: d.siteId, after: { socFin, anomalie } });
      if (anomalie) {
        await notifierAnomalie(d, `La batterie n'a pas monté (${d.socDebut} % → ${socFin} %).`);
        await alerterFinance(d, "Recharge à contrôler", `recharge payée ${d.montantPaye ?? 0} F mais la batterie n'a pas monté (${d.socDebut} % → ${socFin} %).`);
      }
      await diffuser(maj, "statut");
      res.json(await detail(d.id, ctx));
    })
  );

  // =====================================================================================
  // Superviseur Logistique
  // =====================================================================================

  // --- Boîte des demandes (ordre d'arrivée) ---
  r.get(
    "/api/fleet/recharge-demandes",
    authorize("recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const vue = String(req.query.vue || "ouvertes");
      if (vue === "ouvertes") where.statut = { in: STATUTS_OUVERTS };
      else where.statut = { in: ["TERMINEE", "ANNULEE"] };

      const list = await prisma.demandeRecharge.findMany({
        where, orderBy: { createdAt: vue === "ouvertes" ? "asc" : "desc" }, take: vue === "ouvertes" ? 200 : 50,
      });
      const [vehs, users] = await Promise.all([
        prisma.fleetVehicle.findMany({ where: { id: { in: [...new Set(list.map((d) => d.vehicleId))] } }, select: { id: true, immatriculation: true } }),
        prisma.user.findMany({ where: { id: { in: [...new Set(list.map((d) => d.driverId))] } }, select: { id: true, name: true } }),
      ]);
      const immat = new Map(vehs.map((v) => [v.id, v.immatriculation]));
      const nom = new Map(users.map((u) => [u.id, u.name]));
      res.json({
        demandes: list.map((d) => ({
          id: d.id, statut: d.statut, createdAt: d.createdAt, updatedAt: d.updatedAt, anomalie: d.anomalie,
          montantPaye: d.montantPaye, vehicule: immat.get(d.vehicleId) ?? null, chauffeurNom: nom.get(d.driverId) ?? null,
          actionRequise: STATUTS_ACTION_SUPERVISEUR.includes(d.statut as DemandeStatut),
        })),
      });
    })
  );

  // --- Nombre de demandes qui attendent une action du Superviseur (badge de navigation) ---
  r.get(
    "/api/fleet/recharge-demandes/compteur",
    authorize("recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = { statut: { in: STATUTS_ACTION_SUPERVISEUR } };
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      res.json({ aTraiter: await prisma.demandeRecharge.count({ where }) });
    })
  );

  // =====================================================================================
  // Finance : contrôle des recharges payées (séparation payeur / contrôleur)
  // =====================================================================================

  // --- Recharges à contrôler (écart de montant ou anomalie de batterie) / déjà contrôlées ---
  r.get(
    "/api/fleet/recharge-demandes/controle",
    authorize("recharge.controler"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = { OR: [{ ecartMontant: true }, { anomalie: true }] };
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const vue = String(req.query.vue || "a_controler");
      where.controleLe = vue === "controlees" ? { not: null } : null;
      const list = await prisma.demandeRecharge.findMany({ where, orderBy: { createdAt: vue === "controlees" ? "desc" : "asc" }, take: 200 });
      const userIds = [...new Set(list.flatMap((d) => [d.driverId, d.payeParId, d.controleParId]).filter(Boolean) as string[])];
      const [vehs, users] = await Promise.all([
        prisma.fleetVehicle.findMany({ where: { id: { in: [...new Set(list.map((d) => d.vehicleId))] } }, select: { id: true, immatriculation: true } }),
        prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
      ]);
      const immat = new Map(vehs.map((v) => [v.id, v.immatriculation]));
      const nom = new Map(users.map((u) => [u.id, u.name]));
      res.json({
        demandes: list.map((d) => ({
          id: d.id, createdAt: d.createdAt, statut: d.statut, vehicule: immat.get(d.vehicleId) ?? null,
          chauffeurNom: nom.get(d.driverId) ?? null, payeParNom: d.payeParId ? nom.get(d.payeParId) ?? null : null,
          montantPaye: d.montantPaye, montantSuggere: d.montantSuggere, refTransaction: d.refTransaction,
          ecartMontant: d.ecartMontant, anomalie: d.anomalie, socDebut: d.socDebut, socFin: d.socFin,
          ecartPct: d.montantPaye != null && d.montantSuggere ? Math.round(((d.montantPaye - d.montantSuggere) / d.montantSuggere) * 100) : null,
          controleLe: d.controleLe, controleNote: d.controleNote, controleParNom: d.controleParId ? nom.get(d.controleParId) ?? null : null,
        })),
      });
    })
  );

  // --- Nombre de recharges à contrôler (compteur Finance) ---
  r.get(
    "/api/fleet/recharge-demandes/controle/compteur",
    authorize("recharge.controler"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = { OR: [{ ecartMontant: true }, { anomalie: true }], controleLe: null };
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      res.json({ aControler: await prisma.demandeRecharge.count({ where }) });
    })
  );

  // --- Marquer une recharge comme contrôlée (note obligatoire) ---
  r.post(
    "/api/fleet/recharge-demandes/:id/controle",
    authorize("recharge.controler"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      if (got.d.controleLe) return res.status(409).json(ERR("Cette recharge a déjà été contrôlée", "Already checked"));
      const note = String(req.body?.note || "").trim().slice(0, 500);
      if (!note) return res.status(400).json(ERR("Indiquez la conclusion du contrôle", "Note required"));
      await prisma.demandeRecharge.update({ where: { id: got.d.id }, data: { controleParId: ctx.userId, controleLe: new Date(), controleNote: note } });
      await writeAudit(prisma, ctx, { action: "recharge_demande.controle", resourceType: "DemandeRecharge", resourceId: got.d.id, siteId: got.d.siteId, after: { note } });
      res.json(await detail(got.d.id, ctx));
    })
  );

  // --- Détail d'une demande (chauffeur concerné, superviseur ou Finance du site) ---
  r.get(
    "/api/fleet/recharge-demandes/:id",
    authorize("recharge.enregistrer", "recharge.superviser", "recharge.controler"),
    wrap(async (req, res) => {
      const got = await chargerDemande(actor(req), req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      res.json(await detail(got.d.id, actor(req)));
    })
  );

  // --- Message texte dans le fil (les deux parties) ---
  r.post(
    "/api/fleet/recharge-demandes/:id/messages",
    authorize("recharge.enregistrer", "recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      if (!STATUTS_OUVERTS.includes(got.d.statut as DemandeStatut)) return res.status(409).json(ERR("Cette demande est close", "Request closed"));
      const texte = String(req.body?.texte || "").trim().slice(0, 1000);
      if (!texte) return res.status(400).json(ERR("Message vide", "Empty message"));
      await message(got.d.id, ctx.userId, "TEXTE", { texte });
      await diffuser(got.d, "message");
      res.status(201).json(await detail(got.d.id, ctx));
    })
  );

  // --- Indiquer la borne (liste autorisée) ---
  r.post(
    "/api/fleet/recharge-demandes/:id/borne",
    authorize("recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      const d = got.d;
      if (!peut("indiquerBorne", d.statut as DemandeStatut)) return res.status(409).json(ERR("La borne ne peut plus être changée à cette étape", "Step not allowed"));
      const borne = await prisma.borneRecharge.findUnique({ where: { id: String(req.body?.borneId || "") } });
      if (!borne || !borne.active) return res.status(400).json(ERR("Borne non autorisée : choisissez une borne de la liste", "Station not whitelisted"));

      const maj = await prisma.demandeRecharge.update({ where: { id: d.id }, data: { borneId: borne.id, statut: "PRISE_EN_CHARGE" } });
      await message(d.id, ctx.userId, "BORNE", {
        texte: `Rendez-vous à la borne : ${borne.nom}${borne.operateur ? ` (${borne.operateur})` : ""}.`,
        meta: { borneId: borne.id, nom: borne.nom, gpsLat: borne.gpsLat, gpsLng: borne.gpsLng },
      });
      await diffuser(maj, "statut");
      res.json(await detail(d.id, ctx));
    })
  );

  // --- Paiement effectué : le chauffeur peut brancher ---
  r.post(
    "/api/fleet/recharge-demandes/:id/paiement",
    authorize("recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      const d = got.d;
      if (!peut("payer", d.statut as DemandeStatut)) return res.status(409).json(ERR("Le paiement se fait après réception des photos du chauffeur", "Photos required before payment"));

      const montant = Math.round(Number(req.body?.montant));
      const ref = normaliserRef(req.body?.refTransaction);
      if (!Number.isFinite(montant) || montant <= 0) return res.status(400).json(ERR("Montant payé invalide", "Invalid amount"));
      if (ref.length < 4) return res.status(400).json(ERR("Indiquez le n° de transaction du paiement", "Transaction number required"));
      const preuve = String(req.body?.preuveMediaId || "");
      if (!preuve) return res.status(400).json(ERR("Joignez la capture de la confirmation du paiement Wave", "Payment screenshot required"));
      const deja = await prisma.demandeRecharge.findFirst({ where: { refTransaction: ref }, select: { id: true } });
      if (deja) {
        await alerterFinance(d, "Anomalie paiement recharge", `n° de transaction ${ref} déjà utilisé pour une autre recharge (tentative de ${ctx.name}).`);
        return res.status(409).json({ ...ERR("Anomalie détectée : ce n° de transaction a déjà été utilisé", "Transaction number already used"), anomalie: true });
      }
      const refus = await verifierPhotos(ctx, [preuve]);
      if (refus) {
        await alerterFinance(d, "Anomalie paiement recharge", `capture de paiement refusée (${refus}) — ${ctx.name}.`);
        return res.status(409).json({ ...ERR(refus, "Anomaly detected"), anomalie: true });
      }

      // Écart : payé plus de 20 % au-dessus du montant proposé → la Finance contrôle.
      const ecartMontant = d.montantSuggere != null && d.montantSuggere > 0 && montant > d.montantSuggere * 1.2;
      await rattacher([preuve], d.id);
      const maj = await prisma.demandeRecharge.update({
        where: { id: d.id }, data: { statut: "PAYEE", montantPaye: montant, refTransaction: ref, payeParId: ctx.userId, payeLe: new Date(), preuvePaiementMediaId: preuve, ecartMontant },
      });
      await message(d.id, ctx.userId, "PAIEMENT", { texte: "Paiement effectué : vous pouvez brancher le véhicule.", meta: { montant, refTransaction: ref } });
      await writeAudit(prisma, ctx, { action: "recharge_demande.paiement", resourceType: "DemandeRecharge", resourceId: d.id, siteId: d.siteId, after: { montant, refTransaction: ref, montantSuggere: d.montantSuggere, ecartMontant } });
      if (ecartMontant) {
        const pct = Math.round(((montant - (d.montantSuggere as number)) / (d.montantSuggere as number)) * 100);
        await alerterFinance(d, "Recharge à contrôler", `payé ${montant} F pour ${d.montantSuggere} F proposés (+${pct} %) par ${ctx.name}.`);
      }
      await notify(prisma, { userId: d.driverId, canal: "IN_APP", type: "recharge.payee", titre: "Recharge payée", message: "Le paiement est fait : vous pouvez brancher le véhicule." });
      await diffuser(maj, "statut");
      res.json(await detail(d.id, ctx));
    })
  );

  // --- Annuler (chauffeur avant paiement ; superviseur avant la fin) ---
  r.post(
    "/api/fleet/recharge-demandes/:id/annuler",
    authorize("recharge.enregistrer", "recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const got = await chargerDemande(ctx, req.params.id);
      if (!got.d) return res.status(got.status).json(got.body);
      const d = got.d;
      const parChauffeur = d.driverId === ctx.userId && !estSuperviseur(ctx);
      const ok = parChauffeur ? peut("annulerChauffeur", d.statut as DemandeStatut) : peut("annulerSuperviseur", d.statut as DemandeStatut);
      if (!ok) return res.status(409).json(ERR(parChauffeur ? "Après le paiement, seul le Superviseur peut annuler" : "Cette demande ne peut plus être annulée", "Cannot cancel"));
      const motif = String(req.body?.motif || "").trim().slice(0, 300);
      if (!parChauffeur && !motif) return res.status(400).json(ERR("Le motif d'annulation est obligatoire", "Reason required"));

      const maj = await prisma.demandeRecharge.update({ where: { id: d.id }, data: { statut: "ANNULEE", annuleParId: ctx.userId, motifAnnulation: motif || null } });
      await message(d.id, ctx.userId, "ANNULATION", { texte: `Demande annulée${motif ? ` : ${motif}` : "."}` });
      await writeAudit(prisma, ctx, { action: "recharge_demande.annuler", resourceType: "DemandeRecharge", resourceId: d.id, siteId: d.siteId, after: { motif } });
      await diffuser(maj, "statut");
      res.json(await detail(d.id, ctx));
    })
  );

  /** Anomalie : message dans le fil + alerte aux superviseurs du site. */
  async function notifierAnomalie(d: { id: string; driverId: string; siteId: string; statut: string; vehicleId: string }, raison: string) {
    await message(d.id, null, "SYSTEME", { texte: `⚠ ${raison}`, meta: { anomalie: true } });
    const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { immatriculation: true } });
    for (const uid of await superviseurs(d.siteId)) {
      await notify(prisma, { userId: uid, canal: "IN_APP", type: "recharge.anomalie", titre: "Anomalie recharge", message: `${vehicle?.immatriculation ?? "Véhicule"} : ${raison}` });
    }
    await diffuser(d, "message");
  }

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[DemandeRecharge]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire une photo d'une demande (chauffeur concerné ou superviseur du site). */
export async function canReadDemandeRechargeMedia(prisma: PrismaClient, ctx: AuthContext, demandeId: string, mediaId?: string): Promise<boolean> {
  const d = await prisma.demandeRecharge.findUnique({ where: { id: demandeId }, select: { driverId: true, siteId: true, preuvePaiementMediaId: true } });
  if (!d) return false;
  if (hasPermission(ctx, "recharge.superviser", "recharge.controler") && canAccessSite(ctx, d.siteId)) return true;
  // Le chauffeur voit ses propres photos, mais pas la capture du paiement (compte Wave de l'entreprise).
  if (d.driverId === ctx.userId) return !(mediaId && mediaId === d.preuvePaiementMediaId);
  return false;
}
