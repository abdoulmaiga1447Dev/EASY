import { describe, it, expect } from "vitest";
import { interpreterBatterie, interpreterRecuWave, vehiculeSansPourcentage, pourcentageProuve, dateRecu, type LectureBatterie, type LectureRecuWave } from "../lib/ia";

const L = (p: Partial<LectureBatterie>): LectureBatterie => ({
  est_tableau_de_bord: true, pourcentage_affiche: false, soc_pourcentage: null, chiffres_nets: true, soc_estime_barres: null,
  autonomie_km: null, kilometrage_km: null, lisibilite: "bonne", confiance: 0.9, remarque: "",
  texte_pourcentage: p.soc_pourcentage != null ? `${p.soc_pourcentage} %` : null, ...p,
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

describe("interpreterRecuWave / dateRecu", () => {
  const base: LectureRecuWave = {
    est_recu_wave: true, statut_effectue: true, statut: "Effectué", type_transaction: "Paiement", marchand: "Chez Isiaka",
    montant_fcfa: 100, frais_fcfa: 0, date_heure: "2026-11-06T07:19", id_transaction: "T_VCEK26THWKC3I63F",
    chiffres_nets: true, retouche_suspectee: false, lisibilite: "bonne", confiance: 0.95, remarque: "",
  };
  it("reçu valide → montant, n°, date", () => {
    const d = interpreterRecuWave(base);
    expect(d).toMatchObject({ valide: true, montant: 100, ref: "T_VCEK26THWKC3I63F", marchand: "Chez Isiaka" });
    expect(d.date).toBe("2026-11-06T07:19:00.000Z");
  });
  it("refus : pas un reçu, non effectué, illisible, montant ou ID manquant", () => {
    expect(interpreterRecuWave({ ...base, est_recu_wave: false }).valide).toBe(false);
    expect(interpreterRecuWave({ ...base, statut_effectue: false }).valide).toBe(false);
    expect(interpreterRecuWave({ ...base, chiffres_nets: false }).valide).toBe(false);
    expect(interpreterRecuWave({ ...base, montant_fcfa: null }).valide).toBe(false);
    expect(interpreterRecuWave({ ...base, id_transaction: null }).valide).toBe(false);
  });
  it("dateRecu : format attendu seulement", () => {
    expect(dateRecu("2026-11-06T19:19")?.toISOString()).toBe("2026-11-06T19:19:00.000Z");
    expect(dateRecu("6 nov. 2026")).toBeNull();
    expect(dateRecu(null)).toBeNull();
  });
});

describe("% prouvé et véhicules sans %", () => {
  it("un % annoncé sans texte recopié (ex. estimation d'une jauge) n'est pas pris comme lu", () => {
    const d = interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 50, texte_pourcentage: null, soc_estime_barres: 50 }));
    expect(d.source).toBe("barres");
    expect(interpreterBatterie(L({ pourcentage_affiche: true, soc_pourcentage: 50, texte_pourcentage: "258 km" })).source).not.toBe("pourcentage");
  });
  it("le texte recopié doit contenir le même nombre suivi de %", () => {
    expect(pourcentageProuve({ soc_pourcentage: 65, texte_pourcentage: "SOC 65 %" })).toBe(true);
    expect(pourcentageProuve({ soc_pourcentage: 65, texte_pourcentage: "65%" })).toBe(true);
    expect(pourcentageProuve({ soc_pourcentage: 65, texte_pourcentage: "85%" })).toBe(false);
    expect(pourcentageProuve({ soc_pourcentage: 65, texte_pourcentage: "65 km" })).toBe(false);
  });
  it("Eado : tableau de bord sans % (réglable)", () => {
    expect(vehiculeSansPourcentage({ marque: "Changan", modele: "Eado EV" })).toBe(true);
    expect(vehiculeSansPourcentage({ marque: "Dongfeng", modele: "Nano" })).toBe(false);
    expect(vehiculeSansPourcentage(null)).toBe(false);
  });
});
