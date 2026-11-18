/**
 * Notifications push (Web Push, clés VAPID) : font sonner le téléphone même quand
 * l'application est fermée (appel entrant, nouvelle demande, paiement…).
 * Sans clés VAPID configurées, l'envoi est simplement ignoré.
 */
import webpush from "web-push";
import type { PrismaClient } from "@prisma/client";

let configure = false;
function init(): boolean {
  if (configure) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@easybysaver.com", pub, priv);
  configure = true;
  return true;
}

export const clePubliquePush = (): string | null => process.env.VAPID_PUBLIC_KEY || null;

export interface PushPayload {
  titre: string;
  message: string;
  tag?: string; // remplace une notification précédente de même tag
  url?: string;
  type?: string; // ex. « appel » : vibration longue, reste affichée
}

/** Envoie une notification push à des utilisateurs (tous leurs appareils). Ne lève jamais. */
export async function envoyerPush(prisma: PrismaClient, userIds: string[], p: PushPayload): Promise<number> {
  if (!userIds.length || !init()) return 0;
  const abos = await prisma.pushAbonnement.findMany({ where: { userId: { in: [...new Set(userIds)] } } });
  let ok = 0;
  await Promise.all(abos.map(async (a) => {
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify(p),
        { TTL: p.type === "appel" ? 45 : 3600, urgency: "high" },
      );
      ok++;
    } catch (e: any) {
      // Abonnement expiré ou révoqué : on le supprime.
      if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushAbonnement.delete({ where: { id: a.id } }).catch(() => undefined);
      else console.error("[Push]", e?.statusCode ?? "", e?.body ?? e?.message ?? e);
    }
  }));
  return ok;
}
