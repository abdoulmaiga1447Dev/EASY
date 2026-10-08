/**
 * Routes recharge EV (Flux 3, Bloc C1).
 * - Le chauffeur (ou l'équipe recharge) enregistre une recharge : borne, kWh, coût,
 *   % batterie début/fin, justificatif. Le système contrôle la borne (whitelist) et la
 *   cohérence des kWh (SOC/km), et alerte le Superviseur Logistique en cas d'anomalie.
 * - Le Superviseur Logistique supervise les recharges (dashboard consommation/coûts).
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { notify } from "../../lib/notifications";
import { rechargeMissing, computeRechargeAnomalies } from "../../lib/recharge";
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

export function rechargeRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // ------------------------------ Bornes whitelistées (pour la saisie) ------------------------------
  r.get(
    "/api/fleet/bornes",
    authorize("recharge.enregistrer", "recharge.superviser", "borne.gerer"),
    wrap(async (req, res) => {
      const where: any = { active: true };
      if (req.query.type) where.type = String(req.query.type);
      const bornes = await prisma.borneRecharge.findMany({ where, orderBy: [{ type: "asc" }, { nom: "asc" }] });
      res.json({ bornes });
    })
  );

  // ------------------------------ Enregistrer une recharge ------------------------------
  r.post(
    "/api/fleet/recharges",
    authorize("recharge.enregistrer", "recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const b = req.body || {};

      const vehicle = await prisma.fleetVehicle.findUnique({ where: { id: String(b.vehicleId || "") } });
      if (!vehicle) return res.status(404).json({ error: { fr: "Véhicule introuvable", en: "Vehicle not found" } });
      if (!canAccessSite(ctx, vehicle.siteId)) return res.status(403).json({ error: { fr: "Véhicule hors de votre périmètre", en: "Vehicle outside your scope" } });

      // Qui peut enregistrer quoi : le superviseur pour tout véhicule de son site ;
      // le chauffeur uniquement pour le véhicule qui lui est attribué aujourd'hui.
      const estSuperviseur = hasPermission(ctx, "recharge.superviser");
      let driverId: string | null = null;
      if (estSuperviseur) {
        driverId = b.driverId ? String(b.driverId) : null;
      } else {
        const day = normalizeDay(new Date().toISOString());
        const assign = await prisma.assignment.findFirst({ where: { driverId: ctx.userId, vehicleId: vehicle.id, date: day } });
        if (!assign) return res.status(403).json({ error: { fr: "Vous ne pouvez enregistrer une recharge que pour votre véhicule du jour", en: "You can only log a charge for your assigned vehicle" } });
        driverId = ctx.userId;
      }

      const miss = rechargeMissing(b);
      if (miss.length) return res.status(400).json({ error: { fr: "Recharge incomplète : champ(s) manquant(s)", en: "Incomplete charge" }, manquants: miss });

      const kwh = Number(b.kwh);
      const cout = Math.round(Number(b.cout));
      const socDebut = Math.round(Number(b.socDebut));
      const socFin = Math.round(Number(b.socFin));
      if (kwh <= 0 || cout < 0 || socDebut < 0 || socDebut > 100 || socFin < 0 || socFin > 100) {
        return res.status(400).json({ error: { fr: "Valeurs de recharge invalides (kWh, coût, % batterie)", en: "Invalid charge values" } });
      }

      // Borne : whitelistée si elle existe et est active.
      let borneWhitelistee = false;
      if (b.borneId) {
        const borne = await prisma.borneRecharge.findUnique({ where: { id: String(b.borneId) } });
        borneWhitelistee = !!(borne && borne.active);
      }

      // Cohérence kWh ↔ km depuis la dernière recharge.
      const kmAuMoment = Number.isFinite(Number(b.kmAuMoment)) ? Number(b.kmAuMoment) : vehicle.kmActuel;
      const last = await prisma.rechargeRecord.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { date: "desc" } });
      const kmParcourusDepuisDerniere = last?.kmAuMoment != null && kmAuMoment != null ? Math.max(0, kmAuMoment - last.kmAuMoment) : null;

      const anomalies = computeRechargeAnomalies({
        borneWhitelistee, kwh, socDebut, socFin,
        capaciteBatterieKwh: vehicle.capaciteBatterieKwh ?? null,
        kmParcourusDepuisDerniere,
      });

      const rec = await prisma.rechargeRecord.create({
        data: {
          vehicleId: vehicle.id, driverId, enregistreParId: ctx.userId, siteId: vehicle.siteId,
          shift: b.shift === "A" || b.shift === "B" ? b.shift : null,
          typeCharge: b.typeCharge, borneId: b.borneId ? String(b.borneId) : null, lieu: b.lieu ? String(b.lieu) : null,
          kwh, cout, socDebut, socFin, kmAuMoment: Number.isFinite(kmAuMoment) ? kmAuMoment : null,
          justificatifMediaId: b.justificatifMediaId || null,
          anomalieBorne: anomalies.anomalieBorne, anomalieCoherence: anomalies.anomalieCoherence,
        },
      });

      if (b.justificatifMediaId) {
        await prisma.mediaAsset.updateMany({ where: { id: String(b.justificatifMediaId) }, data: { resourceType: "RechargeRecord", resourceId: rec.id } });
      }

      // Met à jour le dernier SOC connu du véhicule.
      await prisma.fleetVehicle.update({ where: { id: vehicle.id }, data: { socDernierConnu: socFin } });

      await writeAudit(prisma, ctx, { action: "recharge.create", resourceType: "RechargeRecord", resourceId: rec.id, siteId: vehicle.siteId, after: { kwh, cout, anomalieBorne: anomalies.anomalieBorne, anomalieCoherence: anomalies.anomalieCoherence } });

      // Anomalie → alerte au Superviseur Logistique du site.
      if (anomalies.anomalieBorne || anomalies.anomalieCoherence) {
        const msg = `Anomalie recharge — ${vehicle.immatriculation} : ${anomalies.raisons.join(" ; ")}.`;
        for (const u of await recipients(prisma, vehicle.siteId, "recharge.superviser")) {
          await notify(prisma, { userId: u.id, canal: "IN_APP", type: "recharge.anomalie", titre: "Anomalie recharge", message: msg });
        }
      }

      res.status(201).json(rec);
    })
  );

  // ------------------------------ Mes recharges (chauffeur / équipe) ------------------------------
  r.get(
    "/api/fleet/me/recharges",
    authorize("recharge.enregistrer", "recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const recharges = await prisma.rechargeRecord.findMany({
        where: { OR: [{ driverId: ctx.userId }, { enregistreParId: ctx.userId }] },
        orderBy: { date: "desc" }, take: 50,
      });
      res.json({ recharges });
    })
  );

  // ------------------------------ Supervision (Superviseur Logistique) ------------------------------
  r.get(
    "/api/fleet/recharges",
    authorize("recharge.superviser"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = {};
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      else if (req.query.siteId) where.siteId = String(req.query.siteId);
      if (req.query.vehicleId) where.vehicleId = String(req.query.vehicleId);
      if (req.query.date) where.date = { gte: normalizeDay(String(req.query.date)), lt: new Date(normalizeDay(String(req.query.date)).getTime() + 86400000) };
      if (req.query.anomalies === "1") where.OR = [{ anomalieBorne: true }, { anomalieCoherence: true }];

      const recharges = await prisma.rechargeRecord.findMany({ where, orderBy: { date: "desc" }, take: 300 });
      const vehIds = [...new Set(recharges.map((x) => x.vehicleId))];
      const vehs = await prisma.fleetVehicle.findMany({ where: { id: { in: vehIds } }, select: { id: true, immatriculation: true } });
      const immatById = new Map(vehs.map((v) => [v.id, v.immatriculation]));

      const resume = {
        total: recharges.length,
        totalKwh: recharges.reduce((s, x) => s + x.kwh, 0),
        totalCout: recharges.reduce((s, x) => s + x.cout, 0),
        anomalies: recharges.filter((x) => x.anomalieBorne || x.anomalieCoherence).length,
      };
      res.json({ recharges: recharges.map((x) => ({ ...x, vehicule: immatById.get(x.vehicleId) ?? null })), resume });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Recharge]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}

/** Vrai si l'utilisateur peut lire le justificatif d'une recharge (auteur/chauffeur ou superviseur du site). */
export async function canReadRechargeMedia(prisma: PrismaClient, ctx: AuthContext, rechargeId: string): Promise<boolean> {
  const rec = await prisma.rechargeRecord.findUnique({ where: { id: rechargeId }, select: { driverId: true, enregistreParId: true, siteId: true } });
  if (!rec) return false;
  if (rec.driverId === ctx.userId || rec.enregistreParId === ctx.userId) return true;
  return hasPermission(ctx, "recharge.superviser") && canAccessSite(ctx, rec.siteId);
}
