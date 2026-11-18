/**
 * Tests de bout en bout — rapprochement guidé des paiements de recharge (Finance).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
// Période isolée dans le passé pour ne pas croiser d'autres données.
const JOURS = ["2020-03-02", "2020-03-03", "2020-03-04"];
const ids: string[] = [];

async function cleanup() {
  const raps = await prisma.rapprochementWave.findMany({ where: { debut: { lt: new Date("2021-01-01") } }, select: { id: true } });
  await prisma.rapprochementWave.deleteMany({ where: { id: { in: raps.map((r) => r.id) } } });
  await prisma.demandeRecharge.deleteMany({ where: { refTransaction: { startsWith: "TX-RAP-" } } });
}

beforeAll(async () => {
  await cleanup();
  // Trois paiements déclarés par le Superviseur (un par jour).
  for (const [i, jour] of JOURS.entries()) {
    const d = await prisma.demandeRecharge.create({
      data: {
        vehicleId: "v_f5", driverId: DEMO.chauffeur, siteId: "site_abidjan", statut: "TERMINEE",
        montantPaye: 4000 + i * 500, refTransaction: `TX-RAP-${i}`, payeParId: DEMO.superviseur, payeLe: new Date(`${jour}T10:00:00.000Z`),
        socDebut: 30, socFin: 80,
      },
    });
    ids.push(d.id);
  }
});
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Rapprochement guidé", () => {
  let rapId: string;
  let lignes: any[];

  it("la Finance ouvre un rapprochement : une ligne par paiement déclaré de la période", async () => {
    const res = await request(app).post("/api/fleet/rapprochements").set(auth(DEMO.finance)).send({ debut: "2020-03-02", fin: "2020-03-03" });
    expect(res.status).toBe(201);
    rapId = res.body.id;
    lignes = res.body.lignes;
    expect(lignes.length).toBe(2); // le 4 mars est hors période
    expect(lignes[0].paiement.refTransaction).toBe("TX-RAP-0");
  });

  it("un seul rapprochement en cours à la fois (409)", async () => {
    const res = await request(app).post("/api/fleet/rapprochements").set(auth(DEMO.finance)).send({ debut: "2020-03-04", fin: "2020-03-04" });
    expect(res.status).toBe(409);
  });

  it("refuse la clôture tant que tout n'est pas vérifié (409)", async () => {
    const res = await request(app).post(`/api/fleet/rapprochements/${rapId}/cloturer`).set(auth(DEMO.finance));
    expect(res.status).toBe(409);
  });

  it("vérifie les paiements : conforme, puis montant différent (montant lu obligatoire)", async () => {
    const ok = await request(app).patch(`/api/fleet/rapprochements/${rapId}/lignes/${lignes[0].id}`).set(auth(DEMO.finance)).send({ verdict: "CONFORME" });
    expect(ok.status).toBe(200);
    const sansMontant = await request(app).patch(`/api/fleet/rapprochements/${rapId}/lignes/${lignes[1].id}`).set(auth(DEMO.finance)).send({ verdict: "MONTANT_DIFFERENT" });
    expect(sansMontant.status).toBe(400);
    const diff = await request(app).patch(`/api/fleet/rapprochements/${rapId}/lignes/${lignes[1].id}`).set(auth(DEMO.finance)).send({ verdict: "MONTANT_DIFFERENT", montantReel: 3000 });
    expect(diff.status).toBe(200);
    expect(diff.body.resumeCourant.verifies).toBe(2);
  });

  it("« absent de Wave » exige une note", async () => {
    const res = await request(app).patch(`/api/fleet/rapprochements/${rapId}/lignes/${lignes[0].id}`).set(auth(DEMO.finance)).send({ verdict: "ABSENT" });
    expect(res.status).toBe(400);
  });

  it("ajoute un paiement vu dans Wave sans demande (un n° déjà déclaré est refusé)", async () => {
    const declare = await request(app).post(`/api/fleet/rapprochements/${rapId}/lignes`).set(auth(DEMO.finance))
      .send({ date: "2020-03-03T09:00:00Z", montant: 2000, refTransaction: "TX-RAP-2" });
    expect(declare.status).toBe(409);
    const res = await request(app).post(`/api/fleet/rapprochements/${rapId}/lignes`).set(auth(DEMO.finance))
      .send({ date: "2020-03-03T09:00:00Z", montant: 2000, refTransaction: "T_INCONNU123", marchand: "Inconnu" });
    expect(res.status).toBe(201);
    expect(res.body.resumeCourant.nonDeclares).toBe(1);
  });

  it("clôture : bilan figé (déclaré 8 500 F, vu dans Wave 9 000 F, 2 écarts)", async () => {
    const res = await request(app).post(`/api/fleet/rapprochements/${rapId}/cloturer`).set(auth(DEMO.finance));
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("CLOTURE");
    expect(res.body.resume.totalDeclare).toBe(8500);
    expect(res.body.resume.totalVuDansWave).toBe(4000 + 3000 + 2000);
    expect(res.body.resume.ecarts).toBe(2);
    // Les écarts sont remontés à la Direction.
    const notif = await prisma.notification.findFirst({ where: { userId: DEMO.admin, type: "rapprochement.ecarts" }, orderBy: { createdAt: "desc" } });
    expect(notif).toBeTruthy();
  });

  it("un rapprochement clôturé n'est plus modifiable (409)", async () => {
    const res = await request(app).patch(`/api/fleet/rapprochements/${rapId}/lignes/${lignes[0].id}`).set(auth(DEMO.finance)).send({ verdict: "CONFORME" });
    expect(res.status).toBe(409);
  });

  it("un paiement déjà rapproché n'est pas repris dans un nouveau rapprochement", async () => {
    const res = await request(app).post("/api/fleet/rapprochements").set(auth(DEMO.finance)).send({ debut: "2020-03-01", fin: "2020-03-05" });
    expect(res.status).toBe(201);
    expect(res.body.lignes.map((l: any) => l.paiement.refTransaction)).toEqual(["TX-RAP-2"]);
  });

  it("le Superviseur (qui paie) n'accède pas au rapprochement (403)", async () => {
    expect((await request(app).get("/api/fleet/rapprochements").set(auth(DEMO.superviseur))).status).toBe(403);
  });
});
