/**
 * Recharge payée par le Superviseur — logique pure (testable sans base).
 *
 * Parcours : le chauffeur DEMANDE → le Superviseur indique la borne (PRISE_EN_CHARGE)
 * → le chauffeur, sur place, envoie les photos QR code + tableau de bord (SUR_PLACE)
 * → le Superviseur paie (PAYEE) → le chauffeur branche puis envoie la photo de fin
 * (TERMINEE). L'argent ne passe jamais par le chauffeur.
 */

export type DemandeStatut = "DEMANDEE" | "PRISE_EN_CHARGE" | "SUR_PLACE" | "PAYEE" | "TERMINEE" | "ANNULEE";

/** % de batterie visé par défaut pour proposer un montant (repère courant pour préserver la batterie). */
export const SOC_CIBLE = 80;

/** Statuts « ouverts » : la demande est en cours. */
export const STATUTS_OUVERTS: DemandeStatut[] = ["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE", "PAYEE"];

/** Statuts où le Superviseur doit agir (indiquer la borne / payer). */
export const STATUTS_ACTION_SUPERVISEUR: DemandeStatut[] = ["DEMANDEE", "SUR_PLACE"];

export const estOuverte = (s: DemandeStatut) => STATUTS_OUVERTS.includes(s);

/** Transitions autorisées, par action. */
export const TRANSITIONS = {
  indiquerBorne: ["DEMANDEE", "PRISE_EN_CHARGE"] as DemandeStatut[], // → PRISE_EN_CHARGE
  surPlace: ["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE"] as DemandeStatut[], // → SUR_PLACE (renvoi possible)
  payer: ["SUR_PLACE"] as DemandeStatut[], // → PAYEE
  terminer: ["PAYEE"] as DemandeStatut[], // → TERMINEE
  annulerChauffeur: ["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE"] as DemandeStatut[], // pas après paiement
  annulerSuperviseur: ["DEMANDEE", "PRISE_EN_CHARGE", "SUR_PLACE", "PAYEE"] as DemandeStatut[],
};

export function peut(action: keyof typeof TRANSITIONS, statut: DemandeStatut): boolean {
  return TRANSITIONS[action].includes(statut);
}

/** Pourcentage de batterie valide (entier 0–100). */
export function socValide(v: unknown): number | null {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 0 && r <= 100 ? r : null;
}

/**
 * Montant proposé au Superviseur : kWh nécessaires pour passer de socDebut à la cible,
 * multipliés par le prix du kWh de la borne (arrondi à 50 F supérieurs).
 * Sans capacité connue → rien ; sans prix connu → seulement les kWh.
 */
export function suggestionRecharge(p: {
  socDebut: number;
  capaciteBatterieKwh: number | null | undefined;
  prixKwh: number | null | undefined;
  cible?: number;
}): { kwhEstime: number | null; montantSuggere: number | null } {
  const cible = p.cible ?? SOC_CIBLE;
  if (!p.capaciteBatterieKwh || p.capaciteBatterieKwh <= 0) return { kwhEstime: null, montantSuggere: null };
  const manque = Math.max(0, cible - p.socDebut);
  const kwhEstime = Math.round(((manque / 100) * p.capaciteBatterieKwh) * 10) / 10;
  if (!p.prixKwh || p.prixKwh <= 0) return { kwhEstime, montantSuggere: null };
  const montantSuggere = Math.ceil((kwhEstime * p.prixKwh) / 50) * 50;
  return { kwhEstime, montantSuggere };
}

/** Normalise un n° de transaction (espaces retirés, majuscules) pour comparer de façon fiable. */
export function normaliserRef(ref: unknown): string {
  return String(ref ?? "").replace(/\s+/g, "").toUpperCase();
}

/** Approximation du % d'après une jauge à barres (calculs internes seulement : montant proposé, historique). */
export function socDepuisBarres(barres: number, total: number): number {
  return Math.round((barres / total) * 100);
}

/** Jauge saisie à la main (IA indisponible) : barres pleines, total et autonomie cohérents. */
export function jaugeValide(barres: unknown, total: unknown, autonomieKm: unknown): { barres: number; total: number; autonomieKm: number } | null {
  const b = Number(barres), t = Number(total), a = Number(autonomieKm);
  if (![b, t, a].every((x) => Number.isInteger(x))) return null;
  if (t < 2 || t > 20 || b < 0 || b > t || a < 0 || a > 1000) return null;
  return { barres: b, total: t, autonomieKm: a };
}

/** Anomalie de fin pour une jauge : l'autonomie n'a pas augmenté (à défaut, les barres). */
export function anomalieFinJauge(debut: { barres: number | null; autonomieKm: number | null }, fin: { barres: number; autonomieKm: number }): boolean {
  if (debut.autonomieKm != null) return fin.autonomieKm <= debut.autonomieKm;
  return debut.barres != null && fin.barres <= debut.barres;
}

/** Anomalie de fin : la batterie n'a pas monté. */
export function anomalieFin(socDebut: number | null | undefined, socFin: number): boolean {
  return socDebut != null && socFin <= socDebut;
}
