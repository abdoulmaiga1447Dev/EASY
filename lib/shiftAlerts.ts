/**
 * Minuteur 15 min (Flux 1) : alerte le Responsable terrain si un shift attribué
 * n'a pas démarré (aucun check-in) au-delà du délai après l'heure prévue.
 * Idempotent via ShiftRecord.alerteRetardEnvoyee.
 */
import type { PrismaClient } from "@prisma/client";
import { notify } from "./notifications";
import { normalizeDay } from "./assignment";
import { shiftStartDate, isRetardDemarrage, type ShiftCode } from "./shift";

const DELAI_MINUTES = 15;

/** Utilisateurs actifs ayant une permission donnée sur un site. */
async function recipientsWithPermission(prisma: PrismaClient, siteId: string, code: string) {
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

/** Parcourt les attributions du jour et alerte pour les shifts en retard de démarrage. */
export async function runShiftLateAlerts(prisma: PrismaClient, now = new Date()): Promise<number> {
  const day = normalizeDay(now);
  const sites = await prisma.site.findMany({ where: { active: true } });
  const settingsBySite = new Map<string, { shiftADebut: string; shiftBDebut: string }>();
  for (const s of sites) {
    const st = await prisma.siteSettings.findFirst({ where: { siteId: s.id }, orderBy: { version: "desc" } });
    settingsBySite.set(s.id, { shiftADebut: st?.shiftADebut ?? "06:00", shiftBDebut: st?.shiftBDebut ?? "15:00" });
  }

  const assignments = await prisma.assignment.findMany({
    where: { date: day },
    include: { shiftRecord: true, driver: { select: { name: true } }, vehicle: { select: { immatriculation: true } } },
  });

  let sent = 0;
  for (const a of assignments) {
    // Déjà démarré (check-in fait) ou déjà alerté → on saute.
    if (a.shiftRecord && (a.shiftRecord.statut !== "EN_ATTENTE" || a.shiftRecord.alerteRetardEnvoyee)) continue;
    const settings = settingsBySite.get(a.siteId) ?? { shiftADebut: "06:00", shiftBDebut: "15:00" };
    const start = shiftStartDate(a.date, a.shift as ShiftCode, settings);
    if (!isRetardDemarrage(start, now, DELAI_MINUTES)) continue;

    const heure = start.toISOString().slice(11, 16);
    const message = `${a.driver?.name ?? "Un chauffeur"} n'a pas démarré son shift prévu à ${heure} (véhicule ${a.vehicle?.immatriculation ?? "?"}).`;

    // Marque l'alerte (crée le ShiftRecord EN_ATTENTE si absent) — anti-doublon.
    if (a.shiftRecord) await prisma.shiftRecord.update({ where: { id: a.shiftRecord.id }, data: { alerteRetardEnvoyee: true } });
    else await prisma.shiftRecord.create({ data: { assignmentId: a.id, driverId: a.driverId, vehicleId: a.vehicleId, siteId: a.siteId, date: a.date, shift: a.shift, statut: "EN_ATTENTE", alerteRetardEnvoyee: true } });

    const recipients = await recipientsWithPermission(prisma, a.siteId, "shift.superviser");
    for (const u of recipients) {
      await notify(prisma, { userId: u.id, canal: "IN_APP", type: "shift.retard", titre: "Shift non démarré", message });
      if (u.phone) await notify(prisma, { userId: u.id, canal: "WHATSAPP", to: u.phone, type: "shift.retard", titre: "Shift non démarré", message, payload: { to: u.phone } });
    }
    sent++;
  }
  return sent;
}
