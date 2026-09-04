/**
 * Logique d'attribution quotidienne (Flux 8) — fonctions pures, testables.
 *
 * Priorité de choix des véhicules : disponibilité (filtre dur, appliqué en amont)
 * → zone géographique du chauffeur → rotation équitable.
 *
 * Rotation équitable : on privilégie les véhicules que CE chauffeur n'a pas (ou peu
 * récemment) conduits, pour éviter de toujours lui donner le même. Le score combine
 * un bonus de zone et l'ancienneté de la dernière attribution véhicule↔chauffeur.
 */
export type ShiftCode = "A" | "B";

/** Ramène une date (chaîne ISO ou Date) au jour, à minuit UTC (Abidjan = UTC). */
export function normalizeDay(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface VehicleSuggestionInput {
  vehicleId: string;
  /** Zone habituelle du véhicule = zone du dernier chauffeur l'ayant conduit (approx.). */
  zoneHabituelleId: string | null;
  /** Dernière fois que ce véhicule a été attribué à CE chauffeur (null si jamais). */
  lastAssignedToDriverAt: Date | null;
}

const ROTATION_CAP_DAYS = 60; // au-delà, on plafonne le bonus d'ancienneté
const ZONE_BONUS = 1000; // domine la rotation : la zone prime (cf. priorité PPT)
const NEVER_BONUS = ROTATION_CAP_DAYS + 1; // « jamais conduit » = variété maximale

/** Score d'un véhicule pour un chauffeur (plus grand = meilleure suggestion). */
export function scoreVehicleForDriver(v: VehicleSuggestionInput, driverZoneId: string | null, today: Date): number {
  const zoneBonus = driverZoneId && v.zoneHabituelleId === driverZoneId ? ZONE_BONUS : 0;
  let rotation: number;
  if (!v.lastAssignedToDriverAt) rotation = NEVER_BONUS;
  else {
    const days = Math.floor((today.getTime() - v.lastAssignedToDriverAt.getTime()) / 86400000);
    rotation = Math.min(Math.max(days, 0), ROTATION_CAP_DAYS);
  }
  return zoneBonus + rotation;
}

/** Trie les véhicules candidats par pertinence décroissante (stable sur l'id). */
export function suggestVehicles(candidates: VehicleSuggestionInput[], driverZoneId: string | null, today: Date): { vehicleId: string; score: number }[] {
  return candidates
    .map((c) => ({ vehicleId: c.vehicleId, score: scoreVehicleForDriver(c, driverZoneId, today) }))
    .sort((a, b) => b.score - a.score || a.vehicleId.localeCompare(b.vehicleId));
}

export interface WarningInput {
  /** Le chauffeur est-il déjà affecté à l'autre shift le même jour (enchaînement A+B) ? */
  enchainementMemeChauffeur: boolean;
  /** SOC dernier connu du véhicule (null si inconnu), pour le handover. */
  socDernierConnu: number | null;
  seuilSoc: number;
  /** Shift concerné (le handover ne concerne que la reprise au shift B). */
  shift: ShiftCode;
  /** Nombre de jours déjà travaillés par le chauffeur sur les 7 derniers jours. */
  joursTravailles7: number;
  rythmeMax: number; // ex. 6 j / 7
}

/** Avertissements NON bloquants renvoyés au Dispatcher au moment d'attribuer. */
export function computeAssignmentWarnings(w: WarningInput): string[] {
  const out: string[] = [];
  if (w.enchainementMemeChauffeur) {
    out.push("Ce chauffeur est déjà affecté à l'autre shift ce jour-là : double shift (~16 h de service).");
  }
  if (w.shift === "B") {
    if (w.socDernierConnu == null) {
      out.push("SOC du véhicule inconnu : prévoir 30 min de recharge au handover si nécessaire.");
    } else if (w.socDernierConnu < w.seuilSoc) {
      out.push(`Batterie à ${w.socDernierConnu} % (< ${w.seuilSoc} %) : recharge requise avant reprise (30 min de handover).`);
    }
  }
  if (w.joursTravailles7 >= w.rythmeMax) {
    out.push(`Ce chauffeur atteint ${w.joursTravailles7} jours travaillés sur 7 (max ${w.rythmeMax}) : pensez au repos.`);
  }
  return out;
}
