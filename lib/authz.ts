/**
 * Couche d'autorisation — SAVER Fleet Ops (Partie A).
 *
 * - `authenticate` : vérifie le JWT (même secret que la couche legacy), charge le
 *   contexte RBAC de l'utilisateur (rôles, permissions, sites, client) et le pose
 *   sur `req.auth`.
 * - `authorize(...codes)` : exige au moins une des permissions ; renvoie 403 sinon.
 * - Helpers de cloisonnement par site / par client, appliqués côté serveur.
 *
 * La sécurité est appliquée AVANT tout : le masquage UI n'est qu'un confort.
 */
import type { PrismaClient } from "@prisma/client";
import type express from "express";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "./env";

export interface AuthContext {
  userId: string;
  name: string;
  email: string;
  legacyRole: string; // champ `role` historique
  roleCode: string | null; // code du rôle principal (nouveau système)
  secondaryRoleCode: string | null;
  permissions: Set<string>;
  siteIds: string[]; // sites de rattachement
  allSites: boolean; // permission site.acces_tous (Admin/Direction)
  clientId: string | null; // rattachement client externe
}

// Réponses d'erreur bilingues, cohérentes avec le style existant.
const ERR_AUTH = { fr: "Authentification requise", en: "Authentication required" };
const ERR_FORBIDDEN = { fr: "Accès refusé : permission insuffisante", en: "Access denied: insufficient permission" };

/** Charge le contexte RBAC complet d'un utilisateur à partir de son id. */
export async function loadAuthContext(
  prisma: PrismaClient,
  userId: string
): Promise<AuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      rolePrincipal: { include: { permissions: { include: { permission: true } } } },
      roleSecondaire: { include: { permissions: { include: { permission: true } } } },
      sites: true,
    },
  });
  if (!user || user.active === false) return null;

  const permissions = new Set<string>();
  for (const rp of user.rolePrincipal?.permissions ?? []) permissions.add(rp.permission.code);
  for (const rp of user.roleSecondaire?.permissions ?? []) permissions.add(rp.permission.code);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    legacyRole: user.role,
    roleCode: user.rolePrincipal?.code ?? null,
    secondaryRoleCode: user.roleSecondaire?.code ?? null,
    permissions,
    siteIds: user.sites.map((s) => s.siteId),
    allSites: permissions.has("site.acces_tous"),
    clientId: user.clientId ?? null,
  };
}

export function hasPermission(ctx: AuthContext, ...codes: string[]): boolean {
  return codes.some((c) => ctx.permissions.has(c));
}

/** Middleware : vérifie le JWT et charge `req.auth`. */
export function authenticate(prisma: PrismaClient) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: ERR_AUTH });
      }
      const token = header.slice(7);
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
      const ctx = await loadAuthContext(prisma, decoded.userId);
      if (!ctx) {
        return res.status(401).json({ error: { fr: "Session invalide", en: "Invalid session" } });
      }
      (req as any).auth = ctx;
      next();
    } catch {
      return res.status(401).json({ error: { fr: "Session expirée ou invalide", en: "Invalid or expired session" } });
    }
  };
}

/** Middleware : exige au moins une des permissions données. */
export function authorize(...codes: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ctx = (req as any).auth as AuthContext | undefined;
    if (!ctx) return res.status(401).json({ error: ERR_AUTH });
    if (!hasPermission(ctx, ...codes)) {
      return res.status(403).json({ error: ERR_FORBIDDEN, requise: codes });
    }
    next();
  };
}

/**
 * Clause Prisma de cloisonnement par site.
 * - Admin (site.acces_tous) : aucun filtre.
 * - Autres : restreint au(x) site(s) de rattachement (liste vide → aucun résultat).
 */
export function siteScopeWhere(ctx: AuthContext, field = "siteId"): Record<string, any> {
  if (ctx.allSites) return {};
  return { [field]: { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] } };
}

/** Vrai si l'utilisateur a le droit d'agir sur ce site précis. */
export function canAccessSite(ctx: AuthContext, siteId: string | null | undefined): boolean {
  if (ctx.allSites) return true;
  if (!siteId) return false;
  return ctx.siteIds.includes(siteId);
}

export const authzErrors = { ERR_AUTH, ERR_FORBIDDEN };
