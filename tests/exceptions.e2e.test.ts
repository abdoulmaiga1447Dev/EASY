/**
 * Tests de bout en bout — exception cash (Bloc B3).
 */
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const created: string[] = [];

describe("Exception cash", () => {
  it("le Responsable terrain déclare une exception cash", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain))
      .send({ driverId: DEMO.chauffeur, montant: 12000, motif: "TPE en panne" });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("EN_ATTENTE_REGUL");
    created.push(res.body.id);
  });

  it("refuse sans motif (400)", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.terrain))
      .send({ driverId: DEMO.chauffeur, montant: 5000 });
    expect(res.status).toBe(400);
  });

  it("le chauffeur ne peut pas déclarer (403)", async () => {
    const res = await request(app).post("/api/fleet/exceptions-cash").set(auth(DEMO.chauffeur))
      .send({ driverId: DEMO.chauffeur, montant: 5000, motif: "x" });
    expect(res.status).toBe(403);
  });

  it("régularise l'exception cash", async () => {
    const res = await request(app).post(`/api/fleet/exceptions-cash/${created[0]}/regulariser`).set(auth(DEMO.finance)).send({});
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("REGULARISE");
  });

  it("Finance/Terrain voient la liste, pas le chauffeur", async () => {
    expect((await request(app).get("/api/fleet/exceptions-cash").set(auth(DEMO.finance))).status).toBe(200);
    expect((await request(app).get("/api/fleet/exceptions-cash").set(auth(DEMO.chauffeur))).status).toBe(403);
  });
});

afterAll(async () => {
  await prisma.compensationCash.deleteMany({ where: { motif: { in: ["TPE en panne", "x"] } } });
  await prisma.$disconnect();
});
