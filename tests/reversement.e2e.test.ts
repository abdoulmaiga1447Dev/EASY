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

describe("Écart, double validation et dette", () => {
  let revId: string;

  it("un écart au-delà de la tolérance passe en ECART_A_VALIDER", async () => {
    const aid = await makeTerminatedShift("v_f2", "A");
    const res = await request(app).post(`/api/fleet/shifts/${aid}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 50000, montantReverse: 40000, preuveYangoMediaId: "m1", preuveReversementMediaId: "m2", depenses: [] });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("ECART_A_VALIDER");
    expect(res.body.ecart).toBe(9500);
    revId = res.body.id;
  });

  it("le chauffeur ne peut pas valider le rapprochement (403)", async () => {
    const res = await request(app).post(`/api/fleet/reversements/${revId}/valider`).set(auth(DEMO.chauffeur)).send({});
    expect(res.status).toBe(403);
  });

  it("une seule validation ne suffit pas (reste ECART_A_VALIDER)", async () => {
    const res = await request(app).post(`/api/fleet/reversements/${revId}/valider`).set(auth(DEMO.finance)).send({});
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("ECART_A_VALIDER");
    expect(res.body.valideFinanceById).toBeTruthy();
  });

  it("la double validation (Finance + Terrain) rapproche et crée la dette", async () => {
    const res = await request(app).post(`/api/fleet/reversements/${revId}/valider`).set(auth(DEMO.terrain)).send({});
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("RAPPROCHE");
    const dette = await prisma.detteChauffeur.findFirst({ where: { sourceId: revId } });
    expect(dette).not.toBeNull();
    expect(dette!.montant).toBe(9500);
  });
});

describe("Supervision RBAC", () => {
  it("Finance voit les reversements, pas le chauffeur", async () => {
    expect((await request(app).get(`/api/fleet/reversements?date=2031-04-05`).set(auth(DEMO.finance))).status).toBe(200);
    expect((await request(app).get(`/api/fleet/reversements?date=2031-04-05`).set(auth(DEMO.chauffeur))).status).toBe(403);
  });
});
