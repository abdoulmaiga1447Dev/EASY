/**
 * Rapprochement GUIDÉ des paiements de recharge (Finance).
 * Pas d'export Wave disponible : la Finance compare chaque paiement déclaré par le Superviseur
 * avec l'historique de l'application Wave de l'entreprise, puis saisit les paiements Wave sans
 * demande. À la clôture, les écarts sont remontés à la Direction.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { resumer, peutCloturer, periode } from "../../lib/rapprochement";
import { normaliserRef } from "../../lib/demandeRecharge";
import { wrap, serverError, notFound } from "./helpers";

const ERR = (fr: string, en: string) => ({ error: { fr, en } });
const VERDICTS_DECLARES = ["CONFORME", "MONTANT_DIFFERENT", "ABSENT"];

export function rapprochementRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use("/api/fleet/rapprochements", authenticate(prisma), authorize("recharge.controler"));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;
  const sitesWhere = (ctx: AuthContext) => (ctx.allSites ? {} : { siteId: { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] } });

  /** Détail enrichi d'un rapprochement (lignes + infos des paiements déclarés). */
  async function detail(id: string) {
    const rap = await prisma.rapprochementWave.findUnique({ where: { id }, include: { lignes: { orderBy: { createdAt: "asc" } } } });
    if (!rap) return null;
    const demandeIds = rap.lignes.map((l) => l.demandeId).filter(Boolean) as string[];
    const demandes = await prisma.demandeRecharge.findMany({ where: { id: { in: demandeIds } } });
    const dById = new Map(demandes.map((d) => [d.id, d]));
    const userIds = [...new Set([rap.creeParId, rap.clotureParId, ...demandes.flatMap((d) => [d.driverId, d.payeParId]), ...rap.lignes.map((l) => l.verifieParId)].filter(Boolean) as string[])];
    const [users, vehs, bornes] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
      prisma.fleetVehicle.findMany({ where: { id: { in: [...new Set(demandes.map((d) => d.vehicleId))] } }, select: { id: true, immatriculation: true } }),
      prisma.borneRecharge.findMany({ where: { id: { in: [...new Set(demandes.map((d) => d.borneId).filter(Boolean) as string[])] } }, select: { id: true, nom: true, operateur: true } }),
    ]);
    const nom = new Map(users.map((u) => [u.id, u.name]));
    const immat = new Map(vehs.map((v) => [v.id, v.immatriculation]));
    const borne = new Map(bornes.map((b) => [b.id, b]));
    return {
      ...rap,
      creeParNom: nom.get(rap.creeParId) ?? null,
      clotureParNom: rap.clotureParId ? nom.get(rap.clotureParId) ?? null : null,
      resumeCourant: resumer(rap.lignes),
      lignes: rap.lignes.map((l) => {
        const d = l.demandeId ? dById.get(l.demandeId) : null;
        const b = d?.borneId ? borne.get(d.borneId) : null;
        return {
          ...l,
          verifieParNom: l.verifieParId ? nom.get(l.verifieParId) ?? null : null,
          paiement: d ? {
            payeLe: d.payeLe, refTransaction: d.refTransaction, preuvePaiementMediaId: d.preuvePaiementMediaId,
            vehicule: immat.get(d.vehicleId) ?? null, chauffeurNom: nom.get(d.driverId) ?? null,
            payeParNom: d.payeParId ? nom.get(d.payeParId) ?? null : null,
            borne: b ? `${b.nom}${b.operateur ? ` (${b.operateur})` : ""}` : null,
          } : null,
        };
      }),
    };
  }

  async function chargerEnCours(id: string) {
    const rap = await prisma.rapprochementWave.findUnique({ where: { id } });
    if (!rap) return { status: 404 as const, body: { error: notFound } };
    if (rap.statut !== "EN_COURS") return { status: 409 as const, body: ERR("Ce rapprochement est clôturé", "Reconciliation closed") };
    return { rap };
  }

  // --- Liste des rapprochements ---
  r.get("/api/fleet/rapprochements", wrap(async (_req, res) => {
    const list = await prisma.rapprochementWave.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { lignes: true } });
    const users = await prisma.user.findMany({ where: { id: { in: [...new Set(list.map((x) => x.creeParId))] } }, select: { id: true, name: true } });
    const nom = new Map(users.map((u) => [u.id, u.name]));
    res.json({
      rapprochements: list.map(({ lignes, ...x }) => ({ ...x, creeParNom: nom.get(x.creeParId) ?? null, resumeCourant: x.resume ?? resumer(lignes) })),
    });
  }));

  // --- Ouvrir un rapprochement sur une période : une ligne par paiement déclaré non encore rapproché ---
  r.post("/api/fleet/rapprochements", wrap(async (req, res) => {
    const ctx = actor(req);
    const p = periode(String(req.body?.debut || ""), String(req.body?.fin || ""));
    if (!p) return res.status(400).json(ERR("Période invalide (dates de début et de fin)", "Invalid period"));
    const ouvert = await prisma.rapprochementWave.findFirst({ where: { statut: "EN_COURS" } });
    if (ouvert) return res.status(409).json({ ...ERR("Un rapprochement est déjà en cours : terminez-le d'abord", "A reconciliation is already open"), rapprochementId: ouvert.id });

    const dejaRapprochees = new Set((await prisma.rapprochementLigne.findMany({ where: { demandeId: { not: null } }, select: { demandeId: true } })).map((l) => l.demandeId));
    const payees = await prisma.demandeRecharge.findMany({
      where: { ...sitesWhere(ctx), payeLe: { gte: p.debut, lt: p.fin }, montantPaye: { not: null } },
      orderBy: { payeLe: "asc" },
    });
    const aRapprocher = payees.filter((d) => !dejaRapprochees.has(d.id));

    const rap = await prisma.rapprochementWave.create({
      data: {
        debut: p.debut, fin: p.fin, creeParId: ctx.userId,
        lignes: { create: aRapprocher.map((d) => ({ demandeId: d.id, montantDeclare: d.montantPaye })) },
      },
    });
    await writeAudit(prisma, ctx, { action: "rapprochement.ouvrir", resourceType: "RapprochementWave", resourceId: rap.id, after: { debut: p.debut, fin: p.fin, paiements: aRapprocher.length } });
    res.status(201).json(await detail(rap.id));
  }));

  // --- Détail ---
  r.get("/api/fleet/rapprochements/:id", wrap(async (req, res) => {
    const d = await detail(req.params.id);
    if (!d) return res.status(404).json({ error: notFound });
    res.json(d);
  }));

  // --- Vérifier un paiement déclaré : conforme / montant différent / absent de Wave ---
  r.patch("/api/fleet/rapprochements/:id/lignes/:ligneId", wrap(async (req, res) => {
    const ctx = actor(req);
    const got = await chargerEnCours(req.params.id);
    if (!got.rap) return res.status(got.status).json(got.body);
    const ligne = await prisma.rapprochementLigne.findFirst({ where: { id: req.params.ligneId, rapprochementId: got.rap.id } });
    if (!ligne) return res.status(404).json({ error: notFound });

    const b = req.body || {};
    const data: any = { note: b.note ? String(b.note).trim().slice(0, 300) : null, verifieParId: ctx.userId, verifieLe: new Date() };
    if (ligne.demandeId) {
      if (b.verdict === null) { // annuler la vérification
        Object.assign(data, { verdict: null, montantReel: null, verifieParId: null, verifieLe: null });
      } else {
        if (!VERDICTS_DECLARES.includes(String(b.verdict))) return res.status(400).json(ERR("Choix invalide : conforme, montant différent ou absent de Wave", "Invalid verdict"));
        data.verdict = b.verdict;
        data.montantReel = null;
        if (b.verdict === "MONTANT_DIFFERENT") {
          const m = Math.round(Number(b.montantReel));
          if (!Number.isFinite(m) || m <= 0) return res.status(400).json(ERR("Indiquez le montant lu dans Wave", "Real amount required"));
          if (m === ligne.montantDeclare) return res.status(400).json(ERR("Le montant lu est identique au montant déclaré : choisissez « Conforme »", "Same amount"));
          data.montantReel = m;
        }
        if (b.verdict === "ABSENT" && !data.note) return res.status(400).json(ERR("Précisez ce que vous avez constaté (paiement introuvable dans Wave)", "Note required"));
      }
    } else {
      return res.status(400).json(ERR("Pour un paiement Wave sans demande, supprimez la ligne et ressaisissez-la", "Use delete + add"));
    }
    await prisma.rapprochementLigne.update({ where: { id: ligne.id }, data });
    res.json(await detail(got.rap.id));
  }));

  // --- Ajouter un paiement vu dans Wave sans demande dans EASY ---
  r.post("/api/fleet/rapprochements/:id/lignes", wrap(async (req, res) => {
    const ctx = actor(req);
    const got = await chargerEnCours(req.params.id);
    if (!got.rap) return res.status(got.status).json(got.body);
    const b = req.body || {};
    const montant = Math.round(Number(b.montant));
    if (!Number.isFinite(montant) || montant <= 0) return res.status(400).json(ERR("Montant invalide", "Invalid amount"));
    const date = b.date ? new Date(String(b.date)) : null;
    if (!date || Number.isNaN(date.getTime())) return res.status(400).json(ERR("Indiquez la date du paiement", "Date required"));
    const ref = b.refTransaction ? normaliserRef(b.refTransaction) : null;
    if (ref) {
      const declaree = await prisma.demandeRecharge.findFirst({ where: { refTransaction: ref }, select: { id: true } });
      if (declaree) return res.status(409).json(ERR("Ce n° de transaction correspond à un paiement déclaré : vérifiez-le dans la liste", "Transaction already declared"));
    }
    await prisma.rapprochementLigne.create({
      data: {
        rapprochementId: got.rap.id, verdict: "NON_DECLARE", montantReel: montant, dateTransaction: date, refTransaction: ref,
        marchand: b.marchand ? String(b.marchand).trim().slice(0, 120) : null, note: b.note ? String(b.note).trim().slice(0, 300) : null,
        verifieParId: ctx.userId, verifieLe: new Date(),
      },
    });
    res.status(201).json(await detail(got.rap.id));
  }));

  // --- Retirer un paiement non déclaré saisi par erreur ---
  r.delete("/api/fleet/rapprochements/:id/lignes/:ligneId", wrap(async (req, res) => {
    const got = await chargerEnCours(req.params.id);
    if (!got.rap) return res.status(got.status).json(got.body);
    const ligne = await prisma.rapprochementLigne.findFirst({ where: { id: req.params.ligneId, rapprochementId: got.rap.id } });
    if (!ligne) return res.status(404).json({ error: notFound });
    if (ligne.demandeId) return res.status(400).json(ERR("Un paiement déclaré ne peut pas être retiré", "Cannot remove a declared payment"));
    await prisma.rapprochementLigne.delete({ where: { id: ligne.id } });
    res.json(await detail(got.rap.id));
  }));

  // --- Clôturer : tous les paiements déclarés doivent être vérifiés ; écarts → Direction ---
  r.post("/api/fleet/rapprochements/:id/cloturer", wrap(async (req, res) => {
    const ctx = actor(req);
    const got = await chargerEnCours(req.params.id);
    if (!got.rap) return res.status(got.status).json(got.body);
    const lignes = await prisma.rapprochementLigne.findMany({ where: { rapprochementId: got.rap.id } });
    if (!peutCloturer(lignes)) return res.status(409).json(ERR("Vérifiez tous les paiements déclarés avant de clôturer", "Check every declared payment first"));
    const resume = resumer(lignes);
    await prisma.rapprochementWave.update({ where: { id: got.rap.id }, data: { statut: "CLOTURE", clotureParId: ctx.userId, clotureLe: new Date(), resume: resume as any } });
    await writeAudit(prisma, ctx, { action: "rapprochement.cloturer", resourceType: "RapprochementWave", resourceId: got.rap.id, after: resume });

    if (resume.ecarts > 0) {
      const direction = await prisma.user.findMany({ where: { active: true, rolePrincipal: { code: "admin_direction" } }, select: { id: true } });
      const periodeTxt = `${got.rap.debut.toLocaleDateString("fr-FR")} → ${new Date(got.rap.fin.getTime() - 86400000).toLocaleDateString("fr-FR")}`;
      const msg = `Rapprochement Wave (${periodeTxt}) : ${resume.ecarts} écart(s) — ${resume.montantsDifferents} montant(s) différent(s), ${resume.absents} paiement(s) absent(s) de Wave, ${resume.nonDeclares} paiement(s) Wave sans demande. Écart total : ${resume.ecart.toLocaleString("fr-FR")} F.`;
      for (const u of direction) await notify(prisma, { userId: u.id, canal: "IN_APP", type: "rapprochement.ecarts", titre: "Écarts au rapprochement Wave", message: msg });
    }
    res.json(await detail(got.rap.id));
  }));

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Rapprochement]", err);
    res.status(500).json({ error: serverError });
  });
  return r;
}
