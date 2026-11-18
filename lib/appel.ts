/**
 * Appel audio intégré (WebRTC) — logique pure.
 * - Identifiants TURN temporaires (API REST de coturn, « use-auth-secret ») : le secret ne
 *   quitte jamais le serveur, chaque utilisateur reçoit un identifiant valable quelques heures.
 * - Registre des appels en cours (en mémoire) : qui appelle qui, état, durée.
 */
import { createHmac } from "crypto";

export type EtatAppel = "SONNE" | "EN_COURS" | "TERMINE" | "MANQUE" | "REFUSE" | "ANNULE";

/** Durée de sonnerie avant « appel manqué ». */
export const SONNERIE_MS = 45_000;
/** Validité des identifiants TURN. */
export const TURN_TTL_S = 12 * 3600;

/** Identifiants TURN temporaires : username = « expiration:userId », credential = HMAC-SHA1 base64. */
export function identifiantsTurn(secret: string, userId: string, nowMs: number, ttlS = TURN_TTL_S) {
  const username = `${Math.floor(nowMs / 1000) + ttlS}:${userId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential };
}

export interface IceServer { urls: string | string[]; username?: string; credential?: string }

/**
 * Serveurs ICE remis au navigateur. Avec coturn configuré (TURN_URLS + TURN_SECRET) : STUN + TURN
 * du VPS. Sinon : STUN public seul (suffit sur un même réseau, souvent insuffisant en 4G).
 */
export function serveursIce(env: { TURN_URLS?: string; TURN_SECRET?: string }, userId: string, nowMs: number): IceServer[] {
  const urls = (env.TURN_URLS || "").split(",").map((u) => u.trim()).filter(Boolean);
  if (!urls.length || !env.TURN_SECRET) return [{ urls: "stun:stun.l.google.com:19302" }];
  const stun = [...new Set(urls.map((u) => u.replace(/^turns?:/, "stun:").replace(/\?.*$/, "")))];
  return [{ urls: stun }, { urls, ...identifiantsTurn(env.TURN_SECRET, userId, nowMs) }];
}

export interface Appel {
  id: string;
  demandeId: string;
  appelantId: string;
  appelesIds: string[]; // ceux qui sonnent (le chauffeur, ou les superviseurs du site)
  decrocheParId: string | null;
  etat: EtatAppel;
  creeLe: number;
  debutLe: number | null;
  finLe: number | null;
}

/** Registre en mémoire des appels (un seul appel actif par demande). */
export class RegistreAppels {
  private appels = new Map<string, Appel>();

  creer(a: { id: string; demandeId: string; appelantId: string; appelesIds: string[] }, now: number): Appel | null {
    if (this.actifPourDemande(a.demandeId)) return null;
    const appel: Appel = { ...a, decrocheParId: null, etat: "SONNE", creeLe: now, debutLe: null, finLe: null };
    this.appels.set(a.id, appel);
    return appel;
  }

  get(id: string): Appel | undefined { return this.appels.get(id); }

  actifPourDemande(demandeId: string): Appel | undefined {
    for (const a of this.appels.values()) if (a.demandeId === demandeId && (a.etat === "SONNE" || a.etat === "EN_COURS")) return a;
    return undefined;
  }

  /** Appels qui sonnent encore pour cet utilisateur (à renvoyer quand il se reconnecte). */
  sonnentPour(userId: string): Appel[] {
    return [...this.appels.values()].filter((a) => a.etat === "SONNE" && a.appelesIds.includes(userId));
  }

  /** Appels actifs auxquels l'utilisateur participe. */
  actifsDe(userId: string): Appel[] {
    return [...this.appels.values()].filter((a) => (a.etat === "SONNE" || a.etat === "EN_COURS") && (a.appelantId === userId || a.appelesIds.includes(userId)));
  }

  decrocher(id: string, userId: string, now: number): Appel | null {
    const a = this.appels.get(id);
    if (!a || a.etat !== "SONNE" || !a.appelesIds.includes(userId)) return null;
    a.etat = "EN_COURS"; a.decrocheParId = userId; a.debutLe = now;
    return a;
  }

  /** Fin d'appel : refus, annulation, raccrochage, manqué. Renvoie l'appel s'il était actif. */
  finir(id: string, etat: Exclude<EtatAppel, "SONNE" | "EN_COURS">, now: number): Appel | null {
    const a = this.appels.get(id);
    if (!a || (a.etat !== "SONNE" && a.etat !== "EN_COURS")) return null;
    a.etat = a.etat === "EN_COURS" ? "TERMINE" : etat;
    a.finLe = now;
    setTimeout(() => this.appels.delete(id), 60_000).unref?.();
    return a;
  }

  /** L'autre participant d'un appel décroché (pour relayer la signalisation WebRTC). */
  correspondant(a: Appel, userId: string): string | null {
    if (userId === a.appelantId) return a.decrocheParId;
    if (userId === a.decrocheParId) return a.appelantId;
    return null;
  }
}

/** Durée lisible : « 2 min 05 s ». */
export function dureeLisible(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}
