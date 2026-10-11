/**
 * Logique de la panne (Flux 4, Bloc C2) — fonctions pures, testables.
 */

/** Champs obligatoires à la déclaration d'une panne : description + au moins une photo. */
export function panneMissing(body: any): string[] {
  const miss: string[] = [];
  if (!body?.description || !String(body.description).trim()) miss.push("description");
  const photos = Array.isArray(body?.photos) ? body.photos.filter(Boolean) : [];
  if (!photos.length) miss.push("photos");
  return miss;
}

/** Vrai si la qualification immobilise le véhicule (panne critique). */
export function immobilisePourGravite(gravite: string): boolean {
  return gravite === "CRITIQUE";
}
