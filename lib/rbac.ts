/**
 * Catalogue RBAC — SAVER Fleet Ops (Partie A, Bloc 1)
 *
 * Source unique de vérité des permissions et des rôles, partagée entre :
 *  - le seed (prisma/seed.ts) qui insère permissions, rôles et associations par défaut ;
 *  - le serveur (server.ts) pour le libellé des permissions ;
 *  - les tests (matrice RBAC).
 *
 * Les associations rôle↔permission sont seedées ICI mais restent MODIFIABLES en base
 * via l'écran d'administration (table RolePermission). Ce fichier ne fait que poser
 * l'état initial.
 */

// -----------------------------------------------------------------------------
// Permissions granulaires, nommées « ressource.action », regroupées par catégorie.
// -----------------------------------------------------------------------------
export interface PermissionDef {
  code: string;
  libelle: string;
  categorie: string;
}

export const PERMISSIONS: PermissionDef[] = [
  // --- Administration & organisation ---
  { code: "site.voir", libelle: "Voir les sites", categorie: "Administration" },
  { code: "site.creer", libelle: "Créer un site", categorie: "Administration" },
  { code: "site.modifier", libelle: "Modifier un site", categorie: "Administration" },
  { code: "site.desactiver", libelle: "Désactiver un site", categorie: "Administration" },
  { code: "site.acces_tous", libelle: "Accéder à tous les sites (pas de cloisonnement)", categorie: "Administration" },
  { code: "zone.gerer", libelle: "Gérer les zones géographiques", categorie: "Administration" },
  { code: "role.voir", libelle: "Voir les rôles", categorie: "Administration" },
  { code: "role.creer", libelle: "Créer un rôle", categorie: "Administration" },
  { code: "role.modifier", libelle: "Modifier un rôle", categorie: "Administration" },
  { code: "role.supprimer", libelle: "Supprimer un rôle", categorie: "Administration" },
  { code: "permission.assigner", libelle: "Modifier les permissions d'un rôle", categorie: "Administration" },
  { code: "parametre.voir", libelle: "Voir les paramètres globaux", categorie: "Administration" },
  { code: "parametre.modifier", libelle: "Modifier les paramètres globaux", categorie: "Administration" },
  { code: "audit.voir", libelle: "Consulter le journal d'audit", categorie: "Administration" },

  // --- Utilisateurs ---
  { code: "utilisateur.voir", libelle: "Voir les utilisateurs", categorie: "Utilisateurs" },
  { code: "utilisateur.creer", libelle: "Créer un utilisateur", categorie: "Utilisateurs" },
  { code: "utilisateur.modifier", libelle: "Modifier un utilisateur", categorie: "Utilisateurs" },
  { code: "utilisateur.activer", libelle: "Activer / désactiver un compte", categorie: "Utilisateurs" },
  { code: "chauffeur.creer", libelle: "Créer un compte chauffeur", categorie: "Utilisateurs" },
  { code: "client.gerer", libelle: "Gérer les clients externes", categorie: "Utilisateurs" },

  // --- Véhicules (Flux 7) ---
  { code: "vehicule.voir", libelle: "Voir les véhicules", categorie: "Véhicules" },
  { code: "vehicule.creer", libelle: "Enregistrer un véhicule", categorie: "Véhicules" },
  { code: "vehicule.modifier", libelle: "Modifier une fiche véhicule", categorie: "Véhicules" },
  { code: "vehicule.reactiver", libelle: "Réactiver un véhicule après réparation", categorie: "Véhicules" }, // EXCLUSIF Dispatcher
  { code: "document.gerer", libelle: "Gérer les documents véhicule", categorie: "Véhicules" },
  { code: "telephone.gerer", libelle: "Gérer les téléphones / SIM", categorie: "Véhicules" },
  { code: "borne.gerer", libelle: "Gérer les bornes de recharge", categorie: "Véhicules" },

  // --- Attribution & planning (Flux 8) ---
  { code: "attribution.voir", libelle: "Voir les attributions et plannings", categorie: "Attribution" },
  { code: "attribution.creer", libelle: "Attribuer un véhicule à un chauffeur", categorie: "Attribution" },
  { code: "remplacement.valider", libelle: "Valider un remplacement de chauffeur", categorie: "Attribution" }, // EXCLUSIF Dispatcher

  // --- Exploitation terrain (Flux 1, B) ---
  { code: "shift.superviser", libelle: "Superviser les check-in / check-out", categorie: "Exploitation" },
  { code: "incident.gerer", libelle: "Gérer les incidents (retards, absences)", categorie: "Exploitation" },
  { code: "operation.annuler", libelle: "Annuler une opération", categorie: "Exploitation" }, // EXCLUSIF Responsable terrain

  // --- Reversement & finance (Flux 2 & 5, B/D) ---
  { code: "reversement.voir", libelle: "Voir les reversements", categorie: "Finance" },
  { code: "reversement.rapprocher", libelle: "Valider un rapprochement de reversement", categorie: "Finance" }, // double validation Finance + Resp. terrain
  { code: "paie.calculer", libelle: "Déclencher / consulter le calcul de paie", categorie: "Finance" },
  { code: "paie.valider", libelle: "Valider la paie", categorie: "Finance" },
  { code: "avance.autoriser", libelle: "Autoriser une avance chauffeur", categorie: "Finance" }, // EXCLUSIF Admin/Direction
  { code: "finance.exporter", libelle: "Exports comptables et P&L", categorie: "Finance" },

  // --- Recharge EV (Flux 3, C) ---
  { code: "recharge.enregistrer", libelle: "Enregistrer une recharge", categorie: "Recharge" },
  { code: "recharge.superviser", libelle: "Superviser les recharges (anti-fraude)", categorie: "Recharge" },

  // --- Maintenance & pannes (Flux 4, C) ---
  { code: "maintenance.gerer", libelle: "Gérer la maintenance et les réparations", categorie: "Maintenance" },
  { code: "panne.qualifier", libelle: "Qualifier une panne", categorie: "Maintenance" },

  // --- Chauffeur (accès limité à ses propres actions) ---
  { code: "self.profil", libelle: "Gérer son profil et ses documents", categorie: "Chauffeur" },
  { code: "self.planning", libelle: "Voir son planning et son véhicule du jour", categorie: "Chauffeur" },
  { code: "self.checkin", libelle: "Effectuer son check-in / check-out", categorie: "Chauffeur" },
  { code: "self.reversement", libelle: "Reverser ses recettes", categorie: "Chauffeur" },
  { code: "self.panne", libelle: "Déclarer une panne", categorie: "Chauffeur" },
  { code: "avance.demander", libelle: "Demander une avance", categorie: "Chauffeur" },

  // --- Portails externes (lecture seule, cloisonnés) ---
  { code: "portail.investisseur", libelle: "Portail investisseur (vue financière globale)", categorie: "Externes" },
  { code: "portail.client", libelle: "Portail client (ses véhicules uniquement)", categorie: "Externes" },

  // --- Alertes & notifications (transverses) ---
  { code: "alerte.voir", libelle: "Consulter les alertes", categorie: "Alertes" },
  { code: "notification.envoyer", libelle: "Envoyer une notification", categorie: "Alertes" },
];

