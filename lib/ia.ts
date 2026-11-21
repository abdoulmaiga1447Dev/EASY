/**
 * IA de vision (Google Gemini) — lecture du tableau de bord pour la recharge.
 * La clé reste sur le serveur (GEMINI_API_KEY) ; le modèle est réglable (GEMINI_MODEL).
 *
 * Principe : l'IA LIT et SIGNALE, l'humain tranche. Elle pré-remplit le % de batterie ;
 * une valeur incertaine est proposée au chauffeur, jamais imposée.
 */

/**
 * Modèle par défaut (réglable via GEMINI_MODEL). Test du 2026-11-18 : « gemini-3.5-flash-lite » a lu
 * 14/14 niveaux de batterie (pièges compris) ; « gemini-3.8-flash » était saturé et limité à 20 requêtes/jour en gratuit.
 */
export const MODELE_PAR_DEFAUT = "gemini-3.5-flash-lite";
const API = "https://generativelanguage.googleapis.com/v1beta";

export interface LectureBatterie {
  est_tableau_de_bord: boolean;
  pourcentage_affiche: boolean;
  soc_pourcentage: number | null;
  chiffres_nets: boolean;
  soc_estime_barres: number | null;
  autonomie_km: number | null;
  kilometrage_km: number | null;
  lisibilite: "bonne" | "moyenne" | "mauvaise";
  confiance: number;
  remarque: string;
}

export const PROMPT_BATTERIE = `Tu analyses une photo prise par un chauffeur de VTC électrique, censée montrer le tableau de bord (instruments derrière le volant ou écran affichant l'état de la batterie) de son véhicule.

Réponds uniquement selon le schéma JSON demandé :
- est_tableau_de_bord : true si la photo montre l'instrumentation du véhicule (compteur, écran de bord) ou un écran affichant l'état de la batterie. false pour une vue extérieure, un siège, un menu sans information de batterie, un autre objet.
- pourcentage_affiche : true seulement si le NIVEAU ACTUEL de la batterie est écrit en chiffres avec un « % ».
- soc_pourcentage : ce niveau actuel (entier 0 à 100), sinon null.
- chiffres_nets : true seulement si les chiffres du pourcentage sont assez grands et nets pour être lus SANS AUCUNE ambiguïté. Si l'écran est loin, petit, flou, de travers ou pixellisé au point qu'on pourrait confondre 6 et 8, 3 et 8, 5 et 6, 1 et 7 ou 0 et 8 : false, et soc_pourcentage = null.
- soc_estime_barres : si le niveau n'est indiqué que par une jauge (barres, segments), estimation en % (barres pleines / barres totales × 100), sinon null.
- autonomie_km : autonomie restante affichée en km, sinon null.
- kilometrage_km : compteur kilométrique total (ODO), sinon null.
- lisibilite : « bonne », « moyenne » ou « mauvaise ».
- confiance : de 0 à 1, ta confiance dans soc_pourcentage (ou dans soc_estime_barres s'il n'y a pas de %).
- remarque : une phrase courte en français.

PIÈGES À ÉVITER :
- Un pourcentage qui est une CIBLE ou une LIMITE n'est pas le niveau actuel : « charge jusqu'à 100 % », « 100 % dans 2 h 30 », « limite de charge 80 % », « 100% de carga 2:30 ». Ne le mets jamais dans soc_pourcentage.
- L'autonomie (km) n'est pas un pourcentage. La vitesse (km/h) non plus.
- Ne devine jamais un chiffre illisible : mets null et une confiance basse. Une valeur fausse est bien plus grave qu'une valeur manquante.`;

/** Schéma de réponse (sous-ensemble OpenAPI accepté par Gemini). */
export const SCHEMA_BATTERIE = {
  type: "OBJECT",
  properties: {
    est_tableau_de_bord: { type: "BOOLEAN" },
    pourcentage_affiche: { type: "BOOLEAN" },
    soc_pourcentage: { type: "INTEGER", nullable: true },
    chiffres_nets: { type: "BOOLEAN" },
    soc_estime_barres: { type: "INTEGER", nullable: true },
    autonomie_km: { type: "INTEGER", nullable: true },
    kilometrage_km: { type: "INTEGER", nullable: true },
    lisibilite: { type: "STRING", enum: ["bonne", "moyenne", "mauvaise"] },
    confiance: { type: "NUMBER" },
    remarque: { type: "STRING" },
  },
  required: ["est_tableau_de_bord", "pourcentage_affiche", "soc_pourcentage", "chiffres_nets", "soc_estime_barres", "autonomie_km", "kilometrage_km", "lisibilite", "confiance", "remarque"],
};

