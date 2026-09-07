/**
 * Génère un guide PDF pédagogique de la Partie A (Blocs 1-3) — langage grand public,
 * avec une section « Comment tester » pas à pas. Utilise PDFKit.
 * Sortie : Guide-Partie-A.pdf
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
const W = doc.page.width - 100;

function ensureSpace(h: number) { if (doc.y + h > doc.page.height - 60) doc.addPage(); }
function h1(txt: string) {
  ensureSpace(60); doc.moveDown(0.5);
  doc.fontSize(18).fillColor(GREEN).font("Helvetica-Bold").text(txt);
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(GREEN).lineWidth(1.5).stroke();
  doc.moveDown(0.8);
}
function h2(txt: string) {
  ensureSpace(40); doc.moveDown(0.3);
  doc.fontSize(13).fillColor(DARK).font("Helvetica-Bold").text(txt); doc.moveDown(0.3);
}
function para(txt: string, color = "#333333") {
  doc.fontSize(10.5).fillColor(color).font("Helvetica").text(txt, { align: "justify", lineGap: 2 }); doc.moveDown(0.4);
}
function bullet(txt: string, bold?: string) {
  ensureSpace(20); const x = doc.x;
  doc.fontSize(10.5).fillColor(GREEN).font("Helvetica-Bold").text("•  ", { continued: true });
  if (bold) doc.fillColor(DARK).font("Helvetica-Bold").text(bold + " : ", { continued: true });
  doc.fillColor("#333333").font("Helvetica").text(txt, { lineGap: 1.5 }); doc.x = x;
}
function step(n: number, txt: string) {
  ensureSpace(22); const x = doc.x;
  doc.fontSize(10.5).fillColor(GREEN).font("Helvetica-Bold").text(`${n}.  `, { continued: true });
  doc.fillColor("#333333").font("Helvetica").text(txt, { lineGap: 1.5 }); doc.x = x;
}
function tip(txt: string) {
  ensureSpace(30);
  const y = doc.y; const h = doc.heightOfString(txt, { width: W - 20 }) + 12;
  doc.rect(50, y, W, h).fill(LIGHT);
  doc.fillColor(DARK).font("Helvetica-Oblique").fontSize(9.5).text(txt, 60, y + 6, { width: W - 20 });
  doc.y = y + h + 6; doc.x = 50; doc.fillColor("#333333").font("Helvetica");
}

// ============================ COUVERTURE ============================
doc.rect(0, 0, doc.page.width, 230).fill(GREEN);
doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(30).text("SAVER Fleet Ops", 50, 80);
doc.fontSize(16).font("Helvetica").text("Plateforme de gestion de flotte — EASY", 50, 120);
doc.fontSize(13).text("Guide complet : profils, véhicules, attribution", 50, 152);
doc.fontSize(11).fillColor("#DDF5E4").text("Partie A (Blocs 1 à 3) — expliqué et testé pour tout le monde", 50, 178);
doc.fillColor(DARK).font("Helvetica").fontSize(10).text("Document rédigé le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), 50, 260);
doc.moveDown(2);

// ============================ 1. INTRO ============================
h1("1. De quoi parle ce document ?");
para("SAVER Fleet Ops est le logiciel qui permet de gérer une flotte de voitures électriques et les chauffeurs qui les conduisent. Ce guide explique, avec des mots simples, tout ce qui a été construit dans la Partie A, puis montre COMMENT le tester soi-même, écran par écran.");
para("La Partie A répond à trois questions : QUI peut faire quoi (les profils et les permissions), COMMENT on enregistre une voiture (sa fiche complète), et COMMENT on décide chaque jour quel chauffeur conduit quelle voiture (l'attribution).");
h2("Deux mots à retenir");
bullet("Un métier = un ensemble de droits regroupés sous un nom simple (ex. « Dispatcher »).", "Le rôle");
bullet("Le droit précis de faire une action (ex. « attribuer une voiture »). Un rôle = plusieurs permissions.", "La permission");

// ============================ 2. LES RÔLES ============================
doc.addPage();
h1("2. Les profils (rôles)");
para("Le logiciel prévoit 8 profils. Le profil « Accès extérieur » se divise en deux (banque et client), ce qui fait 9 rôles au total. Voici chacun, avec la liste de ce qu'il a le droit de faire aujourd'hui.");
for (const role of ROLES) {
  const perms = expandRolePermissions(role.code);
  ensureSpace(90); doc.moveDown(0.3);
  const yTop = doc.y;
  doc.rect(50, yTop, W, 22).fill(LIGHT);
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(13).text(role.nom, 58, yTop + 5);
  doc.y = yTop + 30;
  doc.fillColor(GREY).font("Helvetica-Oblique").fontSize(9.5).text("Nom technique : " + role.code); doc.moveDown(0.2);
  para(ROLE_SIMPLE[role.code] || role.description || "");
  h2("Ce qu'il a le droit de faire :");
  if (role.code === "admin_direction") bullet("Il possède TOUS les droits, sur toutes les villes, sans aucune restriction. C'est le seul qui peut tout voir et tout faire, y compris autoriser les avances d'argent.");
  else { for (const code of perms) bullet(PERM_SIMPLE[code] || code); if (perms.length === 0) bullet("Aucun droit particulier pour l'instant."); }
  doc.moveDown(0.5);
}

// ============================ 3. DICTIONNAIRE DES PERMISSIONS ============================
doc.addPage();
h1("3. Le dictionnaire des permissions");
para("Voici toutes les permissions existantes, expliquées une par une et rangées par thème. Certaines serviront aux étapes suivantes du projet (salaires, recharges, pannes...) : elles sont déjà prévues pour que les règles de sécurité soient en place dès maintenant.");
const byCat = new Map<string, typeof PERMISSIONS>();
for (const p of PERMISSIONS) { if (!byCat.has(p.categorie)) byCat.set(p.categorie, [] as any); (byCat.get(p.categorie) as any).push(p); }
for (const [cat, list] of byCat) { h2(cat); for (const p of list) bullet(PERM_SIMPLE[p.code] || p.libelle, p.libelle); doc.moveDown(0.3); }

// ============================ 4. LES VÉHICULES ============================
doc.addPage();
h1("4. Les véhicules (la fiche de chaque voiture)");
para("Le Superviseur Logistique enregistre chaque voiture de la flotte. La création se fait en plusieurs étapes, et il est IMPOSSIBLE d'enregistrer tant qu'un renseignement ou une photo obligatoire manque (le bouton reste grisé). On peut aussi enregistrer un brouillon pour finir plus tard.");
h2("Ce qu'on renseigne");
bullet("Identité : plaque d'immatriculation, marque et modèle, numéro VIN, autonomie, capacité de la batterie.");
bullet("Contrat : voiture appartenant à SAVER, ou à un client extérieur (dans ce cas on rattache le client et la durée du contrat).");
bullet("Service : VTC, location B2B ou B2C, et les classes proposées (Éco, Confort, VIP).");
bullet("Papiers : carte grise, visite technique, assurance — avec une photo de chaque.");
bullet("Photos : 8 photos obligatoires (les 4 côtés, l'intérieur, le tableau de bord, l'écran, les sièges).");
bullet("Téléphone/SIM et boîtier GPS peuvent être associés à la voiture.");
h2("Ce que le système fait tout seul");
bullet("Il met la voiture en statut « Disponible » et programme son prochain entretien (à 15 000 km ou dans 90 jours).");
bullet("Il surveille les dates qui expirent et prévient à l'avance : visite technique 15 jours avant, assurance 7 jours avant. Ces alertes apparaissent sans que personne ait à y penser.");
bullet("Il empêche deux voitures d'avoir la même plaque ou le même VIN.");
h2("Les statuts d'une voiture");
para("Une voiture passe par des états bien définis : Disponible, Attribué, En charge, Immobilisé, En maintenance, Hors flotte. On ne peut pas sauter n'importe comment d'un état à l'autre. En particulier, remettre une voiture en service après réparation est réservé au Dispatcher.");

// ============================ 5. L'ATTRIBUTION ============================
h1("5. L'attribution quotidienne");
para("Chaque jour, le Dispatcher décide quelle voiture va à quel chauffeur, pour chaque demi-journée : le Shift A (le matin, 6h-14h) et le Shift B (l'après-midi/soir, 15h-23h).");
h2("Comment ça marche");
bullet("Le système propose les voitures les plus adaptées : d'abord celles de la zone du chauffeur, puis en évitant de toujours lui donner la même (rotation équitable).");
bullet("Une voiture déjà prise sur un créneau ne peut PAS être donnée une deuxième fois (elle est grisée, et le système refuse en cas d'erreur).");
bullet("Les voitures immobilisées ou en réparation ne sont jamais proposées.");
bullet("Quand l'attribution est confirmée, le chauffeur reçoit son planning (voiture, horaire).");
h2("Les garde-fous (avertissements)");
para("Le système prévient (sans bloquer) si : le même chauffeur fait le matin ET le soir (journée trop longue), la batterie est trop basse et une recharge s'impose avant de repartir, ou le chauffeur a déjà trop travaillé dans la semaine.");
h2("Remplacement et annulation");
bullet("Le Dispatcher peut remplacer un chauffeur (un motif est obligatoire) ou annuler une attribution.");
bullet("Tout est conservé dans un historique : on sait toujours qui a conduit quelle voiture, quel jour.");

// ============================ 6. RÈGLES DE SÉCURITÉ ============================
doc.addPage();
h1("6. Les règles de sécurité importantes");
h2("a) Chaque ville reste séparée");
para("Une personne rattachée à Abidjan ne voit que les données d'Abidjan. Seule la Direction voit toutes les villes.");
h2("b) Certaines actions sont réservées à une seule personne");
bullet("Autoriser une avance d'argent : uniquement l'Admin / Direction.");
bullet("Annuler une opération : uniquement le Responsable terrain.");
bullet("Valider un remplacement de chauffeur et remettre une voiture en service : uniquement le Dispatcher.");
bullet("Valider un versement d'argent : il faut DEUX validations (Finance ET Responsable terrain).");
h2("c) On ne supprime jamais un compte");
para("Quand une personne quitte l'entreprise, son compte n'est pas effacé : il est « désactivé ». On garde ainsi l'historique de tout ce qu'elle a fait.");
h2("d) Tout est tracé, et la sécurité est vérifiée par le serveur");
para("Chaque action importante est enregistrée (qui, quand, quoi). Et cacher un bouton ne suffit pas : le logiciel vérifie toujours les droits côté serveur, donc personne ne peut contourner l'écran.");

// ============================ 7. RÉGLAGES ============================
h1("7. Les réglages configurables");
para("Toutes les valeurs financières et d'organisation peuvent être modifiées par la Direction, ville par ville. À chaque changement, une nouvelle version est enregistrée (l'historique est conservé). Rien n'est figé dans le logiciel.");
bullet("Salaire fixe par jour (par défaut 5 357 FCFA) et conditions d'éligibilité.");
bullet("Objectifs (KPI), primes par paliers et plafond, pénalités.");
bullet("Tolérance sur les écarts d'argent, règles des avances.");
bullet("Seuil de batterie, entretien (km/jours), délais d'alerte des papiers, horaires des équipes.");

// ============================ 8. COMMENT TESTER ============================
doc.addPage();
h1("8. Comment tester, pas à pas");
para("Cette partie explique comment vérifier soi-même que tout fonctionne. Aucune compétence technique n'est nécessaire, sauf pour la toute dernière section (tests automatiques).");

h2("Avant de commencer");
step(1, "Ouvrez le logiciel dans votre navigateur (adresse fournie par l'équipe, par ex. http://localhost:3000).");
step(2, "Connectez-vous avec un des comptes de démonstration ci-dessous. Le mot de passe est le même pour tous : Easy2026!");
tip("Astuce : pour bien voir les différences, testez plusieurs comptes à la suite (déconnexion en bas à gauche, puis reconnexion). Chaque profil voit un menu différent.");

h2("Test 1 — Chaque profil voit son espace");
step(1, "Connectez-vous avec admin@easy.ci : vous voyez un menu complet (Tableau de bord, Administration, Véhicules, Attribution).");
step(2, "Déconnectez-vous, puis connectez-vous avec chauffeur@easy.ci : vous voyez presque rien (accès très limité). C'est normal et voulu.");
step(3, "Essayez banque@easy.ci et client@easy.ci : ils arrivent sur un portail « lecture seule », sans aucun bouton d'action.");

h2("Test 2 — Administration (compte admin@easy.ci)");
step(1, "Menu « Administration » → onglet « Sites & zones » : vous voyez Hub Abidjan et Hub Yamoussoukro. Créez un site de test, puis ajoutez-lui une zone.");
step(2, "Onglet « Utilisateurs » : créez un utilisateur (nom, email, rôle). Un mot de passe temporaire s'affiche : c'est celui à communiquer à la personne.");
step(3, "Onglet « Rôles & permissions » : cliquez « Modifier les permissions » sur un rôle, cochez/décochez des cases, puis « Enregistrer ».");
step(4, "Onglet « Paramètres » : changez par exemple le salaire fixe, puis « Enregistrer ». Le numéro de version augmente : l'ancienne valeur est conservée dans l'historique.");
step(5, "Onglet « Journal d'audit » : retrouvez la trace de tout ce que vous venez de faire (avec la date et votre nom).");

h2("Test 3 — Véhicules (compte superviseur@easy.ci)");
step(1, "Menu « Véhicules » : vous voyez la flotte de démonstration (10 voitures). Essayez la recherche et les filtres (statut, échéances proches).");
step(2, "Cliquez « + Ajouter un véhicule » et suivez les étapes. IMPORTANT : à la dernière étape, le bouton « Enregistrer le véhicule » reste gris tant qu'il manque un champ ou une photo. Complétez tout (les 8 photos + les 3 documents) pour qu'il devienne actif.");
step(3, "Ouvrez une voiture existante : vous voyez ses photos, ses papiers, ses alertes, et vous pouvez changer son statut.");
step(4, "Onglet « Alertes » : vous voyez les voitures dont la visite technique ou l'assurance approche de l'expiration.");
step(5, "Onglet « Téléphones / SIM » : ajoutez un téléphone. Bouton « Export CSV » : téléchargez la liste des voitures (ouvrable dans Excel).");
tip("Pour vérifier la sécurité des photos : le compte client@easy.ci ne peut voir que les photos de SES voitures, pas celles des autres.");

h2("Test 4 — Attribution (compte dispatcher@easy.ci)");
step(1, "Menu « Attribution » : vous voyez le planning du jour, en deux colonnes (Shift A le matin, Shift B le soir).");
step(2, "Cliquez « + Attribuer un véhicule » : choisissez un shift, un chauffeur, puis une voiture dans les suggestions (la mieux adaptée est marquée d'une étoile). Confirmez. Si un avertissement apparaît (batterie basse, etc.), c'est normal : il informe sans bloquer.");
step(3, "Essayez d'attribuer la MÊME voiture, le même jour, le même shift, à un autre chauffeur : le système refuse (déjà pris).");
step(4, "Sur une attribution existante, testez « Remplacer » (choisir un autre chauffeur + un motif) et « Annuler ».");
step(5, "Onglet « Semaine » : vue d'ensemble des 7 jours.");

h2("Test 5 — Vérifier le cloisonnement (la sécurité)");
step(1, "Connecté en chauffeur@easy.ci, constatez que vous n'avez PAS accès à l'administration ni aux véhicules.");
step(2, "Les comptes extérieurs (banque, client) ne peuvent rien modifier.");

h2("Test 6 — Tests automatiques (pour l'équipe technique)");
para("Dans un terminal, à la racine du projet, lancez la commande : npm test");
para("148 tests s'exécutent et vérifient automatiquement les droits d'accès, l'unicité des attributions, la validation des véhicules, etc. Tous doivent être « au vert » (passed).");

// ============================ 9. COMPTES ============================
doc.addPage();
h1("9. Comptes de démonstration");
para("Mot de passe commun à tous : Easy2026!");
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
para("En plus : 20 comptes chauffeurs (drv_01@easy.ci à drv_20@easy.ci, même mot de passe), 10 voitures et 3 téléphones sont pré-remplis pour tester l'attribution.", GREY);

// ============================ 10. CE QUI RESTE ============================
h1("10. Ce qui est fait, et ce qui reste");
h2("Terminé (Partie A)");
bullet("Profils, permissions et sécurité (Bloc 1).");
bullet("Fiches véhicules, papiers, photos, alertes automatiques, téléphones (Bloc 2).");
bullet("Attribution quotidienne des voitures aux chauffeurs, plannings, remplacements (Bloc 3).");
h2("À venir (prochaines parties)");
bullet("Partie B : prise et fin de poste (check-in/out), reversement de l'argent.");
bullet("Partie C : recharge des batteries, pannes et immobilisation.");
bullet("Partie D : calcul des salaires et primes, avances.");
para("Les fondations sont posées et vérifiées ; les prochaines parties viendront s'appuyer dessus.", GREY);

// pied de page
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.fontSize(8).fillColor("#999999").font("Helvetica").text(
    "SAVER Fleet Ops — Guide Partie A (Blocs 1-3)   ·   page " + (i + 1) + " / " + range.count,
    50, doc.page.height - 40, { align: "center", width: W }
  );
}

doc.end();
console.log("PDF généré : " + OUT);
