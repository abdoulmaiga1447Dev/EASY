# Partie A — Profils & RBAC, Véhicules, Attribution

Refonte **SAVER Fleet Ops** (feuille de route, semaine 1). Ce document décrit ce qui
est livré, comment le lancer et le tester, et ce qui est volontairement reporté.

> **Avancement — Partie A terminée**
> - **Bloc 1 — Profils & RBAC** : ✅ livré et testé.
> - **Bloc 2 — Flux 7 (enregistrement véhicule)** : ✅ livré et testé.
> - **Bloc 3 — Flux 8 (attribution quotidienne)** : ✅ livré et testé.

---

## Lancer

```bash
npx prisma generate      # client Prisma
npx prisma db push       # applique le schéma
npx prisma db seed       # permissions, rôles, 2 sites, comptes de démo
npm run dev              # http://localhost:3000
npm test                # suite Vitest (unitaires + matrice RBAC + e2e)
```

## Comptes de démonstration

Mot de passe commun : **`Easy2026!`**

| Email | Profil |
|---|---|
| admin@easy.ci | Admin / Direction (tous sites) |
| superviseur@easy.ci | Superviseur Logistique (Abidjan) |
| terrain@easy.ci | Responsable terrain (Abidjan) |
| dispatcher@easy.ci | Dispatcher (Abidjan) |
| finance@easy.ci | Finance (Abidjan + Yamoussoukro) |
| maintenance@easy.ci | Maintenance (Abidjan) |
| chauffeur@easy.ci | Chauffeur (Abidjan) |
| banque@easy.ci | Banque / Investisseur (portail externe) |
| client@easy.ci | Client en gestion de flotte (portail externe) |

Sites seedés : **Hub Abidjan** et **Hub Yamoussoukro** (avec zones + paramètres v1).
Flotte de démo : **10 véhicules** (échéances variées → alertes), **3 téléphones/SIM**,
et **20 chauffeurs** supplémentaires (`drv_01@easy.ci` … `drv_20@easy.ci`, même mot de
passe) répartis par site et par zone, pour tester l'attribution.

---

## Bloc 1 — ce qui est livré

### Modèle de données (nouvelles tables Prisma, relations + `DateTime` + `Json`)
`Site`, `Zone`, `Permission`, `Role`, `RolePermission`, `UserSite`, `DriverProfile`,
`Client`, `SiteSettings` (versionné), `AuditLog`. Le modèle `User` est étendu
(`roleId`, `secondaryRoleId`, `active`, `clientId`) sans casser l'existant.

### RBAC
- **53 permissions** granulaires `ressource.action`, regroupées par catégorie
  (`lib/rbac.ts` = source unique, seedée mais **modifiable en base**).
- **9 rôles** (les 8 profils du PowerPoint ; « Accès externes » = 2 rôles cloisonnés).
- **Associations rôle↔permission éditables** depuis l'interface d'administration.
- **Permissions exclusives** posées et cloisonnées dès maintenant :
  `avance.autoriser` (Admin), `operation.annuler` (Responsable terrain),
  `remplacement.valider` + `vehicule.reactiver` (Dispatcher). `reversement.rapprocher`
  est porté par Finance **et** Responsable terrain (double validation).
- **Cloisonnement par site** appliqué **côté serveur** : chaque route filtre par les
  sites de rattachement ; Admin (`site.acces_tous`) voit tout. Les externes sont
  cloisonnés par périmètre (client → ses véhicules ; investisseur → agrégats).
- **Application serveur avant tout** : middleware `authenticate` + `authorize(...)`
  (`lib/authz.ts`). Le masquage UI n'est qu'un confort.

### Fonctionnalités
- CRUD **sites** + **zones** (liste fixe par site).
- **Paramètres globaux par site, versionnés** (toutes les valeurs du PowerPoint :
  fixe 5 357, KPI, bonus, pénalités, tolérance, avances, SOC, maintenance, alertes,
  shifts, rythme). Chaque modification crée une nouvelle version + historique.
  **Aucune valeur métier n'est en dur** : tout vient de `SiteSettings`.
- CRUD **utilisateurs** avec soft delete (activation/désactivation, jamais de
  suppression physique). Règle : le Responsable terrain ne crée **que** des chauffeurs.
  Un mot de passe temporaire est généré et affiché à la création.
- Entité **Client** externe + contacts rattachés.
- **Journal d'audit** de toutes les actions sensibles (auteur, horodatage, avant/après).

### Front
- Espace **SAVER Fleet Ops** (`src/pages/fleet/`) : sidebar pilotée par les
  permissions, tableau de bord par profil, écran d'administration à onglets
  (Sites, Utilisateurs, Rôles & permissions, Paramètres, Audit), portails externes
  cloisonnés. Contexte RBAC front (`useRbac`, `can(...)`).
- Aiguillage automatique : un compte Fleet Ops arrive sur son espace ; les comptes
  legacy gardent l'app publique.

### Tests (`tests/`, Vitest + Supertest)
- **Unitaires** : catalogue RBAC, exclusivité des permissions, helpers de scoping.
- **Matrice RBAC exécutable** : pour chaque couple (rôle × endpoint), autorisé/refusé.
- **E2E** : cloisonnement par site, règle chauffeur, paramètres versionnés,
  édition des permissions d'un rôle avec trace d'audit.

---

## Bloc 2 — ce qui est livré (Flux 7)

