/**
 * Logique du reversement (Flux 2, Bloc B2) — fonctions pures, testables.
 * Concerne les recettes Yango (schéma 2) : le chauffeur déclare sa recette et reverse ;
 * le système compare au montant attendu (recette − dépenses − frais Wave) à la tolérance près.
 */
// ACCEPTE = pas de manquant ; ECART_CONSTATE = manquant constaté automatiquement (dette).
// (ECART_A_VALIDER / RAPPROCHE : anciens statuts de la double validation, supprimée.)
export type ReversementStatut = "ACCEPTE" | "ECART_CONSTATE";

/** Frais Wave estimés (~1 %). Constante documentée — pourra devenir un paramètre de site. */
export const FRAIS_WAVE_PCT = 1;

export interface ReversementCalc {
  totalDepenses: number;
  frais: number;
  montantAttendu: number;
  ecart: number; // montantAttendu - montantReverse : positif = manquant (dette)
  statut: ReversementStatut;
}

/**
 * Calcule le montant attendu, l'écart et le statut d'un reversement.
 * Aucune tolérance : tout manquant (écart > 0), même minime, est constaté et donne lieu à
 * une dette chauffeur enregistrée automatiquement.
 */
export function computeReversement(
  recetteYango: number,
  depenses: number[],
  montantReverse: number,
  fraisPct: number = FRAIS_WAVE_PCT
): ReversementCalc {
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d) || 0), 0);
  const frais = Math.round((recetteYango * fraisPct) / 100);
  const montantAttendu = Math.max(0, recetteYango - totalDepenses - frais);
  const ecart = montantAttendu - montantReverse;
  const statut: ReversementStatut = ecart > 0 ? "ECART_CONSTATE" : "ACCEPTE";
  return { totalDepenses, frais, montantAttendu, ecart, statut };
}

/** Retard de reversement en minutes (par rapport à la fin du shift). */
export function retardReversement(checkoutAt: Date | null, reverseeAt: Date): number | null {
  if (!checkoutAt) return null;
  return Math.max(0, Math.round((reverseeAt.getTime() - new Date(checkoutAt).getTime()) / 60000));
}
