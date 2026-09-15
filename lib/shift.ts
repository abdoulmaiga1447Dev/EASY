/**
 * Logique du check-in / check-out (Flux 1, Bloc B1) — fonctions pures, testables.
 * L'empreinte a été remplacée par le selfie KYC (décision projet) : 5 preuves.
 */
export type ShiftCode = "A" | "B";

/** Preuves obligatoires du check-in (hors GPS/km, vérifiés à part). */
export const CHECKIN_PHOTOS = ["photoCompteur", "photoVehicule", "photoPermis", "selfieKyc"] as const;
export const CHECKOUT_PHOTOS = ["photoAvant", "photoArriere", "photoGauche", "photoDroite"] as const;

/** Retourne la liste des éléments manquants pour valider un check-in. */
export function checkinMissing(body: any): string[] {
  const miss: string[] = [];
  if (body?.gpsLat == null || body?.gpsLng == null) miss.push("gps");
  if (body?.kmDebut == null || Number.isNaN(Number(body.kmDebut))) miss.push("kmDebut");
  for (const p of CHECKIN_PHOTOS) if (!body?.[p]) miss.push(p);
  return miss;
}

/** Retourne la liste des éléments manquants pour valider un check-out. */
export function checkoutMissing(body: any): string[] {
  const miss: string[] = [];
  if (body?.kmFin == null || Number.isNaN(Number(body.kmFin))) miss.push("kmFin");
  for (const p of CHECKOUT_PHOTOS) if (!body?.[p]) miss.push(p);
  return miss;
}

/** Le permis est-il encore valide à la date donnée ? (null = inconnu → considéré invalide). */
export function isPermisValide(permisExpiration: Date | null | undefined, now = new Date()): boolean {
  if (!permisExpiration) return false;
  return new Date(permisExpiration).getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Heure de début théorique d'un shift (date du jour + horaire des paramètres). */
export function shiftStartDate(date: Date, shift: ShiftCode, settings: { shiftADebut: string; shiftBDebut: string }): Date {
  const hhmm = shift === "A" ? settings.shiftADebut : settings.shiftBDebut;
  const [h, m] = (hhmm || (shift === "A" ? "06:00" : "15:00")).split(":").map((x) => parseInt(x, 10));
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h || 0, m || 0));
}

/** Le shift est-il en retard de démarrage (au-delà du délai, sans check-in) ? */
export function isRetardDemarrage(shiftStart: Date, now: Date, delaiMinutes = 15): boolean {
  return now.getTime() - shiftStart.getTime() >= delaiMinutes * 60000;
}

/** Données d'exploitation calculées au check-out. */
export function computeShiftData(kmDebut: number | null, kmFin: number, checkinAt: Date | null, checkoutAt: Date): { kmParcourus: number | null; dureeMinutes: number | null } {
  const kmParcourus = kmDebut != null ? Math.max(0, kmFin - kmDebut) : null;
  const dureeMinutes = checkinAt ? Math.max(0, Math.round((checkoutAt.getTime() - new Date(checkinAt).getTime()) / 60000)) : null;
  return { kmParcourus, dureeMinutes };
}
