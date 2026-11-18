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
- soc_estime_barres : si le niveau n'est indiqué que par une jauge (barres, segments), estimation en % (barres pleines / barres totales × 100), sinon null.
- autonomie_km : autonomie restante affichée en km, sinon null.
- kilometrage_km : compteur kilométrique total (ODO), sinon null.
- lisibilite : « bonne », « moyenne » ou « mauvaise ».
- confiance : de 0 à 1, ta confiance dans soc_pourcentage (ou dans soc_estime_barres s'il n'y a pas de %).
- remarque : une phrase courte en français.

PIÈGES À ÉVITER :
- Un pourcentage qui est une CIBLE ou une LIMITE n'est pas le niveau actuel : « charge jusqu'à 100 % », « 100 % dans 2 h 30 », « limite de charge 80 % », « 100% de carga 2:30 ». Ne le mets jamais dans soc_pourcentage.
- L'autonomie (km) n'est pas un pourcentage. La vitesse (km/h) non plus.
- Ne devine jamais un chiffre illisible : mets null et une confiance basse.`;

/** Schéma de réponse (sous-ensemble OpenAPI accepté par Gemini). */
export const SCHEMA_BATTERIE = {
  type: "OBJECT",
  properties: {
    est_tableau_de_bord: { type: "BOOLEAN" },
    pourcentage_affiche: { type: "BOOLEAN" },
    soc_pourcentage: { type: "INTEGER", nullable: true },
    soc_estime_barres: { type: "INTEGER", nullable: true },
    autonomie_km: { type: "INTEGER", nullable: true },
    kilometrage_km: { type: "INTEGER", nullable: true },
    lisibilite: { type: "STRING", enum: ["bonne", "moyenne", "mauvaise"] },
    confiance: { type: "NUMBER" },
    remarque: { type: "STRING" },
  },
  required: ["est_tableau_de_bord", "pourcentage_affiche", "soc_pourcentage", "soc_estime_barres", "autonomie_km", "kilometrage_km", "lisibilite", "confiance", "remarque"],
};

export class ErreurIA extends Error {
  constructor(message: string, public statut?: number) { super(message); }
}

export const iaConfiguree = (): boolean => !!process.env.GEMINI_API_KEY;

/** Appelle Gemini avec une image + une consigne, et une réponse JSON contrainte par un schéma. */
/** Modèles de secours, essayés si le principal est saturé (réglable via GEMINI_MODELES_SECOURS). */
export const MODELES_SECOURS_PAR_DEFAUT = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest"];
/** Erreurs passagères : on réessaie (saturation, quota par minute, délai, erreur serveur). */
const passagere = (e: any) => e?.passagere === true || [429, 500, 502, 503, 504].includes(e?.statut);
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
  if (l.pourcentage_affiche && valide(l.soc_pourcentage)) {
    const sur = l.confiance >= CONFIANCE_MIN;
    return { soc: l.soc_pourcentage, source: "pourcentage", aConfirmer: !sur, aReprendre: false, message: sur ? `Batterie lue : ${l.soc_pourcentage} %` : `Batterie lue : ${l.soc_pourcentage} % (à vérifier)` };
  }
  if (valide(l.soc_estime_barres)) {
    return { soc: l.soc_estime_barres, source: "barres", aConfirmer: true, aReprendre: false, message: `Pas de % affiché : environ ${l.soc_estime_barres} % d'après la jauge, à confirmer.` };
  }
  return { soc: null, source: null, aConfirmer: true, aReprendre: false, message: "Pourcentage non lu : saisissez-le." };
}
