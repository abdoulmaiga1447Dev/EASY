/**
 * Tests unitaires (purs) — machine à états véhicule et calcul des échéances d'alerte.
 */
import { describe, it, expect } from "vitest";
import { canTransition, permissionForTransition } from "../lib/vehicleState";
import { planVehicleAlerts, daysUntil } from "../lib/alerts";

const seuils = { alerteVisiteTechniqueJours: 15, alerteAssuranceJours: 7 };
const baseVehicle = {
  id: "v1", siteId: "s1", immatriculation: "1234-AB-01", statut: "Disponible",
  kmActuel: 1000, prochainEntretienKm: null as number | null, prochainEntretienDate: null as Date | null,
  documents: [] as { type: string; dateFin: Date | null }[],
};
const today = new Date("2026-09-04T00:00:00Z");
const inDays = (n: number) => new Date(today.getTime() + n * 86400000);

describe("Machine à états véhicule", () => {
  it("autorise les transitions prévues", () => {
    expect(canTransition("Disponible", "Attribue")).toBe(true);
    expect(canTransition("Immobilise", "Disponible")).toBe(true);
    expect(canTransition("EnMaintenance", "Disponible")).toBe(true);
    expect(canTransition("HorsFlotte", "Disponible")).toBe(true);
  });
  it("interdit les transitions non prévues et l'identité", () => {
    expect(canTransition("Disponible", "Disponible")).toBe(false);
    expect(canTransition("HorsFlotte", "Attribue")).toBe(false);
    expect(canTransition("Attribue", "HorsFlotte")).toBe(false);
  });
  it("réserve la réactivation à la permission dédiée", () => {
    expect(permissionForTransition("Immobilise", "Disponible")).toBe("vehicule.reactiver");
    expect(permissionForTransition("EnMaintenance", "Disponible")).toBe("vehicule.reactiver");
    expect(permissionForTransition("Disponible", "EnMaintenance")).toBe("vehicule.modifier");
  });
});

describe("Calcul des échéances (planVehicleAlerts)", () => {
  it("daysUntil compte correctement", () => {
    expect(daysUntil(inDays(10), today)).toBe(10);
    expect(daysUntil(inDays(-3), today)).toBe(-3);
  });

  it("lève une alerte quand la visite technique et l'assurance approchent", () => {
    const v = { ...baseVehicle, documents: [
      { type: "VISITE_TECHNIQUE", dateFin: inDays(10) },
      { type: "ASSURANCE", dateFin: inDays(5) },
    ] };
    const alerts = planVehicleAlerts(v, seuils, today);
    expect(alerts.map((a) => a.type).sort()).toEqual(["ASSURANCE", "VISITE_TECHNIQUE"]);
  });

  it("ne lève pas d'alerte si l'échéance est lointaine", () => {
    const v = { ...baseVehicle, documents: [{ type: "VISITE_TECHNIQUE", dateFin: inDays(40) }] };
    expect(planVehicleAlerts(v, seuils, today)).toHaveLength(0);
  });

  it("marque critique une échéance déjà dépassée", () => {
    const v = { ...baseVehicle, documents: [{ type: "ASSURANCE", dateFin: inDays(-2) }] };
    const a = planVehicleAlerts(v, seuils, today);
    expect(a[0].severity).toBe("critical");
  });

  it("lève une alerte d'entretien par kilométrage", () => {
    const v = { ...baseVehicle, kmActuel: 16000, prochainEntretienKm: 15000 };
    const a = planVehicleAlerts(v, seuils, today);
    expect(a.some((x) => x.type === "ENTRETIEN_KM")).toBe(true);
  });

  it("ne lève aucune alerte pour un véhicule hors flotte", () => {
    const v = { ...baseVehicle, statut: "HorsFlotte", documents: [{ type: "ASSURANCE", dateFin: inDays(1) }] };
    expect(planVehicleAlerts(v, seuils, today)).toHaveLength(0);
  });

  it("produit une clé anti-doublon stable pour une même échéance", () => {
    const v = { ...baseVehicle, documents: [{ type: "VISITE_TECHNIQUE", dateFin: inDays(10) }] };
    const a1 = planVehicleAlerts(v, seuils, today)[0];
    const a2 = planVehicleAlerts(v, seuils, today)[0];
    expect(a1.dedupeKey).toBe(a2.dedupeKey);
  });
});
