/**
 * Temps réel des espaces fleet : une seule connexion Socket.IO partagée, authentifiée
 * avec le jeton de l'utilisateur (le serveur le place dans sa salle `user:<id>`).
 */
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (socket) return socket;
  // Transports par défaut (polling puis passage en WebSocket) : fonctionne aussi derrière un proxy sans WebSocket.
  socket = io();
  const auth = () => socket?.emit("fleet:auth", localStorage.getItem("ev_access_token") || "");
  socket.on("connect", auth); // aussi à chaque reconnexion
  return socket;
}

/** Envoie un événement au serveur ; renvoie sa réponse (accusé de réception) si attendue. */
export function emitRealtime<T = any>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => getSocket().emit(event, payload, (r: T) => resolve(r)));
}
/** Envoi sans attendre de réponse. */
export function sendRealtime(event: string, payload: unknown): void {
  getSocket().emit(event, payload);
}

/** Écoute un événement temps réel tant que le composant est monté. */
export function useRealtime<T = any>(event: string, handler: (payload: T) => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    const cb = (p: T) => ref.current(p);
    s.on(event, cb);
    return () => { s.off(event, cb); };
  }, [event, enabled]);
}

// ---------------------------------------------------------------------------------------
// Sons (bip + annonces vocales).
// Les navigateurs mobiles (Safari iPhone surtout) refusent de jouer un son qui ne part pas
// d'un toucher. On « déverrouille » donc le son au PREMIER toucher dans l'application, puis on
// réutilise toujours le même contexte audio et le même lecteur : les annonces déclenchées par
// le réseau (nouvelle demande, paiement…) peuvent alors être jouées.
// ---------------------------------------------------------------------------------------

/** Annonces vocales (fichiers générés en local avec Piper, voix « siwis »), jouées après le bip. */
export type Annonce = "nouvelle-demande" | "recharge-payee" | "appel-manque";

let ctxAudio: AudioContext | null = null;
let lecteur: HTMLAudioElement | null = null;
let deverrouille = false;

/** Contexte audio partagé (déverrouillé au premier toucher). */
export function contexte(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctxAudio) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctxAudio = new AC();
  }
  return ctxAudio;
}

function lecteurAnnonces(): HTMLAudioElement {
  if (!lecteur) {
    lecteur = new Audio();
    lecteur.preload = "auto";
    (lecteur as any).playsInline = true;
  }
  return lecteur;
}

/** Au premier toucher / clic / touche : active le contexte audio et le lecteur (silencieusement). */
function deverrouiller(): void {
  if (deverrouille) return;
  deverrouille = true;
  try {
    const ctx = contexte();
    if (ctx) {
      void ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050); // un échantillon de silence
      src.connect(ctx.destination);
      src.start(0);
    }
    const l = lecteurAnnonces();
    l.muted = true;
    l.src = "/audio/annonce-appel-manque.mp3";
    void l.play().then(() => { l.pause(); l.currentTime = 0; l.muted = false; }).catch(() => { l.muted = false; deverrouille = false; });
  } catch { deverrouille = false; }
}
if (typeof window !== "undefined") {
  for (const ev of ["pointerdown", "touchend", "keydown"]) window.addEventListener(ev, deverrouiller, { capture: true, passive: true });
}

export function annoncer(nom: Annonce): void {
  bip();
  window.setTimeout(() => {
    try {
      const l = lecteurAnnonces();
      l.muted = false;
      l.src = `/audio/annonce-${nom}.mp3`;
      void l.play().catch(() => undefined);
    } catch { /* son indisponible */ }
  }, 450);
}

/** Petit signal sonore (nouvelle demande, paiement reçu…). Silencieux si le navigateur le bloque. */
export function bip(): void {
  try {
    const ctx = contexte();
    if (!ctx) return;
    void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch { /* son indisponible */ }
}
