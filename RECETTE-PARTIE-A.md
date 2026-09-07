# Recette (tests de validation) — Partie A

Test manuel écran par écran. Légende : ☐ à tester · ✅ testé et fonctionnel · ❌ anomalie.
Mot de passe de tous les comptes de démo : `Easy2026!`.

---

## Profil ADMIN / DIRECTION (`admin@easy.ci`)

### Partie 1 — Connexion & vue d'ensemble
- ☐ A1.1 — La page de connexion s'affiche (champ email + mot de passe).
- ☐ A1.2 — Connexion `admin@easy.ci` / `Easy2026!` réussie, sans message d'erreur.
- ☐ A1.3 — On arrive sur l'espace SAVER Fleet Ops (fond sombre, pas l'ancien site public).
- ☐ A1.4 — Le menu de gauche affiche : Tableau de bord, Administration, Véhicules, Attribution.
- ☐ A1.5 — En bas à gauche : le nom « Administrateur EASY » et le rôle « Admin / Direction ».
- ☐ A1.6 — Le tableau de bord affiche « Bonjour, Administrateur EASY » et la mention « Tous les sites ».
- ☐ A1.7 — Le bouton « Déconnexion » (bas gauche) est présent et fonctionne.

### Partie 2 — Tableau de bord
- ☐ A2.1 — Des cartes de synthèse s'affichent (Administration, Véhicules, Attribution, Finance).

### Partie 3 — Administration : Sites & zones
- ☐ A3.1 — Menu Administration → onglet « Sites & zones ».
- ☐ A3.2 — Les 2 sites sont visibles : Hub Abidjan et Hub Yamoussoukro (ville, fuseau, compte Wave).
- ☐ A3.3 — Chaque site montre ses zones (Cocody, Plateau… pour Abidjan).
- ☐ A3.4 — Création d'un site de test (nom + ville) → il apparaît dans la liste.
- ☐ A3.5 — « Gérer les zones » sur un site → ajouter une zone → elle apparaît ; la supprimer → elle disparaît.

### Partie 4 — Administration : Utilisateurs
- ☐ A4.1 — Onglet « Utilisateurs » : la liste s'affiche (nom, email, rôle, statut).
- ☐ A4.2 — Création d'un utilisateur (nom, email, rôle, site) → un mot de passe temporaire s'affiche.
- ☐ A4.3 — Le nouvel utilisateur apparaît dans la liste.
- ☐ A4.4 — Désactiver puis réactiver un compte → le statut change (Actif / Désactivé).

### Partie 5 — Administration : Rôles & permissions
- ☐ A5.1 — Onglet « Rôles & permissions » : les 9 rôles sont visibles.
- ☐ A5.2 — Chaque rôle montre son nombre de permissions et d'utilisateurs.
- ☐ A5.3 — « Modifier les permissions » d'un rôle → la liste des permissions par catégorie s'affiche.
- ☐ A5.4 — Cocher/décocher une permission puis Enregistrer → confirmation, changement conservé.

### Partie 6 — Administration : Paramètres
- ☐ A6.1 — Onglet « Paramètres » : les valeurs du site s'affichent (salaire, KPI, pénalités…).
- ☐ A6.2 — Changer une valeur (ex. salaire fixe) puis Enregistrer → nouvelle version créée.
- ☐ A6.3 — Le sélecteur de site permet de voir les paramètres de l'autre site.

### Partie 7 — Administration : Journal d'audit
- ☐ A7.1 — Onglet « Journal d'audit » : les actions récentes s'affichent (date, auteur, action).
- ☐ A7.2 — Les actions faites aux parties 3-6 apparaissent bien dans le journal.

### Partie 8 — Véhicules (vue Admin)
- ☐ A8.1 — Menu Véhicules : les 10 véhicules de démonstration s'affichent.
- ☐ A8.2 — Recherche et filtres (statut, contrat, échéances) fonctionnent.
- ☐ A8.3 — Ouvrir une fiche véhicule → détails, photos, documents, alertes.
- ☐ A8.4 — Onglets « Téléphones / SIM » et « Alertes » accessibles.
- ☐ A8.5 — Export CSV télécharge un fichier.

### Partie 9 — Attribution (vue Admin)
- ☐ A9.1 — Menu Attribution : planning du jour (colonnes Shift A / Shift B).
- ☐ A9.2 — Sélecteur de site (Admin voit les deux) et de date.
- ☐ A9.3 — Vue « Semaine » accessible.
