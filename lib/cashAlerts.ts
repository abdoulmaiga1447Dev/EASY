/**
 * Exception cash (Flux 2) : alerte Finance si une compensation cash n'est pas
 * régularisée à J+1. Idempotent via alerteJ1Envoyee. Appelé par le job quotidien.
 */
import type { PrismaClient } from "@prisma/client";
import { notify } from "./notifications";
import { normalizeDay } from "./assignment";

async function financeRecipients(prisma: PrismaClient, siteId: string) {
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
    if (!codes.has("reversement.voir")) return false;
    return codes.has("site.acces_tous") || u.sites.some((s) => s.siteId === siteId);
  });
}

/** Alerte Finance pour toute compensation cash non régularisée depuis plus d'un jour. */
export async function runCashRegulAlerts(prisma: PrismaClient, now = new Date()): Promise<number> {
  const today = normalizeDay(now); // les compensations créées avant aujourd'hui sont en retard (> J+1)
  const enRetard = await prisma.compensationCash.findMany({
    where: { statut: "EN_ATTENTE_REGUL", alerteJ1Envoyee: false, createdAt: { lt: today } },
  });
  let sent = 0;
  for (const c of enRetard) {
    await prisma.compensationCash.update({ where: { id: c.id }, data: { alerteJ1Envoyee: true } });
    const msg = `Compensation cash de ${c.montant} FCFA non régularisée (déclarée le ${c.createdAt.toISOString().slice(0, 10)}).`;
    for (const u of await financeRecipients(prisma, c.siteId)) {
      await notify(prisma, { userId: u.id, canal: "IN_APP", type: "cash.regul_retard", titre: "Régularisation cash en retard", message: msg });
    }
    sent++;
  }
  return sent;
}