export const PERMISSION_CODES: string[] = PERMISSIONS.map((p) => p.code);

// -----------------------------------------------------------------------------
// Rôles — les 8 profils du PowerPoint. Le profil « Accès externes » se décline en
// deux rôles distincts (banque/investisseur et client flotte) pour un cloisonnement
// strict par les permissions.
// -----------------------------------------------------------------------------
export interface RoleDef {
  code: string;
  nom: string;
  description: string;
  isSystem: boolean;
}

export const ROLES: RoleDef[] = [
  { code: "admin_direction", nom: "Admin / Direction", description: "Met en place le système, définit les règles globales, supervise.", isSystem: true },
  { code: "superviseur_logistique", nom: "Superviseur Logistique", description: "Responsable du matériel : véhicules, téléphones/SIM, bornes de recharge.", isSystem: true },
  { code: "responsable_terrain", nom: "Responsable terrain", description: "Applique le fonctionnement du hub au quotidien, premier contact des chauffeurs.", isSystem: true },
  { code: "dispatcher", nom: "Dispatcher", description: "Planification (attribution, plannings) et suivi temps réel.", isSystem: true },
  { code: "finance", nom: "Finance", description: "Reversements, paie, bonus/pénalités, dettes, exports.", isSystem: true },
  { code: "maintenance", nom: "Maintenance", description: "Entretien préventif, pannes, réparations, coûts.", isSystem: true },
  { code: "chauffeur", nom: "Chauffeur (PR)", description: "Accès limité à ses propres actions.", isSystem: true },
  { code: "externe_banque", nom: "Banque / Investisseur", description: "Lecture seule : vue financière globale, aucune donnée nominative.", isSystem: true },
  { code: "externe_client", nom: "Client en gestion de flotte", description: "Lecture seule : uniquement ses propres véhicules.", isSystem: true },
];

