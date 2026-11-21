/**
 * IA dans le parcours de recharge.
 *
 * Étape 1 — % de batterie (photos du tableau de bord du chauffeur) :
 * - POST /api/fleet/ia/batterie { mediaId } : le chauffeur vient de prendre la photo du tableau
 *   de bord ; le serveur la fait lire par Gemini et CONSERVE la lecture sur le média (iaLecture).
 *   L'application pré-remplit le % : le chauffeur confirme.
 * - Quand le chauffeur valide l'étape, le serveur compare le % saisi à SA propre lecture
 *   (jamais à une valeur envoyée par le téléphone) : un écart est signalé au Superviseur et à
 *   la Finance. Si la lecture n'est pas encore prête, elle est faite en arrière-plan.
 * - Photo qui n'est pas un tableau de bord (ou illisible) : REFUSÉE par le serveur.
 * - % lu en chiffres : c'est LUI qui est enregistré (le chauffeur ne le tape pas).
 * - IA indisponible (pas de clé, quota, réseau) : saisie manuelle, signalée dans le fil.
 *
 * Étape 2 — reçu Wave (capture jointe par le Superviseur au paiement) :
 * - pas un reçu Wave, paiement non « Effectué », montant ou ID illisible : REFUSÉ ;
 * - montant et n° de transaction lus sur le reçu font foi ;
 * - reçu daté d'avant la demande, retouche suspectée, IA indisponible : la Finance contrôle.
 */
import express from "express";
import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { UPLOAD_DIR } from "../../lib/upload";
import { ia, iaConfiguree, interpreterBatterie, interpreterRecuWave, type LectureBatterie, type LectureRecuWave } from "../../lib/ia";
import { notify } from "../../lib/notifications";
import { emitToUsers } from "../../lib/realtime";
import { recipients } from "./recharge";
import { wrap, serverError } from "./helpers";

/** Écart toléré (points de %) entre la saisie du chauffeur et la lecture de l'IA. */
export const TOLERANCE_ECART_IA = 2;

export interface LectureStockee {
  lecture: LectureBatterie;
  decision: ReturnType<typeof interpreterBatterie>;
  modele: string;
  le: string;
}

const enCours = new Map<string, Promise<any>>();

/** Lit (une seule fois) le % de batterie sur une photo et conserve le résultat sur le média. */
export function lireBatterieMedia(prisma: PrismaClient, mediaId: string): Promise<LectureStockee | null> {
  const deja = enCours.get(mediaId);
  if (deja) return deja;
  const p = (async () => {
    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media || media.kind !== "image") return null;
    if (media.iaLecture && !(media.iaLecture as any).type) return media.iaLecture as unknown as LectureStockee;
    if (!iaConfiguree()) return null;
    try {
      const image = fs.readFileSync(path.join(UPLOAD_DIR, media.chemin));
      const { resultat, modele } = await ia.lireBatterie(image, media.mime);
      const stockee: LectureStockee = { lecture: resultat, decision: interpreterBatterie(resultat), modele, le: new Date().toISOString() };
      await prisma.mediaAsset.update({ where: { id: mediaId }, data: { iaLecture: stockee as any } });
      return stockee;
    } catch (e: any) {
      console.error("[IA] lecture batterie", mediaId, e?.message ?? e);
      return null;
    }
  })().finally(() => setTimeout(() => enCours.delete(mediaId), 1000));
  enCours.set(mediaId, p);
  return p;
}

/** % fiable lu par l'IA (seulement un pourcentage écrit en chiffres, jamais une estimation par jauge). */
export const socFiable = (l: LectureStockee | null): number | null =>
  l && l.decision.source === "pourcentage" && !l.decision.aReprendre ? l.decision.soc : null;

