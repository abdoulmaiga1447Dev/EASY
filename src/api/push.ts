/**
 * Notifications push du navigateur : enregistrement du service worker et abonnement
 * de l'appareil (pour sonner même quand EASY est fermé).
 */
import { api } from "./fleet";

export const pushSupporte = (): boolean =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone/iPad hors application installée : les notifications push n'y sont pas disponibles. */
export const iosSansInstallation = (): boolean => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installee = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone === true;
  return ios && !installee;
};

function versUint8(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...b].map((c) => c.charCodeAt(0)));
}

let enregistrement: Promise<ServiceWorkerRegistration> | null = null;
export function enregistrerServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (!pushSupporte()) return null;
  enregistrement ??= navigator.serviceWorker.register("/sw.js");
  return enregistrement;
}

/** Abonne l'appareil (demande l'autorisation si nécessaire : à appeler depuis un clic). */
export async function activerNotifications(): Promise<"ok" | "refuse" | "indisponible"> {
  if (!pushSupporte()) return "indisponible";
  const { cle } = await api.get<{ cle: string | null }>("/api/fleet/push/cle");
  if (!cle) return "indisponible";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return "refuse";
  const reg = await enregistrerServiceWorker()!;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versUint8(cle) }));
  await api.post("/api/fleet/push/abonnement", sub.toJSON());
  return "ok";
}

/** Si l'autorisation est déjà donnée : s'assure que l'abonnement est bien enregistré côté serveur. */
export async function resynchroniserNotifications(): Promise<void> {
  if (!pushSupporte() || Notification.permission !== "granted") return;
  try { await activerNotifications(); } catch { /* silencieux */ }
}
