/**
 * Tests de bout en bout — consultation des dettes chauffeur.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
let detteId: string;

beforeAll(async () => {
  const d = await prisma.detteChauffeur.create({ data: { driverId: DEMO.chauffeur, siteId: "site_abidjan", montant: 9500, motif: "Test dette e2e", sourceType: "manuel" } });
  detteId = d.id;
});
afterAll(async () => { await prisma.detteChauffeur.delete({ where: { id: detteId } }).catch(() => {}); await prisma.$disconnect(); });

describe("Consultation des dettes", () => {
  it("le chauffeur voit ses propres dettes", async () => {
    const res = await request(app).get("/api/fleet/me/dettes").set(auth(DEMO.chauffeur));
    expect(res.status).toBe(200);
    expect(res.body.dettes.some((d: any) => d.id === detteId)).toBe(true);
    expect(res.body.resteTotal).toBeGreaterThanOrEqual(9500);
  });

  it("Finance voit les dettes du site, pas un chauffeur la liste globale", async () => {
    expect((await request(app).get("/api/fleet/dettes").set(auth(DEMO.finance))).status).toBe(200);
    expect((await request(app).get("/api/fleet/dettes").set(auth(DEMO.chauffeur))).status).toBe(403);
  });

  it("le détail est accessible au chauffeur concerné et à Finance", async () => {
    expect((await request(app).get(`/api/fleet/dettes/${detteId}`).set(auth(DEMO.chauffeur))).status).toBe(200);
    expect((await request(app).get(`/api/fleet/dettes/${detteId}`).set(auth(DEMO.finance))).status).toBe(200);
  });

  it("un autre chauffeur ne voit pas le détail (403)", async () => {
    const res = await request(app).get(`/api/fleet/dettes/${detteId}`).set(auth("drv_02"));
    expect(res.status).toBe(403);
  });
});
