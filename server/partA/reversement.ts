/**
 * Routes reversement (Flux 2, Bloc B2) — recettes Yango.
 * Le chauffeur déclare sa recette Yango + preuve, son montant reversé + preuve, et ses
 * dépenses. Le système calcule l'écart : dans la tolérance → accepté ; au-delà → alerte
 * Finance + Responsable terrain, double validation, puis création d'une dette chauffeur.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { computeReversement, retardReversement } from "../../lib/reversement";
import { normalizeDay } from "../../lib/assignment";
import { wrap, serverError, notFound } from "./helpers";

/** Utilisateurs actifs ayant une permission donnée sur un site (destinataires d'alerte). */
async function recipients(prisma: PrismaClient, siteId: string, code: string) {
  const users = await prisma.user.findMany({
    where: { active: true },
    include: {
      sites: true,
      rolePrincipal: { include: { permissions: { include: { permission: true } } } },
      roleSecondaire: { include: { permissions: { include: { permission: true } } } },
    },
  });
  return users.filter((u) => {
    const codes = new Set<string>();
    for (const rp of u.rolePrincipal?.permissions ?? []) codes.add(rp.permission.code);
    for (const rp of u.roleSecondaire?.permissions ?? []) codes.add(rp.permission.code);
    if (!codes.has(code)) return false;
    return codes.has("site.acces_tous") || u.sites.some((s) => s.siteId === siteId);
  });
}