export class ErreurIA extends Error {
  constructor(message: string, public statut?: number) { super(message); }
}

export const iaConfiguree = (): boolean => !!process.env.GEMINI_API_KEY;

/** Appelle Gemini avec une image + une consigne, et une réponse JSON contrainte par un schéma. */
/** Modèles de secours, essayés si le principal est saturé (réglable via GEMINI_MODELES_SECOURS). */
export const MODELES_SECOURS_PAR_DEFAUT = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest"];
/** Erreurs passagères : on réessaie (saturation, quota par minute, délai, erreur serveur). */
const passagere = (e: any) => e?.passagere === true || [429, 500, 502, 503, 504].includes(e?.statut)
  || (e instanceof TypeError && /fetch failed|network|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(String(e?.message) + String((e?.cause as any)?.code ?? "")));
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Un seul appel à un modèle donné. */
async function appelGemini<T>(modele: string, image: Buffer, mime: string, consigne: string, schema: object, timeoutMs: number) {
  const debut = Date.now();
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}/models/${encodeURIComponent(modele)}:generateContent`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: image.toString("base64") } }, { text: consigne }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
      }),
    });
    const corps: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErreurIA(`Gemini ${r.status} : ${corps?.error?.message ?? "erreur"}`, r.status);
    const texte = corps?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    if (!texte) throw new ErreurIA(`Réponse vide (${corps?.candidates?.[0]?.finishReason ?? corps?.promptFeedback?.blockReason ?? "inconnu"})`);
    return { resultat: JSON.parse(texte) as T, modele, dureeMs: Date.now() - debut, jetons: (corps?.usageMetadata?.totalTokenCount ?? null) as number | null };
  } catch (e: any) {
    if (e?.name === "AbortError") { const err = new ErreurIA(`Délai dépassé (${modele})`); (err as any).passagere = true; throw err; }
    throw e;
  } finally {
    clearTimeout(minuterie);
  }
}

/**
 * Appelle Gemini avec une image + une consigne ; réponse JSON contrainte par un schéma.
 * Robustesse : 2 essais par modèle (attente entre les deux), puis bascule sur les modèles de secours.
 */
export async function analyserImage<T>(image: Buffer, mime: string, consigne: string, schema: object, opts: { modele?: string; timeoutMs?: number } = {}): Promise<{ resultat: T; modele: string; dureeMs: number; jetons: number | null; essais: number }> {
  if (!process.env.GEMINI_API_KEY) throw new ErreurIA("Clé Gemini absente (GEMINI_API_KEY)");
  const principal = opts.modele || process.env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
  const secours = (process.env.GEMINI_MODELES_SECOURS ?? MODELES_SECOURS_PAR_DEFAUT.join(",")).split(",").map((m) => m.trim()).filter(Boolean);
  const modeles = [...new Set([principal, ...secours])];
  let essais = 0;
  let derniere: any = null;
  for (const modele of modeles) {
    for (let tentative = 0; tentative < 2; tentative++) {
      essais++;
      try {
        return { ...(await appelGemini<T>(modele, image, mime, consigne, schema, opts.timeoutMs ?? 45_000)), essais };
      } catch (e: any) {
        derniere = e;
        if (!passagere(e)) throw e; // erreur de configuration : inutile d'insister
        if (e?.statut === 429) break; // quota du modèle atteint : on passe directement au modèle suivant
        if (tentative === 0) await attendre(2500);
      }
    }
  }
  throw derniere ?? new ErreurIA("IA indisponible");
}

export function lireBatterie(image: Buffer, mime: string, opts?: { modele?: string }) {
  return analyserImage<LectureBatterie>(image, mime, PROMPT_BATTERIE, SCHEMA_BATTERIE, opts);
}

// =====================================================================================
// Reçu de paiement Wave (capture jointe par le Superviseur)
// =====================================================================================

export interface LectureRecuWave {
  est_recu_wave: boolean;
  statut_effectue: boolean;
  statut: string | null;
  type_transaction: string | null;
  marchand: string | null;
  montant_fcfa: number | null;
  frais_fcfa: number | null;
  date_heure: string | null; // « AAAA-MM-JJTHH:MM » (heure affichée, 24 h)
  id_transaction: string | null;
  chiffres_nets: boolean;
  retouche_suspectee: boolean;
  lisibilite: "bonne" | "moyenne" | "mauvaise";
  confiance: number;
  remarque: string;
}

export const PROMPT_RECU_WAVE = `Tu contrôles une capture d'écran censée être le REÇU d'un paiement fait avec l'application mobile Wave (Côte d'Ivoire), pour payer une recharge de véhicule électrique.
Un reçu Wave ressemble à ceci : logo Wave (pingouin), titre « Reçu de Transaction », puis des lignes « Type de transaction » (ex. Paiement), « Marchand », « Montant » (ex. 4500F), « Acheteur », « Statut » (ex. ✅ Effectué), « Frais », « Date et heure » (ex. 6 nov. 2026 7:19 AM) et « ID de transaction » (ex. T_VCEK26THWKC3I63F).

