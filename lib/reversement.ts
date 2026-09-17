/**
 * Logique du reversement (Flux 2, Bloc B2) — fonctions pures, testables.
 * Concerne les recettes Yango (schéma 2) : le chauffeur déclare sa recette et reverse ;
 * le système compare au montant attendu (recette − dépenses − frais Wave) à la tolérance près.
 */
export type ReversementStatut = "ACCEPTE" | "ECART_A_VALIDER" | "RAPPROCHE";

/** Frais Wave estimés (~1 %). Constante documentée — pourra devenir un paramètre de site. */
export const FRAIS_WAVE_PCT = 1;

export interface ReversementCalc {
  totalDepenses: number;
  frais: number;
  montantAttendu: number;
  ecart: number; // montantAttendu - montantReverse : positif = manquant (dette potentielle)
  statut: ReversementStatut;
}

/**
 * Calcule le montant attendu, l'écart et le statut d'un reversement.
 * @param tolerance tolérance d'écart (ex. 5 000 FCFA) — au-delà, double validation requise.
 */
export function computeReversement(
  recetteYango: number,
  depenses: number[],
  montantReverse: number,
  tolerance: number,
  fraisPct: number = FRAIS_WAVE_PCT
): ReversementCalc {
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d) || 0), 0);
  const frais = Math.round((recetteYango * fraisPct) / 100);
  const montantAttendu = Math.max(0, recetteYango - totalDepenses - frais);
  const ecart = montantAttendu - montantReverse;
  const statut: ReversementStatut = Math.abs(ecart) <= tolerance ? "ACCEPTE" : "ECART_A_VALIDER";
  return { totalDepenses, frais, montantAttendu, ecart, statut };
}

/** Retard de reversement en minutes (par rapport à la fin du shift). */
export function retardReversement(checkoutAt: Date | null, reverseeAt: Date): number | null {
  if (!checkoutAt) return null;
  return Math.max(0, Math.round((reverseeAt.getTime() - new Date(checkoutAt).getTime()) / 60000));
}
