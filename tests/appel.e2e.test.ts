/**
 * Tests d'intégration — appel intégré : signalisation Socket.IO réelle (serveur + clients).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import request from "supertest";
import { Server } from "socket.io";
import { io as ioc, type Socket } from "socket.io-client";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { registerFleetSockets } from "../server/partA/appel";

const app = buildApp();
let server: http.Server;
let url: string;
let demandeId: string;
const clients: Socket[] = [];

function client(userId: string | null): Promise<Socket> {
  return new Promise((resolve) => {
    const s = ioc(url, { transports: ["websocket"], forceNew: true });
    clients.push(s);
    s.on("connect", () => {
      if (userId) s.emit("fleet:auth", tokenFor(userId));
      setTimeout(() => resolve(s), 150);
    });
  });
}
const attendre = <T = any>(s: Socket, event: string, ms = 2000) => new Promise<T>((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
  s.once(event, (p: T) => { clearTimeout(t); resolve(p); });
});
const emettre = (s: Socket, event: string, payload: any) => new Promise<any>((resolve) => s.emit(event, payload, resolve));
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  server = http.createServer();
  const io = new Server(server);
  registerFleetSockets(io, prisma, { sonnerieMs: 500 });
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as any).port}`;
  await prisma.demandeRecharge.deleteMany({ where: { vehicleId: "v_f6", driverId: DEMO.chauffeur } });
  const d = await prisma.demandeRecharge.create({ data: { vehicleId: "v_f6", driverId: DEMO.chauffeur, siteId: "site_abidjan" } });
  demandeId = d.id;
});
afterAll(async () => {
  clients.forEach((c) => c.close());
  server.close();
  await prisma.demandeRecharge.deleteMany({ where: { id: demandeId } });
  await prisma.$disconnect();
});

describe("Appel Superviseur → chauffeur", () => {
  it("sonne, décroche, relaie la signalisation, raccroche et trace la durée dans le fil", async () => {
    const sup = await client(DEMO.superviseur);
    const ch = await client(DEMO.chauffeur);
    const sonnerie = attendre(ch, "call:incoming");
    const r = await emettre(sup, "call:invite", { demandeId });
    expect(r.ok).toBe(true);
    const inv: any = await sonnerie;
    expect(inv.callId).toBe(r.callId);
    expect(inv.appelantNom).toBeTruthy();

    const accepte = attendre(sup, "call:accepted");
    expect((await emettre(ch, "call:accept", { callId: r.callId })).ok).toBe(true);
    await accepte;

    const signal = attendre(ch, "call:signal");
    sup.emit("call:signal", { callId: r.callId, data: { type: "offer", sdp: "v=0" } });
    expect((await signal as any).data.type).toBe("offer");

    await pause(1100);
    const finSup = attendre(sup, "call:ended");
    ch.emit("call:hangup", { callId: r.callId });
    expect((await finSup as any).etat).toBe("TERMINE");
    await pause(200);
    const m = await prisma.demandeRechargeMessage.findFirst({ where: { demandeId, type: "APPEL" }, orderBy: { createdAt: "desc" } });
    expect(m?.texte).toMatch(/^Appel · [12] s$/);
    sup.close(); ch.close();
  });

  it("sans réponse : appel manqué après la sonnerie", async () => {
    const sup = await client(DEMO.superviseur);
    const ch = await client(DEMO.chauffeur);
    const r = await emettre(sup, "call:invite", { demandeId });
    expect(r.ok).toBe(true);
    const fin: any = await attendre(sup, "call:ended", 3000);
    expect(fin.etat).toBe("MANQUE");
    await pause(200);
    const m = await prisma.demandeRechargeMessage.findFirst({ where: { demandeId, type: "APPEL" }, orderBy: { createdAt: "desc" } });
    expect(m?.texte).toBe("Appel manqué");
    sup.close(); ch.close();
  });

  it("le chauffeur peut refuser", async () => {
    const sup = await client(DEMO.superviseur);
    const ch = await client(DEMO.chauffeur);
    const r = await emettre(sup, "call:invite", { demandeId });
    const fin = attendre(sup, "call:ended");
    ch.emit("call:reject", { callId: r.callId });
    expect((await fin as any).etat).toBe("REFUSE");
    sup.close(); ch.close();
  });

  it("appelé ni connecté ni abonné aux notifications : l'appel est refusé tout de suite", async () => {
    await prisma.pushAbonnement.deleteMany({ where: { userId: DEMO.chauffeur } });
    const sup = await client(DEMO.superviseur);
    const r = await emettre(sup, "call:invite", { demandeId });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/par téléphone/);
    sup.close();
  });

  it("l'appelé qui se connecte pendant la sonnerie reçoit l'appel (retour depuis la notification)", async () => {
    // Le chauffeur n'a pas EASY ouvert mais a activé les notifications.
    await prisma.pushAbonnement.create({ data: { userId: DEMO.chauffeur, endpoint: "https://push.exemple.invalid/test-" + Date.now(), p256dh: "k", auth: "a" } });
    const sup = await client(DEMO.superviseur);
    const r = await emettre(sup, "call:invite", { demandeId });
    expect(r.ok).toBe(true);
    expect(r.info).toMatch(/notification/);
    const ch = ioc(url, { transports: ["websocket"], forceNew: true });
    clients.push(ch);
    const inv = attendre(ch, "call:incoming");
    ch.on("connect", () => ch.emit("fleet:auth", tokenFor(DEMO.chauffeur)));
    expect((await inv as any).callId).toBe(r.callId);
    sup.emit("call:cancel", { callId: r.callId });
    await pause(200);
    await prisma.pushAbonnement.deleteMany({ where: { userId: DEMO.chauffeur, endpoint: { startsWith: "https://push.exemple.invalid/" } } });
    sup.close(); ch.close();
  });
});

describe("Appel chauffeur → superviseurs", () => {
  it("tous les superviseurs du site sonnent ; le premier qui décroche prend l'appel", async () => {
    const ch = await client(DEMO.chauffeur);
    const sup = await client(DEMO.superviseur);
    const admin = await client(DEMO.admin);
    const s1 = attendre(sup, "call:incoming"), s2 = attendre(admin, "call:incoming");
    const r = await emettre(ch, "call:invite", { demandeId });
    expect(r.ok).toBe(true);
    await Promise.all([s1, s2]);
    const pris = attendre(admin, "call:taken");
    expect((await emettre(sup, "call:accept", { callId: r.callId })).ok).toBe(true);
    await pris;
    expect((await emettre(admin, "call:accept", { callId: r.callId })).ok).toBe(false);
    const fin = attendre(ch, "call:ended");
    sup.emit("call:hangup", { callId: r.callId });
    await fin;
    ch.close(); sup.close(); admin.close();
  });
});

describe("Sécurité", () => {
  it("refuse un appel non authentifié, d'un rôle non concerné, ou en double", async () => {
    const anonyme = await client(null);
    expect((await emettre(anonyme, "call:invite", { demandeId })).ok).toBe(false);
    const disp = await client(DEMO.dispatcher);
    expect((await emettre(disp, "call:invite", { demandeId })).ok).toBe(false);
    const sup = await client(DEMO.superviseur);
    const ch = await client(DEMO.chauffeur);
    const r1 = await emettre(sup, "call:invite", { demandeId });
    expect(r1.ok).toBe(true);
    expect((await emettre(ch, "call:invite", { demandeId })).ok).toBe(false);
    // Un intrus ne peut ni décrocher ni relayer.
    expect((await emettre(disp, "call:accept", { callId: r1.callId })).ok).toBe(false);
    sup.emit("call:cancel", { callId: r1.callId });
    await pause(200);
    [anonyme, disp, sup, ch].forEach((c) => c.close());
  });
});

describe("REST", () => {
  it("config des appels (serveurs ICE) et abonnement push", async () => {
    const auth = { Authorization: `Bearer ${tokenFor(DEMO.chauffeur)}` };
    const cfg = await request(app).get("/api/fleet/appels/config").set(auth);
    expect(cfg.status).toBe(200);
    expect(cfg.body.iceServers.length).toBeGreaterThanOrEqual(1);
    expect((await request(app).get("/api/fleet/appels/config")).status).toBe(401);
    expect((await request(app).post("/api/fleet/push/abonnement").set(auth).send({ endpoint: "http://x" })).status).toBe(400);
    const endpoint = "https://push.exemple.test/abc-" + Date.now();
    const ok = await request(app).post("/api/fleet/push/abonnement").set(auth).send({ endpoint, keys: { p256dh: "k", auth: "a" } });
    expect(ok.status).toBe(201);
    await request(app).delete("/api/fleet/push/abonnement").set(auth).send({ endpoint });
    expect(await prisma.pushAbonnement.findUnique({ where: { endpoint } })).toBeNull();
  });
});
