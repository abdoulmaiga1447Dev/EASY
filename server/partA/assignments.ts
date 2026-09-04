/**
 * Routes attribution quotidienne (Flux 8) — Dispatcher.
 * Planning jour/semaine, suggestions (zone + rotation équitable), confirmation avec
 * unicité (véhicule, date, shift) garantie EN BASE, remplacement de chauffeur
 * (réservé au Dispatcher) et annulation, le tout historisé + notification au chauffeur.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { normalizeDay, suggestVehicles, computeAssignmentWarnings, type ShiftCode, type VehicleSuggestionInput } from "../../lib/assignment";
import { wrap, serverError, notFound } from "./helpers";

const ATTRIBUABLE = { notIn: ["Immobilise", "EnMaintenance", "HorsFlotte"] as any };

async function siteSettings(prisma: PrismaClient, siteId: string) {
  return prisma.siteSettings.findFirst({ where: { siteId }, orderBy: { version: "desc" } });
}
function shiftHoraire(settings: any, shift: ShiftCode) {
  if (shift === "A") return { debut: settings?.shiftADebut ?? "06:00", fin: settings?.shiftAFin ?? "14:00" };
  return { debut: settings?.shiftBDebut ?? "15:00", fin: settings?.shiftBFin ?? "23:00" };
}

export function assignmentsRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Planning du jour ------------------------------
  r.get(
    "/api/fleet/assignments",
    authorize("attribution.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const siteId = String(req.query.siteId || ctx.siteIds[0] || "");
      if (!canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const day = normalizeDay(String(req.query.date || new Date().toISOString()));

      const assignments = await prisma.assignment.findMany({
        where: { siteId, date: day },
        include: { vehicle: { select: { immatriculation: true, marque: true, modele: true } }, driver: { select: { id: true, name: true } } },
      });
      const takenA = new Set(assignments.filter((a) => a.shift === "A").map((a) => a.vehicleId));
      const takenB = new Set(assignments.filter((a) => a.shift === "B").map((a) => a.vehicleId));
      const driverA = new Set(assignments.filter((a) => a.shift === "A").map((a) => a.driverId));
      const driverB = new Set(assignments.filter((a) => a.shift === "B").map((a) => a.driverId));

      const drivers = await prisma.user.findMany({
        where: { active: true, role: "chauffeur", driverProfile: { siteId } },
        include: { driverProfile: { include: { zone: true } } },
      });
      const vehicles = await prisma.fleetVehicle.findMany({ where: { siteId, isDraft: false, statut: ATTRIBUABLE }, select: { id: true, immatriculation: true, marque: true, modele: true, statut: true } });

      res.json({
        date: day.toISOString().slice(0, 10),
        shifts: {
          A: assignments.filter((a) => a.shift === "A"),
          B: assignments.filter((a) => a.shift === "B"),
        },
        chauffeurs: drivers.map((d) => ({ id: d.id, name: d.name, zoneId: d.driverProfile?.zoneId ?? null, zoneNom: d.driverProfile?.zone?.nom ?? null, affecteA: driverA.has(d.id), affecteB: driverB.has(d.id) })),
        vehicules: vehicles.map((v) => ({ ...v, prisA: takenA.has(v.id), prisB: takenB.has(v.id) })),
      });
    })
  );

  // ------------------------------ Planning semaine ------------------------------
  r.get(
    "/api/fleet/assignments/week",
    authorize("attribution.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const siteId = String(req.query.siteId || ctx.siteIds[0] || "");
      if (!canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const start = normalizeDay(String(req.query.date || new Date().toISOString()));
      const end = new Date(start.getTime() + 7 * 86400000);
      const assignments = await prisma.assignment.findMany({
        where: { siteId, date: { gte: start, lt: end } },
        include: { vehicle: { select: { immatriculation: true } }, driver: { select: { name: true } } },
        orderBy: { date: "asc" },
      });
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
        const dayAssign = assignments.filter((a) => a.date.toISOString().slice(0, 10) === d);
        return { date: d, A: dayAssign.filter((a) => a.shift === "A"), B: dayAssign.filter((a) => a.shift === "B") };
      });
      res.json({ days });
    })
  );

  // ------------------------------ Suggestions (zone + rotation) ------------------------------
  r.get(
    "/api/fleet/assignments/suggestions",
    authorize("attribution.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const siteId = String(req.query.siteId || ctx.siteIds[0] || "");
      if (!canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const day = normalizeDay(String(req.query.date || new Date().toISOString()));
      const shift = (String(req.query.shift || "A") as ShiftCode);
      const driverId = String(req.query.driverId || "");
      const driver = await prisma.user.findUnique({ where: { id: driverId }, include: { driverProfile: true } });
      const driverZoneId = driver?.driverProfile?.zoneId ?? null;

      // Véhicules attribuables non déjà pris sur (date, shift).
      const taken = new Set((await prisma.assignment.findMany({ where: { siteId, date: day, shift }, select: { vehicleId: true } })).map((a) => a.vehicleId));
      const candidates = (await prisma.fleetVehicle.findMany({ where: { siteId, isDraft: false, statut: ATTRIBUABLE }, select: { id: true, immatriculation: true, marque: true, modele: true, socDernierConnu: true } })).filter((v) => !taken.has(v.id));

      // Historique récent pour zone habituelle et rotation.
      const recent = await prisma.assignment.findMany({
        where: { siteId, date: { gte: new Date(day.getTime() - 60 * 86400000) } },
        include: { driver: { include: { driverProfile: true } } },
        orderBy: { date: "desc" },
      });
      const zoneHabituelle = new Map<string, string | null>(); // vehicleId -> zone du dernier conducteur
      const lastToDriver = new Map<string, Date>(); // vehicleId -> dernière date attribuée à CE chauffeur
      for (const a of recent) {
        if (!zoneHabituelle.has(a.vehicleId)) zoneHabituelle.set(a.vehicleId, a.driver.driverProfile?.zoneId ?? null);
        if (a.driverId === driverId && !lastToDriver.has(a.vehicleId)) lastToDriver.set(a.vehicleId, a.date);
      }

      const inputs: VehicleSuggestionInput[] = candidates.map((v) => ({ vehicleId: v.id, zoneHabituelleId: zoneHabituelle.get(v.id) ?? null, lastAssignedToDriverAt: lastToDriver.get(v.id) ?? null }));
      const ranked = suggestVehicles(inputs, driverZoneId, day);
      const byId = new Map(candidates.map((v) => [v.id, v]));
      res.json({ suggestions: ranked.map((s) => ({ ...byId.get(s.vehicleId), score: s.score })) });
    })
  );

  // ------------------------------ Confirmer une attribution ------------------------------
  r.post(
    "/api/fleet/assignments",
    authorize("attribution.creer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { siteId, shift, driverId, vehicleId, lieu } = req.body || {};
      if (!siteId || !shift || !driverId || !vehicleId) return res.status(400).json({ error: { fr: "site, shift, chauffeur et véhicule sont obligatoires", en: "site, shift, driver and vehicle are required" } });
      if (!canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      if (shift !== "A" && shift !== "B") return res.status(400).json({ error: { fr: "Shift invalide", en: "Invalid shift" } });
      const day = normalizeDay(String(req.body.date || new Date().toISOString()));

      const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle || vehicle.siteId !== siteId) return res.status(404).json({ error: { fr: "Véhicule introuvable sur ce site", en: "Vehicle not found on this site" } });
      if (["Immobilise", "EnMaintenance", "HorsFlotte"].includes(vehicle.statut)) return res.status(400).json({ error: { fr: `Véhicule indisponible (${vehicle.statut})`, en: "Vehicle unavailable" } });

      const driver = await prisma.user.findUnique({ where: { id: driverId }, include: { driverProfile: true } });
      if (!driver || driver.role !== "chauffeur") return res.status(400).json({ error: { fr: "Chauffeur invalide", en: "Invalid driver" } });

      // Avertissements non bloquants (handover, double shift, rythme).
      const settings = await siteSettings(prisma, siteId);
      const otherShift = shift === "A" ? "B" : "A";
      const enchain = (await prisma.assignment.count({ where: { driverId, date: day, shift: otherShift } })) > 0;
      const weekStart = new Date(day.getTime() - 6 * 86400000);
      const jours7 = (await prisma.assignment.findMany({ where: { driverId, date: { gte: weekStart, lte: day } }, distinct: ["date"], select: { date: true } })).length;
      const warnings = computeAssignmentWarnings({
        enchainementMemeChauffeur: enchain, socDernierConnu: vehicle.socDernierConnu, seuilSoc: settings?.socHandoverSeuil ?? 70,
        shift, joursTravailles7: jours7 + 1, rythmeMax: settings?.rythmeJoursTravailles ?? 6,
      });

      // Création : l'unicité (vehicleId, date, shift) est garantie EN BASE.
      let assignment;
      try {
        assignment = await prisma.assignment.create({ data: { siteId, date: day, shift, driverId, vehicleId, lieu: lieu || null, createdById: ctx.userId } });
      } catch (e: any) {
        if (e?.code === "P2002") return res.status(409).json({ error: { fr: "Ce véhicule est déjà attribué sur ce créneau", en: "Vehicle already assigned for this slot" } });
        throw e;
      }

      await prisma.assignmentEvent.create({ data: { siteId, date: day, shift, vehicleId, driverId, action: "CREATION", byUserId: ctx.userId, byName: ctx.name } });
      await writeAudit(prisma, ctx, { action: "assignment.create", resourceType: "Assignment", resourceId: assignment.id, siteId, after: { vehicleId, driverId, shift, date: day.toISOString().slice(0, 10) } });

      // Notification au chauffeur (WhatsApp mocké + in-app).
      const h = shiftHoraire(settings, shift);
      const msg = `Planning ${day.toISOString().slice(0, 10)} — Shift ${shift} (${h.debut}-${h.fin}). Véhicule ${vehicle.immatriculation}${lieu ? `, lieu : ${lieu}` : ""}.`;
      await notify(prisma, { userId: driverId, canal: "IN_APP", type: "attribution", titre: "Nouvelle attribution", message: msg });
      if (driver.phone) await notify(prisma, { userId: driverId, canal: "WHATSAPP", to: driver.phone, type: "attribution", titre: "Nouvelle attribution", message: msg, payload: { to: driver.phone } });

      res.status(201).json({ assignment, warnings });
    })
  );

  // ------------------------------ Remplacement de chauffeur (Dispatcher) ------------------------------
  r.post(
    "/api/fleet/assignments/:id/replace",
    authorize("remplacement.valider"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const a = await prisma.assignment.findUnique({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, a.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const { nouveauDriverId, motif } = req.body || {};
      if (!nouveauDriverId || !motif) return res.status(400).json({ error: { fr: "Le nouveau chauffeur et le motif sont obligatoires", en: "New driver and reason are required" } });
      const driver = await prisma.user.findUnique({ where: { id: nouveauDriverId } });
      if (!driver || driver.role !== "chauffeur") return res.status(400).json({ error: { fr: "Chauffeur invalide", en: "Invalid driver" } });

      const ancienDriverId = a.driverId;
      const updated = await prisma.assignment.update({ where: { id: a.id }, data: { driverId: nouveauDriverId } });
      await prisma.assignmentEvent.create({ data: { siteId: a.siteId, date: a.date, shift: a.shift, vehicleId: a.vehicleId, driverId: nouveauDriverId, action: "REMPLACEMENT", motif: `Remplace ${ancienDriverId} : ${motif}`, byUserId: ctx.userId, byName: ctx.name } });
      await writeAudit(prisma, ctx, { action: "assignment.replace", resourceType: "Assignment", resourceId: a.id, siteId: a.siteId, before: { driverId: ancienDriverId }, after: { driverId: nouveauDriverId, motif } });

      const settings = await siteSettings(prisma, a.siteId);
      const h = shiftHoraire(settings, a.shift as ShiftCode);
      const msg = `Vous remplacez un chauffeur le ${a.date.toISOString().slice(0, 10)} — Shift ${a.shift} (${h.debut}-${h.fin}).`;
      await notify(prisma, { userId: nouveauDriverId, canal: "IN_APP", type: "remplacement", titre: "Remplacement", message: msg });
      if (driver.phone) await notify(prisma, { userId: nouveauDriverId, canal: "WHATSAPP", to: driver.phone, type: "remplacement", titre: "Remplacement", message: msg, payload: { to: driver.phone } });

      res.json({ assignment: updated });
    })
  );

  // ------------------------------ Annulation d'une attribution ------------------------------
  r.delete(
    "/api/fleet/assignments/:id",
    authorize("attribution.creer", "operation.annuler"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const a = await prisma.assignment.findUnique({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ error: notFound });
      if (!canAccessSite(ctx, a.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const motif = req.body?.motif || (req.query.motif as string) || null;
      await prisma.assignment.delete({ where: { id: a.id } });
      await prisma.assignmentEvent.create({ data: { siteId: a.siteId, date: a.date, shift: a.shift, vehicleId: a.vehicleId, driverId: a.driverId, action: "ANNULATION", motif, byUserId: ctx.userId, byName: ctx.name } });
      await writeAudit(prisma, ctx, { action: "assignment.cancel", resourceType: "Assignment", resourceId: a.id, siteId: a.siteId, before: { vehicleId: a.vehicleId, driverId: a.driverId, shift: a.shift } });
      res.json({ ok: true });
    })
  );

  // ------------------------------ Historique d'un véhicule ou chauffeur ------------------------------
  r.get(
    "/api/fleet/assignments/history",
    authorize("attribution.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (req.query.vehicleId) where.vehicleId = String(req.query.vehicleId);
      if (req.query.driverId) where.driverId = String(req.query.driverId);
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const events = await prisma.assignmentEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
      res.json({ events });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Assignments]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
