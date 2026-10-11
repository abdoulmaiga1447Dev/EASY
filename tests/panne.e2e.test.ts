/**
 * Tests de bout en bout — Flux 4 (panne, Bloc C2a).
 * Déclaration (chauffeur), qualification (terrain), immobilisation auto si critique,
 * check-in refusé sur véhicule immobilisé, RBAC.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { normalizeDay } from "../lib/assignment";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const DRIVER = "drv_01";
const VEH = "v_f3";
const jour = normalizeDay(new Date());

let jpeg: Buffer;
let statutInitial = "Disponible";

async function upload(userId: string): Promise<string> {
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", jpeg, "p.jpg");
  expect(res.status).toBe(201);
  return res.body.id;
}

async function cleanup() {
  await prisma.panne.deleteMany({ where: { vehicleId: VEH } });
  await prisma.assignment.deleteMany({ where: { driverId: DRIVER, vehicleId: VEH, date: jour } });
}

beforeAll(async () => {
  jpeg = await new Jimp({ width: 300, height: 200, color: 0x2277eeff }).getBuffer("image/jpeg");
  const v = await prisma.fleetVehicle.findUnique({ where: { id: VEH }, select: { statut: true } });
  statutInitial = v?.statut ?? "Disponible";
  await prisma.fleetVehicle.update({ where: { id: VEH }, data: { statut: "Disponible" } });
  await prisma.driverProfile.update({ where: { userId: DRIVER }, data: { permisExpiration: new Date("2030-01-01T00:00:00Z") } }).catch(() => {});
  await cleanup();
  await prisma.assignment.create({ data: { siteId: "site_abidjan", date: jour, shift: "A", driverId: DRIVER, vehicleId: VEH, createdById: DEMO.admin } });
});
afterAll(async () => {
  await cleanup();
  await prisma.fleetVehicle.update({ where: { id: VEH }, data: { statut: statutInitial as any } });
  await prisma.$disconnect();
});

describe("Déclaration de panne", () => {
  it("refuse une déclaration sans photo (400)", async () => {
    const res = await request(app).post("/api/fleet/pannes").set(auth(DRIVER)).send({ description: "Bruit moteur" });
    expect(res.status).toBe(400);
  });

  it("le chauffeur déclare une panne (description + photo)", async () => {
    const m = await upload(DRIVER);
    const res = await request(app).post("/api/fleet/pannes").set(auth(DRIVER)).send({ description: "Voyant moteur allumé", photos: [m] });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("DECLAREE");
    expect(res.body.vehicleId).toBe(VEH);
  });
});

describe("Qualification et immobilisation", () => {
  let panneId: string;
  beforeAll(async () => {
    const m = await upload(DRIVER);
    const res = await request(app).post("/api/fleet/pannes").set(auth(DRIVER)).send({ description: "Fumée sous le capot", photos: [m] });
    panneId = res.body.id;
  });

  it("le chauffeur ne peut pas qualifier (403)", async () => {
    const res = await request(app).post(`/api/fleet/pannes/${panneId}/qualifier`).set(auth(DRIVER)).send({ gravite: "CRITIQUE" });
    expect(res.status).toBe(403);
  });

  it("la Maintenance ne qualifie pas (403) mais voit la liste (200)", async () => {
    const q = await request(app).post(`/api/fleet/pannes/${panneId}/qualifier`).set(auth(DEMO.maintenance)).send({ gravite: "CRITIQUE" });
    expect(q.status).toBe(403);
    const l = await request(app).get("/api/fleet/pannes").set(auth(DEMO.maintenance));
    expect(l.status).toBe(200);
  });

  it("le Responsable terrain qualifie CRITIQUE → véhicule immobilisé", async () => {
    const res = await request(app).post(`/api/fleet/pannes/${panneId}/qualifier`).set(auth(DEMO.terrain)).send({ gravite: "CRITIQUE" });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("QUALIFIEE");
    expect(res.body.immobilise).toBe(true);
    const v = await prisma.fleetVehicle.findUnique({ where: { id: VEH }, select: { statut: true } });
    expect(v?.statut).toBe("Immobilise");
  });

  it("check-in impossible sur un véhicule immobilisé (409)", async () => {
    const a = await prisma.assignment.findFirst({ where: { driverId: DRIVER, vehicleId: VEH, date: jour } });
    const res = await request(app).post(`/api/fleet/shifts/${a!.id}/checkin`).set(auth(DRIVER))
      .send({ gpsLat: 5.3, gpsLng: -4, kmDebut: 1000, photoCompteur: "x", photoVehicule: "x", photoPermis: "x", selfieKyc: "x" });
    expect(res.status).toBe(409);
  });
});
