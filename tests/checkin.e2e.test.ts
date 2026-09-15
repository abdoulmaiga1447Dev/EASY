/**
 * Tests de bout en bout — Flux 1 (check-in / check-out).
 * Upload des preuves, check-in sur l'attribution du jour, blocages (permis expiré,
 * preuve manquante), check-out impossible sans check-in, RBAC, supervision.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const DATE = "2031-03-10";
const d0 = new Date("2031-03-10T00:00:00Z");

let jpeg: Buffer;
let assignmentId: string;
let savedPermis: Date | null = null;

async function upload(userId: string): Promise<string> {
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", jpeg, "p.jpg");
  expect(res.status).toBe(201);
  return res.body.id;
}

beforeAll(async () => {
  jpeg = await new Jimp({ width: 400, height: 300, color: 0x2277eeff }).getBuffer("image/jpeg");
  // Permis valide pour le chauffeur de démo
  const prof = await prisma.driverProfile.findUnique({ where: { userId: DEMO.chauffeur } });
  savedPermis = prof?.permisExpiration ?? null;
  await prisma.driverProfile.update({ where: { userId: DEMO.chauffeur }, data: { permisExpiration: new Date("2030-01-01T00:00:00Z") } });
  // Attribution de test isolée
  await prisma.shiftRecord.deleteMany({ where: { date: d0 } });
  await prisma.assignment.deleteMany({ where: { vehicleId: "v_f1", date: d0, shift: "A" } });
  const a = await prisma.assignment.create({ data: { siteId: "site_abidjan", date: d0, shift: "A", driverId: DEMO.chauffeur, vehicleId: "v_f1", createdById: DEMO.admin } });
  assignmentId = a.id;
});

describe("Check-in", () => {
  it("refuse un check-in incomplet (400)", async () => {
    const res = await request(app).post(`/api/fleet/shifts/${assignmentId}/checkin`).set(auth(DEMO.chauffeur)).send({ gpsLat: 5.3, gpsLng: -4 });
    expect(res.status).toBe(400);
    expect(res.body.manquants).toContain("kmDebut");
  });

  it("un autre chauffeur ne peut pas faire ce check-in (403)", async () => {
    const res = await request(app).post(`/api/fleet/shifts/${assignmentId}/checkin`).set(auth(DEMO.dispatcher)).send({});
    expect(res.status).toBe(403); // dispatcher n'a pas self.checkin
  });

  it("check-in complet réussit et passe le shift EN_COURS", async () => {
    const [c, v, p, s] = [await upload(DEMO.chauffeur), await upload(DEMO.chauffeur), await upload(DEMO.chauffeur), await upload(DEMO.chauffeur)];
    const res = await request(app).post(`/api/fleet/shifts/${assignmentId}/checkin`).set(auth(DEMO.chauffeur))
      .send({ gpsLat: 5.35, gpsLng: -4.01, kmDebut: 12000, photoCompteur: c, photoVehicule: v, photoPermis: p, selfieKyc: s });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("EN_COURS");
  });

  it("bloque le check-in si le permis est expiré", async () => {
    await prisma.driverProfile.update({ where: { userId: DEMO.chauffeur }, data: { permisExpiration: new Date("2020-01-01T00:00:00Z") } });
    // nouvelle attribution pour retenter
    const a2 = await prisma.assignment.create({ data: { siteId: "site_abidjan", date: d0, shift: "B", driverId: DEMO.chauffeur, vehicleId: "v_f2", createdById: DEMO.admin } });
    const res = await request(app).post(`/api/fleet/shifts/${a2.id}/checkin`).set(auth(DEMO.chauffeur)).send({ gpsLat: 5, gpsLng: -4, kmDebut: 1, photoCompteur: "x", photoVehicule: "x", photoPermis: "x", selfieKyc: "x" });
    expect(res.status).toBe(403);
    await prisma.driverProfile.update({ where: { userId: DEMO.chauffeur }, data: { permisExpiration: new Date("2030-01-01T00:00:00Z") } });
  });
});

describe("Check-out", () => {
  it("refuse un check-out incomplet (400)", async () => {
    const res = await request(app).post(`/api/fleet/shifts/${assignmentId}/checkout`).set(auth(DEMO.chauffeur)).send({ kmFin: 12200 });
    expect(res.status).toBe(400);
  });

  it("check-out complet réussit, calcule km/durée et passe TERMINE", async () => {
    const [a, b, c, d] = [await upload(DEMO.chauffeur), await upload(DEMO.chauffeur), await upload(DEMO.chauffeur), await upload(DEMO.chauffeur)];
    const res = await request(app).post(`/api/fleet/shifts/${assignmentId}/checkout`).set(auth(DEMO.chauffeur))
      .send({ kmFin: 12180, photoAvant: a, photoArriere: b, photoGauche: c, photoDroite: d });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("TERMINE");
    expect(res.body.kmParcourus).toBe(180);
  });
});

describe("Supervision", () => {
  it("le Responsable terrain voit les shifts du jour, pas le chauffeur", async () => {
    const ok = await request(app).get(`/api/fleet/shifts?siteId=site_abidjan&date=${DATE}`).set(auth(DEMO.terrain));
    expect(ok.status).toBe(200);
    expect(ok.body.shifts.length).toBeGreaterThanOrEqual(1);
    const ko = await request(app).get(`/api/fleet/shifts?siteId=site_abidjan&date=${DATE}`).set(auth(DEMO.chauffeur));
    expect(ko.status).toBe(403); // chauffeur n'a pas shift.superviser
  });

  it("le chauffeur consulte son propre shift du jour", async () => {
    const res = await request(app).get(`/api/fleet/me/shift?date=${DATE}`).set(auth(DEMO.chauffeur));
    expect(res.status).toBe(200);
    expect(res.body.assignment?.id).toBe(assignmentId);
  });
});

afterAll(async () => {
  await prisma.shiftRecord.deleteMany({ where: { date: d0 } });
  await prisma.assignment.deleteMany({ where: { date: d0 } });
  await prisma.mediaAsset.deleteMany({ where: { resourceType: "ShiftRecord" } });
  if (savedPermis) await prisma.driverProfile.update({ where: { userId: DEMO.chauffeur }, data: { permisExpiration: savedPermis } }).catch(() => {});
  await prisma.$disconnect();
});
