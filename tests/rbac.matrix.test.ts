/**
 * Matrice RBAC exécutable — pour chaque couple (rôle × endpoint), vérifie que
 * l'accès est autorisé (2xx) ou refusé (403). C'est le test d'acceptation central
 * de la Partie A : la sécurité est appliquée côté serveur.
 *
 * Pré-requis : base peuplée par `npx prisma db seed` (un compte par profil).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp, tokenFor, DEMO, prisma, type DemoKey } from "./helpers";

const app = buildApp();

// true = accès attendu (2xx), false = refus attendu (403).
type Row = { method: "get"; path: string } & Record<DemoKey, boolean>;

const MATRIX: Row[] = [
  //                                  admin  superv terrain disp   finance maint  chauf  banque client
  { method: "get", path: "/api/permissions", admin: true,  superviseur: false, terrain: false, dispatcher: false, finance: false, maintenance: false, chauffeur: false, banque: false, client: false },
  { method: "get", path: "/api/roles",       admin: true,  superviseur: false, terrain: false, dispatcher: false, finance: false, maintenance: false, chauffeur: false, banque: false, client: false },
  { method: "get", path: "/api/users",       admin: true,  superviseur: true,  terrain: true,  dispatcher: true,  finance: true,  maintenance: false, chauffeur: false, banque: false, client: false },
  { method: "get", path: "/api/sites",       admin: true,  superviseur: true,  terrain: true,  dispatcher: true,  finance: true,  maintenance: true,  chauffeur: false, banque: false, client: false },
  { method: "get", path: "/api/clients",     admin: true,  superviseur: false, terrain: false, dispatcher: false, finance: false, maintenance: false, chauffeur: false, banque: false, client: false },
  { method: "get", path: "/api/audit",       admin: true,  superviseur: false, terrain: false, dispatcher: false, finance: false, maintenance: false, chauffeur: false, banque: false, client: false },
];

const ROLE_KEYS = Object.keys(DEMO) as DemoKey[];

// Jetons pré-générés pour chaque profil.
const tokens: Record<DemoKey, string> = ROLE_KEYS.reduce((acc, k) => {
  acc[k] = tokenFor(DEMO[k]);
  return acc;
}, {} as Record<DemoKey, string>);

describe("Matrice RBAC (rôle × endpoint)", () => {
  for (const row of MATRIX) {
    describe(`${row.method.toUpperCase()} ${row.path}`, () => {
      for (const role of ROLE_KEYS) {
        const expectedAllowed = row[role];
        it(`${role} → ${expectedAllowed ? "autorisé" : "refusé (403)"}`, async () => {
          const res = await request(app)[row.method](row.path).set("Authorization", `Bearer ${tokens[role]}`);
          if (expectedAllowed) {
            expect(res.status, `attendu 2xx, reçu ${res.status}`).toBeLessThan(300);
          } else {
            expect(res.status, `attendu 403, reçu ${res.status}`).toBe(403);
          }
        });
      }
    });
  }

  it("sans jeton → 401", async () => {
    const res = await request(app).get("/api/roles");
    expect(res.status).toBe(401);
  });

  it("jeton invalide → 401", async () => {
    const res = await request(app).get("/api/roles").set("Authorization", "Bearer xxx.yyy.zzz");
    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
