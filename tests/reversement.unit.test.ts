/**
 * Tests unitaires (purs) — calcul du reversement (Flux 2).
 */
import { describe, it, expect } from "vitest";
import { computeReversement, retardReversement } from "../lib/reversement";

describe("computeReversement", () => {
  it("accepte quand le montant reversé couvre le montant attendu", () => {
    // attendu = 50000 - 0 - 500 (1%) = 49500 ; reversé 49500 → écart 0
    const r = computeReversement(50000, [], 49500);
    expect(r.frais).toBe(500);
    expect(r.montantAttendu).toBe(49500);
    expect(r.ecart).toBe(0);
    expect(r.statut).toBe("ACCEPTE");
  });

  it("déduit les dépenses autorisées", () => {
    const r = computeReversement(50000, [3000, 2000], 44500);
    // attendu = 50000 - 5000 - 500 = 44500
    expect(r.totalDepenses).toBe(5000);
    expect(r.montantAttendu).toBe(44500);
    expect(r.statut).toBe("ACCEPTE");
  });

  it("constate tout manquant, même minime (pas de tolérance)", () => {
    const gros = computeReversement(50000, [], 40000);
    expect(gros.ecart).toBe(9500);
    expect(gros.statut).toBe("ECART_CONSTATE");

    // attendu 49500, reversé 49495 → écart 5 FCFA : constaté aussi
    const petit = computeReversement(50000, [], 49495);
    expect(petit.ecart).toBe(5);
    expect(petit.statut).toBe("ECART_CONSTATE");
  });

  it("un surplus (reversé > attendu) reste accepté, sans dette", () => {
    const r = computeReversement(50000, [], 50000);
    expect(r.ecart).toBeLessThan(0);
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
