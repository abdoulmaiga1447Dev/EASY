/**
 * Routes véhicules (Flux 7) — enregistrement multi-étapes (brouillon possible),
 * validation stricte à l'enregistrement, unicité immatriculation/VIN, documents,
 * machine à états, historique km, export CSV. Cloisonnement par site/client côté serveur.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { canTransition, permissionForTransition, isVehicleStatus, type VehicleStatus } from "../../lib/vehicleState";
import { runVehicleAlerts } from "../../lib/alerts";
import { canAccessVehicle, vehicleScopeWhere } from "./vehicleAccess";
import { wrap, serverError, notFound } from "./helpers";

const PHOTO_FIELDS = ["avant", "arriere", "gauche", "droite", "interieur", "tableauBord", "ecran", "sieges"] as const;
const PHOTO_COLUMN: Record<string, string> = {
  avant: "photoAvant", arriere: "photoArriere", gauche: "photoGauche", droite: "photoDroite",
  interieur: "photoInterieur", tableauBord: "photoTableauBord", ecran: "photoEcran", sieges: "photoSieges",
};

// Champs manquants pour un enregistrement complet (non brouillon).
function missingFields(b: any): string[] {
  const miss: string[] = [];
  for (const f of ["immatriculation", "vin", "marque", "modele", "siteId", "autonomieNominale", "capaciteBatterieKwh"]) {
    if (b[f] === undefined || b[f] === null || b[f] === "") miss.push(f);
  }
  if (b.contractType === "EXTERNE_CLIENT" && !b.clientId) miss.push("clientId");
  const photos = b.photos || {};
  for (const p of PHOTO_FIELDS) if (!photos[p]) miss.push(`photo.${p}`);
  const docs = b.documents || {};
  if (!docs.carteGrise?.mediaId || !docs.carteGrise?.numero) miss.push("carteGrise");
  if (!docs.visiteTechnique?.dateExpiration || !docs.visiteTechnique?.mediaId) miss.push("visiteTechnique");
  if (!docs.assurance?.numero || !docs.assurance?.dateDebut || !docs.assurance?.dateFin || !docs.assurance?.mediaId) miss.push("assurance");
  return miss;
}

function collectMediaIds(b: any): string[] {
  const ids: string[] = [];
  const photos = b.photos || {};
  for (const p of PHOTO_FIELDS) if (photos[p]) ids.push(photos[p]);
  const d = b.documents || {};
  for (const k of ["carteGrise", "visiteTechnique", "assurance"]) if (d[k]?.mediaId) ids.push(d[k].mediaId);
  return ids;
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function vehiclesRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Liste + filtres ------------------------------
  r.get(
    "/api/fleet/vehicles",
    authorize("vehicule.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { q, statut, contractType, siteId, echeance } = req.query as Record<string, string>;
      const where: any = { ...vehicleScopeWhere(ctx) };
      if (statut) where.statut = statut;
      if (contractType) where.contractType = contractType;
      if (siteId) where.siteId = siteId; // affiné dans le périmètre déjà cloisonné
      if (q) where.OR = [
        { immatriculation: { contains: q, mode: "insensitive" } },
        { marque: { contains: q, mode: "insensitive" } },
        { modele: { contains: q, mode: "insensitive" } },
        { vin: { contains: q, mode: "insensitive" } },
      ];
      const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
      const pageSize = Math.min(100, parseInt(String(req.query.pageSize ?? "20"), 10) || 20);

      let vehicles = await prisma.fleetVehicle.findMany({
        where, orderBy: { createdAt: "desc" }, include: { site: { select: { nom: true } }, documents: true },
      });
      // Filtre « échéances proches » (documents expirant sous 30 j) — calculé en mémoire.
      if (echeance === "proche") {
        const soon = Date.now() + 30 * 86400000;
        vehicles = vehicles.filter((v) => v.documents.some((d) => d.dateFin && d.dateFin.getTime() <= soon));
      }
      const total = vehicles.length;
      const items = vehicles.slice((page - 1) * pageSize, page * pageSize);
      res.json({ vehicles: items, total, page, pageSize });
    })
  );

  // ------------------------------ Export CSV ------------------------------
  r.get(
    "/api/fleet/vehicles/export",
    authorize("vehicule.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const vehicles = await prisma.fleetVehicle.findMany({ where: vehicleScopeWhere(ctx), orderBy: { createdAt: "desc" }, include: { site: { select: { nom: true } } } });
      const headers = ["Immatriculation", "VIN", "Marque", "Modele", "Site", "Statut", "Contrat", "Service", "km", "Autonomie", "Batterie kWh"];
      const rows = vehicles.map((v) => [v.immatriculation, v.vin, v.marque, v.modele, v.site?.nom, v.statut, v.contractType, v.serviceType, v.kmActuel, v.autonomieNominale, v.capaciteBatterieKwh].map(csvCell).join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="vehicules.csv"');
      res.send("﻿" + csv); // BOM pour Excel
    })
  );

  // ------------------------------ Détail ------------------------------
  r.get(
    "/api/fleet/vehicles/:id",
    authorize("vehicule.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const v = await prisma.fleetVehicle.findUnique({
        where: { id: req.params.id },
        include: { site: { select: { nom: true, ville: true } }, client: { select: { raisonSociale: true } }, documents: true, phone: true, kmHistory: { orderBy: { createdAt: "desc" }, take: 20 } },
      });
      if (!v) return res.status(404).json({ error: notFound });
      if (!canAccessVehicle(ctx, v)) return res.status(403).json({ error: { fr: "Véhicule hors de votre périmètre", en: "Vehicle outside your scope" } });
      const alerts = await prisma.alert.findMany({ where: { resourceType: "FleetVehicle", resourceId: v.id, status: "OUVERTE" }, orderBy: { createdAt: "desc" } });
      res.json({ ...v, alerts });
    })
  );

  // ------------------------------ Création ------------------------------
  r.post(
    "/api/fleet/vehicles",
    authorize("vehicule.creer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const b = req.body || {};
      const isDraft = b.isDraft === true;

      if (!b.siteId) return res.status(400).json({ error: { fr: "Le site est obligatoire", en: "Site is required" } });
      if (!canAccessSite(ctx, b.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });

      if (!isDraft) {
        const miss = missingFields(b);
        if (miss.length) return res.status(400).json({ error: { fr: "Champs ou photos obligatoires manquants", en: "Missing required fields or photos" }, manquants: miss });
      }

      // Unicité immatriculation / VIN (au niveau organisation).
      if (b.immatriculation) {
        const dup = await prisma.fleetVehicle.findUnique({ where: { immatriculation: b.immatriculation } });
        if (dup) return res.status(409).json({ error: { fr: "Cette immatriculation existe déjà", en: "Immatriculation already exists" } });
      }
      if (b.vin) {
        const dup = await prisma.fleetVehicle.findUnique({ where: { vin: b.vin } });
        if (dup) return res.status(409).json({ error: { fr: "Ce numéro VIN existe déjà", en: "VIN already exists" } });
      }

      // Maintenance préventive programmée à partir des paramètres du site.
      const settings = await prisma.siteSettings.findFirst({ where: { siteId: b.siteId }, orderBy: { version: "desc" } });
      const maintKm = settings?.maintenanceKm ?? 15000;
      const maintJours = settings?.maintenanceJours ?? 90;
      const kmActuel = Number(b.kmActuel) || 0;
      const now = new Date();
      const prochainEntretienDate = isDraft ? null : new Date(now.getTime() + maintJours * 86400000);
      const prochainEntretienKm = isDraft ? null : kmActuel + maintKm;

      const photos = b.photos || {};
      const created = await prisma.fleetVehicle.create({
        data: {
          immatriculation: b.immatriculation, vin: b.vin, marque: b.marque, modele: b.modele, siteId: b.siteId,
          autonomieNominale: b.autonomieNominale != null ? Number(b.autonomieNominale) : null,
          capaciteBatterieKwh: b.capaciteBatterieKwh != null ? Number(b.capaciteBatterieKwh) : null,
          statut: "Disponible",
          contractType: b.contractType || "INTERNE_SAVER",
          clientId: b.contractType === "EXTERNE_CLIENT" ? b.clientId : null,
          dureeContratMois: b.dureeContratMois != null ? Number(b.dureeContratMois) : null,
          montantRemboursement: b.montantRemboursement != null ? Number(b.montantRemboursement) : null,
          serviceType: b.serviceType || "VTC",
          classes: Array.isArray(b.classes) ? b.classes : [],
          kmActuel, gpsBoitierId: b.gpsBoitierId || null, isDraft,
          dernierEntretienKm: kmActuel, dernierEntretienDate: isDraft ? null : now,
          prochainEntretienKm, prochainEntretienDate,
          photoAvant: photos.avant || null, photoArriere: photos.arriere || null, photoGauche: photos.gauche || null, photoDroite: photos.droite || null,
          photoInterieur: photos.interieur || null, photoTableauBord: photos.tableauBord || null, photoEcran: photos.ecran || null, photoSieges: photos.sieges || null,
          createdById: ctx.userId,
        },
      });

      // Documents (carte grise, visite technique, assurance).
      const d = b.documents || {};
      const docRows: any[] = [];
      if (d.carteGrise) docRows.push({ vehicleId: created.id, type: "CARTE_GRISE", numero: d.carteGrise.numero || null, proprietaire: d.carteGrise.proprietaire || null, dateDebut: d.carteGrise.date ? new Date(d.carteGrise.date) : null, mediaId: d.carteGrise.mediaId || null });
      if (d.visiteTechnique) docRows.push({ vehicleId: created.id, type: "VISITE_TECHNIQUE", dateFin: d.visiteTechnique.dateExpiration ? new Date(d.visiteTechnique.dateExpiration) : null, mediaId: d.visiteTechnique.mediaId || null });
      if (d.assurance) docRows.push({ vehicleId: created.id, type: "ASSURANCE", numero: d.assurance.numero || null, dateDebut: d.assurance.dateDebut ? new Date(d.assurance.dateDebut) : null, dateFin: d.assurance.dateFin ? new Date(d.assurance.dateFin) : null, mediaId: d.assurance.mediaId || null });
      for (const row of docRows) await prisma.vehicleDocument.create({ data: row });

      // Rattache les médias au véhicule (contrôle d'accès en lecture).
      const mediaIds = collectMediaIds(b);
      if (mediaIds.length) await prisma.mediaAsset.updateMany({ where: { id: { in: mediaIds } }, data: { resourceType: "FleetVehicle", resourceId: created.id } });

      await writeAudit(prisma, ctx, { action: isDraft ? "vehicule.draft" : "vehicule.create", resourceType: "FleetVehicle", resourceId: created.id, siteId: created.siteId, after: { immatriculation: created.immatriculation, statut: created.statut } });

      // Programme immédiatement les alertes d'échéance (idempotent).
      if (!isDraft) await runVehicleAlerts(prisma).catch((e) => console.error("[Alerts]", e));

      res.status(201).json(created);
    })
  );

  // ------------------------------ Modification ------------------------------
  r.put(
    "/api/fleet/vehicles/:id",
    authorize("vehicule.modifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const before = await prisma.fleetVehicle.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: notFound });
      if (!canAccessVehicle(ctx, before)) return res.status(403).json({ error: { fr: "Véhicule hors de votre périmètre", en: "Vehicle outside your scope" } });

      const b = req.body || {};
      const data: any = {};
      for (const f of ["marque", "modele", "autonomieNominale", "capaciteBatterieKwh", "serviceType", "gpsBoitierId", "dureeContratMois", "montantRemboursement"]) {
        if (b[f] !== undefined) data[f] = b[f];
      }
      if (Array.isArray(b.classes)) data.classes = b.classes;
      if (b.photos) for (const p of PHOTO_FIELDS) if (b.photos[p]) data[PHOTO_COLUMN[p]] = b.photos[p];

      const updated = await prisma.fleetVehicle.update({ where: { id: before.id }, data });
      await writeAudit(prisma, ctx, { action: "vehicule.update", resourceType: "FleetVehicle", resourceId: before.id, siteId: before.siteId, before: { marque: before.marque, modele: before.modele }, after: { marque: updated.marque, modele: updated.modele } });
      res.json(updated);
    })
  );

  // ------------------------------ Transition d'état ------------------------------
  r.post(
    "/api/fleet/vehicles/:id/status",
    authorize("vehicule.modifier", "vehicule.reactiver"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const v = await prisma.fleetVehicle.findUnique({ where: { id: req.params.id } });
      if (!v) return res.status(404).json({ error: notFound });
      if (!canAccessVehicle(ctx, v)) return res.status(403).json({ error: { fr: "Véhicule hors de votre périmètre", en: "Vehicle outside your scope" } });

      const to = req.body?.statut;
      if (!isVehicleStatus(to)) return res.status(400).json({ error: { fr: "Statut inconnu", en: "Unknown status" } });
      const from = v.statut as VehicleStatus;
      if (!canTransition(from, to)) return res.status(400).json({ error: { fr: `Transition interdite : ${from} → ${to}`, en: `Forbidden transition: ${from} → ${to}` } });

      const requiredPerm = permissionForTransition(from, to);
      if (!hasPermission(ctx, requiredPerm)) return res.status(403).json({ error: { fr: "Permission insuffisante pour cette transition", en: "Insufficient permission for this transition" }, requise: [requiredPerm] });

      const updated = await prisma.fleetVehicle.update({ where: { id: v.id }, data: { statut: to } });
      await writeAudit(prisma, ctx, { action: "vehicule.status", resourceType: "FleetVehicle", resourceId: v.id, siteId: v.siteId, before: { statut: from }, after: { statut: to } });
      res.json(updated);
    })
  );

  // ------------------------------ Relevé kilométrique ------------------------------
  r.post(
    "/api/fleet/vehicles/:id/km",
    authorize("vehicule.modifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const v = await prisma.fleetVehicle.findUnique({ where: { id: req.params.id } });
      if (!v) return res.status(404).json({ error: notFound });
      if (!canAccessVehicle(ctx, v)) return res.status(403).json({ error: { fr: "Véhicule hors de votre périmètre", en: "Vehicle outside your scope" } });
      const km = Number(req.body?.km);
      if (!Number.isFinite(km) || km < 0) return res.status(400).json({ error: { fr: "Kilométrage invalide", en: "Invalid mileage" } });
      await prisma.vehicleKmHistory.create({ data: { vehicleId: v.id, km, source: req.body?.source || "manuel" } });
      const updated = await prisma.fleetVehicle.update({ where: { id: v.id }, data: { kmActuel: Math.max(km, v.kmActuel) } });
      await runVehicleAlerts(prisma).catch((e) => console.error("[Alerts]", e));
      res.json({ kmActuel: updated.kmActuel });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Vehicles]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
