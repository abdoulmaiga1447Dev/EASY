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
  r.post(
    "/api/fleet/exceptions-cash",
    authorize("incident.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { driverId, montant, motif } = req.body || {};
      if (!driverId || !montant || Number(montant) <= 0) return res.status(400).json({ error: { fr: "Chauffeur et montant obligatoires", en: "Driver and amount required" } });
      if (!motif || !String(motif).trim()) return res.status(400).json({ error: { fr: "Le motif est obligatoire", en: "Reason is required" } });

      const driver = await prisma.user.findUnique({ where: { id: driverId }, include: { driverProfile: true } });
      if (!driver || driver.role !== "chauffeur") return res.status(400).json({ error: { fr: "Chauffeur invalide", en: "Invalid driver" } });
      const siteId = driver.driverProfile?.siteId || ctx.siteIds[0];
      if (!siteId || !canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Chauffeur hors de votre périmètre", en: "Driver outside your scope" } });

      const comp = await prisma.compensationCash.create({
        data: { siteId, driverId, montant: Number(montant), motif: String(motif).trim(), declareParId: ctx.userId, declareParNom: ctx.name },
      });
      await writeAudit(prisma, ctx, { action: "cash.exception.create", resourceType: "CompensationCash", resourceId: comp.id, siteId, after: { driverId, montant: Number(montant) } });
      // Notifie le chauffeur (la compensation Wave est ici une écriture tracée).
      await notify(prisma, { userId: driverId, canal: "IN_APP", type: "cash.compensation", titre: "Compensation cash", message: `Une compensation de ${Number(montant)} FCFA a été enregistrée (à régulariser).` });
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
