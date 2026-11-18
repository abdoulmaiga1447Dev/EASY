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
  await prisma.borneRecharge.deleteMany({ where: { nom: { startsWith: "TEST-" } } });
  await prisma.propositionBorne.deleteMany({ where: { proposeParId: { in: [DEMO.superviseur, DEMO.admin] } } });
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
    expect(res.body.anomalieCoherence).toBe(false);
  });

  it("refuse une recharge sans borne (borne obligatoire et whitelistée)", async () => {
    const m = await upload(DEMO.superviseur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.superviseur))
      .send({ vehicleId: "v_f5", typeCharge: "PARTENAIRE", lieu: "Borne inconnue", kwh: 12, cout: 1500, socDebut: 40, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(400);
  });

  it("refuse une borne inexistante / hors whitelist (400)", async () => {
    const m = await upload(DEMO.superviseur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.superviseur))
      .send({ vehicleId: "v_f5", typeCharge: "DOMESTIQUE", borneId: "borne_inconnue", kwh: 12, cout: 1500, socDebut: 40, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(400);
  });

  it("le chauffeur ne déclare plus de recharge lui-même, même pour son véhicule du jour (403 : il passe par une demande payée par le Superviseur)", async () => {
    const m = await upload(DEMO.chauffeur);
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.chauffeur))
      .send({ vehicleId: "v_f2", typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 20, socFin: 60, justificatifMediaId: m });
    expect(res.status).toBe(403);
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

describe("Bornes : le Superviseur propose, l'Admin ou la Finance valide", () => {
  let propId: string;
  let borneId: string;

  it("le Superviseur propose une borne : rien n'est créé avant validation (202)", async () => {
    const res = await request(app).post("/api/fleet/bornes").set(auth(DEMO.superviseur))
      .send({ nom: "TEST-Borne Cocody", type: "PARTENAIRE", operateur: "Test", siteId: "site_abidjan", prixKwh: 150 });
    expect(res.status).toBe(202);
    expect(res.body.proposition.statut).toBe("EN_ATTENTE");
    propId = res.body.proposition.id;
    expect(await prisma.borneRecharge.findFirst({ where: { nom: "TEST-Borne Cocody" } })).toBeNull();
  });

  it("refuse une borne sans nom (400)", async () => {
    const res = await request(app).post("/api/fleet/bornes").set(auth(DEMO.superviseur)).send({ type: "DOMESTIQUE" });
    expect(res.status).toBe(400);
  });

  it("la Finance voit la proposition et la valide : la borne est créée", async () => {
    const list = await request(app).get("/api/fleet/bornes/propositions").set(auth(DEMO.finance));
    expect(list.status).toBe(200);
    expect(list.body.propositions.find((p: any) => p.id === propId)).toBeDefined();
    const res = await request(app).post(`/api/fleet/bornes/propositions/${propId}/valider`).set(auth(DEMO.finance));
    expect(res.status).toBe(200);
    expect(res.body.borne.prixKwh).toBe(150);
    expect(res.body.borne.active).toBe(true);
    borneId = res.body.borne.id;
  });

  it("une proposition déjà traitée ne peut plus être validée (409)", async () => {
    const res = await request(app).post(`/api/fleet/bornes/propositions/${propId}/valider`).set(auth(DEMO.admin));
    expect(res.status).toBe(409);
  });

  it("un changement de prix est une proposition ; l'auteur ne peut pas la valider lui-même", async () => {
    const prop = await request(app).post("/api/fleet/bornes").set(auth(DEMO.admin))
      .send({ nom: "TEST-Borne Admin", type: "DOMESTIQUE", siteId: "site_abidjan" });
    expect(prop.status).toBe(202);
    const soi = await request(app).post(`/api/fleet/bornes/propositions/${prop.body.proposition.id}/valider`).set(auth(DEMO.admin));
    expect(soi.status).toBe(403);
    // La Finance (l'autre valideur) peut la refuser, avec un motif.
    const sansMotif = await request(app).post(`/api/fleet/bornes/propositions/${prop.body.proposition.id}/refuser`).set(auth(DEMO.finance)).send({});
    expect(sansMotif.status).toBe(400);
    const refus = await request(app).post(`/api/fleet/bornes/propositions/${prop.body.proposition.id}/refuser`).set(auth(DEMO.finance)).send({ motif: "Doublon" });
    expect(refus.status).toBe(200);
    expect(refus.body.proposition.statut).toBe("REFUSEE");
  });

  it("le prix du kWh ne change qu'après validation", async () => {
    const prop = await request(app).patch(`/api/fleet/bornes/${borneId}`).set(auth(DEMO.superviseur)).send({ prixKwh: 250 });
    expect(prop.status).toBe(202);
    expect((await prisma.borneRecharge.findUnique({ where: { id: borneId } }))?.prixKwh).toBe(150);
    const doublon = await request(app).patch(`/api/fleet/bornes/${borneId}`).set(auth(DEMO.superviseur)).send({ prixKwh: 300 });
    expect(doublon.status).toBe(409);
    const ok = await request(app).post(`/api/fleet/bornes/propositions/${prop.body.proposition.id}/valider`).set(auth(DEMO.admin));
    expect(ok.status).toBe(200);
    expect((await prisma.borneRecharge.findUnique({ where: { id: borneId } }))?.prixKwh).toBe(250);
  });

  it("la désactivation est immédiate ; la réactivation passe par une validation", async () => {
    const off = await request(app).patch(`/api/fleet/bornes/${borneId}`).set(auth(DEMO.superviseur)).send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.active).toBe(false);
    const active = await request(app).get("/api/fleet/bornes").set(auth(DEMO.superviseur));
    expect(active.body.bornes.find((b: any) => b.id === borneId)).toBeUndefined();
    const on = await request(app).patch(`/api/fleet/bornes/${borneId}`).set(auth(DEMO.superviseur)).send({ active: true });
    expect(on.status).toBe(202);
    expect((await prisma.borneRecharge.findUnique({ where: { id: borneId } }))?.active).toBe(false);
  });

  it("permissions : le chauffeur ne propose pas, le Superviseur ne valide pas, la Finance ne propose pas (403)", async () => {
    expect((await request(app).post("/api/fleet/bornes").set(auth(DEMO.chauffeur)).send({ nom: "TEST-X", type: "DOMESTIQUE" })).status).toBe(403);
    expect((await request(app).post(`/api/fleet/bornes/propositions/${propId}/valider`).set(auth(DEMO.superviseur))).status).toBe(403);
    expect((await request(app).post("/api/fleet/bornes").set(auth(DEMO.finance)).send({ nom: "TEST-Y", type: "DOMESTIQUE" })).status).toBe(403);
  });
});
