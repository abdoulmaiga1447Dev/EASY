import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSIONS,
  ROLES,
  expandRolePermissions,
} from "../lib/rbac";

const prisma = new PrismaClient();

// Mot de passe commun aux comptes de démonstration (voir README Partie A).
const DEMO_PASSWORD = "Easy2026!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // 1. Permissions (catalogue complet)
  // ---------------------------------------------------------------------------
  console.log("Seed : permissions...");
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { libelle: p.libelle, categorie: p.categorie },
      create: { code: p.code, libelle: p.libelle, categorie: p.categorie },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permIdByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  // ---------------------------------------------------------------------------
  // 2. Rôles (8 profils → 9 rôles) + associations rôle↔permission par défaut
  //    Les associations des rôles système sont remises à l'état par défaut ;
  //    l'admin peut ensuite les personnaliser via l'interface.
  // ---------------------------------------------------------------------------
  console.log("Seed : rôles & permissions...");
  const roleIdByCode = new Map<string, string>();
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { nom: r.nom, description: r.description, isSystem: r.isSystem },
      create: { code: r.code, nom: r.nom, description: r.description, isSystem: r.isSystem },
    });
    roleIdByCode.set(r.code, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const codes = expandRolePermissions(r.code);
    await prisma.rolePermission.createMany({
      data: codes
        .filter((c) => permIdByCode.has(c))
        .map((c) => ({ roleId: role.id, permissionId: permIdByCode.get(c)! })),
      skipDuplicates: true,
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Sites (villes du pilote) + zones géographiques
  // ---------------------------------------------------------------------------
  console.log("Seed : sites & zones...");
  const sitesData = [
    {
      id: "site_abidjan",
      nom: "Hub Abidjan",
      ville: "Abidjan",
      waveAccountId: "WAVE-ABJ-001",
      zones: ["Cocody", "Plateau", "Zone 4", "Marcory", "Yopougon", "Abobo", "Aéroport FHB"],
    },
    {
      id: "site_yamoussoukro",
      nom: "Hub Yamoussoukro",
      ville: "Yamoussoukro",
      waveAccountId: "WAVE-YAM-001",
      zones: ["Centre-ville", "Habitat", "N'Zuessy", "Kokrenou"],
    },
  ];

  const zoneIdByKey = new Map<string, string>(); // `${siteId}:${nom}` -> zoneId
  for (const s of sitesData) {
    await prisma.site.upsert({
      where: { id: s.id },
      update: { nom: s.nom, ville: s.ville, waveAccountId: s.waveAccountId },
      create: { id: s.id, nom: s.nom, ville: s.ville, waveAccountId: s.waveAccountId },
    });
    for (const zn of s.zones) {
      const zone = await prisma.zone.upsert({
        where: { siteId_nom: { siteId: s.id, nom: zn } },
        update: {},
        create: { siteId: s.id, nom: zn },
      });
      zoneIdByKey.set(`${s.id}:${zn}`, zone.id);
    }
    // Paramètres globaux version 1 (valeurs par défaut du schéma).
    await prisma.siteSettings.upsert({
      where: { siteId_version: { siteId: s.id, version: 1 } },
      update: {},
      create: { siteId: s.id, version: 1, createdById: "usr_admin" },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Client externe (entité + contact rattaché)
  // ---------------------------------------------------------------------------
  console.log("Seed : client externe...");
  await prisma.client.upsert({
    where: { id: "cli_demo" },
    update: {},
    create: {
      id: "cli_demo",
      raisonSociale: "Société de Démonstration SARL",
      contactNom: "Awa Koné",
      contactEmail: "client@easy.ci",
      contactPhone: "+225 0102030405",
    },
  });

  // ---------------------------------------------------------------------------
  // 5. Un utilisateur de démonstration par profil
  // ---------------------------------------------------------------------------
  console.log("Seed : comptes de démonstration...");
  const demoUsers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    roleCode: string;
    siteIds: string[]; // rattachements (vide = aucun site pour les externes)
    clientId?: string;
  }[] = [
    { id: "usr_admin", name: "Administrateur EASY", email: "admin@easy.ci", phone: "+225 0700000000", roleCode: "admin_direction", siteIds: ["site_abidjan", "site_yamoussoukro"] },
    { id: "usr_superviseur", name: "Superviseur Logistique", email: "superviseur@easy.ci", phone: "+225 0700000001", roleCode: "superviseur_logistique", siteIds: ["site_abidjan"] },
    { id: "usr_terrain", name: "Responsable Terrain", email: "terrain@easy.ci", phone: "+225 0700000002", roleCode: "responsable_terrain", siteIds: ["site_abidjan"] },
    { id: "usr_dispatcher", name: "Dispatcher", email: "dispatcher@easy.ci", phone: "+225 0700000003", roleCode: "dispatcher", siteIds: ["site_abidjan"] },
    { id: "usr_finance", name: "Responsable Finance", email: "finance@easy.ci", phone: "+225 0700000004", roleCode: "finance", siteIds: ["site_abidjan", "site_yamoussoukro"] },
    { id: "usr_maintenance", name: "Atelier Maintenance", email: "maintenance@easy.ci", phone: "+225 0700000005", roleCode: "maintenance", siteIds: ["site_abidjan"] },
    { id: "usr_chauffeur", name: "Koffi N'Guessan", email: "chauffeur@easy.ci", phone: "+225 0707070707", roleCode: "chauffeur", siteIds: ["site_abidjan"] },
    { id: "usr_banque", name: "Banque / Investisseur", email: "banque@easy.ci", phone: "+225 0700000006", roleCode: "externe_banque", siteIds: [] },
    { id: "usr_client", name: "Awa Koné (Client flotte)", email: "client@easy.ci", phone: "+225 0102030405", roleCode: "externe_client", siteIds: [], clientId: "cli_demo" },
  ];

  for (const u of demoUsers) {
    const roleId = roleIdByCode.get(u.roleCode)!;
    await prisma.user.upsert({
      where: { id: u.id },
      update: { roleId, clientId: u.clientId ?? null, active: true },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: u.roleCode, // champ legacy conservé (miroir du code de rôle)
        createdAt: now,
        roleId,
        clientId: u.clientId ?? null,
        active: true,
      },
    });
    // Rattachements aux sites (reset puis recréation).
    await prisma.userSite.deleteMany({ where: { userId: u.id } });
    if (u.siteIds.length) {
      await prisma.userSite.createMany({
        data: u.siteIds.map((siteId) => ({ userId: u.id, siteId })),
        skipDuplicates: true,
      });
    }
  }

  // Profil chauffeur pour le compte de démonstration.
  await prisma.driverProfile.upsert({
    where: { userId: "usr_chauffeur" },
    update: {},
    create: {
      userId: "usr_chauffeur",
      siteId: "site_abidjan",
      zoneId: zoneIdByKey.get("site_abidjan:Cocody"),
      permisNumero: "CI-2023-0099",
      permisExpiration: new Date("2027-06-30T00:00:00Z"),
      dateEntree: new Date("2025-01-15T00:00:00Z"),
      statut: "actif",
    },
  });

  console.log(`\nSeed terminé. Mot de passe de démonstration : ${DEMO_PASSWORD}`);
  console.log("Comptes : admin@easy.ci, superviseur@easy.ci, terrain@easy.ci, dispatcher@easy.ci,");
  console.log("          finance@easy.ci, maintenance@easy.ci, chauffeur@easy.ci, banque@easy.ci, client@easy.ci");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