export function reversementRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Mon reversement du jour (chauffeur) ------------------------------
  r.get(
    "/api/fleet/me/reversement",
    authorize("self.reversement"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const day = normalizeDay(String(req.query.date || new Date().toISOString()));
      const assignment = await prisma.assignment.findFirst({
        where: { driverId: ctx.userId, date: day },
        include: { vehicle: { select: { immatriculation: true } }, shiftRecord: { include: { reversement: { include: { depenses: true } } } } },
      });
      const settings = assignment ? await prisma.siteSettings.findFirst({ where: { siteId: assignment.siteId }, orderBy: { version: "desc" } }) : null;
      res.json({
        date: day.toISOString().slice(0, 10),
        assignment,
        checkoutFait: assignment?.shiftRecord?.statut === "TERMINE",
        reversement: assignment?.shiftRecord?.reversement ?? null,
        tolerance: settings?.toleranceEcartReversement ?? 5000,
      });
    })
  );

  // ------------------------------ Créer le reversement (chauffeur) ------------------------------
  r.post(
    "/api/fleet/shifts/:assignmentId/reversement",
    authorize("self.reversement"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const a = await prisma.assignment.findUnique({ where: { id: req.params.assignmentId }, include: { shiftRecord: { include: { reversement: true } } } });
      if (!a) return res.status(404).json({ error: notFound });
      if (a.driverId !== ctx.userId) return res.status(403).json({ error: { fr: "Ce shift n'est pas le vôtre", en: "Not your shift" } });
      if (!a.shiftRecord || a.shiftRecord.statut !== "TERMINE") return res.status(400).json({ error: { fr: "Terminez d'abord votre shift (check-out)", en: "Finish your shift first (check-out)" } });
      if (a.shiftRecord.reversement) return res.status(409).json({ error: { fr: "Reversement déjà effectué", en: "Remittance already submitted" } });
      // Exclusivité : pas de reversement si une exception cash a été déclarée pour ce shift.
      const exceptionCash = await prisma.compensationCash.findUnique({ where: { assignmentId: a.id } });
      if (exceptionCash) return res.status(409).json({ error: { fr: "Une exception cash a été déclarée pour ce shift : pas de reversement", en: "A cash exception exists for this shift" } });

      const b = req.body || {};
      const recetteYango = Number(b.recetteYango);
      const montantReverse = Number(b.montantReverse);
      if (!Number.isFinite(recetteYango) || recetteYango < 0 || !Number.isFinite(montantReverse) || montantReverse < 0) {
        return res.status(400).json({ error: { fr: "Recette et montant reversé obligatoires", en: "Revenue and remitted amount required" } });
      }
      // Preuves obligatoires : relevé Yango + preuve du virement.
      if (!b.preuveYangoMediaId) return res.status(400).json({ error: { fr: "Le relevé Yango est obligatoire", en: "Yango statement is required" } });
      if (!b.preuveReversementMediaId) return res.status(400).json({ error: { fr: "La preuve du virement est obligatoire", en: "Transfer proof is required" } });
      const depensesInput: { montant: number; motif?: string; preuveMediaId?: string }[] = Array.isArray(b.depenses) ? b.depenses : [];
      // Chaque dépense déclarée doit avoir une preuve.
      if (depensesInput.some((d) => (Number(d.montant) || 0) > 0 && !d.preuveMediaId)) {
        return res.status(400).json({ error: { fr: "Chaque dépense doit avoir une preuve de paiement", en: "Each expense requires a payment proof" } });
      }

      const settings = await prisma.siteSettings.findFirst({ where: { siteId: a.siteId }, orderBy: { version: "desc" } });
      const tolerance = settings?.toleranceEcartReversement ?? 5000;
      const calc = computeReversement(recetteYango, depensesInput.map((d) => Number(d.montant) || 0), montantReverse, tolerance);
      const retard = retardReversement(a.shiftRecord.checkoutAt, new Date());

      const rev = await prisma.reversement.create({
        data: {
          shiftRecordId: a.shiftRecord.id, driverId: a.driverId, vehicleId: a.vehicleId, siteId: a.siteId, date: a.date, shift: a.shift,
          recetteYango, preuveYangoMediaId: b.preuveYangoMediaId || null, montantReverse, preuveReversementMediaId: b.preuveReversementMediaId || null,
          totalDepenses: calc.totalDepenses, frais: calc.frais, montantAttendu: calc.montantAttendu, ecart: calc.ecart,
          statut: calc.statut as any, retardMinutes: retard,
          depenses: { create: depensesInput.map((d) => ({ montant: Number(d.montant) || 0, motif: d.motif || null, preuveMediaId: d.preuveMediaId || null })) },
        },
        include: { depenses: true },
      });

      // Rattache les médias (preuves) pour le contrôle d'accès en lecture.
      const mediaIds = [b.preuveYangoMediaId, b.preuveReversementMediaId, ...depensesInput.map((d) => d.preuveMediaId)].filter(Boolean);
      if (mediaIds.length) await prisma.mediaAsset.updateMany({ where: { id: { in: mediaIds } }, data: { resourceType: "Reversement", resourceId: rev.id } });

      await writeAudit(prisma, ctx, { action: "reversement.create", resourceType: "Reversement", resourceId: rev.id, siteId: a.siteId, after: { recetteYango, montantReverse, ecart: calc.ecart, statut: calc.statut } });

      // Écart au-delà de la tolérance → alerte Finance + Responsable terrain.
      if (calc.statut === "ECART_A_VALIDER") {
        const dest = new Set<string>();
        for (const u of await recipients(prisma, a.siteId, "reversement.rapprocher")) dest.add(u.id);
        const msg = `Écart de ${Math.abs(calc.ecart)} FCFA détecté sur le reversement de ${ctx.name}.`;
        for (const uid of dest) await notify(prisma, { userId: uid, canal: "IN_APP", type: "reversement.ecart", titre: "Écart de reversement", message: msg });
      }

      res.status(201).json(rev);
    })
  );

  // ------------------------------ Supervision (Finance / Responsable terrain) ------------------------------
  r.get(
    "/api/fleet/reversements",
    authorize("reversement.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (req.query.statut) where.statut = String(req.query.statut);
      if (req.query.date) where.date = normalizeDay(String(req.query.date));
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      else if (req.query.siteId) where.siteId = String(req.query.siteId);
      const reversements = await prisma.reversement.findMany({
        where, orderBy: { createdAt: "desc" }, take: 200,
        include: { shiftRecord: { include: { assignment: { include: { driver: { select: { name: true } }, vehicle: { select: { immatriculation: true } } } } } } },
      });
      res.json({ reversements });
    })
  );

  r.get(
    "/api/fleet/reversements/:id",
    authorize("reversement.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const rev = await prisma.reversement.findUnique({ where: { id: req.params.id }, include: { depenses: true, shiftRecord: { include: { assignment: { include: { driver: { select: { name: true } }, vehicle: { select: { immatriculation: true } } } } } } } });
      if (!rev) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, rev.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      res.json(rev);
    })
  );

  // ------------------------------ Double validation du rapprochement ------------------------------
  r.post(
    "/api/fleet/reversements/:id/valider",
    authorize("reversement.rapprocher"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const rev = await prisma.reversement.findUnique({ where: { id: req.params.id } });
      if (!rev) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, rev.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      if (rev.statut !== "ECART_A_VALIDER") return res.status(400).json({ error: { fr: "Ce reversement n'attend pas de validation", en: "No validation pending" } });

      // Détermine le côté : par le rôle, ou par le côté encore manquant (admin).
      let cote: "finance" | "terrain" = req.body?.cote === "terrain" ? "terrain" : req.body?.cote === "finance" ? "finance" : (ctx.roleCode === "responsable_terrain" ? "terrain" : ctx.roleCode === "finance" ? "finance" : (rev.valideFinanceById ? "terrain" : "finance"));

      // Un même utilisateur ne peut pas valider les deux côtés (double validation = 2 personnes).
      const dejaAutreCote = cote === "finance" ? rev.valideTerrainById : rev.valideFinanceById;
      if (dejaAutreCote === ctx.userId) return res.status(400).json({ error: { fr: "La double validation doit être faite par deux personnes différentes", en: "Two different validators required" } });
      if ((cote === "finance" && rev.valideFinanceById) || (cote === "terrain" && rev.valideTerrainById)) {
        return res.status(409).json({ error: { fr: "Ce côté est déjà validé", en: "This side is already validated" } });
      }

      const data: any = cote === "finance"
        ? { valideFinanceById: ctx.userId, valideFinanceAt: new Date() }
        : { valideTerrainById: ctx.userId, valideTerrainAt: new Date() };

      let updated = await prisma.reversement.update({ where: { id: rev.id }, data });

      // Les deux côtés validés → rapproché ; création de la dette si manquant.
      if (updated.valideFinanceById && updated.valideTerrainById) {
        let detteId: string | null = null;
        if (updated.ecart > 0) {
          const dette = await prisma.detteChauffeur.create({
            data: { driverId: updated.driverId, siteId: updated.siteId, montant: updated.ecart, motif: `Écart de reversement du ${updated.date.toISOString().slice(0, 10)}`, sourceType: "reversement", sourceId: updated.id },
          });
          detteId = dette.id;
          await notify(prisma, { userId: updated.driverId, canal: "IN_APP", type: "dette.creee", titre: "Dette enregistrée", message: `Une dette de ${updated.ecart} FCFA a été enregistrée suite à un écart de reversement.` });
        }
        updated = await prisma.reversement.update({ where: { id: rev.id }, data: { statut: "RAPPROCHE", detteId } });
      }

      await writeAudit(prisma, ctx, { action: "reversement.valider", resourceType: "Reversement", resourceId: rev.id, siteId: rev.siteId, after: { cote, statut: updated.statut } });
      res.json(updated);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Reversement]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire les preuves d'un reversement (chauffeur concerné ou superviseur du site). */
export async function canReadReversementMedia(prisma: PrismaClient, ctx: AuthContext, reversementId: string): Promise<boolean> {
  const rev = await prisma.reversement.findUnique({ where: { id: reversementId }, select: { driverId: true, siteId: true } });
  if (!rev) return false;
  if (rev.driverId === ctx.userId) return true;
  return ctx.permissions.has("reversement.voir") && canAccessSite(ctx, rev.siteId);
}
