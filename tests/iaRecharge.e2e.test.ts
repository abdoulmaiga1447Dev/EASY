/**
 * Tests — IA dans la recharge : lecture du % de batterie (fausse IA, aucun appel réseau),
 * pré-remplissage, refus des photos hors sujet, et écart saisie / lecture signalé.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { normalizeDay } from "../lib/assignment";
import { ia, type LectureBatterie } from "../lib/ia";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });
const jour = normalizeDay(new Date());
const VEH = "v_f7";
const lectures = new Map<string, Partial<LectureBatterie>>(); // mediaId → ce que la fausse IA doit « lire »
let n = 0;

async function upload(userId: string, lecture?: Partial<LectureBatterie>): Promise<string> {
  const img = new Jimp({ width: 80, height: 60, color: 0x112233ff });
  for (let i = 0; i < 200; i++) img.setPixelColor((((Math.random() * 0xffffff) | 0) * 256 + 0xff) >>> 0, (Math.random() * 80) | 0, (Math.random() * 60) | 0);
  img.setPixelColor(((++n * 7919) % 0xffffff) * 256 + 0xff, 0, 0);
  const res = await request(app).post("/api/media").set(auth(userId)).attach("file", await img.getBuffer("image/jpeg"), "p.jpg");
  expect(res.status).toBe(201);
  if (lecture) lectures.set(res.body.id, lecture);
  return res.body.id;
}
const L = (p: Partial<LectureBatterie>): LectureBatterie => ({
  est_tableau_de_bord: true, pourcentage_affiche: false, soc_pourcentage: null, chiffres_nets: true, soc_estime_barres: null,
  autonomie_km: null, kilometrage_km: null, lisibilite: "bonne", confiance: 0.95, remarque: "test", ...p,
});
const original = ia.lireBatterie;
let enAttente = "";

async function cleanup() {
  const ds = await prisma.demandeRecharge.findMany({ where: { vehicleId: VEH }, select: { id: true } });
  await prisma.demandeRecharge.deleteMany({ where: { id: { in: ds.map((d) => d.id) } } });
  await prisma.assignment.deleteMany({ where: { driverId: DEMO.chauffeur, vehicleId: VEH, date: jour } });
}

beforeAll(async () => {
  await cleanup();
  await prisma.assignment.create({ data: { siteId: "site_abidjan", date: jour, shift: "A", driverId: DEMO.chauffeur, vehicleId: VEH, createdById: DEMO.admin } });
  process.env.GEMINI_API_KEY = "cle-de-test";
  // Fausse IA : répond selon la photo (identifiée par la dernière photo enregistrée en attente).
  ia.lireBatterie = (async () => ({ resultat: L(lectures.get(enAttente) ?? {}), modele: "faux-modele", dureeMs: 1, jetons: 0, essais: 1 })) as any;
});
afterAll(async () => { ia.lireBatterie = original; process.env.GEMINI_API_KEY = ""; await cleanup(); await prisma.$disconnect(); });

const lire = (mediaId: string, userId = DEMO.chauffeur) => { enAttente = mediaId; return request(app).post("/api/fleet/ia/batterie").set(auth(userId)).send({ mediaId }); };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Lecture du % de batterie", () => {
  it("pré-remplit le % lu en chiffres", async () => {
    const m = await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 45 });
    const res = await lire(m);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ disponible: true, soc: 45, aReprendre: false });
    const media = await prisma.mediaAsset.findUnique({ where: { id: m } });
    expect((media?.iaLecture as any)?.decision?.soc).toBe(45); // lecture conservée par le serveur
  });

  it("photo hors sujet → à reprendre", async () => {
    const m = await upload(DEMO.chauffeur, { est_tableau_de_bord: false });
    expect((await lire(m)).body).toMatchObject({ soc: null, aReprendre: true });
  });

  it("jauge à barres seulement → pas de suggestion (saisie manuelle)", async () => {
    const m = await upload(DEMO.chauffeur, { soc_estime_barres: 80 });
    const res = await lire(m);
    expect(res.body.soc).toBeNull();
    expect(res.body.message).toMatch(/saisissez/);
  });

  it("on ne peut faire lire que ses propres photos (404)", async () => {
    const m = await upload(DEMO.superviseur, { pourcentage_affiche: true, soc_pourcentage: 50 });
    expect((await lire(m, DEMO.chauffeur)).status).toBe(404);
  });

  it("sans clé IA : indisponible, la saisie manuelle continue", async () => {
    process.env.GEMINI_API_KEY = "";
    const m = await upload(DEMO.chauffeur);
    expect((await lire(m)).body).toEqual({ disponible: false });
    process.env.GEMINI_API_KEY = "cle-de-test";
  });
});

describe("Écart entre le % saisi et la lecture de l'IA", () => {
  it("le chauffeur saisit 60 % alors que l'IA lit 45 % → écart signalé (Superviseur et Finance)", async () => {
    const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    expect(d.status).toBe(201);
    const qr = await upload(DEMO.chauffeur);
    const tableau = await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 45 });
    enAttente = tableau;
    const sp = await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/sur-place`).set(auth(DEMO.chauffeur))
      .send({ qrMediaId: qr, tableauMediaId: tableau, socDebut: 60 });
    expect(sp.status).toBe(200);
    await pause(400); // la comparaison se fait en arrière-plan
    const maj = await prisma.demandeRecharge.findUnique({ where: { id: d.body.id } });
    expect(maj?.socDebutIa).toBe(45);
    expect(maj?.ecartIa).toBe(true);
    const msg = await prisma.demandeRechargeMessage.findFirst({ where: { demandeId: d.body.id, type: "SYSTEME", texte: { contains: "Écart IA" } } });
    expect(msg?.texte).toMatch(/60 %.*45 %/);
    const controle = await request(app).get("/api/fleet/recharge-demandes/controle").set(auth(DEMO.finance));
    expect(controle.body.demandes.find((x: any) => x.id === d.body.id)?.ecartIa).toBe(true);
    await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/annuler`).set(auth(DEMO.chauffeur)).send({});
  });

  it("saisie conforme à la lecture (à 2 points près) → pas d'écart", async () => {
    const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
    const qr = await upload(DEMO.chauffeur);
    const tableau = await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 45 });
    enAttente = tableau;
    await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/sur-place`).set(auth(DEMO.chauffeur)).send({ qrMediaId: qr, tableauMediaId: tableau, socDebut: 46 });
    await pause(400);
    const maj = await prisma.demandeRecharge.findUnique({ where: { id: d.body.id } });
    expect(maj?.socDebutIa).toBe(45);
    expect(maj?.ecartIa).toBe(false);
    await request(app).post(`/api/fleet/recharge-demandes/${d.body.id}/annuler`).set(auth(DEMO.chauffeur)).send({});
  });
});