Réponds uniquement selon le schéma JSON demandé :
- est_recu_wave : true seulement si l'image est bien un reçu ou une confirmation de transaction Wave. false pour toute autre image (photo quelconque, tableau de bord, autre application, conversation, reçu d'un autre opérateur).
- statut_effectue : true seulement si le statut indique clairement que la transaction a réussi (« Effectué », « Réussi »). false si « En attente », « Échoué », « Annulé » ou absent.
- statut : le texte du statut tel qu'affiché, sinon null.
- type_transaction : ex. « Paiement », « Transfert », sinon null.
- marchand : le nom du marchand (ou du destinataire), sinon null.
- montant_fcfa : le MONTANT de la transaction en francs CFA (entier, sans les frais), sinon null.
- frais_fcfa : les frais affichés (entier), sinon null.
- date_heure : la date et l'heure affichées, au format AAAA-MM-JJTHH:MM en 24 h (7:19 PM → 19:19), sinon null.
- id_transaction : l'identifiant exact, caractère par caractère (ex. T_VCEK26THWKC3I63F), sinon null.
- chiffres_nets : true seulement si le montant et l'identifiant se lisent SANS AUCUNE ambiguïté.
- retouche_suspectee : true si l'image semble modifiée (polices ou tailles différentes sur une même ligne, chiffres mal alignés, zones floues ou recollées, incohérences).
- lisibilite : « bonne », « moyenne » ou « mauvaise ».
- confiance : de 0 à 1.
- remarque : une phrase courte en français.

Ne devine jamais un chiffre ou un caractère illisible : mets null. Une valeur fausse est bien plus grave qu'une valeur manquante.`;

export const SCHEMA_RECU_WAVE = {
  type: "OBJECT",
  properties: {
    est_recu_wave: { type: "BOOLEAN" },
    statut_effectue: { type: "BOOLEAN" },
    statut: { type: "STRING", nullable: true },
    type_transaction: { type: "STRING", nullable: true },
    marchand: { type: "STRING", nullable: true },
    montant_fcfa: { type: "INTEGER", nullable: true },
    frais_fcfa: { type: "INTEGER", nullable: true },
    date_heure: { type: "STRING", nullable: true },
    id_transaction: { type: "STRING", nullable: true },
    chiffres_nets: { type: "BOOLEAN" },
    retouche_suspectee: { type: "BOOLEAN" },
    lisibilite: { type: "STRING", enum: ["bonne", "moyenne", "mauvaise"] },
    confiance: { type: "NUMBER" },
    remarque: { type: "STRING" },
  },
  required: ["est_recu_wave", "statut_effectue", "statut", "type_transaction", "marchand", "montant_fcfa", "frais_fcfa", "date_heure", "id_transaction", "chiffres_nets", "retouche_suspectee", "lisibilite", "confiance", "remarque"],
};

export function lireRecuWave(image: Buffer, mime: string, opts?: { modele?: string }) {
  return analyserImage<LectureRecuWave>(image, mime, PROMPT_RECU_WAVE, SCHEMA_RECU_WAVE, opts);
}

