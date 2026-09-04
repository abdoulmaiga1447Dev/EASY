/**
 * Génère un guide PDF pédagogique de la Partie A (Bloc 1) — langage grand public.
 * Utilise PDFKit (déjà dépendance du projet). Sortie : Guide-Partie-A.pdf
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import { PERMISSIONS, ROLES, expandRolePermissions } from "../lib/rbac";

// ----- Explications « grand public » -----
const ROLE_SIMPLE: Record<string, string> = {
  admin_direction:
    "C'est le grand responsable, le patron de la plateforme. Il met tout en place au démarrage (les villes, les règles), décide qui a le droit de faire quoi, et surveille toute l'activité. C'est aussi le seul qui peut autoriser une avance d'argent à un chauffeur.",
  superviseur_logistique:
    "C'est le responsable du matériel. Il s'occupe des voitures (leurs fiches, leurs papiers), des téléphones et cartes SIM confiés aux véhicules, et des bornes de recharge électrique.",
  responsable_terrain:
    "C'est la personne présente sur le terrain, au contact direct des chauffeurs. Il vérifie leurs prises de poste, gère les retards et les absences. C'est le seul qui peut annuler une opération, et il peut créer les comptes des nouveaux chauffeurs.",
  dispatcher:
    "C'est l'organisateur de la journée. Chaque jour, il décide quel chauffeur conduit quelle voiture et prépare les plannings. C'est le seul qui peut valider le remplacement d'un chauffeur et remettre une voiture en service après une réparation.",
  finance:
    "C'est le responsable de l'argent. Il vérifie que chaque chauffeur reverse bien les recettes, calcule les salaires, les primes et les pénalités, et prépare les documents comptables.",
  maintenance:
    "C'est l'atelier. Il programme les entretiens, gère les pannes et les réparations, et suit les coûts.",
  chauffeur:
    "C'est le conducteur. Il n'a accès qu'à ses propres informations : son planning, la voiture qu'on lui confie, ses documents. Il peut demander une avance d'argent.",
  externe_banque:
    "C'est un partenaire extérieur (banque ou investisseur). Il peut seulement consulter les grands chiffres financiers de l'entreprise. Il ne peut rien modifier et ne voit jamais le nom d'un chauffeur.",
  externe_client:
    "C'est un client qui confie ses voitures à SAVER. Il voit uniquement SES propres voitures et leurs résultats. Il ne voit rien des autres.",
};

const PERM_SIMPLE: Record<string, string> = {
  "site.voir": "Voir la liste des villes (hubs).",
  "site.creer": "Ajouter une nouvelle ville.",
  "site.modifier": "Modifier les informations d'une ville.",
  "site.desactiver": "Mettre une ville hors service.",
  "site.acces_tous": "Voir toutes les villes sans restriction (réservé à la direction).",
  "zone.gerer": "Créer ou supprimer les quartiers d'une ville.",
  "role.voir": "Voir la liste des rôles.",
  "role.creer": "Créer un nouveau rôle.",
  "role.modifier": "Renommer ou modifier un rôle.",
  "role.supprimer": "Supprimer un rôle.",
  "permission.assigner": "Décider quels droits possède chaque rôle.",
  "parametre.voir": "Consulter les réglages (salaires, primes, etc.).",
  "parametre.modifier": "Changer les réglages.",
  "audit.voir": "Consulter l'historique de toutes les actions importantes.",
  "utilisateur.voir": "Voir la liste des comptes.",
  "utilisateur.creer": "Créer n'importe quel type de compte.",
  "utilisateur.modifier": "Modifier un compte existant.",
  "utilisateur.activer": "Activer ou désactiver un compte.",
  "chauffeur.creer": "Créer uniquement des comptes de chauffeur.",
  "client.gerer": "Gérer les clients extérieurs.",
  "vehicule.voir": "Voir les voitures.",
  "vehicule.creer": "Enregistrer une nouvelle voiture.",
  "vehicule.modifier": "Modifier la fiche d'une voiture.",
  "vehicule.reactiver": "Remettre une voiture en service après réparation.",
  "document.gerer": "Gérer les papiers des voitures (carte grise, assurance...).",
  "telephone.gerer": "Gérer les téléphones et cartes SIM.",
  "borne.gerer": "Gérer les bornes de recharge.",
  "attribution.voir": "Voir les plannings et les attributions.",
  "attribution.creer": "Attribuer une voiture à un chauffeur.",
  "remplacement.valider": "Valider le remplacement d'un chauffeur.",
  "shift.superviser": "Surveiller les prises et fins de poste.",
  "incident.gerer": "Gérer les retards et les absences.",
  "operation.annuler": "Annuler une opération.",
  "reversement.voir": "Voir les versements d'argent des chauffeurs.",
  "reversement.rapprocher": "Vérifier et valider qu'un versement est correct.",
  "paie.calculer": "Lancer ou consulter le calcul des salaires.",
  "paie.valider": "Valider les salaires avant paiement.",
  "avance.autoriser": "Autoriser une avance d'argent à un chauffeur.",
  "finance.exporter": "Sortir les documents comptables.",
  "recharge.enregistrer": "Enregistrer une recharge de batterie.",
  "recharge.superviser": "Surveiller les recharges pour éviter les fraudes.",
  "maintenance.gerer": "Gérer les entretiens et les réparations.",
  "panne.qualifier": "Juger de la gravité d'une panne.",
  "self.profil": "Gérer son propre profil et ses documents.",
  "self.planning": "Voir son planning et sa voiture du jour.",
  "self.checkin": "Faire sa prise et sa fin de poste.",
  "self.reversement": "Reverser ses recettes.",
  "self.panne": "Signaler une panne.",
  "avance.demander": "Demander une avance d'argent.",
  "portail.investisseur": "Accéder au tableau financier global.",
  "portail.client": "Accéder à ses propres voitures.",
  "alerte.voir": "Voir les alertes.",
  "notification.envoyer": "Envoyer une notification.",
};

// ----- Couleurs & mise en page -----
const GREEN = "#0B8A3D";
const DARK = "#20222D";
const GREY = "#555555";
const LIGHT = "#EAF6EE";

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
const OUT = "Guide-Partie-A.pdf";
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width - 100; // largeur utile

function ensureSpace(h: number) {
  if (doc.y + h > doc.page.height - 60) doc.addPage();
}
function h1(txt: string) {
  ensureSpace(60);
  doc.moveDown(0.5);
  doc.fontSize(18).fillColor(GREEN).font("Helvetica-Bold").text(txt);
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(GREEN).lineWidth(1.5).stroke();
  doc.moveDown(0.8);
}
function h2(txt: string) {
  ensureSpace(40);
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor(DARK).font("Helvetica-Bold").text(txt);
  doc.moveDown(0.3);
}
function para(txt: string, color = "#333333") {
  doc.fontSize(10.5).fillColor(color).font("Helvetica").text(txt, { align: "justify", lineGap: 2 });
  doc.moveDown(0.4);
}
function bullet(txt: string, bold?: string) {
  ensureSpace(20);
  const x = doc.x;
  doc.fontSize(10.5).fillColor(GREEN).font("Helvetica-Bold").text("•  ", { continued: true });
  if (bold) doc.fillColor(DARK).font("Helvetica-Bold").text(bold + " : ", { continued: true });
  doc.fillColor("#333333").font("Helvetica").text(txt, { lineGap: 1.5 });
  doc.x = x;
}

// ============================ COUVERTURE ============================
doc.rect(0, 0, doc.page.width, 230).fill(GREEN);
doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(30).text("SAVER Fleet Ops", 50, 80);
doc.fontSize(16).font("Helvetica").text("Plateforme de gestion de flotte — EASY", 50, 120);
doc.fontSize(13).text("Guide simple : les profils et les permissions", 50, 155);
doc.fontSize(11).fillColor("#DDF5E4").text("Partie A · Bloc 1 — expliqué pour tout le monde", 50, 180);
doc.fillColor(DARK).font("Helvetica").fontSize(10).text(
  "Document rédigé le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
  50, 260
);
doc.moveDown(2);

// ============================ INTRO ============================
h1("1. De quoi parle ce document ?");
para(
  "SAVER Fleet Ops est le logiciel qui permet de gérer une flotte de voitures électriques et les chauffeurs qui les conduisent. Ce guide explique, avec des mots simples, la première brique construite : QUI peut faire QUOI dans le logiciel."
);
para(
  "Imaginez un grand immeuble : tout le monde n'a pas les clés de toutes les portes. Le gardien, le comptable, le chauffeur… chacun a son trousseau de clés adapté à son travail. Dans le logiciel, c'est pareil : chaque personne reçoit un \"rôle\", et ce rôle donne un ensemble de \"permissions\" (les clés)."
);
h2("Deux mots à retenir");
bullet("Un métier = un ensemble de droits regroupés sous un nom simple (ex. « Dispatcher »).", "Le rôle");
bullet("Le droit précis de faire une action (ex. « attribuer une voiture »). Un rôle = plusieurs permissions.", "La permission");

// ============================ LES RÔLES ============================
doc.addPage();
h1("2. Les profils (rôles)");
para(
  "Le logiciel prévoit 8 profils, comme dans le document de cadrage. Le profil « Accès extérieur » se divise en deux (banque et client), ce qui fait 9 rôles au total. Voici chacun expliqué simplement, avec la liste de ce qu'il a le droit de faire aujourd'hui."
);

for (const role of ROLES) {
  const perms = expandRolePermissions(role.code);
  ensureSpace(90);
  // bandeau titre
  doc.moveDown(0.3);
  const yTop = doc.y;
  doc.rect(50, yTop, W, 22).fill(LIGHT);
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(13).text(role.nom, 58, yTop + 5);
  doc.y = yTop + 30;
  doc.fillColor(GREY).font("Helvetica-Oblique").fontSize(9.5).text("Nom technique : " + role.code);
  doc.moveDown(0.2);
  para(ROLE_SIMPLE[role.code] || role.description || "");
  h2("Ce qu'il a le droit de faire :");
  if (role.code === "admin_direction") {
    bullet("Il possède TOUS les droits, sur toutes les villes, sans aucune restriction. C'est le seul rôle qui peut tout voir et tout faire, y compris autoriser les avances d'argent.");
  } else {
    for (const code of perms) {
      bullet(PERM_SIMPLE[code] || code);
    }
    if (perms.length === 0) bullet("Aucun droit particulier pour l'instant.");
  }
  doc.moveDown(0.5);
}

// ============================ DICTIONNAIRE DES PERMISSIONS ============================
doc.addPage();
h1("3. Le dictionnaire des permissions");
para(
  "Voici toutes les permissions existantes, expliquées une par une et rangées par thème. Certaines serviront aux étapes suivantes du projet (salaires, recharges, pannes…) : elles sont déjà prévues pour que les règles de sécurité soient en place dès maintenant."
);

const byCat = new Map<string, typeof PERMISSIONS>();
for (const p of PERMISSIONS) {
  if (!byCat.has(p.categorie)) byCat.set(p.categorie, [] as any);
  (byCat.get(p.categorie) as any).push(p);
}
for (const [cat, list] of byCat) {
  h2(cat);
  for (const p of list) {
    bullet(PERM_SIMPLE[p.code] || p.libelle, p.libelle);
  }
  doc.moveDown(0.3);
}

// ============================ RÈGLES DE SÉCURITÉ ============================
doc.addPage();
h1("4. Les règles de sécurité importantes");

h2("a) Chaque ville reste séparée");
para(
  "Une personne rattachée à Abidjan ne voit que les données d'Abidjan. Elle ne peut pas accéder à Yamoussoukro, même en essayant de contourner l'écran. Seule la Direction voit toutes les villes."
);
h2("b) Certaines actions sont réservées à une seule personne");
bullet("Autoriser une avance d'argent à un chauffeur : uniquement l'Admin / Direction.");
bullet("Annuler une opération : uniquement le Responsable terrain.");
bullet("Valider un remplacement de chauffeur et remettre une voiture en service : uniquement le Dispatcher.");
bullet("Valider un versement d'argent : il faut DEUX validations (Finance ET Responsable terrain).");
h2("c) On ne supprime jamais un compte");
para(
  "Quand une personne quitte l'entreprise, son compte n'est pas effacé : il est simplement \"désactivé\". Ainsi, on garde l'historique de tout ce qu'elle a fait."
);
h2("d) Tout est tracé (journal d'audit)");
para(
  "Chaque action importante (créer une voiture, changer un droit, activer un compte…) est enregistrée avec le nom de la personne, la date et l'heure, et ce qui a changé. Rien ne se perd."
);
h2("e) La sécurité est vérifiée par le serveur");
para(
  "Cacher un bouton à l'écran ne suffit pas. Le logiciel vérifie systématiquement les droits côté serveur : même quelqu'un de malveillant qui tenterait de contourner l'écran serait bloqué."
);

// ============================ RÉGLAGES ============================
h1("5. Les réglages configurables");
para(
  "Toutes les valeurs financières et d'organisation ne sont PAS écrites en dur dans le logiciel : la Direction peut les modifier quand elle veut, ville par ville. À chaque modification, une nouvelle version est enregistrée (on garde l'historique des anciennes valeurs)."
);
bullet("Salaire fixe par jour (par défaut 5 357 FCFA) et conditions pour y avoir droit.");
bullet("Objectif de chiffre d'affaires (KPI) et nombre de courses visées.");
bullet("Primes (bonus) par paliers, et plafond des primes.");
bullet("Pénalités : retard, non-versement, absence.");
bullet("Tolérance acceptée sur les écarts d'argent (5 000 FCFA).");
bullet("Règles des avances : ancienneté requise et montant maximum.");
bullet("Seuil de batterie, entretien (km ou jours), délais d'alerte des papiers.");
bullet("Horaires des équipes (Shift A et Shift B) et rythme de travail des chauffeurs.");

// ============================ COMPTES DE TEST ============================
doc.addPage();
h1("6. Comptes pour tester");
para("Un compte de démonstration existe pour chaque profil. Mot de passe commun : Easy2026!");
const demos = [
  ["admin@easy.ci", "Admin / Direction (toutes les villes)"],
  ["superviseur@easy.ci", "Superviseur Logistique (Abidjan)"],
  ["terrain@easy.ci", "Responsable terrain (Abidjan)"],
  ["dispatcher@easy.ci", "Dispatcher (Abidjan)"],
  ["finance@easy.ci", "Finance (Abidjan + Yamoussoukro)"],
  ["maintenance@easy.ci", "Maintenance (Abidjan)"],
  ["chauffeur@easy.ci", "Chauffeur (Abidjan)"],
  ["banque@easy.ci", "Banque / Investisseur (extérieur)"],
  ["client@easy.ci", "Client en gestion de flotte (extérieur)"],
];
for (const [mail, desc] of demos) bullet(desc, mail);

// ============================ CE QUI RESTE ============================
h1("7. Ce qui est fait, et ce qui reste à faire");
h2("Déjà terminé (Bloc 1)");
bullet("Les profils et les permissions (ce document).");
bullet("La création des villes et de leurs quartiers.");
bullet("La gestion des comptes utilisateurs.");
bullet("Les réglages financiers configurables, ville par ville.");
bullet("Le journal d'audit et la séparation par ville.");
h2("Encore à venir dans la Partie A");
bullet("Bloc 2 — Les fiches des voitures : papiers, photos, alertes automatiques (visite technique, assurance, entretien).");
bullet("Bloc 3 — L'attribution quotidienne : qui conduit quelle voiture chaque jour, avec les plannings.");
para(
  "Autrement dit : les fondations (qui a le droit de faire quoi) sont posées et testées. Les deux prochains blocs viendront s'appuyer dessus.",
  GREY
);

// pied de page sur toutes les pages
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.fontSize(8).fillColor("#999999").font("Helvetica").text(
    "SAVER Fleet Ops — Guide Partie A (Bloc 1)   ·   page " + (i + 1) + " / " + range.count,
    50, doc.page.height - 40, { align: "center", width: W }
  );
}

doc.end();
console.log("PDF généré : " + OUT);
