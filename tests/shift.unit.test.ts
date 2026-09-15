/**
 * Tests unitaires (purs) — logique de check-in / check-out (Flux 1).
 */
import { describe, it, expect } from "vitest";
import { checkinMissing, checkoutMissing, isPermisValide, shiftStartDate, isRetardDemarrage, computeShiftData } from "../lib/shift";

const okCheckin = { gpsLat: 5.3, gpsLng: -4.0, kmDebut: 1000, photoCompteur: "m1", photoVehicule: "m2", photoPermis: "m3", selfieKyc: "m4" };
const okCheckout = { kmFin: 1200, photoAvant: "a", photoArriere: "b", photoGauche: "c", photoDroite: "d" };

describe("Complétude des preuves", () => {
  it("check-in complet → aucun manquant", () => {
    expect(checkinMissing(okCheckin)).toHaveLength(0);
  });
  it("détecte GPS, km et photos manquants au check-in", () => {
    const m = checkinMissing({ photoCompteur: "m1" });
    expect(m).toContain("gps");
    expect(m).toContain("kmDebut");
    expect(m).toContain("selfieKyc");
    expect(m).not.toContain("photoCompteur");
  });
  it("check-out complet → aucun manquant", () => {
    expect(checkoutMissing(okCheckout)).toHaveLength(0);
  });
  it("détecte les photos et le km manquants au check-out", () => {
    const m = checkoutMissing({ photoAvant: "a" });
    expect(m).toContain("kmFin");
    expect(m).toContain("photoDroite");
  });
});

describe("Validité du permis", () => {
  it("permis futur = valide", () => {
    expect(isPermisValide(new Date(Date.now() + 86400000))).toBe(true);
  });
  it("permis passé = invalide", () => {
    expect(isPermisValide(new Date(Date.now() - 86400000))).toBe(false);
  });
  it("permis inconnu = invalide", () => {
    expect(isPermisValide(null)).toBe(false);
  });
});

describe("Horaires & retard", () => {
  const settings = { shiftADebut: "06:00", shiftBDebut: "15:00" };
  it("calcule l'heure de début du shift A", () => {
    const start = shiftStartDate(new Date("2026-09-15T00:00:00Z"), "A", settings);
    expect(start.toISOString()).toBe("2026-09-15T06:00:00.000Z");
  });
  it("détecte un retard au-delà de 15 min", () => {
    const start = new Date("2026-09-15T06:00:00Z");
    expect(isRetardDemarrage(start, new Date("2026-09-15T06:20:00Z"))).toBe(true);
    expect(isRetardDemarrage(start, new Date("2026-09-15T06:10:00Z"))).toBe(false);
  });
});

describe("Données d'exploitation", () => {
  it("calcule km parcourus et durée", () => {
    const r = computeShiftData(1000, 1150, new Date("2026-09-15T06:00:00Z"), new Date("2026-09-15T14:00:00Z"));
    expect(r.kmParcourus).toBe(150);
    expect(r.dureeMinutes).toBe(480);
  });
  it("km parcourus null si km de début inconnu", () => {
    expect(computeShiftData(null, 1150, null, new Date()).kmParcourus).toBeNull();
  });
});