/** Délai maximal d'attente de l'IA pendant une validation (au-delà : on continue sans elle). */
export const DELAI_IA_MS = 25_000;
export const TROP_LENT = Symbol("trop-lent");
/** Attend une lecture au plus `ms` ; renvoie TROP_LENT si elle n'est pas prête. */
export function avecDelai<T>(p: Promise<T>, ms = DELAI_IA_MS): Promise<T | typeof TROP_LENT> {
  let t: NodeJS.Timeout;
  return Promise.race([p, new Promise<typeof TROP_LENT>((r) => { t = setTimeout(() => r(TROP_LENT), ms); })]).finally(() => clearTimeout(t));
}

/**
 * Vérifie la photo du tableau de bord avant d'accepter l'étape :
 * - refus si l'IA voit que ce n'est pas un tableau de bord (ou que c'est illisible) ;
 * - soc = % lu par l'IA (fait foi), sinon null (saisie manuelle : Eado sans %, IA indisponible).
 */
export async function verifierPhotoTableau(prisma: PrismaClient, mediaId: string): Promise<
  { ok: false; refus: string } | { ok: true; soc: number | null; etat: "lu" | "sans_pourcentage" | "indisponible" | "trop_lent" }
> {
  const l = await avecDelai(lireBatterieMedia(prisma, mediaId));
  if (l === TROP_LENT) return { ok: true, soc: null, etat: "trop_lent" };
  if (!l) return { ok: true, soc: null, etat: "indisponible" };
  if (l.decision.aReprendre) return { ok: false, refus: l.decision.message };
  const soc = socFiable(l);
  return { ok: true, soc, etat: soc === null ? "sans_pourcentage" : "lu" };
}

/** Message du fil quand le % n'a pas été lu par l'IA (saisie du chauffeur). */
export async function noterSaisieManuelle(prisma: PrismaClient, demandeId: string, moment: "debut" | "fin", etat: "sans_pourcentage" | "indisponible" | "trop_lent", saisi: number) {
  const quand = moment === "debut" ? "à l'arrivée" : "à la fin";
  const texte = etat === "sans_pourcentage"
    ? `% ${quand} saisi par le chauffeur (${saisi} %) : ce tableau de bord n'affiche pas de pourcentage.`
    : `% ${quand} saisi par le chauffeur (${saisi} %) : photo non vérifiée par l'IA (service indisponible).`;
  await prisma.demandeRechargeMessage.create({ data: { demandeId, auteurId: null, type: "SYSTEME", texte, meta: { ia: true, etat, saisi } } });
}

/**
 * Compare le % saisi par le chauffeur à la lecture de l'IA et l'enregistre sur la demande.
 * Écart > tolérance → message dans le fil + alerte Superviseur et Finance.
 */
export async function appliquerLectureIa(prisma: PrismaClient, demandeId: string, moment: "debut" | "fin", mediaId: string, saisi: number): Promise<void> {
  const l = await lireBatterieMedia(prisma, mediaId);
  const socIa = socFiable(l);
  if (socIa === null) return;
  const ecart = Math.abs(socIa - saisi) > TOLERANCE_ECART_IA;
  const d = await prisma.demandeRecharge.update({
    where: { id: demandeId },
    data: { ...(moment === "debut" ? { socDebutIa: socIa } : { socFinIa: socIa }), ...(ecart ? { ecartIa: true } : {}) },
  });
  const quand = moment === "debut" ? "à l'arrivée" : "à la fin";
  const texte = ecart
    ? `⚠ Écart IA ${quand} : le chauffeur a indiqué ${saisi} %, l'IA lit ${socIa} % sur la photo.`
    : `IA : ${socIa} % lu sur la photo ${quand}.`;
  await prisma.demandeRechargeMessage.create({ data: { demandeId, auteurId: null, type: "SYSTEME", texte, meta: { ia: true, anomalie: ecart, socIa, saisi } } });

  const superviseurs = (await recipients(prisma, d.siteId, "recharge.superviser")).map((u) => u.id);
  emitToUsers([d.driverId, ...superviseurs], "recharge:update", { demandeId, statut: d.statut, type: "message" });
  if (ecart) {
    const controleurs = (await recipients(prisma, d.siteId, "recharge.controler")).map((u) => u.id);
    const vehicule = await prisma.fleetVehicle.findUnique({ where: { id: d.vehicleId }, select: { immatriculation: true } });
    for (const uid of [...new Set([...superviseurs, ...controleurs])]) {
      await notify(prisma, { userId: uid, canal: "IN_APP", type: "recharge.ecart_ia", titre: "Écart de lecture batterie", message: `${vehicule?.immatriculation ?? "Véhicule"} : saisi ${saisi} %, IA ${socIa} % (${quand}).` });
    }
    emitToUsers(controleurs, "recharge:controle", { demandeId });
  }
}

