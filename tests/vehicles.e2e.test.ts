/**
 * Tests de bout en bout — Flux 7 (enregistrement véhicule).
 * Upload d'une photo, création complète, statut Disponible, maintenance programmée,
 * alertes générées, unicité, double création, machine à états, cloisonnement des
 * documents pour le client externe.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

let jpeg: Buffer;
const createdVehicleIds: string[] = [];
const createdMediaIds: string[] = [];

async function uploadPhoto(userId: string): Promise<string> {
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", jpeg, "photo.jpg");
  expect(res.status).toBe(201);
  createdMediaIds.push(res.body.id);
  return res.body.id;
}

function vehicleBody(mediaId: string, overrides: Record<string, any> = {}) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inDays = (n: number) => iso(new Date(Date.now() + n * 86400000));
  return {
    immatriculation: `E2E-${Math.floor(Math.random() * 1e6)}`,
    vin: `VINE2E${Math.floor(Math.random() * 1e9)}`,
    marque: "BYD", modele: "Han EV", siteId: "site_abidjan",
    autonomieNominale: 500, capaciteBatterieKwh: 85,
    contractType: "INTERNE_SAVER", serviceType: "VTC", classes: ["Eco"],
    kmActuel: 1000, gpsBoitierId: "LUOGU-TEST",
    photos: Object.fromEntries(["avant", "arriere", "gauche", "droite", "interieur", "tableauBord", "ecran", "sieges"].map((k) => [k, mediaId])),
    documents: {
      carteGrise: { numero: "CG-1", proprietaire: "SAVER", date: "2024-01-01", mediaId },
      visiteTechnique: { dateExpiration: inDays(10), mediaId },
      assurance: { numero: "ASS-1", dateDebut: "2025-01-01", dateFin: inDays(5), mediaId },
    },
    ...overrides,
  };
}

beforeAll(async () => {
  jpeg = await new Jimp({ width: 800, height: 600, color: 0x22aa55ff }).getBuffer("image/jpeg");
});

describe("Enregistrement d'un véhicule", () => {
  it("crée un véhicule complet : Disponible, maintenance programmée, alertes générées", async () => {
    const mid = await uploadPhoto(DEMO.superviseur);
    const res = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(vehicleBody(mid));
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("Disponible");
    expect(res.body.prochainEntretienKm).toBe(1000 + 15000);
    expect(res.body.prochainEntretienDate).toBeTruthy();
    createdVehicleIds.push(res.body.id);

    const alerts = await prisma.alert.findMany({ where: { resourceId: res.body.id, status: "OUVERTE" } });
    const types = alerts.map((a) => a.type).sort();
    expect(types).toContain("VISITE_TECHNIQUE");
    expect(types).toContain("ASSURANCE");
  });

  it("refuse une immatriculation ou un VIN déjà utilisés (409)", async () => {
    const mid = await uploadPhoto(DEMO.superviseur);
    const body = vehicleBody(mid);
    const first = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(body);
    expect(first.status).toBe(201);
    createdVehicleIds.push(first.body.id);
    const dup = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send({ ...vehicleBody(mid), immatriculation: body.immatriculation });
    expect(dup.status).toBe(409);
  });

  it("refuse un enregistrement incomplet (400) mais accepte un brouillon", async () => {
    const incomplete = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send({ siteId: "site_abidjan", isDraft: false });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.manquants).toBeInstanceOf(Array);

    const draft = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send({ siteId: "site_abidjan", immatriculation: `D-${Date.now()}`, vin: `VD-${Date.now()}`, marque: "X", modele: "Y", isDraft: true });
    expect(draft.status).toBe(201);
    expect(draft.body.isDraft).toBe(true);
    createdVehicleIds.push(draft.body.id);
  });

  it("un chauffeur ne peut pas lister ni créer de véhicule (403)", async () => {
    expect((await request(app).get("/api/fleet/vehicles").set(auth(DEMO.chauffeur))).status).toBe(403);
    const mid = await uploadPhoto(DEMO.superviseur);
    expect((await request(app).post("/api/fleet/vehicles").set(auth(DEMO.chauffeur)).send(vehicleBody(mid))).status).toBe(403);
  });
});

describe("Machine à états (via API)", () => {
  it("réactivation réservée au Dispatcher", async () => {
    const mid = await uploadPhoto(DEMO.superviseur);
    const v = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(vehicleBody(mid));
    createdVehicleIds.push(v.body.id);

    // Disponible -> EnMaintenance (superviseur, vehicule.modifier)
    expect((await request(app).post(`/api/fleet/vehicles/${v.body.id}/status`).set(auth(DEMO.superviseur)).send({ statut: "EnMaintenance" })).status).toBe(200);
    // EnMaintenance -> Disponible : refusé au superviseur (pas de vehicule.reactiver)
    expect((await request(app).post(`/api/fleet/vehicles/${v.body.id}/status`).set(auth(DEMO.superviseur)).send({ statut: "Disponible" })).status).toBe(403);
    // EnMaintenance -> Disponible : autorisé au dispatcher
    expect((await request(app).post(`/api/fleet/vehicles/${v.body.id}/status`).set(auth(DEMO.dispatcher)).send({ statut: "Disponible" })).status).toBe(200);
  });

  it("rejette une transition interdite (400)", async () => {
    const mid = await uploadPhoto(DEMO.superviseur);
    const v = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(vehicleBody(mid));
    createdVehicleIds.push(v.body.id);
    // Disponible -> HorsFlotte est autorisé ; HorsFlotte -> Attribue est interdit.
    await request(app).post(`/api/fleet/vehicles/${v.body.id}/status`).set(auth(DEMO.superviseur)).send({ statut: "HorsFlotte" });
    const bad = await request(app).post(`/api/fleet/vehicles/${v.body.id}/status`).set(auth(DEMO.superviseur)).send({ statut: "Attribue" });
    expect(bad.status).toBe(400);
  });
});

describe("Cloisonnement des documents (client externe)", () => {
  it("le client externe ne lit que les médias de ses propres véhicules", async () => {
    // Véhicule interne (site) : le client externe ne doit PAS voir sa photo.
    const midInterne = await uploadPhoto(DEMO.superviseur);
    const vInterne = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(vehicleBody(midInterne));
    createdVehicleIds.push(vInterne.body.id);
    const koInterne = await request(app).get(`/api/media/${midInterne}`).set(auth(DEMO.client));
    expect(koInterne.status).toBe(403);

    // Véhicule externe rattaché au client cli_demo : la photo devient visible pour lui.
    const midClient = await uploadPhoto(DEMO.superviseur);
    const vClient = await request(app).post("/api/fleet/vehicles").set(auth(DEMO.superviseur)).send(vehicleBody(midClient, { contractType: "EXTERNE_CLIENT", clientId: "cli_demo", montantRemboursement: 5000000, dureeContratMois: 24 }));
    expect(vClient.status).toBe(201);
    createdVehicleIds.push(vClient.body.id);
    const okClient = await request(app).get(`/api/media/${midClient}`).set(auth(DEMO.client));
    expect(okClient.status).toBe(200);
  });
});

afterAll(async () => {
  for (const id of createdVehicleIds) {
    await prisma.alert.deleteMany({ where: { resourceId: id } });
    await prisma.vehicleDocument.deleteMany({ where: { vehicleId: id } });
    await prisma.vehicleKmHistory.deleteMany({ where: { vehicleId: id } });
    await prisma.fleetVehicle.delete({ where: { id } }).catch(() => {});
  }
  await prisma.mediaAsset.deleteMany({ where: { id: { in: createdMediaIds } } });
  await prisma.$disconnect();
});
