/**
 * Service de notifications multi-canal (Partie A).
 * Canaux : in-app (stocké en base), email (SMTP best-effort), SMS & WhatsApp
 * (adaptateurs mockés/log tant que les API ne sont pas branchées — pilotés par env).
 *
 * Chaque notification est persistée (file d'attente) puis expédiée. Les échecs sont
 * marqués et rejouables via `retryPendingNotifications` (appelée par le job quotidien).
 */
import type { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

export type Canal = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export interface NotifInput {
  userId?: string | null;
  canal: Canal;
  type: string;
  titre: string;
  message: string;
  to?: string | null; // email ou numéro selon le canal
  payload?: Record<string, unknown>;
}

const MAX_RETRIES = 3;

// --- Adaptateurs ---------------------------------------------------------------
async function sendEmail(to: string, titre: string, message: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[Notif:EMAIL:mock] → ${to} | ${titre} — ${message}`);
    return; // aucune config : mode log (comme la couche legacy)
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: titre,
    text: message,
  });
}

async function sendSms(to: string, message: string): Promise<void> {
  // Adaptateur mocké : Twilio est branché dans la couche legacy. Ici, log configurable.
  if (process.env.SMS_ADAPTER === "real") throw new Error("Adaptateur SMS réel non branché dans ce module");
  console.log(`[Notif:SMS:mock] → ${to} | ${message}`);
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  // WhatsApp Business Cloud API non branchée : adaptateur mock/log (piloté par env).
  if (process.env.WHATSAPP_ADAPTER === "real") throw new Error("Adaptateur WhatsApp réel non branché");
  console.log(`[Notif:WhatsApp:mock] → ${to} | ${message}`);
}

async function dispatch(n: NotifInput): Promise<void> {
  switch (n.canal) {
    case "IN_APP": return; // rien à envoyer : la présence en base suffit
    case "EMAIL": if (n.to) await sendEmail(n.to, n.titre, n.message); return;
    case "SMS": if (n.to) await sendSms(n.to, n.message); return;
    case "WHATSAPP": if (n.to) await sendWhatsApp(n.to, n.message); return;
  }
}

// --- API du service ------------------------------------------------------------

/** Crée la notification (file d'attente) puis tente l'envoi immédiat. */
export async function notify(prisma: PrismaClient, input: NotifInput): Promise<void> {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId ?? null,
      canal: input.canal as any,
      type: input.type,
      titre: input.titre,
      message: input.message,
      payload: (input.payload ?? undefined) as any,
      status: "EN_ATTENTE",
    },
  });
  try {
    await dispatch(input);
    await prisma.notification.update({ where: { id: row.id }, data: { status: "ENVOYE", sentAt: new Date() } });
  } catch (err) {
    console.error("[Notif] échec d'envoi :", err);
    await prisma.notification.update({ where: { id: row.id }, data: { status: "ECHEC", retries: { increment: 1 } } });
  }
}

/** Rejoue les notifications en attente/échec (hors in-app), sous le plafond de retries. */
export async function retryPendingNotifications(prisma: PrismaClient): Promise<number> {
  const pending = await prisma.notification.findMany({
    where: { status: { in: ["EN_ATTENTE", "ECHEC"] }, canal: { not: "IN_APP" }, retries: { lt: MAX_RETRIES } },
    take: 100,
  });
  let ok = 0;
  for (const n of pending) {
    try {
      const to = (n.payload as any)?.to as string | undefined;
      await dispatch({ canal: n.canal as Canal, type: n.type, titre: n.titre, message: n.message, to });
      await prisma.notification.update({ where: { id: n.id }, data: { status: "ENVOYE", sentAt: new Date() } });
      ok++;
    } catch {
      await prisma.notification.update({ where: { id: n.id }, data: { status: "ECHEC", retries: { increment: 1 } } });
    }
  }
  return ok;
}