// =====================================================================================
// Reçu Wave
// =====================================================================================

export interface LectureRecuStockee {
  type: "recu_wave";
  lecture: LectureRecuWave;
  decision: ReturnType<typeof interpreterRecuWave>;
  modele: string;
  le: string;
}

/** Lit (une seule fois) un reçu Wave et conserve le résultat sur le média. */
export function lireRecuMedia(prisma: PrismaClient, mediaId: string): Promise<LectureRecuStockee | null> {
  const cle = `recu:${mediaId}`;
  const deja: Promise<LectureRecuStockee | null> | undefined = enCours.get(cle);
  if (deja) return deja;
  const p = (async () => {
    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media || media.kind !== "image") return null;
    if ((media.iaLecture as any)?.type === "recu_wave") return media.iaLecture as unknown as LectureRecuStockee;
    if (!iaConfiguree()) return null;
    try {
      const image = fs.readFileSync(path.join(UPLOAD_DIR, media.chemin));
      const { resultat, modele } = await ia.lireRecuWave(image, media.mime);
      const stockee: LectureRecuStockee = { type: "recu_wave", lecture: resultat, decision: interpreterRecuWave(resultat), modele, le: new Date().toISOString() };
      await prisma.mediaAsset.update({ where: { id: mediaId }, data: { iaLecture: stockee as any } });
      return stockee;
    } catch (e: any) {
      console.error("[IA] lecture reçu Wave", mediaId, e?.message ?? e);
      return null;
    }
  })().finally(() => setTimeout(() => enCours.delete(cle), 1000));
  enCours.set(cle, p);
  return p;
}

const MARGE_HORLOGE_MS = 15 * 60_000;
const jourUtc = (d: Date) => d.toISOString().slice(0, 10);
const dateFr = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Africa/Abidjan", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Contrôle du reçu joint au paiement.
 * - refus : la capture n'est pas un reçu Wave valide, ou le reçu date d'un jour antérieur à la demande ;
 * - sinon montant et n° lus sur le reçu font foi ; les incohérences (saisie différente, heure
 *   antérieure à la demande, reçu dans le futur, retouche suspectée, IA indisponible) → contrôle Finance.
 */
export async function controlerRecu(
  prisma: PrismaClient,
  demande: { createdAt: Date },
  mediaId: string,
  saisi: { montant: number | null; ref: string },
  maintenant = new Date(),
): Promise<
  | { ok: false; refus: string; alerte: boolean }
  | { ok: true; montant: number | null; ref: string | null; problemes: string[]; iaPaiement: any }
