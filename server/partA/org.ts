/**
 * Routes organisation — sites (villes), zones géographiques, paramètres globaux versionnés.
 * Cloisonnement par site appliqué côté serveur : un utilisateur ne voit/modifie que
 * ses sites (Admin/Direction voit tout via `site.acces_tous`).
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, siteScopeWhere, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { wrap, serverError, notFound } from "./helpers";

// Champs de paramétrage modifiables (garde-fou : rien d'autre n'est accepté).
const SETTINGS_FIELDS = [
  "devise",
  "salaireFixeJour", "eligibiliteCaJour", "eligibiliteCoursesJour", "eligibiliteHeures", "eligibiliteHeuresEnLigne",
  "kpiObjectifMontant", "kpiSeuilCourses", "periodePaieJours",
  "bonusPaliers", "bonusPlafond",
  "penaliteRetardHeure", "penaliteNonReversement", "penaliteAbsence",
  "toleranceEcartReversement", "avanceEligibiliteJours", "avancePlafond",
  "socHandoverSeuil", "maintenanceKm", "maintenanceJours", "alerteVisiteTechniqueJours", "alerteAssuranceJours",
  "shiftADebut", "shiftAFin", "shiftBDebut", "shiftBFin", "handoverMinutes", "handoverRechargeMinutes",
  "rythmeJoursTravailles", "rythmeReposDemiJourSemaines",
] as const;

export function orgRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Sites ------------------------------
  r.get(
    "/api/sites",
    authorize("site.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where = ctx.allSites ? {} : siteScopeWhere(ctx, "id");
      const sites = await prisma.site.findMany({ where, orderBy: { createdAt: "asc" }, include: { zones: true } });
      res.json({ sites });
    })
  );

  r.get(
    "/api/sites/:id",
    authorize("site.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.id)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const site = await prisma.site.findUnique({ where: { id: req.params.id }, include: { zones: true } });
      if (!site) return res.status(404).json({ error: notFound });
      res.json(site);
    })
  );

  r.post(
    "/api/sites",
    authorize("site.creer"),
    wrap(async (req, res) => {
      const { nom, ville, timezone, waveAccountId } = req.body || {};
      if (!nom || !ville) return res.status(400).json({ error: { fr: "Le nom et la ville sont obligatoires", en: "Name and city are required" } });
      const site = await prisma.site.create({
        data: { nom, ville, timezone: timezone || "Africa/Abidjan", waveAccountId: waveAccountId ?? null },
      });
      // Paramètres v1 automatiques pour le nouveau site.
      await prisma.siteSettings.create({ data: { siteId: site.id, version: 1, createdById: ctxId(req) } });
      await writeAudit(prisma, actor(req), { action: "site.create", resourceType: "Site", resourceId: site.id, siteId: site.id, after: site });
      res.status(201).json(site);
    })
  );

  r.put(
    "/api/sites/:id",
    authorize("site.modifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.id)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const before = await prisma.site.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: notFound });
      const { nom, ville, timezone, waveAccountId } = req.body || {};
      const site = await prisma.site.update({
        where: { id: req.params.id },
        data: {
          nom: nom ?? before.nom,
          ville: ville ?? before.ville,
          timezone: timezone ?? before.timezone,
          waveAccountId: waveAccountId === undefined ? before.waveAccountId : waveAccountId,
        },
      });
      await writeAudit(prisma, ctx, { action: "site.update", resourceType: "Site", resourceId: site.id, siteId: site.id, before, after: site });
      res.json(site);
    })
  );

  r.post(
    "/api/sites/:id/deactivate",
    authorize("site.desactiver"),
    wrap(async (req, res) => {
      const before = await prisma.site.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: notFound });
      const site = await prisma.site.update({ where: { id: req.params.id }, data: { active: false } });
      await writeAudit(prisma, actor(req), { action: "site.deactivate", resourceType: "Site", resourceId: site.id, siteId: site.id, before, after: site });
      res.json(site);
    })
  );

  // ------------------------------ Zones ------------------------------
  r.get(
    "/api/sites/:id/zones",
    authorize("site.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.id)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const zones = await prisma.zone.findMany({ where: { siteId: req.params.id }, orderBy: { nom: "asc" } });
      res.json({ zones });
    })
  );

  r.post(
    "/api/sites/:id/zones",
    authorize("zone.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.id)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const { nom } = req.body || {};
      if (!nom) return res.status(400).json({ error: { fr: "Le nom de la zone est obligatoire", en: "Zone name is required" } });
      const existing = await prisma.zone.findUnique({ where: { siteId_nom: { siteId: req.params.id, nom } } });
      if (existing) return res.status(409).json({ error: { fr: "Cette zone existe déjà pour ce site", en: "Zone already exists for this site" } });
      const zone = await prisma.zone.create({ data: { siteId: req.params.id, nom } });
      await writeAudit(prisma, ctx, { action: "zone.create", resourceType: "Zone", resourceId: zone.id, siteId: req.params.id, after: zone });
      res.status(201).json(zone);
    })
  );

  r.delete(
    "/api/zones/:id",
    authorize("zone.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const zone = await prisma.zone.findUnique({ where: { id: req.params.id } });
      if (!zone) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, zone.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      await prisma.zone.delete({ where: { id: zone.id } });
      await writeAudit(prisma, ctx, { action: "zone.delete", resourceType: "Zone", resourceId: zone.id, siteId: zone.siteId, before: zone });
      res.json({ ok: true });
    })
  );

  // --------------------- Paramètres globaux (versionnés) ---------------------
  r.get(
    "/api/settings/:siteId",
    authorize("parametre.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const settings = await prisma.siteSettings.findFirst({ where: { siteId: req.params.siteId }, orderBy: { version: "desc" } });
      if (!settings) return res.status(404).json({ error: notFound });
      res.json(settings);
    })
  );

  r.get(
    "/api/settings/:siteId/history",
    authorize("parametre.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const history = await prisma.siteSettings.findMany({ where: { siteId: req.params.siteId }, orderBy: { version: "desc" } });
      res.json({ history });
    })
  );

  r.post(
    "/api/settings/:siteId",
    authorize("parametre.modifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      if (!canAccessSite(ctx, req.params.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const site = await prisma.site.findUnique({ where: { id: req.params.siteId } });
      if (!site) return res.status(404).json({ error: notFound });

      const last = await prisma.siteSettings.findFirst({ where: { siteId: req.params.siteId }, orderBy: { version: "desc" } });
      // Repart de la dernière version (ou des valeurs par défaut du schéma).
      const base: Record<string, any> = {};
      if (last) for (const f of SETTINGS_FIELDS) base[f] = (last as any)[f];

      // Applique uniquement les champs connus fournis dans le corps.
      const overrides: Record<string, any> = {};
      for (const f of SETTINGS_FIELDS) {
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) overrides[f] = req.body[f];
      }

      const nextVersion = (last?.version ?? 0) + 1;
      const created = await prisma.siteSettings.create({
        data: {
          siteId: req.params.siteId,
          version: nextVersion,
          createdById: ctx.userId,
          ...base,
          ...overrides,
        },
      });
      await writeAudit(prisma, ctx, {
        action: "settings.update",
        resourceType: "SiteSettings",
        resourceId: created.id,
        siteId: req.params.siteId,
        before: last ?? null,
        after: created,
      });
      res.status(201).json(created);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Org]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

function ctxId(req: express.Request): string | null {
  return ((req as any).auth as AuthContext | undefined)?.userId ?? null;
}
