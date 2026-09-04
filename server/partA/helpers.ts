/** Utilitaires partagés par les routers Partie A. */
import { randomBytes } from "crypto";

/** Génère un identifiant lisible et unique pour les tables legacy (sans @default). */
export function genId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

/** Mot de passe temporaire lisible (à communiquer au nouvel utilisateur). */
export function tempPassword(): string {
  // 4 octets → 8 caractères hex + un suffixe pour satisfaire les règles courantes.
  return `Easy-${randomBytes(4).toString("hex")}`;
}

/** Enveloppe async pour propager les erreurs vers le gestionnaire Express. */
export function wrap(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => fn(req, res, next).catch(next);
}

export const serverError = { fr: "Erreur serveur", en: "Server error" };
export const notFound = { fr: "Ressource introuvable", en: "Resource not found" };
export const badRequest = (fr: string, en: string) => ({ error: { fr, en } });
