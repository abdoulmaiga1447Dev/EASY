/**
 * Moteur d'alertes (Flux 7) — calcule chaque jour les échéances des véhicules et
 * génère des alertes SANS doublon (idempotence via `dedupeKey`) puis notifie les
 * personnes concernées (in-app + email). Aucune action manuelle requise.
 *
 * Réutilisable par les autres flux : la table Alert n'est pas spécifique aux véhicules.
 */
import type { PrismaClient } from "@prisma/client";
import { notify } from "./notifications";

export function daysUntil(date: Date, today: Date): number {
  const d0 = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((d0 - t0) / 86400000);
}

interface PlannedAlert {
  type: "VISITE_TECHNIQUE" | "ASSURANCE" | "ENTRETIEN_KM" | "ENTRETIEN_DATE";
  vehicleId: string;
  siteId: string;
  dueDate: Date | null;
  severity: string;
  message: string;
  dedupeKey: string;
}

/**
 * Détermine les alertes à lever pour un véhicule donné, selon les seuils du site.
 * Fonction pure (testable) : ne touche pas la base.
 */
export function planVehicleAlerts(
  vehicle: {
    id: string; siteId: string; immatriculation: string; statut: string;
    kmActuel: number; prochainEntretienKm: number | null; prochainEntretienDate: Date | null;
    documents: { type: string; dateFin: Date | null }[];
  },
  seuils: { alerteVisiteTechniqueJours: number; alerteAssuranceJours: number },
  today: Date
): PlannedAlert[] {
  const out: PlannedAlert[] = [];
  if (vehicle.statut === "HorsFlotte") return out;
  const imm = vehicle.immatriculation;

  const docAlert = (type: "VISITE_TECHNIQUE" | "ASSURANCE", seuilJours: number, libelle: string) => {
    const doc = vehicle.documents.find((d) => d.type === type && d.dateFin);
    if (!doc?.dateFin) return;
    const j = daysUntil(doc.dateFin, today);
    if (j <= seuilJours) {
      out.push({
        type, vehicleId: vehicle.id, siteId: vehicle.siteId, dueDate: doc.dateFin,
        severity: j < 0 ? "critical" : "warning",
        message: j < 0 ? `${libelle} du véhicule ${imm} expirée depuis ${-j} j` : `${libelle} du véhicule ${imm} expire dans ${j} j`,
        dedupeKey: `${type}:${vehicle.id}:${doc.dateFin.toISOString().slice(0, 10)}`,
      });
    }
  };
  docAlert("VISITE_TECHNIQUE", seuils.alerteVisiteTechniqueJours, "Visite technique");
  docAlert("ASSURANCE", seuils.alerteAssuranceJours, "Assurance");

  // Entretien préventif par date
  if (vehicle.prochainEntretienDate) {
    const j = daysUntil(vehicle.prochainEntretienDate, today);
    if (j <= 0) {
      out.push({
        type: "ENTRETIEN_DATE", vehicleId: vehicle.id, siteId: vehicle.siteId, dueDate: vehicle.prochainEntretienDate,
        severity: "warning", message: `Entretien préventif dû (date) pour le véhicule ${imm}`,
        dedupeKey: `ENTRETIEN_DATE:${vehicle.id}:${vehicle.prochainEntretienDate.toISOString().slice(0, 10)}`,
      });
    }
  }
  // Entretien préventif par kilométrage
  if (vehicle.prochainEntretienKm != null && vehicle.kmActuel >= vehicle.prochainEntretienKm) {
    out.push({
      type: "ENTRETIEN_KM", vehicleId: vehicle.id, siteId: vehicle.siteId, dueDate: null,
      severity: "warning", message: `Entretien préventif dû (${vehicle.kmActuel} km ≥ ${vehicle.prochainEntretienKm} km) pour le véhicule ${imm}`,
      dedupeKey: `ENTRETIEN_KM:${vehicle.id}:${vehicle.prochainEntretienKm}`,
    });
  }
  return out;
}

/** Destinataires des alertes d'un site : utilisateurs actifs ayant `alerte.voir`. */
async function alertRecipients(prisma: PrismaClient, siteId: string) {
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
    if (!codes.has("alerte.voir")) return false;
    return codes.has("site.acces_tous") || u.sites.some((s) => s.siteId === siteId);
  });
}

/**
 * Exécute le moteur : lit les véhicules, calcule les alertes, insère celles qui
 * n'existent pas encore (idempotent), et notifie. Retourne le nombre d'alertes créées.
 */
export async function runVehicleAlerts(prisma: PrismaClient, today = new Date()): Promise<number> {
  // Seuils par site (dernière version des paramètres).
  const sites = await prisma.site.findMany({ where: { active: true } });
  const seuilsBySite = new Map<string, { alerteVisiteTechniqueJours: number; alerteAssuranceJours: number }>();
  for (const s of sites) {
    const st = await prisma.siteSettings.findFirst({ where: { siteId: s.id }, orderBy: { version: "desc" } });
    seuilsBySite.set(s.id, {
      alerteVisiteTechniqueJours: st?.alerteVisiteTechniqueJours ?? 15,
      alerteAssuranceJours: st?.alerteAssuranceJours ?? 7,
    });
  }

  const vehicles = await prisma.fleetVehicle.findMany({
    where: { isDraft: false, statut: { not: "HorsFlotte" } },
    include: { documents: true },
  });

  let created = 0;
  for (const v of vehicles) {
    const seuils = seuilsBySite.get(v.siteId) ?? { alerteVisiteTechniqueJours: 15, alerteAssuranceJours: 7 };
    const planned = planVehicleAlerts(
      { id: v.id, siteId: v.siteId, immatriculation: v.immatriculation, statut: v.statut, kmActuel: v.kmActuel, prochainEntretienKm: v.prochainEntretienKm, prochainEntretienDate: v.prochainEntretienDate, documents: v.documents.map((d) => ({ type: d.type, dateFin: d.dateFin })) },
      seuils, today
    );
    for (const a of planned) {
      const existing = await prisma.alert.findUnique({ where: { dedupeKey: a.dedupeKey } });
      if (existing) continue; // anti-doublon : idempotent
      await prisma.alert.create({
        data: { type: a.type as any, resourceType: "FleetVehicle", resourceId: a.vehicleId, siteId: a.siteId, dueDate: a.dueDate, severity: a.severity, message: a.message, dedupeKey: a.dedupeKey },
      });
      created++;
      const recipients = await alertRecipients(prisma, a.siteId);
      for (const u of recipients) {
        await notify(prisma, { userId: u.id, canal: "IN_APP", type: `alerte.${a.type.toLowerCase()}`, titre: "Alerte véhicule", message: a.message });
        if (u.email) await notify(prisma, { userId: u.id, canal: "EMAIL", to: u.email, type: `alerte.${a.type.toLowerCase()}`, titre: "Alerte véhicule", message: a.message, payload: { to: u.email } });
      }
    }
  }
  return created;
}
