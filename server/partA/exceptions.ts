/**
 * Routes exception cash (Flux 2, Bloc B3).
 * Le Responsable terrain déclare un paiement en espèces exceptionnel (motif obligatoire) ;
 * le système enregistre une compensation (écriture — pas d'API Wave) à régulariser.
 * Régularisation à J+1, sinon alerte Finance (job quotidien).
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { wrap, serverError, notFound } from "./helpers";

export function exceptionsRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Liste ------------------------------
  r.get(
    "/api/fleet/exceptions-cash",
    authorize("incident.gerer", "reversement.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (req.query.statut) where.statut = String(req.query.statut);
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const items = await prisma.compensationCash.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
      // Nom du chauffeur (dénormalisé pour l'affichage).
      const driverIds = [...new Set(items.map((i) => i.driverId))];
      const drivers = await prisma.user.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } });
      const nameById = new Map(drivers.map((d) => [d.id, d.name]));
      res.json({ items: items.map((i) => ({ ...i, driverNom: nameById.get(i.driverId) ?? null })) });
    })
  );

  // ------------------------------ Déclarer (Responsable terrain) ------------------------------
  // Rattachée à un shift (attribution) : le chauffeur doit avoir été programmé, et pour ce
  // shift on a SOIT un reversement SOIT une exception cash, jamais les deux.
  r.post(
    "/api/fleet/exceptions-cash",
    authorize("incident.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { assignmentId, montant, motif } = req.body || {};
      if (!assignmentId) return res.status(400).json({ error: { fr: "Le shift (attribution) est obligatoire", en: "Assignment is required" } });
      if (!montant || Number(montant) <= 0) return res.status(400).json({ error: { fr: "Le montant est obligatoire", en: "Amount required" } });
      if (!motif || !String(motif).trim()) return res.status(400).json({ error: { fr: "Le motif est obligatoire", en: "Reason is required" } });

      // L'attribution prouve que le chauffeur a bien été programmé ce jour-là.
      const a = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { shiftRecord: { include: { reversement: true } } } });
      if (!a) return res.status(404).json({ error: { fr: "Attribution introuvable", en: "Assignment not found" } });
      if (!canAccessSite(ctx, a.siteId)) return res.status(403).json({ error: { fr: "Hors de votre périmètre", en: "Outside your scope" } });

      // Exclusivité : pas d'exception cash si un reversement existe déjà pour ce shift.
      if (a.shiftRecord?.reversement) return res.status(409).json({ error: { fr: "Un reversement a déjà été déclaré pour ce shift", en: "A remittance already exists for this shift" } });
      // Une seule exception cash par shift.
      const existe = await prisma.compensationCash.findUnique({ where: { assignmentId } });
      if (existe) return res.status(409).json({ error: { fr: "Une exception cash existe déjà pour ce shift", en: "A cash exception already exists for this shift" } });

      const comp = await prisma.compensationCash.create({
        data: { siteId: a.siteId, driverId: a.driverId, assignmentId, date: a.date, shift: a.shift, montant: Number(montant), motif: String(motif).trim(), declareParId: ctx.userId, declareParNom: ctx.name },
      });
      await writeAudit(prisma, ctx, { action: "cash.exception.create", resourceType: "CompensationCash", resourceId: comp.id, siteId: a.siteId, after: { driverId: a.driverId, assignmentId, montant: Number(montant) } });
      await notify(prisma, { userId: a.driverId, canal: "IN_APP", type: "cash.compensation", titre: "Compensation cash", message: `Une compensation de ${Number(montant)} FCFA a été enregistrée (à régulariser).` });
      res.status(201).json(comp);
    })
  );

  // ------------------------------ Régulariser ------------------------------
  r.post(
    "/api/fleet/exceptions-cash/:id/regulariser",
    authorize("incident.gerer", "reversement.rapprocher"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const comp = await prisma.compensationCash.findUnique({ where: { id: req.params.id } });
      if (!comp) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, comp.siteId)) return res.status(403).json({ error: { fr: "Hors de votre périmètre", en: "Outside your scope" } });
      if (comp.statut === "REGULARISE") return res.status(409).json({ error: { fr: "Déjà régularisé", en: "Already settled" } });
      const updated = await prisma.compensationCash.update({ where: { id: comp.id }, data: { statut: "REGULARISE", regulariseAt: new Date(), regulariseParId: ctx.userId } });
      await writeAudit(prisma, ctx, { action: "cash.exception.regulariser", resourceType: "CompensationCash", resourceId: comp.id, siteId: comp.siteId, before: { statut: comp.statut }, after: { statut: "REGULARISE" } });
      res.json(updated);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Exceptions]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
