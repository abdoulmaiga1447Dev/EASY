import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSIONS,
  ROLES,
  expandRolePermissions,
} from "../lib/rbac";
import { runVehicleAlerts } from "../lib/alerts";

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

  // ---------------------------------------------------------------------------
  // 6. Flotte de démonstration (~10 véhicules) + téléphones/SIM
  // ---------------------------------------------------------------------------
  console.log("Seed : flotte de démonstration...");
  const days = (n: number) => new Date(Date.now() + n * 86400000);
  const fleet = [
    { id: "v_f1", immatriculation: "1111-AA-01", vin: "VF1SAVER0000001", marque: "BYD", modele: "Han EV", siteId: "site_abidjan", vt: 200, ass: 200, statut: "Disponible", km: 12000, contract: "INTERNE_SAVER" },
    { id: "v_f2", immatriculation: "2222-AB-01", vin: "VF1SAVER0000002", marque: "Hyundai", modele: "Kona Electric", siteId: "site_abidjan", vt: 10, ass: 40, statut: "Disponible", km: 28000, contract: "INTERNE_SAVER" },
    { id: "v_f3", immatriculation: "3333-AC-01", vin: "VF1SAVER0000003", marque: "MG", modele: "MG4", siteId: "site_abidjan", vt: 60, ass: 5, statut: "Attribue", km: 45000, contract: "INTERNE_SAVER" },
    { id: "v_f4", immatriculation: "4444-AD-01", vin: "VF1SAVER0000004", marque: "Tesla", modele: "Model 3", siteId: "site_abidjan", vt: 300, ass: 300, statut: "EnCharge", km: 8000, contract: "INTERNE_SAVER" },
    { id: "v_f5", immatriculation: "5555-AE-01", vin: "VF1SAVER0000005", marque: "BYD", modele: "Dolphin", siteId: "site_abidjan", vt: 150, ass: 150, statut: "Disponible", km: 33000, contract: "EXTERNE_CLIENT" },
    { id: "v_f6", immatriculation: "6666-AF-01", vin: "VF1SAVER0000006", marque: "Nissan", modele: "Leaf", siteId: "site_abidjan", vt: 90, ass: 12, statut: "EnMaintenance", km: 61000, contract: "INTERNE_SAVER" },
    { id: "v_f7", immatriculation: "7777-BA-02", vin: "VF1SAVER0000007", marque: "BYD", modele: "Atto 3", siteId: "site_yamoussoukro", vt: 20, ass: 220, statut: "Disponible", km: 15000, contract: "INTERNE_SAVER" },
    { id: "v_f8", immatriculation: "8888-BB-02", vin: "VF1SAVER0000008", marque: "Hyundai", modele: "Ioniq 5", siteId: "site_yamoussoukro", vt: 250, ass: 250, statut: "Disponible", km: 5000, contract: "INTERNE_SAVER" },
    { id: "v_f9", immatriculation: "9999-BC-02", vin: "VF1SAVER0000009", marque: "MG", modele: "ZS EV", siteId: "site_yamoussoukro", vt: 3, ass: 3, statut: "Immobilise", km: 72000, contract: "INTERNE_SAVER" },
    { id: "v_f10", immatriculation: "1010-BD-02", vin: "VF1SAVER0000010", marque: "Renault", modele: "Zoe", siteId: "site_yamoussoukro", vt: 120, ass: 120, statut: "Disponible", km: 22000, contract: "INTERNE_SAVER" },
  ];
  for (const f of fleet) {
    await prisma.fleetVehicle.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id, immatriculation: f.immatriculation, vin: f.vin, marque: f.marque, modele: f.modele, siteId: f.siteId,
        autonomieNominale: 450, capaciteBatterieKwh: 60, statut: f.statut as any,
        contractType: f.contract as any, clientId: f.contract === "EXTERNE_CLIENT" ? "cli_demo" : null,
        dureeContratMois: f.contract === "EXTERNE_CLIENT" ? 24 : null, montantRemboursement: f.contract === "EXTERNE_CLIENT" ? 8000000 : null,
        serviceType: "VTC", classes: ["Eco", "Confort"], kmActuel: f.km, gpsBoitierId: `LUOGU-${f.id}`,
        dernierEntretienKm: f.km, dernierEntretienDate: new Date(), prochainEntretienKm: f.km + 15000, prochainEntretienDate: days(90),
        createdById: "usr_admin",
      },
    });
    // Documents (VT + assurance) avec échéances variées, pour alimenter le moteur d'alertes.
    await prisma.vehicleDocument.deleteMany({ where: { vehicleId: f.id } });
    await prisma.vehicleDocument.createMany({ data: [
      { vehicleId: f.id, type: "CARTE_GRISE", numero: `CG-${f.id}`, proprietaire: f.contract === "EXTERNE_CLIENT" ? "Client démo" : "SAVER", dateDebut: days(-400) },
      { vehicleId: f.id, type: "VISITE_TECHNIQUE", dateFin: days(f.vt) },
      { vehicleId: f.id, type: "ASSURANCE", numero: `ASS-${f.id}`, dateDebut: days(-180), dateFin: days(f.ass) },
    ] });
  }

  // Téléphones / SIM (matériel SAVER), certains affectés.
  const phones = [
    { id: "ph_1", numero: "+225 0500000001", imei: "356938035643809", operateur: "Orange CI", siteId: "site_abidjan", vehicleId: "v_f1" },
    { id: "ph_2", numero: "+225 0500000002", imei: "356938035643810", operateur: "MTN CI", siteId: "site_abidjan", vehicleId: "v_f2" },
    { id: "ph_3", numero: "+225 0500000003", imei: "356938035643811", operateur: "Moov Africa", siteId: "site_yamoussoukro", vehicleId: null },
  ];
  for (const p of phones) {
    await prisma.devicePhone.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, numero: p.numero, imei: p.imei, operateur: p.operateur, siteId: p.siteId, vehicleId: p.vehicleId, dateAffectation: p.vehicleId ? new Date() : null },
    });
  }

  // Calcule les alertes d'échéance de démonstration (idempotent).
  const created = await runVehicleAlerts(prisma);
  console.log(`Seed : ${fleet.length} véhicules, ${phones.length} téléphones, ${created} alerte(s) générée(s).`);

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
