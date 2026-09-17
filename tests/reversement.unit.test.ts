/**
 * Tests unitaires (purs) — calcul du reversement (Flux 2).
 */
import { describe, it, expect } from "vitest";
import { computeReversement, retardReversement } from "../lib/reversement";

describe("computeReversement", () => {
  it("accepte quand l'écart est dans la tolérance", () => {
    // attendu = 50000 - 0 - 500 (1%) = 49500 ; reversé 49500 → écart 0
    const r = computeReversement(50000, [], 49500, 5000);
    expect(r.frais).toBe(500);
    expect(r.montantAttendu).toBe(49500);
    expect(r.ecart).toBe(0);
    expect(r.statut).toBe("ACCEPTE");
  });

  it("déduit les dépenses autorisées", () => {
    const r = computeReversement(50000, [3000, 2000], 44500, 5000);
    // attendu = 50000 - 5000 - 500 = 44500
    expect(r.totalDepenses).toBe(5000);
    expect(r.montantAttendu).toBe(44500);
    expect(r.statut).toBe("ACCEPTE");
  });

  it("signale un écart au-delà de la tolérance", () => {
    const r = computeReversement(50000, [], 40000, 5000);
    // attendu 49500, reversé 40000 → écart 9500 > 5000
    expect(r.ecart).toBe(9500);
    expect(r.statut).toBe("ECART_A_VALIDER");
  });

  it("tolère un petit manquant sous le seuil", () => {
    const r = computeReversement(50000, [], 45000, 5000);
    // attendu 49500, reversé 45000 → écart 4500 <= 5000
    expect(r.statut).toBe("ACCEPTE");
  });
});

describe("retardReversement", () => {
  it("calcule le retard en minutes", () => {
    expect(retardReversement(new Date("2026-09-15T14:00:00Z"), new Date("2026-09-15T15:30:00Z"))).toBe(90);
  });
  it("retourne null si pas de check-out", () => {
    expect(retardReversement(null, new Date())).toBeNull();
  });
});
