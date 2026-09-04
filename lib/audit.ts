/**
 * Journal d'audit — trace chaque action sensible (auteur, horodatage, avant/après).
 * Volontairement tolérant : une écriture d'audit qui échoue ne doit jamais faire
 * échouer l'action métier (on logue l'erreur et on continue).
 */
import type { PrismaClient } from "@prisma/client";
import type { AuthContext } from "./authz";

export interface AuditEntry {
  action: string; // ex. "role.permissions.update"
  resourceType: string; // ex. "Role"
  resourceId?: string | null;
  siteId?: string | null;
  before?: unknown;
  after?: unknown;
}

export async function writeAudit(
  prisma: PrismaClient,
  actor: Pick<AuthContext, "userId" | "name"> | null,
  entry: AuditEntry
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.userId ?? null,
        actorName: actor?.name ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        siteId: entry.siteId ?? null,
        before: entry.before === undefined ? undefined : (entry.before as any),
        after: entry.after === undefined ? undefined : (entry.after as any),
      },
    });
  } catch (err) {
    console.error("[Audit] Échec d'écriture du journal d'audit :", err);
  }
}
