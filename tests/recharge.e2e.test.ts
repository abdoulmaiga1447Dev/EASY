/**
 * Tests de bout en bout — Flux 3 (recharge EV, Bloc C1).
 * Enregistrement par le superviseur et par le chauffeur, anti-fraude (borne hors
 * whitelist), cloisonnement (véhicule non attribué), supervision, RBAC.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { normalizeDay } from "../lib/assignment";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

let jpeg: Buffer;
const jour = normalizeDay(new Date());

async function upload(userId: string): Promise<string> {
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", jpeg, "p.jpg");
  expect(res.status).toBe(201);
  return res.body.id;
}

async function cleanup() {
  await prisma.rechargeRecord.deleteMany({ where: { vehicleId: { in: ["v_f1", "v_f2", "v_f5"] } } });
  await prisma.assignment.deleteMany({ where: { driverId: DEMO.chauffeur, vehicleId: "v_f2", date: jour, shift: "B" } });
}

beforeAll(async () => {
  jpeg = await new Jimp({ width: 300, height: 200, color: 0x2277eeff }).getBuffer("image/jpeg");
  await cleanup();
  // Le chauffeur a le véhicule v_f2 attribué aujourd'hui (shift B).
  await prisma.assignment.create({ data: { siteId: "site_abidjan", date: jour, shift: "B", driverId: DEMO.chauffeur, vehicleId: "v_f2", createdById: DEMO.admin } });
});
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Bornes", () => {
  it("liste les bornes whitelistées", async () => {
    const res = await request(app).get("/api/fleet/bornes").set(auth(DEMO.chauffeur));
    expect(res.status).toBe(200);
    expect(res.body.bornes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Enregistrement d'une recharge", () => {
  it("le Superviseur Logistique enregistre une recharge cohérente (aucune anomalie)", async () => {
    const m = await upload(DEMO.superviseur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.superviseur))
      .send({ vehicleId: "v_f1", typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 30, socFin: 70, justificatifMediaId: m });
    expect(res.status).toBe(201);
    expect(res.body.anomalieBorne).toBe(false);
    expect(res.body.anomalieCoherence).toBe(false);
  });

  it("borne hors whitelist → anomalie signalée", async () => {
    const m = await upload(DEMO.superviseur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.superviseur))
      .send({ vehicleId: "v_f5", typeCharge: "PARTENAIRE", lieu: "Borne inconnue", kwh: 12, cout: 1500, socDebut: 40, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(201);
    expect(res.body.anomalieBorne).toBe(true);
  });

  it("le chauffeur enregistre une recharge pour SON véhicule du jour", async () => {
    const m = await upload(DEMO.chauffeur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.chauffeur))
      .send({ vehicleId: "v_f2", typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 20, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(201);
    expect(res.body.driverId).toBe(DEMO.chauffeur);
  });

  it("le chauffeur ne peut pas enregistrer pour un véhicule qui n'est pas le sien (403)", async () => {
    const m = await upload(DEMO.chauffeur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.chauffeur))
      .send({ vehicleId: "v_f5", typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 20, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(403);
  });

  it("refuse une recharge incomplète (400)", async () => {
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.superviseur)).send({ vehicleId: "v_f1", typeCharge: "DOMESTIQUE" });
    expect(res.status).toBe(400);
  });
});

describe("Supervision & RBAC", () => {
  it("le Superviseur Logistique voit les recharges et le résumé", async () => {
    const res = await request(app).get("/api/fleet/recharges").set(auth(DEMO.superviseur));
    expect(res.status).toBe(200);
    expect(res.body.resume.total).toBeGreaterThanOrEqual(1);
    expect(res.body.resume).toHaveProperty("totalKwh");
  });

  it("un rôle sans permission recharge ne peut pas enregistrer (403)", async () => {
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.dispatcher))
      .send({ vehicleId: "v_f1", typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 30, socFin: 70, justificatifMediaId: "x" });
    expect(res.status).toBe(403);
  });
});
