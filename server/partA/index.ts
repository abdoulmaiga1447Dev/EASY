/**
 * Assemble tous les routers de la Partie A (SAVER Fleet Ops) en un seul router Express,
 * monté dans server.ts. Fournit aussi :
 *  - GET /api/context : le contexte RBAC du user connecté (pour piloter l'affichage front) ;
 *  - GET /api/audit   : le journal d'audit (cloisonné par site).
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { wrap, serverError } from "./helpers";
import { rbacRouter } from "./rbac";
import { orgRouter } from "./org";
import { usersRouter } from "./users";

export function createPartARouter(prisma: PrismaClient): express.Router {
  const root = express.Router();

  // --- Contexte RBAC du user connecté ---
  root.get(
    "/api/context",
    authenticate(prisma),
    wrap(async (req, res) => {
      const ctx = (req as any).auth as AuthContext;
      const sites = ctx.siteIds.length
        ? await prisma.site.findMany({ where: { id: { in: ctx.siteIds } }, select: { id: true, nom: true, ville: true } })
        : [];
      res.json({
        userId: ctx.userId,
        name: ctx.name,
        email: ctx.email,
        roleCode: ctx.roleCode,
        secondaryRoleCode: ctx.secondaryRoleCode,
        permissions: [...ctx.permissions],
        siteIds: ctx.siteIds,
        sites,
        allSites: ctx.allSites,
        clientId: ctx.clientId,
      });
    })
  );

  // --- Journal d'audit (cloisonné par site) ---
  const auditRouter = express.Router();
  auditRouter.use(authenticate(prisma));
  auditRouter.get(
    "/api/audit",
    authorize("audit.voir"),
    wrap(async (req, res) => {
      const ctx = (req as any).auth as AuthContext;
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
      const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;
      // Admin (allSites) voit tout ; sinon les entrées de ses sites (+ celles sans site rattaché).
      const where = ctx.allSites ? {} : { OR: [{ siteId: { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] } }, { siteId: null }] };
      const [entries, total] = await Promise.all([
        prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
        prisma.auditLog.count({ where }),
      ]);
      res.json({ entries, total, limit, offset });
    })
  );
  auditRouter.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Audit route]", err);
    res.status(500).json({ error: serverError });
  });

  root.use(rbacRouter(prisma));
  root.use(orgRouter(prisma));
  root.use(usersRouter(prisma));
  root.use(auditRouter);

  return root;
}
