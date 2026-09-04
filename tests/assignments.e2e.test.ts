/**
 * Tests de bout en bout — Flux 8 (attribution quotidienne).
 * Confirmation, unicité (véhicule, date, shift) au niveau BASE (y compris concurrence),
 * suggestions, remplacement réservé au Dispatcher, annulation qui libère le créneau,
 * planning du jour, RBAC.
 *
 * Utilise les données du seed (véhicules v_f*, chauffeurs drv_*) sur une date isolée.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const DATE = "2030-01-15"; // date isolée pour ne pas heurter le seed/autres tests

async function cleanup() {
  const d0 = new Date("2030-01-15T00:00:00Z");
  await prisma.assignment.deleteMany({ where: { date: d0 } });
  await prisma.assignmentEvent.deleteMany({ where: { date: d0 } });
}

beforeAll(cleanup);
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Confirmation et unicité", () => {
  it("crée une attribution et renvoie d'éventuels avertissements", async () => {
    const res = await request(app).post("/api/fleet/assignments").set(auth(DEMO.dispatcher))
      .send({ siteId: "site_abidjan", date: DATE, shift: "A", driverId: "drv_01", vehicleId: "v_f1" });
    expect(res.status).toBe(201);
    expect(res.body.assignment.vehicleId).toBe("v_f1");
    expect(Array.isArray(res.body.warnings)).toBe(true);
  });

  it("refuse une double attribution du même véhicule sur le même créneau (409)", async () => {
    const dup = await request(app).post("/api/fleet/assignments").set(auth(DEMO.dispatcher))
      .send({ siteId: "site_abidjan", date: DATE, shift: "A", driverId: "drv_02", vehicleId: "v_f1" });
    expect(dup.status).toBe(409);
  });

  it("garantit l'unicité même en cas d'appels concurrents", async () => {
    const body = { siteId: "site_abidjan", date: DATE, shift: "B", driverId: "drv_03", vehicleId: "v_f2" };
    const [a, b] = await Promise.all([
      request(app).post("/api/fleet/assignments").set(auth(DEMO.dispatcher)).send(body),
      request(app).post("/api/fleet/assignments").set(auth(DEMO.dispatcher)).send({ ...body, driverId: "drv_04" }),
    ]);
    const codes = [a.status, b.status].sort();
    expect(codes).toEqual([201, 409]); // exactement une réussite
  });

  it("refuse un véhicule immobilisé", async () => {
    // v_f9 est Immobilise dans le seed (site Yamoussoukro) : l'admin (tous sites)
    // atteint la vérification de disponibilité → 400.
    const res = await request(app).post("/api/fleet/assignments").set(auth(DEMO.admin))
      .send({ siteId: "site_yamoussoukro", date: DATE, shift: "A", driverId: "drv_15", vehicleId: "v_f9" });
    expect(res.status).toBe(400);
  });
});

describe("Suggestions et planning", () => {
  it("propose des véhicules disponibles, triés", async () => {
    const res = await request(app).get(`/api/fleet/assignments/suggestions?siteId=site_abidjan&date=${DATE}&shift=A&driverId=drv_05`).set(auth(DEMO.dispatcher));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    // v_f1 est déjà pris sur (DATE, A) : il ne doit pas être suggéré.
    expect(res.body.suggestions.find((s: any) => s.id === "v_f1")).toBeUndefined();
  });

  it("le planning du jour liste les attributions, chauffeurs et véhicules", async () => {
    const res = await request(app).get(`/api/fleet/assignments?siteId=site_abidjan&date=${DATE}`).set(auth(DEMO.dispatcher));
    expect(res.status).toBe(200);
    expect(res.body.shifts.A.length).toBeGreaterThanOrEqual(1);
    const v1 = res.body.vehicules.find((v: any) => v.id === "v_f1");
    expect(v1?.prisA).toBe(true); // grisé côté UI
  });
});

describe("Remplacement et annulation", () => {
  it("le remplacement de chauffeur est réservé au Dispatcher", async () => {
    const a = await prisma.assignment.findFirst({ where: { date: new Date("2030-01-15T00:00:00Z"), vehicleId: "v_f1", shift: "A" } });
    // Superviseur (pas remplacement.valider) → 403
    const ko = await request(app).post(`/api/fleet/assignments/${a!.id}/replace`).set(auth(DEMO.superviseur)).send({ nouveauDriverId: "drv_06", motif: "test" });
    expect(ko.status).toBe(403);
    // Dispatcher → 200
    const ok = await request(app).post(`/api/fleet/assignments/${a!.id}/replace`).set(auth(DEMO.dispatcher)).send({ nouveauDriverId: "drv_06", motif: "Chauffeur souffrant" });
    expect(ok.status).toBe(200);
    expect(ok.body.assignment.driverId).toBe("drv_06");
    // Trace d'historique
    const ev = await prisma.assignmentEvent.findFirst({ where: { action: "REMPLACEMENT", vehicleId: "v_f1", date: new Date("2030-01-15T00:00:00Z") } });
    expect(ev).not.toBeNull();
  });

  it("le motif est obligatoire pour un remplacement", async () => {
    const a = await prisma.assignment.findFirst({ where: { date: new Date("2030-01-15T00:00:00Z"), vehicleId: "v_f1", shift: "A" } });
    const res = await request(app).post(`/api/fleet/assignments/${a!.id}/replace`).set(auth(DEMO.dispatcher)).send({ nouveauDriverId: "drv_07" });
    expect(res.status).toBe(400);
  });

  it("l'annulation libère le créneau (réattribution possible)", async () => {
    const a = await prisma.assignment.findFirst({ where: { date: new Date("2030-01-15T00:00:00Z"), vehicleId: "v_f1", shift: "A" } });
    const del = await request(app).delete(`/api/fleet/assignments/${a!.id}`).set(auth(DEMO.dispatcher)).send({ motif: "Réorganisation" });
    expect(del.status).toBe(200);
    // le créneau est de nouveau libre
    const re = await request(app).post("/api/fleet/assignments").set(auth(DEMO.dispatcher)).send({ siteId: "site_abidjan", date: DATE, shift: "A", driverId: "drv_08", vehicleId: "v_f1" });
    expect(re.status).toBe(201);
    // l'annulation est tracée
    const ev = await prisma.assignmentEvent.findFirst({ where: { action: "ANNULATION", vehicleId: "v_f1", date: new Date("2030-01-15T00:00:00Z") } });
    expect(ev).not.toBeNull();
  });
});

describe("RBAC", () => {
  it("un chauffeur ne peut pas voir ni créer d'attribution", async () => {
    expect((await request(app).get(`/api/fleet/assignments?siteId=site_abidjan&date=${DATE}`).set(auth(DEMO.chauffeur))).status).toBe(403);
    expect((await request(app).post("/api/fleet/assignments").set(auth(DEMO.chauffeur)).send({ siteId: "site_abidjan", date: DATE, shift: "A", driverId: "drv_09", vehicleId: "v_f4" })).status).toBe(403);
  });
});
