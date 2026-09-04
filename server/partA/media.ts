/**
 * Routes médias (Flux 7) — upload contrôlé et lecture cloisonnée par RBAC.
 * Un client externe ne peut lire que les fichiers rattachés à ses propres véhicules.
 */
import express from "express";
import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { authenticate, authorize, type AuthContext } from "../../lib/authz";
import { uploadMiddleware, processAndStore, UPLOAD_DIR } from "../../lib/upload";
import { canAccessVehicle } from "./vehicleAccess";
import { wrap, serverError, notFound } from "./helpers";

export function mediaRouter(prisma: PrismaClient): express.Router {
  const r = express.Router();
  r.use(authenticate(prisma));
  const actor = (req: express.Request) => (req as any).auth as AuthContext;

  // --- Upload d'un fichier (photo ou document) ---
  r.post(
    "/api/media",
    authorize("vehicule.creer", "vehicule.modifier", "document.gerer"),
    (req, res) => {
      uploadMiddleware(req, res, async (err: any) => {
        if (err) return res.status(400).json({ error: { fr: err.message || "Upload invalide", en: "Invalid upload" } });
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: { fr: "Aucun fichier reçu", en: "No file received" } });
        try {
          const media = await processAndStore(prisma, file, actor(req).userId);
          res.status(201).json(media);
        } catch (e) {
          console.error("[Media]", e);
          res.status(500).json({ error: serverError });
        }
      });
    }
  );

  // --- Lecture d'un fichier (contrôle d'accès) ---
  r.get(
    "/api/media/:id",
    wrap(async (req, res) => {
      const ctx = actor(req);
      const media = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
      if (!media) return res.status(404).json({ error: notFound });

      // Média rattaché à un véhicule → on applique le cloisonnement véhicule.
      if (media.resourceType === "FleetVehicle" && media.resourceId) {
        const v = await prisma.fleetVehicle.findUnique({ where: { id: media.resourceId }, select: { siteId: true, clientId: true } });
        if (!v || !canAccessVehicle(ctx, v)) return res.status(403).json({ error: { fr: "Accès refusé à ce fichier", en: "Access denied" } });
      } else {
        // Média non encore rattaché : seul l'auteur de l'upload peut le lire.
        if (media.uploadedById !== ctx.userId) return res.status(403).json({ error: { fr: "Accès refusé à ce fichier", en: "Access denied" } });
      }

      const filePath = path.join(UPLOAD_DIR, media.chemin);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: notFound });
      res.setHeader("Content-Type", media.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      fs.createReadStream(filePath).pipe(res);
    })
  );

  r.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Media]", err);
    res.status(500).json({ error: serverError });
  });

  return r;
}
