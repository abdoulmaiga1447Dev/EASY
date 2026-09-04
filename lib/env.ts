/**
 * Secrets partagés entre le monolithe legacy (server.ts) et les modules Partie A.
 * On réplique volontairement les mêmes valeurs/fallbacks que server.ts pour que les
 * tokens émis par la couche d'auth existante restent vérifiables par les nouvelles routes.
 *
 * NB : les fallbacks en dur correspondent à l'incohérence #7 du CLAUDE.md (à traiter
 * globalement dans un chantier dédié). En dev/prod, JWT_SECRET est fourni via .env.
 */
export const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET || "ev_premium_access_secret_123456";
export const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || "ev_premium_refresh_secret_78910";