> {
  const l = await avecDelai(lireRecuMedia(prisma, mediaId));
  if (l === TROP_LENT || !l) {
    const raison = l === TROP_LENT ? "reçu non vérifié par l'IA (lecture trop lente)" : "reçu non vérifié par l'IA (service indisponible)";
    return { ok: true, montant: saisi.montant, ref: saisi.ref || null, problemes: [raison], iaPaiement: { verifie: false, problemes: [raison] } };
  }
  const dec = l.decision;
  if (!dec.valide) return { ok: false, refus: dec.message, alerte: false };

  const problemes: string[] = [];
  if (saisi.montant != null && saisi.montant !== dec.montant) problemes.push(`montant saisi ${saisi.montant} F, reçu ${dec.montant} F`);
  if (saisi.ref && saisi.ref !== dec.ref) problemes.push(`n° saisi ${saisi.ref}, reçu ${dec.ref}`);
  const date = dec.date ? new Date(dec.date) : null;
  if (!date) problemes.push("date du reçu non lue");
  else {
    if (date.getTime() < demande.createdAt.getTime() - MARGE_HORLOGE_MS) {
      if (jourUtc(date) < jourUtc(demande.createdAt)) {
        return { ok: false, refus: `Anomalie détectée : ce reçu date du ${dateFr(date)}, avant la demande de recharge. Joignez le reçu du paiement de cette recharge.`, alerte: true };
      }
      problemes.push(`reçu daté de ${dateFr(date)}, avant la demande (${dateFr(demande.createdAt)})`);
    }
    if (date.getTime() > maintenant.getTime() + MARGE_HORLOGE_MS) problemes.push(`reçu daté dans le futur (${dateFr(date)})`);
  }
  if (l.lecture.retouche_suspectee) problemes.push("l'IA soupçonne une retouche de la capture");
  return {
    ok: true, montant: dec.montant, ref: dec.ref, problemes,
    iaPaiement: { verifie: true, montant: dec.montant, ref: dec.ref, date: dec.date, marchand: dec.marchand, statut: l.lecture.statut, problemes, modele: l.modele },
  };
}

export function iaRechargeRouter(prisma: PrismaClient): express.Router {
  if (!iaConfiguree()) console.warn("[IA] GEMINI_API_KEY absente du .env : photos du tableau de bord et reçus Wave NON vérifiés (saisie manuelle, paiements envoyés au contrôle Finance).");
  else console.log(`[IA] Gemini actif (modèle ${process.env.GEMINI_MODEL || "par défaut"}).`);
  const r = express.Router();
  r.use("/api/fleet/ia", authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // --- Lire le % de batterie sur une photo que l'on vient de prendre ---
  r.post("/api/fleet/ia/batterie", authorize("recharge.enregistrer", "recharge.superviser"), wrap(async (req, res) => {
    const ctx = actor(req);
    const media = await prisma.mediaAsset.findUnique({ where: { id: String(req.body?.mediaId || "") } });
    if (!media || media.uploadedById !== ctx.userId) return res.status(404).json({ error: { fr: "Photo introuvable", en: "Photo not found" } });
    if (!iaConfiguree()) return res.json({ disponible: false, message: "Vérification automatique non configurée : saisissez le %." });
    const l = await lireBatterieMedia(prisma, media.id);
    if (!l) return res.json({ disponible: false, message: "Vérification automatique indisponible pour le moment : saisissez le %." });
    // Pas de suggestion à partir d'une jauge à barres (estimation peu fiable) : saisie manuelle.
    const d = l.decision;
    const suggestion = d.source === "pourcentage" ? d.soc : null;
    res.json({
      disponible: true,
      soc: suggestion,
      aConfirmer: d.aConfirmer,
      aReprendre: d.aReprendre,
      message: d.source === "barres" ? "Pas de % affiché sur ce tableau de bord : saisissez-le." : d.message,
    });
  }));

  // --- Lire un reçu Wave que le Superviseur vient de joindre ---
  r.post("/api/fleet/ia/recu-wave", authorize("recharge.superviser"), wrap(async (req, res) => {
    const ctx = actor(req);
    const media = await prisma.mediaAsset.findUnique({ where: { id: String(req.body?.mediaId || "") } });
    if (!media || media.uploadedById !== ctx.userId) return res.status(404).json({ error: { fr: "Capture introuvable", en: "Screenshot not found" } });
    if (!iaConfiguree()) return res.json({ disponible: false, message: "Vérification automatique non configurée : saisissez le montant et le n°. La Finance contrôlera ce paiement." });
    const l = await lireRecuMedia(prisma, media.id);
    if (!l) return res.json({ disponible: false, message: "Vérification automatique indisponible : saisissez le montant et le n°. La Finance contrôlera ce paiement." });
    res.json({ disponible: true, ...l.decision });
  }));

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[IA]", err);
    res.status(500).json({ error: serverError });
  });
  return r;
}
