/**
 * Routes RBAC — permissions et rôles éditables.
 * Admin/Direction administre ici qui voit/modifie quoi (associations rôle↔permission
 * modifiables en base). Toutes les modifications sont tracées au journal d'audit.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { PERMISSIONS } from "../../lib/rbac";
import { genId, wrap, serverError, notFound } from "./helpers";

export function rbacRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));

  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // --- Permissions : catalogue (lecture) ---
  r.get(
    "/api/permissions",
    authorize("role.voir"),
    wrap(async (_req, res) => {
      const perms = await prisma.permission.findMany({ orderBy: [{ categorie: "asc" }, { code: "asc" }] });
      res.json({ permissions: perms, catalogue: PERMISSIONS });
    })
  );

  // --- Rôles : liste avec leurs permissions ---
  r.get(
    "/api/roles",
    authorize("role.voir"),
    wrap(async (_req, res) => {
      const roles = await prisma.role.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { usersPrincipal: true, usersSecondaire: true } },
        },
      });
      res.json({
        roles: roles.map((role) => ({
          id: role.id,
          code: role.code,
          nom: role.nom,
          description: role.description,
          isSystem: role.isSystem,
          active: role.active,
          nbUtilisateurs: role._count.usersPrincipal + role._count.usersSecondaire,
          permissions: role.permissions.map((p) => p.permission.code),
        })),
      });
    })
  );

  r.get(
    "/api/roles/:id",
    authorize("role.voir"),
    wrap(async (req, res) => {
      const role = await prisma.role.findUnique({
        where: { id: req.params.id },
        include: { permissions: { include: { permission: true } } },
      });
      if (!role) return res.status(404).json({ error: notFound });
      res.json({
        ...role,
        permissions: role.permissions.map((p) => p.permission.code),
      });
    })
  );

  // --- Créer un rôle ---
  r.post(
    "/api/roles",
    authorize("role.creer"),
    wrap(async (req, res) => {
      const { code, nom, description } = req.body || {};
      if (!code || !nom) {
        return res.status(400).json({ error: { fr: "Le code et le nom sont obligatoires", en: "Code and name are required" } });
      }
      const existing = await prisma.role.findUnique({ where: { code } });
      if (existing) {
        return res.status(409).json({ error: { fr: "Ce code de rôle existe déjà", en: "Role code already exists" } });
      }
      const role = await prisma.role.create({ data: { id: genId("role"), code, nom, description: description ?? null } });
      await writeAudit(prisma, actor(req), { action: "role.create", resourceType: "Role", resourceId: role.id, after: role });
      res.status(201).json(role);
    })
  );

  // --- Modifier un rôle (nom, description, activation) ---
  r.put(
    "/api/roles/:id",
    authorize("role.modifier"),
    wrap(async (req, res) => {
      const before = await prisma.role.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: notFound });
      const { nom, description, active } = req.body || {};
      const role = await prisma.role.update({
        where: { id: req.params.id },
        data: {
          nom: nom ?? before.nom,
          description: description === undefined ? before.description : description,
          active: typeof active === "boolean" ? active : before.active,
        },
      });
      await writeAudit(prisma, actor(req), { action: "role.update", resourceType: "Role", resourceId: role.id, before, after: role });
      res.json(role);
    })
  );

  // --- Supprimer un rôle (interdit si système ou utilisé) ---
  r.delete(
    "/api/roles/:id",
    authorize("role.supprimer"),
    wrap(async (req, res) => {
      const role = await prisma.role.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { usersPrincipal: true, usersSecondaire: true } } },
      });
      if (!role) return res.status(404).json({ error: notFound });
      if (role.isSystem) {
        return res.status(400).json({ error: { fr: "Un rôle système ne peut pas être supprimé", en: "A system role cannot be deleted" } });
      }
      if (role._count.usersPrincipal + role._count.usersSecondaire > 0) {
        return res.status(409).json({ error: { fr: "Ce rôle est encore attribué à des utilisateurs", en: "Role still assigned to users" } });
      }
      await prisma.role.delete({ where: { id: role.id } });
      await writeAudit(prisma, actor(req), { action: "role.delete", resourceType: "Role", resourceId: role.id, before: role });
      res.json({ ok: true });
    })
  );

  // --- Modifier les permissions d'un rôle (cœur de l'admin RBAC) ---
  r.put(
    "/api/roles/:id/permissions",
    authorize("permission.assigner"),
    wrap(async (req, res) => {
      const role = await prisma.role.findUnique({
        where: { id: req.params.id },
        include: { permissions: { include: { permission: true } } },
      });
      if (!role) return res.status(404).json({ error: notFound });

      const codes: string[] = Array.isArray(req.body?.permissionCodes) ? req.body.permissionCodes : [];
      const perms = await prisma.permission.findMany({ where: { code: { in: codes } } });
      const foundCodes = new Set(perms.map((p) => p.code));
      const unknown = codes.filter((c) => !foundCodes.has(c));
      if (unknown.length) {
        return res.status(400).json({ error: { fr: `Permissions inconnues : ${unknown.join(", ")}`, en: `Unknown permissions: ${unknown.join(", ")}` } });
      }

      const before = role.permissions.map((p) => p.permission.code).sort();
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
        prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        }),
      ]);
      const after = [...foundCodes].sort();
      await writeAudit(prisma, actor(req), {
        action: "role.permissions.update",
        resourceType: "Role",
        resourceId: role.id,
        before: { permissions: before },
        after: { permissions: after },
      });
      res.json({ id: role.id, code: role.code, permissions: after });
    })
  );

  // Gestionnaire d'erreurs local.
  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[RBAC]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
