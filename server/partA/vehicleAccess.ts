/** Règles de visibilité d'un véhicule selon le profil (cloisonnement serveur). */
import type { AuthContext } from "../../lib/authz";

export interface VehicleScopeFields {
  siteId: string;
  clientId: string | null;
}

/**
 * Un utilisateur peut voir/gérer un véhicule si :
 *  - il a accès à tous les sites (Admin), ou
 *  - il est un contact du client propriétaire (client externe), ou
 *  - le véhicule appartient à l'un de ses sites de rattachement.
 */
export function canAccessVehicle(ctx: AuthContext, v: VehicleScopeFields): boolean {
  if (ctx.allSites) return true;
  if (ctx.clientId) return v.clientId === ctx.clientId; // client externe : uniquement ses véhicules
  return ctx.siteIds.includes(v.siteId);
}

/** Clause Prisma de liste des véhicules visibles par l'utilisateur. */
export function vehicleScopeWhere(ctx: AuthContext): Record<string, any> {
  if (ctx.allSites) return {};
  if (ctx.clientId) return { clientId: ctx.clientId };
  return { siteId: { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] } };
}
