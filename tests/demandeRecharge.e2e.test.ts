/**
 * Tests de bout en bout — recharge payée par le Superviseur (demande + fil de discussion).
 * Parcours complet, anti-fraude (photo déjà envoyée, n° de transaction réutilisé),
 * ordre des étapes, cloisonnement et permissions.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { normalizeDay } from "../lib/assignment";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const jour = normalizeDay(new Date());
const VEH = "v_f5";
const BORNE = "TEST-DR-Borne";
let compteur = 0;

/** Photo unique à chaque appel (pixels aléatoires → fichier et empreinte différents). */
async function photo(): Promise<Buffer> {
  compteur += 1;
  const img = new Jimp({ width: 120, height: 80, color: 0x223344ff });
  for (let i = 0; i < 400; i++) {
    const c = ((Math.random() * 0xffffff) | 0) * 256 + 0xff;
    img.setPixelColor(c >>> 0, (Math.random() * 120) | 0, (Math.random() * 80) | 0);
  }
  img.setPixelColor(((compteur * 7919) % 0xffffff) * 256 + 0xff, 0, 0);
  return img.getBuffer("image/jpeg");
}
async function upload(userId: string, buf?: Buffer): Promise<string> {
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", buf ?? (await photo()), "p.jpg");
  expect(res.status).toBe(201);
  return res.body.id;
}

let borneId: string;

async function cleanup() {
  const ds = await prisma.demandeRecharge.findMany({ where: { vehicleId: VEH }, select: { id: true } });
  const ids = ds.map((d) => d.id);
  await prisma.rechargeRecord.deleteMany({ where: { demandeId: { in: ids } } });
  await prisma.mediaAsset.deleteMany({ where: { resourceType: "DemandeRecharge", resourceId: { in: ids } } });
  await prisma.demandeRecharge.deleteMany({ where: { id: { in: ids } } });
  await prisma.assignment.deleteMany({ where: { driverId: DEMO.chauffeur, vehicleId: VEH, date: jour } });
  await prisma.borneRecharge.deleteMany({ where: { nom: BORNE } });
}

