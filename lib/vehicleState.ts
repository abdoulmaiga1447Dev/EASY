/**
 * Machine à états du véhicule (Flux 7).
 * Statuts : Disponible, Attribue, EnCharge, Immobilise, EnMaintenance, HorsFlotte.
 * Les transitions arbitraires sont interdites ; chaque transition manuelle exige une
 * permission. Les passages vers Immobilise/EnMaintenance seront surtout pilotés par
 * la Partie C (pannes), mais les règles sont posées dès maintenant.
 */
export type VehicleStatus =
  | "Disponible"
  | "Attribue"
  | "EnCharge"
  | "Immobilise"
  | "EnMaintenance"
  | "HorsFlotte";

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "Disponible", "Attribue", "EnCharge", "Immobilise", "EnMaintenance", "HorsFlotte",
];

// Transitions autorisées depuis chaque statut.
export const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  Disponible: ["Attribue", "EnCharge", "Immobilise", "EnMaintenance", "HorsFlotte"],
  Attribue: ["Disponible", "EnCharge", "Immobilise", "EnMaintenance"],
  EnCharge: ["Disponible", "Attribue", "Immobilise", "EnMaintenance"],
  Immobilise: ["EnMaintenance", "Disponible", "HorsFlotte"],
  EnMaintenance: ["Disponible", "Immobilise", "HorsFlotte"],
  HorsFlotte: ["Disponible"],
};

export function canTransition(from: VehicleStatus, to: VehicleStatus): boolean {
  if (from === to) return false;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/**
 * Permission requise pour effectuer une transition manuelle.
 * Réactiver un véhicule (sortir d'Immobilise/EnMaintenance vers Disponible) est
 * réservé au Dispatcher (vehicule.reactiver) ; le reste relève de vehicule.modifier.
 */
export function permissionForTransition(from: VehicleStatus, to: VehicleStatus): string {
  if ((from === "Immobilise" || from === "EnMaintenance") && to === "Disponible") {
    return "vehicule.reactiver";
  }
  return "vehicule.modifier";
}

export function isVehicleStatus(x: unknown): x is VehicleStatus {
  return typeof x === "string" && (VEHICLE_STATUSES as string[]).includes(x);
}
