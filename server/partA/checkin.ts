/**
 * Routes check-in / check-out (Flux 1, Bloc B1).
 * - Le chauffeur consulte son attribution du jour, fait son check-in (5 preuves) puis
 *   son check-out (4 photos). Check-in bloqué si permis expiré ou preuve manquante ;
 *   check-out impossible sans check-in valide.
 * - Le Responsable terrain / l'Admin supervisent les shifts et voient les preuves.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { checkinMissing, checkoutMissing, isPermisValide, computeShiftData } from "../../lib/shift";
import { normalizeDay } from "../../lib/assignment";
import { wrap, serverError, notFound } from "./helpers";

const CHECKIN_MEDIA = ["photoCompteur", "photoVehicule", "photoPermis", "selfieKyc"] as const;
const CHECKOUT_MEDIA = ["photoAvant", "photoArriere", "photoGauche", "photoDroite"] as const;

export function checkinRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Mon shift du jour (chauffeur) ------------------------------
  r.get(
    "/api/fleet/me/shift",
    authorize("self.planning"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const day = normalizeDay(String(req.query.date || new Date().toISOString()));
      const assignment = await prisma.assignment.findFirst({
        where: { driverId: ctx.userId, date: day },
        include: { vehicle: { select: { immatriculation: true, marque: true, modele: true, statut: true } }, site: { select: { nom: true } }, shiftRecord: true },
      });
      const profile = await prisma.driverProfile.findUnique({ where: { userId: ctx.userId } });
      res.json({
        date: day.toISOString().slice(0, 10),
        assignment,
        permisExpiration: profile?.permisExpiration ?? null,
        permisValide: isPermisValide(profile?.permisExpiration ?? null),
      });
    })
  );

  // ------------------------------ Check-in ------------------------------
  r.post(
    "/api/fleet/shifts/:assignmentId/checkin",
    authorize("self.checkin"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const a = await prisma.assignment.findUnique({ where: { id: req.params.assignmentId }, include: { shiftRecord: true } });
      if (!a) return res.status(404).json({ error: notFound });
      if (a.driverId !== ctx.userId) return res.status(403).json({ error: { fr: "Ce shift n'est pas le vôtre", en: "Not your shift" } });
      if (a.shiftRecord && a.shiftRecord.statut !== "EN_ATTENTE") return res.status(409).json({ error: { fr: "Check-in déjà effectué", en: "Check-in already done" } });

      // Permis valide obligatoire.
      const profile = await prisma.driverProfile.findUnique({ where: { userId: ctx.userId } });
      if (!isPermisValide(profile?.permisExpiration ?? null)) {
        return res.status(403).json({ error: { fr: "Permis expiré, contactez votre Responsable terrain", en: "Driving licence expired, contact your field manager" } });
      }

      // Les 5 preuves obligatoires.
      const miss = checkinMissing(req.body);
      if (miss.length) return res.status(400).json({ error: { fr: "Check-in incomplet : preuve(s) manquante(s)", en: "Incomplete check-in" }, manquants: miss });

      const b = req.body;
      const data = {
        driverId: a.driverId, vehicleId: a.vehicleId, siteId: a.siteId, date: a.date, shift: a.shift,
        statut: "EN_COURS" as const, checkinAt: new Date(),
        gpsLat: Number(b.gpsLat), gpsLng: Number(b.gpsLng), kmDebut: Number(b.kmDebut),
        photoCompteur: b.photoCompteur, photoVehicule: b.photoVehicule, photoPermis: b.photoPermis, selfieKyc: b.selfieKyc,
      };
      const record = a.shiftRecord
        ? await prisma.shiftRecord.update({ where: { id: a.shiftRecord.id }, data })
        : await prisma.shiftRecord.create({ data: { assignmentId: a.id, ...data } });

      // Rattache les médias (contrôle d'accès en lecture).
      const ids = CHECKIN_MEDIA.map((k) => b[k]).filter(Boolean);
      if (ids.length) await prisma.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { resourceType: "ShiftRecord", resourceId: record.id } });

      await writeAudit(prisma, ctx, { action: "shift.checkin", resourceType: "ShiftRecord", resourceId: record.id, siteId: a.siteId, after: { kmDebut: data.kmDebut } });
      res.status(201).json(record);
    })
  );

  // ------------------------------ Check-out ------------------------------
  r.post(
    "/api/fleet/shifts/:assignmentId/checkout",
    authorize("self.checkin"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const a = await prisma.assignment.findUnique({ where: { id: req.params.assignmentId }, include: { shiftRecord: true } });
      if (!a) return res.status(404).json({ error: notFound });
      if (a.driverId !== ctx.userId) return res.status(403).json({ error: { fr: "Ce shift n'est pas le vôtre", en: "Not your shift" } });
      if (!a.shiftRecord || a.shiftRecord.statut !== "EN_COURS") {
        return res.status(400).json({ error: { fr: "Aucun check-in valide pour ce shift", en: "No valid check-in for this shift" } });
      }

      const miss = checkoutMissing(req.body);
      if (miss.length) return res.status(400).json({ error: { fr: "Check-out incomplet : photo(s) manquante(s)", en: "Incomplete check-out" }, manquants: miss });

      const b = req.body;
      const checkoutAt = new Date();
      const kmFin = Number(b.kmFin);
      const { kmParcourus, dureeMinutes } = computeShiftData(a.shiftRecord.kmDebut, kmFin, a.shiftRecord.checkinAt, checkoutAt);

      const record = await prisma.shiftRecord.update({
        where: { id: a.shiftRecord.id },
        data: {
          statut: "TERMINE", checkoutAt, kmFin, kmParcourus, dureeMinutes,
          photoAvant: b.photoAvant, photoArriere: b.photoArriere, photoGauche: b.photoGauche, photoDroite: b.photoDroite,
        },
      });

      const ids = CHECKOUT_MEDIA.map((k) => b[k]).filter(Boolean);
      if (ids.length) await prisma.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { resourceType: "ShiftRecord", resourceId: record.id } });

      // Met à jour le compteur du véhicule + historique.
      if (Number.isFinite(kmFin)) {
        const v = await prisma.fleetVehicle.findUnique({ where: { id: a.vehicleId }, select: { kmActuel: true } });
        if (v && kmFin > v.kmActuel) {
          await prisma.fleetVehicle.update({ where: { id: a.vehicleId }, data: { kmActuel: kmFin } });
          await prisma.vehicleKmHistory.create({ data: { vehicleId: a.vehicleId, km: kmFin, source: "check-out" } });
        }
      }

      await writeAudit(prisma, ctx, { action: "shift.checkout", resourceType: "ShiftRecord", resourceId: record.id, siteId: a.siteId, after: { kmFin, kmParcourus, dureeMinutes } });
      res.json(record);
    })
  );

  // ------------------------------ Supervision (Responsable terrain / Admin) ------------------------------
  r.get(
    "/api/fleet/shifts",
    authorize("shift.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const siteId = String(req.query.siteId || ctx.siteIds[0] || "");
      if (!canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const day = normalizeDay(String(req.query.date || new Date().toISOString()));
      const assignments = await prisma.assignment.findMany({
        where: { siteId, date: day },
        include: { vehicle: { select: { immatriculation: true } }, driver: { select: { name: true } }, shiftRecord: true },
        orderBy: { shift: "asc" },
      });
      res.json({
        date: day.toISOString().slice(0, 10),
        shifts: assignments.map((a) => ({
          assignmentId: a.id, shift: a.shift, vehicule: a.vehicle?.immatriculation, chauffeur: a.driver?.name,
          statut: a.shiftRecord?.statut ?? "EN_ATTENTE", checkinAt: a.shiftRecord?.checkinAt ?? null, checkoutAt: a.shiftRecord?.checkoutAt ?? null,
          recordId: a.shiftRecord?.id ?? null,
        })),
      });
    })
  );

  r.get(
    "/api/fleet/shifts/:id",
    authorize("shift.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const rec = await prisma.shiftRecord.findUnique({ where: { id: req.params.id }, include: { assignment: { include: { vehicle: { select: { immatriculation: true } }, driver: { select: { name: true } } } } } });
      if (!rec) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, rec.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      res.json(rec);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Checkin]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire les médias d'un shift (chauffeur concerné ou superviseur du site). */
export async function canReadShiftMedia(prisma: PrismaClient, ctx: AuthContext, shiftRecordId: string): Promise<boolean> {
  const rec = await prisma.shiftRecord.findUnique({ where: { id: shiftRecordId }, select: { driverId: true, siteId: true } });
  if (!rec) return false;
  if (rec.driverId === ctx.userId) return true;
  return hasPermission(ctx, "shift.superviser") && canAccessSite(ctx, rec.siteId);
}