beforeAll(async () => {
  await cleanup();
  await prisma.assignment.create({ data: { siteId: "site_abidjan", date: jour, shift: "A", driverId: DEMO.chauffeur, vehicleId: VEH, createdById: DEMO.admin } });
  const b = await prisma.borneRecharge.create({ data: { nom: BORNE, type: "PARTENAIRE", operateur: "Test", siteId: "site_abidjan", prixKwh: 150 } });
  borneId = b.id;
});
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("Parcours complet", () => {
  let id: string;
  let photosArrivee: string[] = [];

  it("le chauffeur demande une recharge pour son véhicule du jour", async () => {
    const res = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe("DEMANDEE");
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    id = res.body.id;
  });

  it("refuse une deuxième demande ouverte pour le même véhicule (409)", async () => {
    const res = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(res.status).toBe(409);
    expect(res.body.demandeId).toBe(id);
  });

  it("la demande apparaît dans la boîte du Superviseur et dans son compteur", async () => {
    const box = await request(app).get("/api/fleet/recharge-demandes").set(auth(DEMO.superviseur));
    expect(box.status).toBe(200);
    const d = box.body.demandes.find((x: any) => x.id === id);
    expect(d).toBeDefined();
    expect(d.actionRequise).toBe(true);
    const c = await request(app).get("/api/fleet/recharge-demandes/compteur").set(auth(DEMO.superviseur));
    expect(c.body.aTraiter).toBeGreaterThanOrEqual(1);
  });

  it("le paiement est refusé tant que les photos ne sont pas arrivées (409)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur)).send({ montant: 5000, refTransaction: "TX-AVANT" });
    expect(res.status).toBe(409);
  });

  it("le Superviseur indique la borne (liste autorisée)", async () => {
    const bad = await request(app).post(`/api/fleet/recharge-demandes/${id}/borne`).set(auth(DEMO.superviseur)).send({ borneId: "borne_inconnue" });
    expect(bad.status).toBe(400);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/borne`).set(auth(DEMO.superviseur)).send({ borneId });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("PRISE_EN_CHARGE");
    expect(res.body.borne.id).toBe(borneId);
  });

  it("les deux parties échangent des messages dans le fil", async () => {
    const a = await request(app).post(`/api/fleet/recharge-demandes/${id}/messages`).set(auth(DEMO.superviseur)).send({ texte: "Va à la borne de Cocody." });
    expect(a.status).toBe(201);
    const b = await request(app).post(`/api/fleet/recharge-demandes/${id}/messages`).set(auth(DEMO.chauffeur)).send({ texte: "J'y vais." });
    expect(b.status).toBe(201);
    expect(b.body.messages.filter((m: any) => m.type === "TEXTE").length).toBe(2);
  });

  it("sur place, refuse un envoi sans % de batterie (400)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: await upload(DEMO.chauffeur), tableauMediaId: await upload(DEMO.chauffeur) });
    expect(res.status).toBe(400);
  });

  it("sur place, le chauffeur envoie QR + tableau de bord : un montant est proposé", async () => {
    photosArrivee = [await upload(DEMO.chauffeur), await upload(DEMO.chauffeur)];
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: photosArrivee[0], tableauMediaId: photosArrivee[1], socDebut: 30 });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("SUR_PLACE");
    // Capacité 60 kWh, 30 % → 80 % = 30 kWh × 150 F = 4 500 F.
    expect(res.body.kwhEstime).toBe(30);
    expect(res.body.montantSuggere).toBe(4500);
  });

  it("le Superviseur lit les photos de la demande", async () => {
    const res = await request(app).get(`/api/media/${photosArrivee[0]}`).set(auth(DEMO.superviseur));
    expect(res.status).toBe(200);
  });

  it("le chauffeur ne peut pas terminer avant le paiement (409)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/terminer`).set(auth(DEMO.chauffeur))
      .send({ tableauFinMediaId: await upload(DEMO.chauffeur), socFin: 80 });
    expect(res.status).toBe(409);
  });

  it("le chauffeur ne peut pas enregistrer le paiement (403)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.chauffeur)).send({ montant: 4500, refTransaction: "TX-CH" });
    expect(res.status).toBe(403);
  });

  it("le Superviseur enregistre le paiement (montant + n° de transaction)", async () => {
    const sansRef = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur)).send({ montant: 4500 });
    expect(sansRef.status).toBe(400);
    const sansCapture = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur)).send({ montant: 4500, refTransaction: "TX-DR0001" });
    expect(sansCapture.status).toBe(400);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur))
      .send({ montant: 4500, refTransaction: " tx-dr 0001 ", preuveMediaId: await upload(DEMO.superviseur) });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("PAYEE");
    expect(res.body.refTransaction).toBe("TX-DR0001");
    expect(res.body.ecartMontant).toBe(false); // payé = montant proposé
  });

  it("le chauffeur termine : une recharge est enregistrée (coût = montant payé)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/terminer`).set(auth(DEMO.chauffeur))
      .send({ tableauFinMediaId: await upload(DEMO.chauffeur), socFin: 80 });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("TERMINEE");
    expect(res.body.anomalie).toBe(false);
    const rec = await prisma.rechargeRecord.findFirst({ where: { demandeId: id } });
    expect(rec?.cout).toBe(4500);
    expect(rec?.socDebut).toBe(30);
    expect(rec?.socFin).toBe(80);
    expect(rec?.kwh).toBeNull();
  });

  it("une demande close n'accepte plus de messages (409)", async () => {
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/messages`).set(auth(DEMO.chauffeur)).send({ texte: "Merci" });
    expect(res.status).toBe(409);
  });
});

describe("Anti-fraude", () => {
  let id: string;

  it("refuse la même photo envoyée deux fois (même fichier → même empreinte)", async () => {
    const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(d.status).toBe(201);
    id = d.body.id;
    // Le même fichier envoyé deux fois (mêmes octets → même empreinte).
    const buf = await photo();
    const m1 = await upload(DEMO.chauffeur, buf);
    const m2 = await upload(DEMO.chauffeur, buf);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: m1, tableauMediaId: m2, socDebut: 40 });
    expect(res.status).toBe(409);
    expect(res.body.anomalie).toBe(true);
    expect(res.body.error.fr).toMatch(/Anomalie détectée/);
  });

  it("refuse un fichier déjà utilisé dans une recharge précédente", async () => {
    const buf = await photo();
    const premier = await upload(DEMO.chauffeur, buf);
    await prisma.mediaAsset.update({ where: { id: premier }, data: { resourceType: "DemandeRecharge", resourceId: "ancienne" } });
    const renvoi = await upload(DEMO.chauffeur, buf);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: renvoi, tableauMediaId: await upload(DEMO.chauffeur), socDebut: 40 });
    expect(res.status).toBe(409);
    expect(res.body.error.fr).toMatch(/déjà été envoyée/);
    await prisma.mediaAsset.delete({ where: { id: premier } });
  });

  it("refuse un n° de transaction déjà utilisé", async () => {
    const ok = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: await upload(DEMO.chauffeur), tableauMediaId: await upload(DEMO.chauffeur), socDebut: 40 });
    expect(ok.status).toBe(200);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur))
      .send({ montant: 3000, refTransaction: "TX-DR 0001", preuveMediaId: await upload(DEMO.superviseur) });
    expect(res.status).toBe(409);
    expect(res.body.anomalie).toBe(true);
  });

  it("signale une anomalie si la batterie n'a pas monté", async () => {
    const pay = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur))
      .send({ montant: 3000, refTransaction: "TX-DR0002", preuveMediaId: await upload(DEMO.superviseur) });
    expect(pay.status).toBe(200);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${id}/terminer`).set(auth(DEMO.chauffeur))
      .send({ tableauFinMediaId: await upload(DEMO.chauffeur), socFin: 40 });
    expect(res.status).toBe(200);
    expect(res.body.anomalie).toBe(true);
    const rec = await prisma.rechargeRecord.findFirst({ where: { demandeId: id } });
    expect(rec?.anomalieCoherence).toBe(true);
  });
});

