/**
 * Tests — IA dans la recharge (fausse IA, aucun appel réseau) :
 * % de batterie (pré-remplissage, refus des photos hors sujet, % lu qui fait foi, écart signalé)
 * et reçu Wave du Superviseur (refus, montant et n° lus qui font foi, date, contrôle Finance).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Jimp } from "jimp";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";
import { normalizeDay } from "../lib/assignment";
import { ia, type LectureBatterie, type LectureRecuWave } from "../lib/ia";

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
  autonomie_km: null, kilometrage_km: null, lisibilite: "bonne", confiance: 0.95, remarque: "test",
  texte_pourcentage: p.soc_pourcentage != null ? `${p.soc_pourcentage} %` : null, ...p,
});
const R = (p: Partial<LectureRecuWave>): LectureRecuWave => ({
  est_recu_wave: true, statut_effectue: true, statut: "Effectué", type_transaction: "Paiement", marchand: "Borne Test",
  montant_fcfa: 3000, frais_fcfa: 0, date_heure: new Date().toISOString().slice(0, 16), id_transaction: `T_TEST${Date.now()}`,
  chiffres_nets: true, retouche_suspectee: false, lisibilite: "bonne", confiance: 0.95, remarque: "test", ...p,
});
const recus = new Map<string, Partial<LectureRecuWave>>();
const original = ia.lireBatterie;
const originalRecu = ia.lireRecuWave;
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
  ia.lireRecuWave = (async () => ({ resultat: R(recus.get(enAttente) ?? {}), modele: "faux-modele", dureeMs: 1, jetons: 0, essais: 1 })) as any;
});
afterAll(async () => { ia.lireBatterie = original; ia.lireRecuWave = originalRecu; process.env.GEMINI_API_KEY = ""; await cleanup(); await prisma.$disconnect(); });

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
    const res = await lire(m);
    process.env.GEMINI_API_KEY = "cle-de-test";
    expect(res.body).toMatchObject({ disponible: false });
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

const nouvelleDemande = async () => {
  const d = await request(app).post("/api/fleet/recharge-demandes").set(auth(DEMO.chauffeur)).send({ vehicleId: VEH });
  expect(d.status).toBe(201);
  return d.body.id as string;
};
const surPlace = (id: string, qr: string, tableau: string, socDebut?: number) => {
  enAttente = tableau;
  return request(app).post(`/api/fleet/recharge-demandes/${id}/sur-place`).set(auth(DEMO.chauffeur)).send({ qrMediaId: qr, tableauMediaId: tableau, socDebut });
};
const fermer = (id: string) => prisma.demandeRecharge.update({ where: { id }, data: { statut: "ANNULEE" } });

describe("La photo du tableau de bord est vérifiée par le serveur", () => {
  it("photo hors sujet → refusée (422), la demande ne bouge pas", async () => {
    const id = await nouvelleDemande();
    const res = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { est_tableau_de_bord: false }), 50);
    expect(res.status).toBe(422);
    expect(res.body.aReprendre).toBe(true);
    expect((await prisma.demandeRecharge.findUnique({ where: { id } }))?.statut).toBe("DEMANDEE");
    await fermer(id);
  });

  it("chiffres flous → refusée (rapprochez-vous)", async () => {
    const id = await nouvelleDemande();
    const res = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 85, chiffres_nets: false }), 85);
    expect(res.status).toBe(422);
    expect(res.body.error.fr).toMatch(/rapprochez-vous/);
    await fermer(id);
  });

  it("% lu par l'IA → enregistré automatiquement, sans saisie du chauffeur", async () => {
    const id = await nouvelleDemande();
    const res = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 37 }));
    expect(res.status).toBe(200);
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    expect(d?.socDebut).toBe(37);
    expect(d?.socDebutIa).toBe(37);
    await fermer(id);
  });

  it("le téléphone envoie un autre chiffre que l'IA → c'est la lecture IA qui est enregistrée, écart signalé", async () => {
    const id = await nouvelleDemande();
    await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 30 }), 70);
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    expect(d?.socDebut).toBe(30);
    expect(d?.ecartIa).toBe(true);
    await fermer(id);
  });

  it("tableau sans % (ex. Eado) → saisie du chauffeur obligatoire, tracée dans le fil", async () => {
    const id = await nouvelleDemande();
    const sansSaisie = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { autonomie_km: 258 }));
    expect(sansSaisie.status).toBe(400);
    const res = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { autonomie_km: 258 }), 55);
    expect(res.status).toBe(200);
    expect((await prisma.demandeRecharge.findUnique({ where: { id } }))?.socDebut).toBe(55);
    const msg = await prisma.demandeRechargeMessage.findFirst({ where: { demandeId: id, type: "SYSTEME", texte: { contains: "n'affiche pas de pourcentage" } } });
    expect(msg).not.toBeNull();
    await fermer(id);
  });
});

describe("Véhicule dont le tableau de bord n'affiche pas de % (Eado)", () => {
  it("photo vérifiée, mais le % n'est jamais rempli par l'IA : le chauffeur le saisit", async () => {
    process.env.IA_MODELES_SANS_POURCENTAGE = "atto 3"; // le véhicule de test (BYD Atto 3) joue le rôle de l'Eado
    try {
      const id = await nouvelleDemande();
      const tableau = await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 60 });
      const lu = await lire(tableau);
      expect(lu.body).toMatchObject({ soc: null, aReprendre: false });
      expect(lu.body.message).toMatch(/n'affiche pas/);
      const sansSaisie = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 60 }));
      expect(sansSaisie.status).toBe(400);
      const ok = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 60 }), 42);
      expect(ok.status).toBe(200);
      const d = await prisma.demandeRecharge.findUnique({ where: { id } });
      expect(d?.socDebut).toBe(42);
      expect(d?.socDebutIa).toBeNull();
      const horsSujet = await upload(DEMO.chauffeur, { est_tableau_de_bord: false });
      expect((await lire(horsSujet)).body.aReprendre).toBe(true); // la photo reste vérifiée
      await fermer(id);
    } finally { delete process.env.IA_MODELES_SANS_POURCENTAGE; }
  });
});

describe("Le reçu Wave du Superviseur est lu et contrôlé", () => {
  const prete = async () => {
    const id = await nouvelleDemande();
    // Véhicule de test rattaché à Yamoussoukro : la demande passe sur le site du Superviseur de test (Abidjan).
    await prisma.demandeRecharge.update({ where: { id }, data: { siteId: "site_abidjan" } });
    const sp = await surPlace(id, await upload(DEMO.chauffeur), await upload(DEMO.chauffeur, { pourcentage_affiche: true, soc_pourcentage: 40 }));
    expect(sp.status).toBe(200);
    return id;
  };
  const payer = async (id: string, recu: Partial<LectureRecuWave>, saisi: { montant?: number; refTransaction?: string } = {}) => {
    const m = await upload(DEMO.superviseur);
    recus.set(m, recu);
    enAttente = m;
    return request(app).post(`/api/fleet/recharge-demandes/${id}/paiement`).set(auth(DEMO.superviseur)).send({ ...saisi, preuveMediaId: m });
  };

  it("lecture du reçu pour le Superviseur : montant, n°, date", async () => {
    const m = await upload(DEMO.superviseur);
    recus.set(m, { montant_fcfa: 4200, id_transaction: "T_LECTURE01" });
    enAttente = m;
    const res = await request(app).post("/api/fleet/ia/recu-wave").set(auth(DEMO.superviseur)).send({ mediaId: m });
    expect(res.body).toMatchObject({ disponible: true, valide: true, montant: 4200, ref: "T_LECTURE01" });
  });

  it("image qui n'est pas un reçu Wave → refusée", async () => {
    const id = await prete();
    const res = await payer(id, { est_recu_wave: false }, { montant: 3000, refTransaction: "T_FAUX0001" });
    expect(res.status).toBe(422);
    expect((await prisma.demandeRecharge.findUnique({ where: { id } }))?.statut).toBe("SUR_PLACE");
    await fermer(id);
  });

  it("paiement non « Effectué » → refusé", async () => {
    const id = await prete();
    const res = await payer(id, { statut_effectue: false, statut: "En attente" });
    expect(res.status).toBe(422);
    expect(res.body.error.fr).toMatch(/En attente/);
    await fermer(id);
  });

  it("reçu d'un jour antérieur à la demande → refusé et Finance alertée", async () => {
    const id = await prete();
    const hier = new Date(Date.now() - 36 * 3600_000).toISOString().slice(0, 16);
    const res = await payer(id, { date_heure: hier });
    expect(res.status).toBe(422);
    expect(res.body.anomalie).toBe(true);
    await fermer(id);
  });

  it("montant et n° du reçu font foi ; saisie différente → contrôle Finance", async () => {
    const id = await prete();
    const ref = `T_FOI${Date.now()}`;
    const res = await payer(id, { montant_fcfa: 3000, id_transaction: ref }, { montant: 5000, refTransaction: "T_AUTRE999" });
    expect(res.status).toBe(200);
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    expect(d?.montantPaye).toBe(3000);
    expect(d?.refTransaction).toBe(ref.toUpperCase());
    expect(d?.anomaliePaiement).toBe(true);
    const controle = await request(app).get("/api/fleet/recharge-demandes/controle").set(auth(DEMO.finance));
    expect(controle.body.demandes.find((x: any) => x.id === id)?.problemesRecu.join(" ")).toMatch(/montant saisi 5000/);
    await fermer(id);
  });

  it("reçu conforme → payé, sans contrôle ; le même n° ne peut pas resservir", async () => {
    const id = await prete();
    const ref = `T_OK${Date.now()}`;
    const res = await payer(id, { montant_fcfa: 2500, id_transaction: ref }, { montant: 2500, refTransaction: ref });
    expect(res.status).toBe(200);
    expect(res.body.iaPaiement?.verifie).toBe(true);
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    expect(d?.anomaliePaiement).toBe(false);
    await fermer(id);

    const id2 = await prete();
    const re = await payer(id2, { montant_fcfa: 2500, id_transaction: ref });
    expect(re.status).toBe(409);
    await fermer(id2);
  });

  it("IA indisponible → saisie acceptée, mais le paiement part au contrôle Finance", async () => {
    const id = await prete();
    process.env.GEMINI_API_KEY = "";
    const res = await payer(id, {}, { montant: 3100, refTransaction: `T_MANU${Date.now()}` });
    process.env.GEMINI_API_KEY = "cle-de-test";
    expect(res.status).toBe(200);
    const d = await prisma.demandeRecharge.findUnique({ where: { id } });
    expect(d?.montantPaye).toBe(3100);
    expect(d?.anomaliePaiement).toBe(true);
    await fermer(id);
  });

  it("le chauffeur ne voit pas la lecture du reçu", async () => {
    const id = await prete();
    await payer(id, { id_transaction: `T_CACHE${Date.now()}` });
    const vu = await request(app).get(`/api/fleet/recharge-demandes/${id}`).set(auth(DEMO.chauffeur));
    expect(vu.body.iaPaiement).toBeNull();
    await fermer(id);
  });
});