// -----------------------------------------------------------------------------
// Matrice rôle → permissions par défaut (modifiable ensuite en base).
// '*' = toutes les permissions (réservé à Admin/Direction).
// -----------------------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin_direction: ["*"],

  superviseur_logistique: [
    "site.voir",
    "zone.gerer",
    "utilisateur.voir",
    "vehicule.voir", "vehicule.creer", "vehicule.modifier",
    "document.gerer", "telephone.gerer", "borne.gerer",
    "attribution.voir",
    "recharge.superviser",
    "parametre.voir",
    "alerte.voir",
  ],

  responsable_terrain: [
    "site.voir",
    "utilisateur.voir", "chauffeur.creer", // point de contact des chauffeurs : crée UNIQUEMENT des chauffeurs
    "vehicule.voir",
    "attribution.voir",
    "shift.superviser", "incident.gerer",
    "operation.annuler", // EXCLUSIF
    "reversement.voir", "reversement.rapprocher",
    "parametre.voir",
  ],

  dispatcher: [
    "site.voir",
    "utilisateur.voir",
    "vehicule.voir",
    "attribution.voir", "attribution.creer",
    "remplacement.valider", // EXCLUSIF
    "vehicule.reactiver", // EXCLUSIF
    "parametre.voir",
  ],

  finance: [
    "site.voir",
    "utilisateur.voir",
    "vehicule.voir",
    "reversement.voir", "reversement.rapprocher",
    "paie.calculer", "paie.valider",
    "finance.exporter",
    "parametre.voir",
  ],

  maintenance: [
    "site.voir",
    "vehicule.voir",
    "maintenance.gerer", "panne.qualifier",
    "parametre.voir",
  ],

  chauffeur: [
    "self.profil", "self.planning", "self.checkin", "self.reversement", "self.panne",
    "avance.demander",
    "recharge.enregistrer",
  ],

  externe_banque: ["portail.investisseur"],

  externe_client: ["portail.client"],
};

// -----------------------------------------------------------------------------
// Permissions EXCLUSIVES : chacune n'appartient qu'à un seul rôle (hors Admin '*').
// Sert de garde-fou au seed et de base aux tests d'acceptation.
// (reversement.rapprocher n'est PAS exclusive : double validation Finance + Resp. terrain.)
// -----------------------------------------------------------------------------
export const EXCLUSIVE_PERMISSIONS: Record<string, string> = {
  "avance.autoriser": "admin_direction",
  "operation.annuler": "responsable_terrain",
  "remplacement.valider": "dispatcher",
  "vehicule.reactiver": "dispatcher",
};

/** Développe la liste de permissions d'un rôle ('*' → toutes). */
export function expandRolePermissions(roleCode: string): string[] {
  const list = ROLE_PERMISSIONS[roleCode] || [];
  if (list.includes("*")) return [...PERMISSION_CODES];
  // Ne conserve que des codes réellement définis (garde-fou contre les fautes de frappe).
  return list.filter((c) => PERMISSION_CODES.includes(c));
}
