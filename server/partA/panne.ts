/**
 * Routes panne (Flux 4, Bloc C2a).
 * - Le chauffeur déclare une panne (description + photos) pour son véhicule du jour.
 * - Le Responsable terrain qualifie (Critique / Non critique). Si critique, le véhicule
 *   est immobilisé automatiquement (check-in désactivé) et Dispatcher + Maintenance notifiés.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { panneMissing, immobilisePourGravite } from "../../lib/panne";
import { normalizeDay } from "../../lib/assignment";
import { wrap, serverError, notFound } from "./helpers";

/** Destinataires d'alerte : utilisateurs actifs ayant une permission sur un site. */
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

async function notifier(prisma: PrismaClient, siteId: string, code: string, type: string, titre: string, message: string) {
  for (const u of await recipients(prisma, siteId, code)) {
    await notify(prisma, { userId: u.id, canal: "IN_APP", type, titre, message });
  }
}

export function panneRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Déclarer une panne (chauffeur) ------------------------------
  r.post(
    "/api/fleet/pannes",
    authorize("self.panne"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const b = req.body || {};
      // Le chauffeur déclare pour son véhicule attribué aujourd'hui.
      const day = normalizeDay(new Date().toISOString());
      const assignment = await prisma.assignment.findFirst({ where: { driverId: ctx.userId, date: day } });
      if (!assignment) return res.status(400).json({ error: { fr: "Aucun véhicule attribué aujourd'hui", en: "No vehicle assigned today" } });

      const miss = panneMissing(b);
      if (miss.length) return res.status(400).json({ error: { fr: "Déclaration incomplète : description et photo(s) obligatoires", en: "Incomplete report" }, manquants: miss });

      const photos: string[] = (Array.isArray(b.photos) ? b.photos : []).filter(Boolean).map(String);
      const panne = await prisma.panne.create({
        data: {
          vehicleId: assignment.vehicleId, driverId: ctx.userId, siteId: assignment.siteId,
          description: String(b.description).trim(), photos, statut: "DECLAREE",
        },
      });
      if (photos.length) await prisma.mediaAsset.updateMany({ where: { id: { in: photos } }, data: { resourceType: "Panne", resourceId: panne.id } });

      await writeAudit(prisma, ctx, { action: "panne.declare", resourceType: "Panne", resourceId: panne.id, siteId: assignment.siteId, after: { vehicleId: assignment.vehicleId } });

      const veh = await prisma.fleetVehicle.findUnique({ where: { id: assignment.vehicleId }, select: { immatriculation: true } });
      await notifier(prisma, assignment.siteId, "panne.qualifier", "panne.declaree", "Panne déclarée", `Panne déclarée par ${ctx.name} sur ${veh?.immatriculation ?? "un véhicule"} — à qualifier.`);

      res.status(201).json(panne);
    })
  );

  // ------------------------------ Mes pannes (chauffeur) ------------------------------
  r.get(
    "/api/fleet/me/pannes",
    authorize("self.panne"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const pannes = await prisma.panne.findMany({ where: { driverId: ctx.userId }, orderBy: { declareeAt: "desc" }, take: 50 });
      res.json({ pannes });
    })
  );

  // ------------------------------ Supervision (Responsable terrain / Maintenance) ------------------------------
  r.get(
    "/api/fleet/pannes",
    authorize("panne.qualifier", "maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      else if (req.query.siteId) where.siteId = String(req.query.siteId);
      if (req.query.statut) where.statut = String(req.query.statut);

      const pannes = await prisma.panne.findMany({ where, orderBy: { declareeAt: "desc" }, take: 200 });
      const vehIds = [...new Set(pannes.map((p) => p.vehicleId))];
      const drvIds = [...new Set(pannes.map((p) => p.driverId))];
      const [vehs, drvs] = await Promise.all([
        prisma.fleetVehicle.findMany({ where: { id: { in: vehIds } }, select: { id: true, immatriculation: true } }),
        prisma.user.findMany({ where: { id: { in: drvIds } }, select: { id: true, name: true } }),
      ]);
      const immat = new Map(vehs.map((v) => [v.id, v.immatriculation]));
      const nom = new Map(drvs.map((u) => [u.id, u.name]));
      res.json({ pannes: pannes.map((p) => ({ ...p, vehicule: immat.get(p.vehicleId) ?? null, chauffeurNom: nom.get(p.driverId) ?? null })) });
    })
  );

  r.get(
    "/api/fleet/pannes/:id",
    authorize("panne.qualifier", "maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const p = await prisma.panne.findUnique({ where: { id: req.params.id } });
      if (!p) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, p.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const veh = await prisma.fleetVehicle.findUnique({ where: { id: p.vehicleId }, select: { immatriculation: true } });
      const drv = await prisma.user.findUnique({ where: { id: p.driverId }, select: { name: true } });
      res.json({ ...p, vehicule: veh?.immatriculation ?? null, chauffeurNom: drv?.name ?? null });
    })
  );

  // ------------------------------ Qualifier une panne (Responsable terrain) ------------------------------
  r.post(
    "/api/fleet/pannes/:id/qualifier",
    authorize("panne.qualifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const p = await prisma.panne.findUnique({ where: { id: req.params.id } });
      if (!p) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, p.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      if (p.statut !== "DECLAREE") return res.status(409).json({ error: { fr: "Cette panne est déjà qualifiée", en: "Already qualified" } });

      const gravite = String(req.body?.gravite || "");
      if (!["CRITIQUE", "NON_CRITIQUE"].includes(gravite)) return res.status(400).json({ error: { fr: "Gravité invalide (Critique / Non critique)", en: "Invalid severity" } });

      const immobilise = immobilisePourGravite(gravite);
      const panne = await prisma.panne.update({
        where: { id: p.id },
        data: { statut: "QUALIFIEE", gravite: gravite as any, immobilise, qualifieeById: ctx.userId, qualifieeAt: new Date() },
      });

      if (immobilise) {
        // Immobilisation automatique du véhicule : le check-in sera refusé tant qu'il n'est pas réactivé.
        await prisma.fleetVehicle.update({ where: { id: p.vehicleId }, data: { statut: "Immobilise" } });
        const veh = await prisma.fleetVehicle.findUnique({ where: { id: p.vehicleId }, select: { immatriculation: true } });
        const msg = `Véhicule ${veh?.immatriculation ?? ""} immobilisé suite à une panne critique.`;
        await notifier(prisma, p.siteId, "vehicule.reactiver", "panne.immobilisation", "Véhicule immobilisé", msg);
        await notifier(prisma, p.siteId, "maintenance.gerer", "panne.immobilisation", "Véhicule immobilisé", msg);
      }

      await writeAudit(prisma, ctx, { action: "panne.qualifier", resourceType: "Panne", resourceId: panne.id, siteId: p.siteId, after: { gravite, immobilise } });
      res.json(panne);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Panne]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire les photos d'une panne (chauffeur déclarant, terrain ou maintenance du site). */
export async function canReadPanneMedia(prisma: PrismaClient, ctx: AuthContext, panneId: string): Promise<boolean> {
  const p = await prisma.panne.findUnique({ where: { id: panneId }, select: { driverId: true, siteId: true } });
  if (!p) return false;
  if (p.driverId === ctx.userId) return true;
  return (hasPermission(ctx, "panne.qualifier") || hasPermission(ctx, "maintenance.gerer")) && canAccessSite(ctx, p.siteId);
}
