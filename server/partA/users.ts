/**
 * Routes utilisateurs & clients externes.
 * - CRUD utilisateurs avec cloisonnement par site (on ne gère que des comptes de ses sites).
 * - Règle métier : la création d'un compte chauffeur est ouverte à `utilisateur.creer`
 *   OU `chauffeur.creer` (le Responsable terrain peut se voir accorder ce droit).
 * - Jamais de suppression physique : activation / désactivation (soft delete).
 */
import express from "express";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, hasPermission, canAccessSite, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { genId, tempPassword, wrap, serverError, notFound } from "./helpers";

function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    roleCode: u.rolePrincipal?.code ?? u.role ?? null,
    roleNom: u.rolePrincipal?.nom ?? null,
    secondaryRoleCode: u.roleSecondaire?.code ?? null,
    active: u.active,
    clientId: u.clientId ?? null,
    siteIds: (u.sites ?? []).map((s: any) => s.siteId),
    createdAt: u.createdAt,
  };
}

export function usersRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  const userInclude = {
    rolePrincipal: true,
    roleSecondaire: true,
    sites: true,
  } as const;

  // Vrai si l'acteur peut gérer l'utilisateur cible (partage d'au moins un site, ou admin).
  const inScope = (ctx: AuthContext, target: any) =>
    ctx.allSites || (target.sites ?? []).some((s: any) => ctx.siteIds.includes(s.siteId));

  // ------------------------------ Liste ------------------------------
  r.get(
    "/api/users",
    authorize("utilisateur.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where = ctx.allSites ? {} : { sites: { some: { siteId: { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] } } } };
      const users = await prisma.user.findMany({ where, include: userInclude, orderBy: { createdAt: "asc" } });
      res.json({ users: users.map(publicUser) });
    })
  );

  r.get(
    "/api/users/:id",
    authorize("utilisateur.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: userInclude });
      if (!u) return res.status(404).json({ error: notFound });
      if (!inScope(ctx, u)) return res.status(403).json({ error: { fr: "Utilisateur hors de votre périmètre", en: "User outside your scope" } });
      res.json(publicUser(u));
    })
  );

  // ------------------------------ Création ------------------------------
  r.post(
    "/api/users",
    authorize("utilisateur.creer", "chauffeur.creer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { name, email, phone, roleCode, secondaryRoleCode, siteIds, password, clientId, driver } = req.body || {};
      if (!name || !email || !roleCode) {
        return res.status(400).json({ error: { fr: "Nom, email et rôle sont obligatoires", en: "Name, email and role are required" } });
      }

      // Règle chauffeur : `chauffeur.creer` seul ne permet QUE de créer des chauffeurs.
      if (roleCode !== "chauffeur" && !hasPermission(ctx, "utilisateur.creer")) {
        return res.status(403).json({ error: { fr: "Vous ne pouvez créer que des comptes chauffeur", en: "You may only create driver accounts" } });
      }

      const role = await prisma.role.findUnique({ where: { code: roleCode } });
      if (!role) return res.status(400).json({ error: { fr: "Rôle inconnu", en: "Unknown role" } });
      let secondaryRoleId: string | null = null;
      if (secondaryRoleCode) {
        const sr = await prisma.role.findUnique({ where: { code: secondaryRoleCode } });
        if (!sr) return res.status(400).json({ error: { fr: "Rôle secondaire inconnu", en: "Unknown secondary role" } });
        secondaryRoleId = sr.id;
      }

      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) return res.status(409).json({ error: { fr: "Cet email est déjà utilisé", en: "Email already in use" } });

      // Cloisonnement : on ne peut rattacher qu'à ses propres sites.
      const wantedSites: string[] = Array.isArray(siteIds) ? siteIds : [];
      if (!ctx.allSites) {
        const outside = wantedSites.filter((s) => !ctx.siteIds.includes(s));
        if (outside.length) return res.status(403).json({ error: { fr: "Sites hors de votre périmètre", en: "Sites outside your scope" } });
      }

      const plain = typeof password === "string" && password.length >= 6 ? password : tempPassword();
      const passwordHash = await bcrypt.hash(plain, 10);
      const generated = plain !== password;

      const id = genId("usr");
      const user = await prisma.user.create({
        data: {
          id,
          name,
          email,
          phone: phone || "",
          passwordHash,
          role: roleCode, // miroir legacy
          createdAt: new Date().toISOString(),
          roleId: role.id,
          secondaryRoleId,
          clientId: clientId ?? null,
          active: true,
          sites: { create: wantedSites.map((siteId) => ({ siteId })) },
        },
        include: userInclude,
      });

      if (roleCode === "chauffeur") {
        await prisma.driverProfile.create({
          data: {
            userId: id,
            siteId: driver?.siteId ?? wantedSites[0] ?? null,
            zoneId: driver?.zoneId ?? null,
            permisNumero: driver?.permisNumero ?? null,
            permisExpiration: driver?.permisExpiration ? new Date(driver.permisExpiration) : null,
            dateEntree: driver?.dateEntree ? new Date(driver.dateEntree) : new Date(),
            statut: "actif",
          },
        });
      }

      await writeAudit(prisma, ctx, { action: "user.create", resourceType: "User", resourceId: id, after: publicUser(user) });
      res.status(201).json({ user: publicUser(user), motDePasseTemporaire: generated ? plain : undefined });
    })
  );

  // ------------------------------ Modification ------------------------------
  r.put(
    "/api/users/:id",
    authorize("utilisateur.modifier"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const before = await prisma.user.findUnique({ where: { id: req.params.id }, include: userInclude });
      if (!before) return res.status(404).json({ error: notFound });
      if (!inScope(ctx, before)) return res.status(403).json({ error: { fr: "Utilisateur hors de votre périmètre", en: "User outside your scope" } });

      const { name, phone, roleCode, secondaryRoleCode, siteIds } = req.body || {};
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone;
      if (roleCode !== undefined) {
        const role = await prisma.role.findUnique({ where: { code: roleCode } });
        if (!role) return res.status(400).json({ error: { fr: "Rôle inconnu", en: "Unknown role" } });
        data.roleId = role.id;
        data.role = roleCode;
      }
      if (secondaryRoleCode !== undefined) {
        if (secondaryRoleCode === null) data.secondaryRoleId = null;
        else {
          const sr = await prisma.role.findUnique({ where: { code: secondaryRoleCode } });
          if (!sr) return res.status(400).json({ error: { fr: "Rôle secondaire inconnu", en: "Unknown secondary role" } });
          data.secondaryRoleId = sr.id;
        }
      }

      if (Array.isArray(siteIds)) {
        if (!ctx.allSites) {
          const outside = siteIds.filter((s: string) => !ctx.siteIds.includes(s));
          if (outside.length) return res.status(403).json({ error: { fr: "Sites hors de votre périmètre", en: "Sites outside your scope" } });
        }
        await prisma.userSite.deleteMany({ where: { userId: before.id } });
        if (siteIds.length) await prisma.userSite.createMany({ data: siteIds.map((siteId: string) => ({ userId: before.id, siteId })), skipDuplicates: true });
      }

      const user = await prisma.user.update({ where: { id: before.id }, data, include: userInclude });
      await writeAudit(prisma, ctx, { action: "user.update", resourceType: "User", resourceId: user.id, before: publicUser(before), after: publicUser(user) });
      res.json(publicUser(user));
    })
  );

  // --------------------- Activation / désactivation (soft delete) ---------------------
  const setActive = (active: boolean) =>
    wrap(async (req: express.Request, res: express.Response) => {
      const ctx = actor(req);
      const before = await prisma.user.findUnique({ where: { id: req.params.id }, include: userInclude });
      if (!before) return res.status(404).json({ error: notFound });
      if (!inScope(ctx, before)) return res.status(403).json({ error: { fr: "Utilisateur hors de votre périmètre", en: "User outside your scope" } });
      if (before.id === ctx.userId && !active) {
        return res.status(400).json({ error: { fr: "Vous ne pouvez pas désactiver votre propre compte", en: "You cannot deactivate your own account" } });
      }
      const user = await prisma.user.update({ where: { id: before.id }, data: { active }, include: userInclude });
      await writeAudit(prisma, ctx, { action: active ? "user.activate" : "user.deactivate", resourceType: "User", resourceId: user.id, before: publicUser(before), after: publicUser(user) });
      res.json(publicUser(user));
    });

  r.post("/api/users/:id/activate", authorize("utilisateur.activer"), setActive(true));
  r.post("/api/users/:id/deactivate", authorize("utilisateur.activer"), setActive(false));

  // ------------------------------ Clients externes ------------------------------
  r.get(
    "/api/clients",
    authorize("client.gerer"),
    wrap(async (_req, res) => {
      const clients = await prisma.client.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { contacts: true } } } });
      res.json({ clients });
    })
  );

  r.post(
    "/api/clients",
    authorize("client.gerer"),
    wrap(async (req, res) => {
      const { raisonSociale, contactNom, contactEmail, contactPhone } = req.body || {};
      if (!raisonSociale) return res.status(400).json({ error: { fr: "La raison sociale est obligatoire", en: "Company name is required" } });
      const client = await prisma.client.create({ data: { raisonSociale, contactNom, contactEmail, contactPhone } });
      await writeAudit(prisma, actor(req), { action: "client.create", resourceType: "Client", resourceId: client.id, after: client });
      res.status(201).json(client);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Users]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
