import { describe, it, expect } from "vitest";
import { interpreterBatterie, type LectureBatterie } from "../lib/ia";

const L = (p: Partial<LectureBatterie>): LectureBatterie => ({
  est_tableau_de_bord: true, pourcentage_affiche: false, soc_pourcentage: null, chiffres_nets: true, soc_estime_barres: null,
  autonomie_km: null, kilometrage_km: null, lisibilite: "bonne", confiance: 0.9, remarque: "", ...p,
});

describe("interprétation de la lecture batterie", () => {
  it("photo qui n'est pas un tableau de bord → à reprendre", () => {
    expect(interpreterBatterie(L({ est_tableau_de_bord: false })).aReprendre).toBe(true);
  });
  it("photo illisible → à reprendre", () => {
    expect(interpreterBatterie(L({ lisibilite: "mauvaise" })).aReprendre).toBe(true);
  });
  it("% lu avec confiance → pré-rempli sans confirmation", () => {
    const d = interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 67 }));
    expect(d).toMatchObject({ soc: 67, source: "pourcentage", aConfirmer: false, aReprendre: false });
  });
  it("% lu mais confiance faible → à confirmer", () => {
    expect(interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 23, confiance: 0.4 })).aConfirmer).toBe(true);
  });
  it("jauge seulement → estimation à confirmer", () => {
    expect(interpreterBatterie(L({ soc_estime_barres: 67 }))).toMatchObject({ soc: 67, source: "barres", aConfirmer: true });
  });
  it("chiffres trop petits ou flous → à reprendre, aucune valeur proposée", () => {
    expect(interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 85, chiffres_nets: false }))).toMatchObject({ soc: null, aReprendre: true });
  });
  it("valeur hors 0–100 ignorée → saisie manuelle", () => {
    expect(interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 241 }))).toMatchObject({ soc: null, aConfirmer: true });
  });
});
