/**
 * Logique de la recharge EV (Flux 3, Bloc C1) — fonctions pures, testables.
 * Enregistrement d'une recharge + contrôles anti-fraude : borne whitelistée et
 * cohérence entre les kWh rechargés, la variation de batterie (SOC) et les km parcourus.
 */

/** Conso moyenne estimée d'un VE (kWh par km) — repère, paramétrable. */
export const RENDEMENT_KWH_PAR_KM = 0.2;

/** Champs obligatoires à la saisie d'une recharge. */
export function rechargeMissing(body: any): string[] {
  const miss: string[] = [];
  if (!body?.typeCharge || !["DOMESTIQUE", "PARTENAIRE"].includes(String(body.typeCharge))) miss.push("typeCharge");
  for (const f of ["kwh", "cout", "socDebut", "socFin"] as const) {
    if (body?.[f] == null || Number.isNaN(Number(body[f]))) miss.push(f);
  }
  if (!body?.justificatifMediaId) miss.push("justificatifMediaId");
  return miss;
}

export interface RechargeAnomalies {
  anomalieBorne: boolean;
  anomalieCoherence: boolean;
  raisons: string[];
}

/**
 * Détecte les anomalies d'une recharge (sans lever d'erreur : on enregistre + on alerte).
 * - anomalieBorne : la borne n'est pas dans la liste autorisée (whitelist).
 * - anomalieCoherence : les kWh déclarés sont incohérents avec la variation de batterie
 *   (SOC × capacité) et/ou avec les km parcourus depuis la dernière recharge.
 */
export function computeRechargeAnomalies(p: {
  borneWhitelistee: boolean;
  kwh: number;
  socDebut: number;
  socFin: number;
  capaciteBatterieKwh: number | null;
  kmParcourusDepuisDerniere: number | null;
}): RechargeAnomalies {
  const raisons: string[] = [];

  const anomalieBorne = !p.borneWhitelistee;
  if (anomalieBorne) raisons.push("Borne hors liste autorisée");

  let anomalieCoherence = false;

  // 1) SOC : la batterie doit monter.
  if (!(p.socFin > p.socDebut)) {
    anomalieCoherence = true;
    raisons.push("Niveau de batterie de fin ≤ niveau de début");
  }

  // 2) kWh vs variation de batterie (si la capacité est connue).
  if (p.capaciteBatterieKwh && p.capaciteBatterieKwh > 0) {
    if (p.kwh > p.capaciteBatterieKwh * 1.1) {
      anomalieCoherence = true;
      raisons.push("kWh supérieurs à la capacité de la batterie");
    }
    const implique = ((p.socFin - p.socDebut) / 100) * p.capaciteBatterieKwh;
    if (implique > 0) {
      const ratio = p.kwh / implique;
      if (ratio < 0.6 || ratio > 1.6) {
        anomalieCoherence = true;
        raisons.push("kWh incohérents avec la variation de batterie");
      }
    }
  }

  // 3) kWh vs km parcourus depuis la dernière recharge (borne supérieure large).
  if (p.kmParcourusDepuisDerniere != null && p.kmParcourusDepuisDerniere >= 0) {
    const kwhPlausibleMax = p.kmParcourusDepuisDerniere * RENDEMENT_KWH_PAR_KM * 1.8 + 5;
    if (p.kwh > kwhPlausibleMax) {
      anomalieCoherence = true;
      raisons.push("kWh trop élevés par rapport aux km parcourus");
    }
  }

  return { anomalieBorne, anomalieCoherence, raisons };
}
