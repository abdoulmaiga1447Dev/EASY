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

/** Petit signal sonore (nouvelle demande, paiement reçu…). Silencieux si le navigateur le bloque. */
export function bip(): void {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
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
    setTimeout(() => void ctx.close(), 600);
  } catch { /* son indisponible */ }
}
