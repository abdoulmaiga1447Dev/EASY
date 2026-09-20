/**
 * Routes dettes chauffeur (Flux 2) — consultation.
 * - Le chauffeur voit ses propres dettes ; Finance / Responsable terrain voient
 *   celles de leurs sites. Le détail inclut le reversement à l'origine de la dette.
 * (Le remboursement effectif se fera à la paie — Partie D.)
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, type AuthContext } from "../../lib/authz";
import { wrap, serverError, notFound } from "./helpers";

export function dettesRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // --- Mes dettes (chauffeur) ---
  r.get(
    "/api/fleet/me/dettes",
    authorize("self.reversement"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const dettes = await prisma.detteChauffeur.findMany({ where: { driverId: ctx.userId }, orderBy: { createdAt: "desc" } });
      const total = dettes.filter((d) => d.statut === "EN_COURS").reduce((s, d) => s + (d.montant - d.montantRembourse), 0);
      res.json({ dettes, resteTotal: total });
    })
  );

  // --- Supervision (Finance / Responsable terrain) ---
  r.get(
    "/api/fleet/dettes",
    authorize("reversement.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (req.query.statut) where.statut = String(req.query.statut);
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const dettes = await prisma.detteChauffeur.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
      const driverIds = [...new Set(dettes.map((d) => d.driverId))];
      const drivers = await prisma.user.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } });
      const nameById = new Map(drivers.map((d) => [d.id, d.name]));
      res.json({ dettes: dettes.map((d) => ({ ...d, driverNom: nameById.get(d.driverId) ?? null })) });
    })
  );

  // --- Détail d'une dette (+ reversement source) ---
  r.get(
    "/api/fleet/dettes/:id",
    wrap(async (req, res) => {
      const ctx = actor(req);
      const dette = await prisma.detteChauffeur.findUnique({ where: { id: req.params.id } });
      if (!dette) return res.status(404).json({ error: notFound });
      const estConcerne = dette.driverId === ctx.userId;
      const estSuperviseur = ctx.permissions.has("reversement.voir") && canAccessSite(ctx, dette.siteId);
      if (!estConcerne && !estSuperviseur) return res.status(403).json({ error: { fr: "Accès refusé", en: "Access denied" } });

      let source: any = null;
      if (dette.sourceType === "reversement" && dette.sourceId) {
        const rev = await prisma.reversement.findUnique({
          where: { id: dette.sourceId },
          include: { shiftRecord: { include: { assignment: { include: { vehicle: { select: { immatriculation: true } } } } } } },
        });
        if (rev) source = { type: "reversement", id: rev.id, date: rev.date, shift: rev.shift, recetteYango: rev.recetteYango, montantReverse: rev.montantReverse, montantAttendu: rev.montantAttendu, ecart: rev.ecart, vehicule: rev.shiftRecord?.assignment?.vehicle?.immatriculation ?? null };
      }
      const driver = await prisma.user.findUnique({ where: { id: dette.driverId }, select: { name: true } });
      res.json({ ...dette, driverNom: driver?.name ?? null, source });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Dettes]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
