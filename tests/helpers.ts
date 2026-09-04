/**
 * Utilitaires de test — app Express isolée (router Partie A uniquement) + jetons JWT.
 * Les tests s'appuient sur la base PostgreSQL de dev, déjà peuplée par `prisma db seed`.
 */
import express from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { ACCESS_TOKEN_SECRET } from "../lib/env";
import { createPartARouter } from "../server/partA/index";

export const prisma = new PrismaClient();

/** App Express minimale montant seulement les routes Partie A. */
export function buildApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(createPartARouter(prisma));
  return app;
}

/** Jeton d'accès pour un utilisateur (même secret que la couche d'auth réelle). */
export function tokenFor(userId: string): string {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

/** Comptes de démonstration seedés (un par profil). */
export const DEMO = {
  admin: "usr_admin",
  superviseur: "usr_superviseur",
  terrain: "usr_terrain",
  dispatcher: "usr_dispatcher",
  finance: "usr_finance",
  maintenance: "usr_maintenance",
  chauffeur: "usr_chauffeur",
  banque: "usr_banque",
  client: "usr_client",
} as const;

export type DemoKey = keyof typeof DEMO;
