/**
 * Uploads (Flux 7) — réception en mémoire (multer), validation type/taille,
 * compression des images (jimp), écriture sur disque dans uploads/ et création
 * d'un MediaAsset. L'accès en lecture est contrôlé par RBAC (voir media router).
 */
import multer from "multer";
import { Jimp } from "jimp";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_IMAGE_DIM = 1600; // px (côté le plus long)

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** Middleware multer : un seul fichier sous le champ « file », gardé en mémoire. */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Type de fichier non autorisé"));
  },
}).single("file");

export interface StoredMedia {
  id: string;
  kind: string;
  mime: string;
  taille: number;
}

/** Compresse (si image), écrit le fichier et enregistre le MediaAsset. */
export async function processAndStore(
  prisma: PrismaClient,
  file: { buffer: Buffer; mimetype: string; originalname: string },
  uploadedById: string | null
): Promise<StoredMedia> {
  let buffer = file.buffer;
  let mime = file.mimetype;
  let ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1];
  const kind = mime === "application/pdf" ? "pdf" : "image";

  if (kind === "image") {
    try {
      const img = await Jimp.read(buffer);
      if (img.bitmap.width > MAX_IMAGE_DIM || img.bitmap.height > MAX_IMAGE_DIM) {
        img.scaleToFit({ w: MAX_IMAGE_DIM, h: MAX_IMAGE_DIM });
      }
      buffer = await img.getBuffer("image/jpeg", { quality: 80 });
      mime = "image/jpeg";
      ext = "jpg";
    } catch (err) {
      console.error("[Upload] compression échouée, fichier conservé tel quel :", err);
    }
  }

  const fileName = `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

  const media = await prisma.mediaAsset.create({
    data: {
      kind,
      mime,
      taille: buffer.length,
      chemin: fileName,
      originalName: file.originalname,
      uploadedById,
    },
  });
  return { id: media.id, kind, mime, taille: buffer.length };
}
