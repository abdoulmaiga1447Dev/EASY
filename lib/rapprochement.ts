/**
 * Rapprochement guidé des paiements de recharge avec l'historique Wave — logique pure.
 */

export type Verdict = "CONFORME" | "MONTANT_DIFFERENT" | "ABSENT" | "NON_DECLARE";

export interface LigneResume {
  demandeId: string | null;
  verdict: Verdict | null;
  montantDeclare: number | null;
  montantReel: number | null;
}

export interface ResumeRapprochement {
  paiementsDeclares: number;
  verifies: number;
  conformes: number;
  montantsDifferents: number;
  absents: number;
  nonDeclares: number;
  totalDeclare: number; // somme des montants déclarés dans EASY
  totalVuDansWave: number; // somme de ce qui est réellement sorti du compte (lu dans Wave)
  totalDeclareVerifie: number; // montants déclarés des paiements déjà vérifiés
  ecart: number; // totalVuDansWave − totalDeclareVerifie (+ : argent sorti non justifié) ; à la clôture tout est vérifié
  ecarts: number; // nombre de lignes en écart
}

/** Montant réellement sorti du compte selon la vérification d'une ligne. */
export function montantVu(l: LigneResume): number {
  switch (l.verdict) {
    case "CONFORME": return l.montantDeclare ?? 0;
    case "MONTANT_DIFFERENT": return l.montantReel ?? 0;
    case "NON_DECLARE": return l.montantReel ?? 0;
    default: return 0; // ABSENT ou non vérifié : rien vu dans Wave
  }
}

export function resumer(lignes: LigneResume[]): ResumeRapprochement {
  const declarees = lignes.filter((l) => l.demandeId);
  const r: ResumeRapprochement = {
    paiementsDeclares: declarees.length,
    verifies: declarees.filter((l) => l.verdict).length,
    conformes: lignes.filter((l) => l.verdict === "CONFORME").length,
    montantsDifferents: lignes.filter((l) => l.verdict === "MONTANT_DIFFERENT").length,
    absents: lignes.filter((l) => l.verdict === "ABSENT").length,
    nonDeclares: lignes.filter((l) => l.verdict === "NON_DECLARE").length,
    totalDeclare: declarees.reduce((s, l) => s + (l.montantDeclare ?? 0), 0),
    totalVuDansWave: lignes.reduce((s, l) => s + montantVu(l), 0),
    totalDeclareVerifie: declarees.filter((l) => l.verdict).reduce((s, l) => s + (l.montantDeclare ?? 0), 0),
    ecart: 0,
    ecarts: 0,
  };
  // Écart calculé sur ce qui a été vérifié : un paiement pas encore vérifié n'est pas un écart.
  r.ecart = r.totalVuDansWave - r.totalDeclareVerifie;
  r.ecarts = r.montantsDifferents + r.absents + r.nonDeclares;
  return r;
}

/** La clôture n'est possible que si chaque paiement déclaré a été vérifié. */
export function peutCloturer(lignes: LigneResume[]): boolean {
  return lignes.filter((l) => l.demandeId).every((l) => l.verdict);
}

/** Période [début inclus, fin exclue) à partir de deux dates « AAAA-MM-JJ ». */
export function periode(debut: string, fin: string): { debut: Date; fin: Date } | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(debut) || !re.test(fin)) return null;
  const d = new Date(`${debut}T00:00:00.000Z`);
  const f = new Date(`${fin}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(f.getTime()) || f < d) return null;
  return { debut: d, fin: new Date(f.getTime() + 86400000) };
}
