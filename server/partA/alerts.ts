/**
 * Routes alertes & notifications (Flux 7).
 * - Consultation des alertes (cloisonnée par site).
 * - Déclenchement manuel du moteur d'alertes (admin) — le job tourne aussi chaque jour.
 * - Notifications in-app de l'utilisateur connecté.
 */
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { runVehicleAlerts } from "../../lib/alerts";
import { wrap, serverError } from "./helpers";

export function alertsRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  r.get(
    "/api/fleet/alerts",
    authorize("alerte.voir"),
    wrap(async (req, res) => {
      const ctx = actor(req);
      const where: any = { status: (req.query.status as string) || "OUVERTE" };
      if (!ctx.allSites) where.siteId = { in: ctx.siteIds.length ? ctx.siteIds : ["__none__"] };
      const alerts = await prisma.alert.findMany({ where, orderBy: [{ severity: "desc" }, { createdAt: "desc" }], take: 200 });
      res.json({ alerts });
    })
  );

  // Déclenchement manuel (le moteur tourne automatiquement chaque jour).
  r.post(
    "/api/fleet/alerts/run",
    authorize("parametre.modifier"),
    wrap(async (_req, res) => {
      const created = await runVehicleAlerts(prisma);
      res.json({ created });
    })
  );

  // Notifications in-app de l'utilisateur connecté.
  r.get(
    "/api/fleet/notifications/me",
    wrap(async (req, res) => {
      const ctx = actor(req);
      const notifications = await prisma.notification.findMany({
        where: { userId: ctx.userId, canal: "IN_APP" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json({ notifications });
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Alerts]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
