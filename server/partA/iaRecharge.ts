/**
 * IA dans le parcours de recharge (étape 1 : lecture du % de batterie).
 *
 * - POST /api/fleet/ia/batterie { mediaId } : le chauffeur vient de prendre la photo du tableau
 *   de bord ; le serveur la fait lire par Gemini et CONSERVE la lecture sur le média (iaLecture).
 *   L'application pré-remplit le % : le chauffeur confirme.
 * - Quand le chauffeur valide l'étape, le serveur compare le % saisi à SA propre lecture
 *   (jamais à une valeur envoyée par le téléphone) : un écart est signalé au Superviseur et à
 *   la Finance. Si la lecture n'est pas encore prête, elle est faite en arrière-plan.
 * - IA indisponible (pas de clé, quota, réseau) : tout continue en saisie manuelle.
 */
import express from "express";
import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { UPLOAD_DIR } from "../../lib/upload";
import { ia, iaConfiguree, interpreterBatterie, type LectureBatterie } from "../../lib/ia";
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

const enCours = new Map<string, Promise<LectureStockee | null>>();

/** Lit (une seule fois) le % de batterie sur une photo et conserve le résultat sur le média. */
export function lireBatterieMedia(prisma: PrismaClient, mediaId: string): Promise<LectureStockee | null> {
  const deja = enCours.get(mediaId);
  if (deja) return deja;
  const p = (async () => {
    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media || media.kind !== "image") return null;
    if (media.iaLecture) return media.iaLecture as unknown as LectureStockee;
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
    : `IA : ${socIa} % lu sur la photo ${quand} (concorde).`;
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

export function iaRechargeRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use("/api/fleet/ia", authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // --- Lire le % de batterie sur une photo que l'on vient de prendre ---
  r.post("/api/fleet/ia/batterie", authorize("recharge.enregistrer", "recharge.superviser"), wrap(async (req, res) => {
    const ctx = actor(req);
    const media = await prisma.mediaAsset.findUnique({ where: { id: String(req.body?.mediaId || "") } });
    if (!media || media.uploadedById !== ctx.userId) return res.status(404).json({ error: { fr: "Photo introuvable", en: "Photo not found" } });
    if (!iaConfiguree()) return res.json({ disponible: false });
    const l = await lireBatterieMedia(prisma, media.id);
    if (!l) return res.json({ disponible: false });
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

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[IA]", err);
    res.status(500).json({ error: serverError });
  });
  return r;
}
