/**
 * Tests de bout en bout — exception cash (Bloc B3), rattachée à un shift.
 * Règles : chauffeur programmé (attribution obligatoire) + exclusivité avec le reversement.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const d0 = new Date("2031-05-04T00:00:00Z");
let aExc: string; // attribution pour l'exception
let aRev: string; // attribution avec un reversement (pour tester l'exclusivité)

async function makeTerminatedShift(vehicleId: string, shift: "A" | "B") {
  const a = await prisma.assignment.create({ data: { siteId: "site_abidjan", date: d0, shift, driverId: DEMO.chauffeur, vehicleId, createdById: DEMO.admin } });
  await prisma.shiftRecord.create({ data: { assignmentId: a.id, driverId: DEMO.chauffeur, vehicleId, siteId: "site_abidjan", date: d0, shift, statut: "TERMINE", checkinAt: d0, checkoutAt: d0, kmDebut: 1, kmFin: 2 } });
  return a.id;
}

async function cleanup() {
  const as = await prisma.assignment.findMany({ where: { date: d0 }, select: { id: true } });
  const ids = as.map((a) => a.id);
  await prisma.compensationCash.deleteMany({ where: { assignmentId: { in: ids } } });
  const revs = await prisma.reversement.findMany({ where: { date: d0 }, select: { id: true } });
  await prisma.reversementDepense.deleteMany({ where: { reversementId: { in: revs.map((r) => r.id) } } });
  await prisma.reversement.deleteMany({ where: { date: d0 } });
  await prisma.shiftRecord.deleteMany({ where: { date: d0 } });
  await prisma.assignment.deleteMany({ where: { date: d0 } });
}

beforeAll(async () => {
  await cleanup();
  aExc = await makeTerminatedShift("v_f1", "A");
  aRev = await makeTerminatedShift("v_f2", "B");
  // Un reversement existe déjà sur aRev.
  const sr = await prisma.shiftRecord.findUnique({ where: { assignmentId: aRev } });
  await prisma.reversement.create({ data: { shiftRecordId: sr!.id, driverId: DEMO.chauffeur, vehicleId: "v_f2", siteId: "site_abidjan", date: d0, shift: "B", recetteYango: 10000, montantReverse: 10000, montantAttendu: 9900, ecart: -100, statut: "ACCEPTE" } });
});
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Exception cash rattachée à un shift", () => {
  it("le Responsable terrain déclare une exception sur un shift", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain)).send({ assignmentId: aExc, montant: 12000, motif: "TPE en panne" });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("EN_ATTENTE_REGUL");
  });

  it("refuse sans motif (400)", async () => {
    const a3 = await makeTerminatedShift("v_f3", "A");
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain)).send({ assignmentId: a3, montant: 5000 });
    expect(res.status).toBe(400);
  });

  it("refuse une 2e exception sur le même shift (409)", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain)).send({ assignmentId: aExc, montant: 3000, motif: "x" });
    expect(res.status).toBe(409);
  });

  it("refuse une exception si un reversement existe déjà pour ce shift (409)", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain)).send({ assignmentId: aRev, montant: 3000, motif: "x" });
    expect(res.status).toBe(409);
  });

  it("refuse un reversement si une exception cash existe pour ce shift (409)", async () => {
    const res = await request(app).post(`/api/fleet/shifts/${aExc}/reversement`).set(auth(DEMO.chauffeur))
      .send({ recetteYango: 10000, montantReverse: 10000, preuveYangoMediaId: "m1", preuveReversementMediaId: "m2", depenses: [] });
    expect(res.status).toBe(409);
  });

  it("le chauffeur ne peut pas déclarer (403)", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.chauffeur)).send({ assignmentId: aExc, montant: 5000, motif: "x" });
    expect(res.status).toBe(403);
  });
});