describe("Annulation, cloisonnement et permissions", () => {
  it("le chauffeur annule avant paiement ; le superviseur doit donner un motif", async () => {
    const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(d.status).toBe(201);
    const sansMotif = await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/annuler`).set(auth(DEMO.superviseur)).send({});
    expect(sansMotif.status).toBe(400);
    const res = await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/annuler`).set(auth(DEMO.chauffeur)).send({});
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("ANNULEE");
  });

  it("un chauffeur sans véhicule du jour ne peut pas demander (403)", async () => {
    const res = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: "v_f10" });
    expect(res.status).toBe(403);
  });

  it("un rôle sans permission recharge n'accède pas à la boîte (403)", async () => {
    const res = await request(app).get("/api/fleet/recharge-demandes").set(auth(DEMO.dispatcher));
    expect(res.status).toBe(403);
  });

  it("le chauffeur ne déclare plus ses recharges lui-même (403)", async () => {
    const res = await request(app).post("/api/fleet/recharges").set(auth(DEMO.chauffeur))
      .send({ vehicleId: VEH, typeCharge: "DOMESTIQUE", borneId: "borne_saver_abidjan", kwh: 24, cout: 2400, socDebut: 20, socFin: 60, justificatifMediaId: "x" });
    expect(res.status).toBe(403);
  });
});

describe("Contrôle par la Finance (séparation payeur / contrôleur)", () => {
  let id: string;
  let preuve: string;

  it("un paiement supérieur de plus de 20 % au montant proposé est signalé", async () => {
    const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(d.status).toBe(201);
    id = d.body.id;
    await request(app).post(`/api/fleet/recharge-demandes/${id}/borne`).set(auth(DEMO.superviseur)).send({ borneId });
    const sp = await request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: await upload(DEMO.chauffeur), tableauMediaId: await upload(DEMO.chauffeur), socDebut: 30 });
    expect(sp.body.montantSuggere).toBe(4500);
    preuve = await upload(DEMO.superviseur);
    const pay = await request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur))
      .send({ montant: 6000, refTransaction: "TX-DR-ECART", preuveMediaId: preuve });
    expect(pay.status).toBe(200);
    expect(pay.body.ecartMontant).toBe(true);
  });

  it("la Finance voit la recharge à contrôler (+33 %) et son compteur", async () => {
    const res = await request(app).get("/api/fleet/recharge-demandes/controle").set(auth(DEMO.finance));
    expect(res.status).toBe(200);
    const d = res.body.demandes.find((x: any) => x.id === id);
    expect(d).toBeDefined();
    expect(d.ecartPct).toBe(33);
    const c = await request(app).get("/api/fleet/recharge-demandes/controle/compteur").set(auth(DEMO.finance));
    expect(c.body.aControler).toBeGreaterThanOrEqual(1);
  });

  it("la capture du paiement est visible par la Finance, pas par le chauffeur", async () => {
    expect((await request(app).get(`/api/media/${preuve}`).set(auth(DEMO.finance))).status).toBe(200);
    expect((await request(app).get(`/api/media/${preuve}`).set(auth(DEMO.chauffeur))).status).toBe(403);
    const vueChauffeur = await request(app).get(`/api/fleet/recharge-demandes/${id}`).set(auth(DEMO.chauffeur));
    expect(vueChauffeur.body.preuvePaiementMediaId).toBeNull();
    const vueFinance = await request(app).get(`/api/fleet/recharge-demandes/${id}`).set(auth(DEMO.finance));
    expect(vueFinance.body.preuvePaiementMediaId).toBe(preuve);
  });

  it("le Superviseur n'accède pas au contrôle (403)", async () => {
    expect((await request(app).get("/api/fleet/recharge-demandes/controle").set(auth(DEMO.superviseur))).status).toBe(403);
    expect((await request(app).post(`/api/fleet/recharge-demandes/${id}/controle`).set(auth(DEMO.superviseur)).send({ note: "ok" })).status).toBe(403);
  });

  it("la Finance marque la recharge comme contrôlée (conclusion obligatoire)", async () => {
    const sansNote = await request(app).post(`/api/fleet/recharge-demandes/${id}/controle`).set(auth(DEMO.finance)).send({});
    expect(sansNote.status).toBe(400);
    const ok = await request(app).post(`/api/fleet/recharge-demandes/${id}/controle`).set(auth(DEMO.finance)).send({ note: "Prix réel de la borne plus élevé, justifié." });
    expect(ok.status).toBe(200);
    expect(ok.body.controleNote).toMatch(/justifié/);
    const controlees = await request(app).get("/api/fleet/recharge-demandes/controle?vue=controlees").set(auth(DEMO.finance));
    expect(controlees.body.demandes.find((x: any) => x.id === id)).toBeDefined();
    const deux = await request(app).post(`/api/fleet/recharge-demandes/${id}/controle`).set(auth(DEMO.finance)).send({ note: "encore" });
    expect(deux.status).toBe(409);
    await request(app).post(`/api/fleet/recharge-demandes/${id}/annuler`).set(auth(DEMO.superviseur)).send({ motif: "fin du test" });
  });
});
