import { describe, it, expect } from "vitest";
import { suggestionRecharge, socValide, normaliserRef, peut, anomalieFin } from "../lib/demandeRecharge";

describe("suggestionRecharge", () => {
  it("calcule les kWh et le montant (arrondi à 50 F supérieurs)", () => {
    expect(suggestionRecharge({ socDebut: 30, capaciteBatterieKwh: 60, prixKwh: 150 })).toEqual({ kwhEstime: 30, montantSuggere: 4500 });
    expect(suggestionRecharge({ socDebut: 25, capaciteBatterieKwh: 40, prixKwh: 133 })).toEqual({ kwhEstime: 22, montantSuggere: 2950 });
  });
  it("sans prix connu : seulement les kWh ; sans capacité : rien", () => {
    expect(suggestionRecharge({ socDebut: 30, capaciteBatterieKwh: 60, prixKwh: null })).toEqual({ kwhEstime: 30, montantSuggere: null });
    expect(suggestionRecharge({ socDebut: 30, capaciteBatterieKwh: null, prixKwh: 150 })).toEqual({ kwhEstime: null, montantSuggere: null });
  });
  it("batterie déjà au-dessus de la cible → 0", () => {
    expect(suggestionRecharge({ socDebut: 90, capaciteBatterieKwh: 60, prixKwh: 150 })).toEqual({ kwhEstime: 0, montantSuggere: 0 });
  });
});

describe("contrôles", () => {
  it("socValide accepte 0–100 seulement", () => {
    expect(socValide("45")).toBe(45);
    expect(socValide(0)).toBe(0);
    expect(socValide(101)).toBeNull();
    expect(socValide("")).toBeNull();
    expect(socValide(undefined)).toBeNull();
  });
  it("normaliserRef retire les espaces et met en majuscules", () => {
    expect(normaliserRef(" tx 12 ab ")).toBe("TX12AB");
  });
  it("respecte l'ordre des étapes", () => {
    expect(peut("payer", "DEMANDEE")).toBe(false);
    expect(peut("payer", "SUR_PLACE")).toBe(true);
    expect(peut("terminer", "SUR_PLACE")).toBe(false);
    expect(peut("terminer", "PAYEE")).toBe(true);
    expect(peut("annulerChauffeur", "PAYEE")).toBe(false);
    expect(peut("annulerSuperviseur", "PAYEE")).toBe(true);
  });
  it("anomalie si la batterie n'a pas monté", () => {
    expect(anomalieFin(40, 40)).toBe(true);
    expect(anomalieFin(40, 80)).toBe(false);
  });
});
