/**
 * Tests unitaires (purs) — suggestions (zone + rotation équitable) et avertissements.
 */
import { describe, it, expect } from "vitest";
import { normalizeDay, scoreVehicleForDriver, suggestVehicles, computeAssignmentWarnings } from "../lib/assignment";

const today = new Date("2026-09-04T00:00:00Z");
const ago = (n: number) => new Date(today.getTime() - n * 86400000);

describe("normalizeDay", () => {
  it("ramène au jour à minuit UTC", () => {
    expect(normalizeDay("2026-09-04T13:45:00Z").toISOString()).toBe("2026-09-04T00:00:00.000Z");
  });
});

describe("Score et suggestions de véhicules", () => {
  it("privilégie un véhicule de la même zone que le chauffeur", () => {
    const meme = scoreVehicleForDriver({ vehicleId: "v1", zoneHabituelleId: "zA", lastAssignedToDriverAt: today }, "zA", today);
    const autre = scoreVehicleForDriver({ vehicleId: "v2", zoneHabituelleId: "zB", lastAssignedToDriverAt: ago(50) }, "zA", today);
    expect(meme).toBeGreaterThan(autre);
  });

  it("favorise la variété (véhicule jamais/moins récemment conduit) à zone égale", () => {
    const jamais = scoreVehicleForDriver({ vehicleId: "v1", zoneHabituelleId: null, lastAssignedToDriverAt: null }, null, today);
    const recent = scoreVehicleForDriver({ vehicleId: "v2", zoneHabituelleId: null, lastAssignedToDriverAt: ago(2) }, null, today);
    expect(jamais).toBeGreaterThan(recent);
  });

  it("classe la zone avant la rotation", () => {
    const ranked = suggestVehicles([
      { vehicleId: "hors_zone_jamais", zoneHabituelleId: "zB", lastAssignedToDriverAt: null },
      { vehicleId: "zone_recent", zoneHabituelleId: "zA", lastAssignedToDriverAt: ago(1) },
    ], "zA", today);
    expect(ranked[0].vehicleId).toBe("zone_recent"); // la zone prime sur la rotation
  });
});

describe("Avertissements d'attribution (non bloquants)", () => {
  const base = { enchainementMemeChauffeur: false, socDernierConnu: 90, seuilSoc: 70, shift: "A" as const, joursTravailles7: 1, rythmeMax: 6 };

  it("aucun avertissement dans le cas nominal", () => {
    expect(computeAssignmentWarnings(base)).toHaveLength(0);
  });
  it("avertit d'un double shift", () => {
    expect(computeAssignmentWarnings({ ...base, enchainementMemeChauffeur: true }).some((m) => /double shift/i.test(m))).toBe(true);
  });
  it("avertit d'une recharge nécessaire au shift B si SOC bas", () => {
    expect(computeAssignmentWarnings({ ...base, shift: "B", socDernierConnu: 50 }).some((m) => /recharge/i.test(m))).toBe(true);
  });
  it("avertit d'un SOC inconnu au shift B", () => {
    expect(computeAssignmentWarnings({ ...base, shift: "B", socDernierConnu: null }).some((m) => /inconnu/i.test(m))).toBe(true);
  });
  it("ne parle pas de handover au shift A", () => {
    expect(computeAssignmentWarnings({ ...base, shift: "A", socDernierConnu: null })).toHaveLength(0);
  });
  it("avertit d'un dépassement du rythme de travail", () => {
    expect(computeAssignmentWarnings({ ...base, joursTravailles7: 6 }).some((m) => /repos/i.test(m))).toBe(true);
  });
});
