import { describe, it, expect } from "vitest";
import { resumer, peutCloturer, periode, montantVu } from "../lib/rapprochement";

const L = (demandeId: string | null, verdict: any, montantDeclare: number | null, montantReel: number | null = null) => ({ demandeId, verdict, montantDeclare, montantReel });

describe("rapprochement", () => {
  it("calcule ce qui est réellement sorti du compte", () => {
    expect(montantVu(L("a", "CONFORME", 4500))).toBe(4500);
    expect(montantVu(L("a", "MONTANT_DIFFERENT", 4500, 3000))).toBe(3000);
    expect(montantVu(L("a", "ABSENT", 4500))).toBe(0);
    expect(montantVu(L(null, "NON_DECLARE", null, 2000))).toBe(2000);
  });
  it("résume les écarts", () => {
    const r = resumer([L("a", "CONFORME", 4500), L("b", "MONTANT_DIFFERENT", 6000, 3000), L("c", "ABSENT", 2000), L(null, "NON_DECLARE", null, 2500)]);
    expect(r.paiementsDeclares).toBe(3);
    expect(r.verifies).toBe(3);
    expect(r.totalDeclare).toBe(12500);
    expect(r.totalVuDansWave).toBe(4500 + 3000 + 2500);
    expect(r.ecart).toBe(10000 - 12500);
    expect(r.ecarts).toBe(3);
  });
  it("un paiement pas encore vérifié n'est pas compté comme écart", () => {
    const r = resumer([L("a", "CONFORME", 4500), L("b", null, 6000)]);
    expect(r.ecart).toBe(0);
    expect(r.ecarts).toBe(0);
    expect(r.totalDeclare).toBe(10500);
  });
  it("ne clôture que si chaque paiement déclaré est vérifié", () => {
    expect(peutCloturer([L("a", "CONFORME", 1), L(null, "NON_DECLARE", null, 5)])).toBe(true);
    expect(peutCloturer([L("a", null, 1)])).toBe(false);
  });
  it("valide la période", () => {
    const p = periode("2026-11-10", "2026-11-16");
    expect(p?.debut.toISOString()).toBe("2026-11-10T00:00:00.000Z");
    expect(p?.fin.toISOString()).toBe("2026-11-17T00:00:00.000Z");
    expect(periode("2026-11-16", "2026-11-10")).toBeNull();
    expect(periode("hier", "2026-11-10")).toBeNull();
  });
});
