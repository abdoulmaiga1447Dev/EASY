/**
 * Tests de bout en bout — Flux 2 (reversement).
 * Reversement accepté ; reversement avec écart → double validation → dette ; RBAC.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const d0 = new Date("2031-04-05T00:00:00Z");

async function makeTerminatedShift(vehicleId: string, shift: "A" | "B") {
  const a = await prisma.assignment.create({ data: { siteId: "site_abidjan", date: d0, shift, driverId: DEMO.chauffeur, vehicleId, createdById: DEMO.admin } });
  await prisma.shiftRecord.create({ data: { assignmentId: a.id, driverId: DEMO.chauffeur, vehicleId, siteId: "site_abidjan", date: d0, shift, statut: "TERMINE", checkinAt: new Date("2031-04-05T06:00:00Z"), checkoutAt: new Date("2031-04-05T14:00:00Z"), kmDebut: 1000, kmFin: 1150 } });
  return a.id;
}

async function cleanup() {
  const revs = await prisma.reversement.findMany({ where: { date: d0 }, select: { id: true } });
  await prisma.reversementDepense.deleteMany({ where: { reversementId: { in: revs.map((r) => r.id) } } });
  await prisma.detteChauffeur.deleteMany({ where: { sourceId: { in: revs.map((r) => r.id) } } });
  await prisma.reversement.deleteMany({ where: { date: d0 } });
  await prisma.shiftRecord.deleteMany({ where: { date: d0 } });
  await prisma.assignment.deleteMany({ where: { date: d0 } });
}

beforeAll(cleanup);
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Reversement accepté", () => {
  it("un écart dans la tolérance est accepté automatiquement", async () => {
    const aid = await makeTerminatedShift("v_f1", "A");
    const res = await request(app).post(`/api/fleet/shifts/${aid}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 50000, montantReverse: 49500, preuveYangoMediaId: "m1", preuveReversementMediaId: "m2", depenses: [] });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("ACCEPTE");
    expect(res.body.montantAttendu).toBe(49500);
  });

  it("un petit manquant est constaté et crée une dette, sans validation", async () => {
    const aid = await makeTerminatedShift("v_f5", "A");
    const res = await request(app).post(`/api/fleet/shifts/${aid}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 50000, montantReverse: 47000, preuveYangoMediaId: "m1", preuveReversementMediaId: "m2", depenses: [] });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("ECART_CONSTATE"); // constaté automatiquement, pas de double validation
    expect(res.body.ecart).toBe(2500); // 49500 attendu - 47000 reversé
    expect(res.body.detteId).toBeTruthy();
    const dette = await prisma.detteChauffeur.findFirst({ where: { sourceId: res.body.id } });
    expect(dette).not.toBeNull();
    expect(dette!.montant).toBe(2500);
  });

  it("refuse un reversement sans preuve (relevé Yango / virement obligatoires)", async () => {
    const aid = await makeTerminatedShift("v_f4", "A");
    const res = await request(app).post(`/api/fleet/shifts/${aid}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 10000, montantReverse: 10000, depenses: [] });
    expect(res.status).toBe(400);
  });

  it("check-out requis avant reversement", async () => {
    const a = await prisma.assignment.create({ data: { siteId: "site_abidjan", date: d0, shift: "B", driverId: DEMO.chauffeur, vehicleId: "v_f3", createdById: DEMO.admin } });
    const res = await request(app).post(`/api/fleet/shifts/${a.id}/reversement`).set(auth(DEMO.chauffeur)).send({ recetteYango: 1000, montantReverse: 1000 });
    expect(res.status).toBe(400);
  });
});

describe("Écart constaté et dette (sans double validation)", () => {
  it("un écart, quel que soit le montant, est constaté et crée la dette dès la déclaration", async () => {
    const aid = await makeTerminatedShift("v_f2", "A");
    const res = await request(app).post(`/api/fleet/shifts/${aid}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 50000, montantReverse: 40000, preuveYangoMediaId: "m1", preuveReversementMediaId: "m2", depenses: [] });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("ECART_CONSTATE");
    expect(res.body.ecart).toBe(9500);
    expect(res.body.detteId).toBeTruthy();
    const dette = await prisma.detteChauffeur.findFirst({ where: { sourceId: res.body.id } });
    expect(dette).not.toBeNull();
    expect(dette!.montant).toBe(9500);
  });

  it("la supervision des shifts expose l'écart constaté au Responsable terrain", async () => {
    const res = await request(app).get(`/api/fleet/shifts?siteId=site_abidjan&date=2031-04-05`).set(auth(DEMO.terrain));
    expect(res.status).toBe(200);
    const avecEcart = res.body.shifts.filter((s: any) => s.ecart != null && s.ecart > 0);
    expect(avecEcart.length).toBeGreaterThanOrEqual(1);
    expect(avecEcart.every((s: any) => s.detteId)).toBe(true);
  });
});

describe("Supervision RBAC", () => {
  it("Finance voit les reversements, pas le chauffeur", async () => {
    expect((await request(app).get(`/api/fleet/reversements?date=2031-04-05`).set(auth(DEMO.finance))).status).toBe(200);
    expect((await request(app).get(`/api/fleet/reversements?date=2031-04-05`).set(auth(DEMO.chauffeur))).status).toBe(403);
  });
});
