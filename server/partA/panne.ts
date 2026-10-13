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
      // Réparation « courante » (la plus récente non annulée).
      const rep = await prisma.reparation.findFirst({ where: { panneId: p.id, statut: { not: "ANNULE" } }, orderBy: { createdAt: "desc" } });
      const garage = rep ? await prisma.garage.findUnique({ where: { id: rep.garageId }, select: { nom: true } }) : null;
      res.json({ ...p, vehicule: veh?.immatriculation ?? null, chauffeurNom: drv?.name ?? null, reparation: rep ? { ...rep, garageNom: garage?.nom ?? null } : null });
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

  // ------------------------------ Garages partenaires (gestion par la Maintenance) ------------------------------
  r.get(
    "/api/fleet/garages",
    authorize("maintenance.gerer"),
    wrap(async (req, res) => {
      const where: any = {};
      if (req.query.all !== "1") where.active = true; // par défaut, uniquement les garages actifs (pour la sélection)
      const garages = await prisma.garage.findMany({ where, orderBy: { nom: "asc" } });
      res.json({ garages });
    })
  );

  r.post(
    "/api/fleet/garages",
    authorize("maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const b = req.body || {};
      const nom = String(b.nom || "").trim();
      if (!nom) return res.status(400).json({ error: { fr: "Le nom du garage est obligatoire", en: "Garage name required" } });
      const garage = await prisma.garage.create({ data: { nom, ville: b.ville ? String(b.ville) : null, telephone: b.telephone ? String(b.telephone) : null, active: b.active === false ? false : true } });
      await writeAudit(prisma, ctx, { action: "garage.create", resourceType: "Garage", resourceId: garage.id, siteId: null, after: { nom } });
      res.status(201).json(garage);
    })
  );

  r.patch(
    "/api/fleet/garages/:id",
    authorize("maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const existing = await prisma.garage.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: notFound });
      const b = req.body || {};
      const data: any = {};
      if (b.nom != null) { const n = String(b.nom).trim(); if (!n) return res.status(400).json({ error: { fr: "Nom invalide", en: "Invalid name" } }); data.nom = n; }
      if (b.ville !== undefined) data.ville = b.ville ? String(b.ville) : null;
      if (b.telephone !== undefined) data.telephone = b.telephone ? String(b.telephone) : null;
      if (b.active !== undefined) data.active = !!b.active;
      const garage = await prisma.garage.update({ where: { id: existing.id }, data });
      await writeAudit(prisma, ctx, { action: "garage.update", resourceType: "Garage", resourceId: garage.id, siteId: null, after: data });
      res.json(garage);
    })
  );

  // ------------------------------ Planifier une réparation (Maintenance) ------------------------------
  r.post(
    "/api/fleet/pannes/:id/reparation",
    authorize("maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const p = await prisma.panne.findUnique({ where: { id: req.params.id } });
      if (!p) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, p.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      if (!["QUALIFIEE", "EN_REPARATION"].includes(p.statut)) return res.status(409).json({ error: { fr: "La panne doit d'abord être qualifiée", en: "Panne must be qualified first" } });

      const active = await prisma.reparation.findFirst({ where: { panneId: p.id, statut: { in: ["PLANIFIE", "EN_COURS"] } } });
      if (active) return res.status(409).json({ error: { fr: "Une réparation est déjà en cours pour cette panne", en: "A repair is already ongoing" } });

      const b = req.body || {};
      const garage = b.garageId ? await prisma.garage.findUnique({ where: { id: String(b.garageId) } }) : null;
      if (!garage || !garage.active) return res.status(400).json({ error: { fr: "Garage invalide : choisissez un garage de la liste", en: "Invalid garage" } });

      const rep = await prisma.reparation.create({
        data: {
          panneId: p.id, vehicleId: p.vehicleId, siteId: p.siteId, garageId: garage.id, statut: "PLANIFIE",
          datePrevueDebut: b.datePrevueDebut ? new Date(b.datePrevueDebut) : null,
          datePrevueFin: b.datePrevueFin ? new Date(b.datePrevueFin) : null,
          coutEstime: Number.isFinite(Number(b.coutEstime)) ? Math.round(Number(b.coutEstime)) : null,
          createdById: ctx.userId,
        },
      });
      await prisma.panne.update({ where: { id: p.id }, data: { statut: "EN_REPARATION" } });
      await writeAudit(prisma, ctx, { action: "reparation.planifier", resourceType: "Reparation", resourceId: rep.id, siteId: p.siteId, after: { garageId: garage.id } });
      res.status(201).json(rep);
    })
  );

  // ------------------------------ Transitions d'une réparation (Maintenance) ------------------------------
  r.patch(
    "/api/fleet/reparations/:id",
    authorize("maintenance.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const rep = await prisma.reparation.findUnique({ where: { id: req.params.id } });
      if (!rep) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, rep.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });

      const action = String(req.body?.action || "");
      const b = req.body || {};

      if (action === "en_cours") {
        if (rep.statut !== "PLANIFIE") return res.status(409).json({ error: { fr: "La réparation n'est pas au statut planifié", en: "Not planned" } });
        if (!b.devisMediaId) return res.status(400).json({ error: { fr: "Le devis est obligatoire pour démarrer la réparation", en: "Quote required" } });
        const updated = await prisma.reparation.update({ where: { id: rep.id }, data: { statut: "EN_COURS", devisMediaId: String(b.devisMediaId) } });
        await prisma.mediaAsset.updateMany({ where: { id: String(b.devisMediaId) }, data: { resourceType: "Reparation", resourceId: rep.id } });
        await writeAudit(prisma, ctx, { action: "reparation.en_cours", resourceType: "Reparation", resourceId: rep.id, siteId: rep.siteId });
        return res.json(updated);
      }

      if (action === "termine") {
        if (rep.statut !== "EN_COURS") return res.status(409).json({ error: { fr: "La réparation n'est pas en cours", en: "Not in progress" } });
        const montant = Math.round(Number(b.montantFacture));
        const statutFacture = String(b.statutFacture || "");
        if (!Number.isFinite(montant) || montant < 0) return res.status(400).json({ error: { fr: "Montant facturé invalide", en: "Invalid invoice amount" } });
        if (!["EN_ATTENTE", "PAYEE"].includes(statutFacture)) return res.status(400).json({ error: { fr: "Statut de facture invalide", en: "Invalid invoice status" } });

        const updated = await prisma.reparation.update({ where: { id: rep.id }, data: { statut: "TERMINE", montantFacture: montant, statutFacture: statutFacture as any } });

        // Réparation terminée → panne résolue + RÉACTIVATION AUTOMATIQUE du véhicule.
        const panne = await prisma.panne.update({ where: { id: rep.panneId }, data: { statut: "RESOLUE" } });
        if (panne.immobilise) {
          await prisma.fleetVehicle.update({ where: { id: rep.vehicleId }, data: { statut: "Disponible" } });
        }
        const veh = await prisma.fleetVehicle.findUnique({ where: { id: rep.vehicleId }, select: { immatriculation: true } });
        const msg = `Réparation terminée — ${veh?.immatriculation ?? "véhicule"} de nouveau disponible.`;
        await notifier(prisma, rep.siteId, "vehicule.reactiver", "vehicule.reactive", "Véhicule réactivé", msg);
        await writeAudit(prisma, ctx, { action: "reparation.termine", resourceType: "Reparation", resourceId: rep.id, siteId: rep.siteId, after: { montant, statutFacture, reactive: panne.immobilise } });
        return res.json(updated);
      }

      if (action === "annuler") {
        if (!["PLANIFIE", "EN_COURS"].includes(rep.statut)) return res.status(409).json({ error: { fr: "Réparation non annulable", en: "Cannot cancel" } });
        if (!b.motif || !String(b.motif).trim()) return res.status(400).json({ error: { fr: "Motif d'annulation obligatoire", en: "Cancellation reason required" } });
        const updated = await prisma.reparation.update({ where: { id: rep.id }, data: { statut: "ANNULE", motifAnnulation: String(b.motif).trim() } });
        // La panne redevient « qualifiée » : une nouvelle réparation pourra être planifiée.
        await prisma.panne.update({ where: { id: rep.panneId }, data: { statut: "QUALIFIEE" } });
        await writeAudit(prisma, ctx, { action: "reparation.annuler", resourceType: "Reparation", resourceId: rep.id, siteId: rep.siteId, after: { motif: b.motif } });
        return res.json(updated);
      }

      return res.status(400).json({ error: { fr: "Action invalide", en: "Invalid action" } });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Panne]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire le devis d'une réparation (Maintenance / terrain du site). */
export async function canReadReparationMedia(prisma: PrismaClient, ctx: AuthContext, reparationId: string): Promise<boolean> {
  const rep = await prisma.reparation.findUnique({ where: { id: reparationId }, select: { siteId: true } });
  if (!rep) return false;
  return (hasPermission(ctx, "maintenance.gerer") || hasPermission(ctx, "panne.qualifier")) && canAccessSite(ctx, rep.siteId);
}

/** Vrai si l'utilisateur peut lire les photos d'une panne (chauffeur déclarant, terrain ou maintenance du site). */
export async function canReadPanneMedia(prisma: PrismaClient, ctx: AuthContext, panneId: string): Promise<boolean> {
  const p = await prisma.panne.findUnique({ where: { id: panneId }, select: { driverId: true, siteId: true } });
  if (!p) return false;
  if (p.driverId === ctx.userId) return true;
  return (hasPermission(ctx, "panne.qualifier") || hasPermission(ctx, "maintenance.gerer")) && canAccessSite(ctx, p.siteId);
}