### Modèle de données (nouvelles tables)
`FleetVehicle` (machine à états), `VehicleDocument` (carte grise / VT / assurance),
`MediaAsset` (fichiers), `DevicePhone` (téléphones/SIM), `VehicleKmHistory`,
`Alert` (idempotente via `dedupeKey`), `Notification` (file + retry).

### Fonctionnalités
- **Enregistrement multi-étapes** d'un véhicule (identification, contrat, service,
  documents, photos, validation) avec **brouillon** sauvegardable. Côté serveur ET
  côté UI : l'enregistrement complet est **refusé tant qu'un champ ou une photo
  obligatoire manque** (le bouton reste désactivé).
- **Unicité** de l'immatriculation et du VIN.
- **Machine à états** explicite (Disponible, Attribué, En charge, Immobilisé, En
  maintenance, Hors flotte) : transitions arbitraires interdites ; la **réactivation**
  (sortie de maintenance) est réservée au **Dispatcher**.
- À l'enregistrement : statut **Disponible**, **maintenance préventive programmée**
  (km + date depuis les paramètres du site), **alertes d'échéance générées**.
- **Moteur d'alertes** quotidien (job) : visite technique, assurance, entretien
  (km/date). **Idempotent** (aucun doublon), avec **notifications** in-app + email
  (SMS/WhatsApp en adaptateurs mockés, file d'attente + retry).
- **Uploads** photos/documents : multer + compression (jimp) + limites (8 Mo, types
  autorisés) + **accès contrôlé par RBAC** (un client externe ne lit que les fichiers
  de ses propres véhicules).
- **Téléphones/SIM** (matériel SAVER) : enregistrement et affectation à un véhicule.
- **Historique kilométrique** ; **GPS LUOGU** = champ d'association.
- **Liste véhicules** : recherche, filtres (statut, contrat, échéances proches),
  pagination, **export CSV**. Fiche détail (documents, photos, GPS, téléphone,
  historique, alertes, changement de statut).

### Front
Écran **Véhicules** (onglets Véhicules / Téléphones-SIM / Alertes) : liste filtrable,
assistant de création multi-étapes avec upload, fiche détail.

### Tests
Unitaires (machine à états, calcul des échéances). E2E (upload, création complète,
unicité, brouillon, transitions, cloisonnement des documents pour le client externe).
**119 tests au total.**

## Bloc 3 — ce qui est livré (Flux 8)

### Modèle de données
`Assignment` (attribution courante, **contrainte d'unicité `(véhicule, date, shift)`
au niveau BASE** — empêche toute double attribution, même en concurrence) et
`AssignmentEvent` (historique append-only : création, remplacement, annulation).

### Fonctionnalités
- **Attribution quotidienne** par jour + shift (A 6h-14h, B 15h-23h) : le Dispatcher
  choisit un chauffeur puis un véhicule.
- **Suggestions** de véhicules classées **par zone du chauffeur puis rotation
  équitable** (on privilégie les véhicules qu'il n'a pas conduits récemment). Les
  véhicules Immobilisé/En maintenance/Hors flotte et ceux déjà pris sur le créneau
  sont exclus (grisés côté UI).
- **Avertissements non bloquants** : double shift (enchaînement A+B), recharge de
  handover si SOC < seuil (ou SOC inconnu), dépassement du rythme (6 j/7).
- **Remplacement de chauffeur** réservé au **Dispatcher** (motif obligatoire, tracé).
- **Annulation** qui libère le créneau (tracée). Chaque action est **historisée**.
- **Notification** au chauffeur à la confirmation (WhatsApp mocké + in-app) avec
  véhicule, shift et horaire.
- **Planning** du jour (2 shifts, chauffeurs et véhicules non affectés visibles) et
  de la semaine, par site.

### Front
Écran **Attribution** : vue Jour (colonnes Shift A / Shift B, assistant d'attribution
avec suggestions, remplacement, annulation) et vue Semaine.

### Tests
Unitaires (suggestions/rotation, avertissements). E2E (confirmation, unicité y compris
**concurrente**, véhicule indisponible, suggestions, remplacement réservé au Dispatcher,
annulation qui libère le créneau, RBAC). **148 tests au total.**

## Incohérences corrigées dans le périmètre
- **#2** (`App.tsx`) : les deux listes `allowedPages` divergentes sont unifiées en une
  constante `ALLOWED_PAGES` (la navigation vers `#admin` par les boutons du navigateur
  fonctionne à nouveau).

## Hypothèses & décisions (validées avec le porteur)
- Le PowerPoint fait autorité ; l'existant non conforme est remplacé au fil des blocs.
- Rôle principal + rôle secondaire optionnel ; zones = liste fixe par site.
- Nouvelles tables en Prisma direct (relations/`DateTime`), sans toucher au
  `readDB/writeDB` legacy. Nouvelles routes sous `/api/*` montées via `server/partA`.
- Le champ legacy `User.role` reflète le code du rôle (transition douce).

## Volontairement reporté (Parties B–D)
- Check-in/out, reversement, recharge EV, pannes, paie, avances (les **permissions**
  existent déjà et sont cloisonnées ; les **flux** viendront).
- Uploads (photos/docs véhicule) + moteur d'alertes + notifications multi-canal :
  arrivent avec le Bloc 2 (Flux 7).
- Télémétrie GPS LUOGU : seul le champ d'association sera posé (doc/API non fournie).
- Intégration WhatsApp : adaptateur mocké prévu au Bloc 3.

## Points restant à vérifier
- Revue **visuelle** de l'espace Fleet Ops (aucun navigateur disponible dans
  l'environnement de dev automatisé) : à faire avec les comptes de démo ci-dessus.
