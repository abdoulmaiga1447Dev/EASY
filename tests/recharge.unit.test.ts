/**
 * Tests unitaires (purs) — contrôles de recharge EV (Flux 3).
 */
import { describe, it, expect } from "vitest";
import { rechargeMissing, computeRechargeAnomalies } from "../lib/recharge";

describe("rechargeMissing", () => {
  it("liste les champs obligatoires manquants (borne comprise)", () => {
    expect(rechargeMissing({})).toEqual(expect.arrayContaining(["typeCharge", "borneId", "kwh", "cout", "socDebut", "socFin", "justificatifMediaId"]));
  });
  it("accepte une saisie complète", () => {
    expect(rechargeMissing({ typeCharge: "DOMESTIQUE", borneId: "b1", kwh: 20, cout: 2000, socDebut: 30, socFin: 70, justificatifMediaId: "m1" })).toEqual([]);
  });
});

describe("computeRechargeAnomalies", () => {
  const base = { kwh: 24, socDebut: 30, socFin: 70, capaciteBatterieKwh: 60, kmParcourusDepuisDerniere: 120 };

  it("recharge cohérente : aucune anomalie", () => {
    const r = computeRechargeAnomalies(base);
    expect(r.anomalieCoherence).toBe(false);
  });

  it("batterie qui ne monte pas → incohérent", () => {
    const r = computeRechargeAnomalies({ ...base, socDebut: 70, socFin: 60 });
    expect(r.anomalieCoherence).toBe(true);
  });

  it("kWh supérieurs à la capacité batterie → incohérent", () => {
    const r = computeRechargeAnomalies({ ...base, kwh: 80 });
    expect(r.anomalieCoherence).toBe(true);
  });

  it("kWh très éloignés de la variation de batterie → incohérent", () => {
    // delta 40% de 60 kWh ≈ 24 kWh attendu ; 50 kWh déclarés → ratio > 1,6
    const r = computeRechargeAnomalies({ ...base, kwh: 50 });
    expect(r.anomalieCoherence).toBe(true);
  });

  it("kWh trop élevés vs km parcourus → incohérent", () => {
    const r = computeRechargeAnomalies({ ...base, kmParcourusDepuisDerniere: 10 });
    expect(r.anomalieCoherence).toBe(true);
  });
});