/** Date du reçu (« AAAA-MM-JJTHH:MM », heure d'Abidjan = UTC) → Date, sinon null. */
export function dateRecu(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s ?? ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Décision à partir de la lecture du reçu (pure, testable).
 * Refus (capture à refaire) : pas un reçu Wave, paiement non effectué, montant ou ID illisible.
 * Sinon : montant, ID et date lus sur le reçu font foi.
 */
export function interpreterRecuWave(l: LectureRecuWave): {
  valide: boolean;
  montant: number | null;
  ref: string | null;
  date: string | null;
  marchand: string | null;
  message: string;
} {
  const refuse = (message: string) => ({ valide: false, montant: null, ref: null, date: null, marchand: null, message });
  if (!l.est_recu_wave) return refuse("Cette image n'est pas un reçu Wave. Dans Wave, ouvrez la transaction et faites une capture du « Reçu de Transaction ».");
  if (!l.statut_effectue) return refuse(`Le paiement n'est pas « Effectué » sur ce reçu${l.statut ? ` (statut : ${l.statut})` : ""}.`);
  if (l.lisibilite === "mauvaise" || !l.chiffres_nets) return refuse("Reçu illisible : faites une capture d'écran nette du reçu complet.");
  const montant = typeof l.montant_fcfa === "number" && Number.isInteger(l.montant_fcfa) && l.montant_fcfa > 0 ? l.montant_fcfa : null;
  const ref = l.id_transaction && l.id_transaction.trim().length >= 6 ? l.id_transaction.trim().toUpperCase().replace(/\s+/g, "") : null;
  if (montant === null) return refuse("Montant non lu sur le reçu : faites une capture du reçu complet.");
  if (ref === null) return refuse("ID de transaction non lu : capturez le reçu complet, jusqu'à la ligne « ID de transaction ».");
  const date = dateRecu(l.date_heure);
  return { valide: true, montant, ref, date: date ? date.toISOString() : null, marchand: l.marchand?.trim() || null, message: `Reçu lu : ${montant} F, n° ${ref}.` };
}

/** Point d'accès remplaçable (les tests y branchent une fausse IA, sans appel réseau). */
export const ia = { lireBatterie, lireRecuWave };

/** Liste les modèles disponibles pour la clé (aide au choix de GEMINI_MODEL). */
export async function listerModeles(): Promise<string[]> {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "" } });
  const d: any = await r.json();
  if (!r.ok) throw new ErreurIA(`Gemini ${r.status} : ${d?.error?.message ?? "erreur"}`, r.status);
  return (d.models ?? []).filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent")).map((m: any) => String(m.name).replace(/^models\//, ""));
}

/** Seuil de confiance au-dessous duquel le % est seulement proposé (à confirmer). */
export const CONFIANCE_MIN = 0.7;

/**
 * Décision à partir de la lecture de l'IA (pure, testable) :
 * - photo qui n'est pas un tableau de bord / illisible → à reprendre ;
 * - % lu avec confiance → pré-rempli ;
 * - seulement une jauge, ou confiance faible → valeur proposée, le chauffeur confirme ;
 * - rien → saisie manuelle.
 */
export function interpreterBatterie(l: LectureBatterie): {
  soc: number | null;
  source: "pourcentage" | "barres" | null;
  aConfirmer: boolean;
  aReprendre: boolean;
  message: string;
} {
  const valide = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;
  if (!l.est_tableau_de_bord) return { soc: null, source: null, aConfirmer: false, aReprendre: true, message: "Cette photo ne montre pas le tableau de bord : reprenez-la." };
  if (l.lisibilite === "mauvaise") return { soc: null, source: null, aConfirmer: false, aReprendre: true, message: "Photo illisible : reprenez-la plus près, sans reflet." };
  if (l.pourcentage_affiche && valide(l.soc_pourcentage) && l.chiffres_nets === false) {
    return { soc: null, source: null, aConfirmer: false, aReprendre: true, message: "Chiffres trop petits ou flous : rapprochez-vous du tableau de bord et reprenez la photo." };
  }
  if (l.pourcentage_affiche && valide(l.soc_pourcentage)) {
    const sur = l.confiance >= CONFIANCE_MIN;
    return { soc: l.soc_pourcentage, source: "pourcentage", aConfirmer: !sur, aReprendre: false, message: sur ? `Batterie lue : ${l.soc_pourcentage} %` : `Batterie lue : ${l.soc_pourcentage} % (à vérifier)` };
  }
  if (valide(l.soc_estime_barres)) {
    return { soc: l.soc_estime_barres, source: "barres", aConfirmer: true, aReprendre: false, message: `Pas de % affiché : environ ${l.soc_estime_barres} % d'après la jauge, à confirmer.` };
  }
  return { soc: null, source: null, aConfirmer: true, aReprendre: false, message: "Pourcentage non lu : saisissez-le." };
}
