/**
 * Tests de bout en bout — Partie A (Bloc 1).
 * Couvre : cloisonnement par site, règle de création chauffeur, paramètres versionnés,
 * édition des permissions d'un rôle avec trace d'audit.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma } from "./helpers";

const app = buildApp();
const auth = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];

describe("Cloisonnement par site", () => {
  it("le dispatcher (Abidjan) ne voit pas un site hors périmètre", async () => {
    const ok = await request(app).get("/api/sites/site_abidjan").set(auth(DEMO.dispatcher));
    expect(ok.status).toBe(200);
    const ko = await request(app).get("/api/sites/site_yamoussoukro").set(auth(DEMO.dispatcher));
    expect(ko.status).toBe(403);
  });

  it("l'Admin accède à tous les sites", async () => {
    const res = await request(app).get("/api/sites/site_yamoussoukro").set(auth(DEMO.admin));
    expect(res.status).toBe(200);
  });
});

describe("Création d'utilisateur (règle chauffeur)", () => {
  it("le Responsable terrain peut créer un chauffeur", async () => {
    const res = await request(app)
      .post("/api/users")
      .set(auth(DEMO.terrain))
      .send({ name: "E2E Chauffeur", email: `e2e.chauf.${Date.now()}@easy.ci`, phone: "+225 00", roleCode: "chauffeur", siteIds: ["site_abidjan"] });
    expect(res.status).toBe(201);
    expect(res.body.motDePasseTemporaire).toBeTruthy(); // mot de passe généré renvoyé
    createdUserIds.push(res.body.user.id);
    // Un profil chauffeur a bien été créé.
    const profile = await prisma.driverProfile.findUnique({ where: { userId: res.body.user.id } });
    expect(profile).not.toBeNull();
  });

  it("le Responsable terrain ne peut PAS créer un autre profil", async () => {
    const res = await request(app)
      .post("/api/users")
      .set(auth(DEMO.terrain))
      .send({ name: "E2E Disp", email: `e2e.disp.${Date.now()}@easy.ci`, phone: "+225 00", roleCode: "dispatcher", siteIds: ["site_abidjan"] });
    expect(res.status).toBe(403);
  });

  it("empêche de rattacher un utilisateur à un site hors périmètre", async () => {
    const res = await request(app)
      .post("/api/users")
      .set(auth(DEMO.terrain))
      .send({ name: "E2E Hors", email: `e2e.hors.${Date.now()}@easy.ci`, phone: "+225 00", roleCode: "chauffeur", siteIds: ["site_yamoussoukro"] });
    expect(res.status).toBe(403);
  });
});

describe("Paramètres versionnés", () => {
  it("créer un nouveau jeu de paramètres incrémente la version et conserve l'historique", async () => {
    const before = await request(app).get("/api/settings/site_abidjan").set(auth(DEMO.admin));
    expect(before.status).toBe(200);
    const v0 = before.body.version;

    const upd = await request(app).post("/api/settings/site_abidjan").set(auth(DEMO.admin)).send({ salaireFixeJour: 6000 });
    expect(upd.status).toBe(201);
    expect(upd.body.version).toBe(v0 + 1);
    expect(upd.body.salaireFixeJour).toBe(6000);
    // Les autres valeurs sont reprises de la version précédente.
    expect(upd.body.kpiObjectifMontant).toBe(before.body.kpiObjectifMontant);

    const hist = await request(app).get("/api/settings/site_abidjan/history").set(auth(DEMO.admin));
    expect(hist.body.history.length).toBeGreaterThanOrEqual(2);
  });

  it("un rôle sans permission ne peut pas modifier les paramètres", async () => {
    const res = await request(app).post("/api/settings/site_abidjan").set(auth(DEMO.chauffeur)).send({ salaireFixeJour: 1 });
    expect(res.status).toBe(403);
  });
});

describe("Édition des permissions d'un rôle + audit", () => {
  it("l'Admin modifie les permissions d'un rôle et l'action est tracée", async () => {
    // Rôle jetable pour ne pas altérer les rôles système.
    const created = await request(app).post("/api/roles").set(auth(DEMO.admin)).send({ code: `e2e_role_${Date.now()}`, nom: "Rôle E2E" });
    expect(created.status).toBe(201);
    createdRoleIds.push(created.body.id);

    const put = await request(app)
      .put(`/api/roles/${created.body.id}/permissions`)
      .set(auth(DEMO.admin))
      .send({ permissionCodes: ["vehicule.voir", "attribution.voir"] });
    expect(put.status).toBe(200);
    expect(put.body.permissions.sort()).toEqual(["attribution.voir", "vehicule.voir"]);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "role.permissions.update", resourceId: created.body.id },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect((audit!.after as any).permissions).toContain("vehicule.voir");
  });

  it("rejette un code de permission inconnu", async () => {
    const roleId = createdRoleIds[0];
    const res = await request(app).put(`/api/roles/${roleId}/permissions`).set(auth(DEMO.admin)).send({ permissionCodes: ["nimportequoi.action"] });
    expect(res.status).toBe(400);
  });
});

afterAll(async () => {
  // Nettoyage des données créées par les tests.
  for (const id of createdUserIds) {
    await prisma.userSite.deleteMany({ where: { userId: id } });
    await prisma.driverProfile.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdRoleIds) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
});
