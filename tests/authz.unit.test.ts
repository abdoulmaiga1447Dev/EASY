/**
 * Tests unitaires (purs) de la couche d'autorisation et du catalogue RBAC.
 * Aucune dépendance à la base : logique seule.
 */
import { describe, it, expect } from "vitest";
import {
  PERMISSION_CODES,
  ROLE_PERMISSIONS,
  ROLES,
  EXCLUSIVE_PERMISSIONS,
  expandRolePermissions,
} from "../lib/rbac";
import { hasPermission, siteScopeWhere, canAccessSite, type AuthContext } from "../lib/authz";

function ctx(partial: Partial<AuthContext>): AuthContext {
  return {
    userId: "u",
    name: "n",
    email: "e",
    legacyRole: "x",
    roleCode: null,
    secondaryRoleCode: null,
    permissions: new Set(),
    siteIds: [],
    allSites: false,
    clientId: null,
    ...partial,
  };
}

describe("catalogue RBAC", () => {
  it("Admin/Direction possède toutes les permissions", () => {
    expect(expandRolePermissions("admin_direction").sort()).toEqual([...PERMISSION_CODES].sort());
  });

  it("chaque rôle ne référence que des permissions existantes", () => {
    for (const r of ROLES) {
      for (const code of expandRolePermissions(r.code)) {
        expect(PERMISSION_CODES).toContain(code);
      }
    }
  });

  it("les permissions exclusives ne sont portées que par leur rôle désigné (hors Admin)", () => {
    for (const [permCode, ownerRole] of Object.entries(EXCLUSIVE_PERMISSIONS)) {
      for (const r of ROLES) {
        if (r.code === "admin_direction") continue; // superadmin : possède tout
        const has = expandRolePermissions(r.code).includes(permCode);
        if (r.code === ownerRole) expect(has, `${ownerRole} doit avoir ${permCode}`).toBe(true);
        else expect(has, `${r.code} ne doit PAS avoir ${permCode}`).toBe(false);
      }
    }
  });

  it("le chauffeur n'a aucune permission d'administration ni exclusive", () => {
    const perms = expandRolePermissions("chauffeur");
    for (const forbidden of ["avance.autoriser", "operation.annuler", "remplacement.valider", "utilisateur.creer", "role.voir"]) {
      expect(perms).not.toContain(forbidden);
    }
  });

  it("le Responsable terrain peut créer des chauffeurs mais pas d'autres comptes", () => {
    const perms = expandRolePermissions("responsable_terrain");
    expect(perms).toContain("chauffeur.creer");
    expect(perms).not.toContain("utilisateur.creer");
  });
});

describe("helpers d'autorisation", () => {
  it("hasPermission est un OU logique sur les codes", () => {
    const c = ctx({ permissions: new Set(["vehicule.voir"]) });
    expect(hasPermission(c, "vehicule.voir")).toBe(true);
    expect(hasPermission(c, "role.voir", "vehicule.voir")).toBe(true);
    expect(hasPermission(c, "role.voir")).toBe(false);
  });

  it("siteScopeWhere : Admin (allSites) ne filtre pas", () => {
    expect(siteScopeWhere(ctx({ allSites: true }))).toEqual({});
  });

  it("siteScopeWhere : restreint aux sites de rattachement", () => {
    expect(siteScopeWhere(ctx({ siteIds: ["s1", "s2"] }))).toEqual({ siteId: { in: ["s1", "s2"] } });
  });

  it("siteScopeWhere : aucun site rattaché → aucun résultat", () => {
    expect(siteScopeWhere(ctx({ siteIds: [] }))).toEqual({ siteId: { in: ["__none__"] } });
  });

  it("canAccessSite respecte le périmètre", () => {
    expect(canAccessSite(ctx({ allSites: true }), "s9")).toBe(true);
    expect(canAccessSite(ctx({ siteIds: ["s1"] }), "s1")).toBe(true);
    expect(canAccessSite(ctx({ siteIds: ["s1"] }), "s2")).toBe(false);
    expect(canAccessSite(ctx({ siteIds: ["s1"] }), null)).toBe(false);
  });
});
