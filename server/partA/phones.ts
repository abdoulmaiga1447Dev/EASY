/**
 * Routes téléphones + SIM (matériel propriété SAVER, Flux 7).
 * Le Superviseur Logistique enregistre le matériel, l'affecte à un véhicule et le
 * récupère en fin de contrat. Cloisonnement par site côté serveur.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, canAccessSite, siteScopeWhere, type AuthContext } from "../../lib/authz";
import { writeAudit } from "../../lib/audit";
import { wrap, serverError, notFound } from "./helpers";

export function phonesRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  r.get(
    "/api/fleet/phones",
    authorize("telephone.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where = ctx.allSites ? {} : siteScopeWhere(ctx);
      const phones = await prisma.devicePhone.findMany({ where, orderBy: { createdAt: "desc" }, include: { vehicle: { select: { immatriculation: true } } } });
      res.json({ phones });
    })
  );

  r.post(
    "/api/fleet/phones",
    authorize("telephone.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const { numero, imei, operateur, siteId } = req.body || {};
      if (!numero) return res.status(400).json({ error: { fr: "Le numéro est obligatoire", en: "Number is required" } });
      if (siteId && !canAccessSite(ctx, siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });
      const phone = await prisma.devicePhone.create({ data: { numero, imei: imei || null, operateur: operateur || null, siteId: siteId || null } });
      await writeAudit(prisma, ctx, { action: "phone.create", resourceType: "DevicePhone", resourceId: phone.id, siteId: siteId || null, after: phone });
      res.status(201).json(phone);
    })
  );

  r.put(
    "/api/fleet/phones/:id",
    authorize("telephone.gerer"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const before = await prisma.devicePhone.findUnique({ where: { id: req.params.id } });
      if (!before) return res.status(404).json({ error: notFound });
      if (before.siteId && !canAccessSite(ctx, before.siteId)) return res.status(403).json({ error: { fr: "Site hors de votre périmètre", en: "Site outside your scope" } });

      const { numero, imei, operateur, statut, vehicleId, dateRecuperation } = req.body || {};
      const data: any = {};
      if (numero !== undefined) data.numero = numero;
      if (imei !== undefined) data.imei = imei;
      if (operateur !== undefined) data.operateur = operateur;
      if (statut !== undefined) data.statut = statut;
      if (vehicleId !== undefined) {
        data.vehicleId = vehicleId || null;
        data.dateAffectation = vehicleId ? new Date() : null;
      }
      if (dateRecuperation !== undefined) data.dateRecuperation = dateRecuperation ? new Date(dateRecuperation) : null;

      const phone = await prisma.devicePhone.update({ where: { id: before.id }, data });
      await writeAudit(prisma, ctx, { action: "phone.update", resourceType: "DevicePhone", resourceId: phone.id, siteId: phone.siteId, before, after: phone });
      res.json(phone);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Phones]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
