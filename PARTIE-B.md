# Partie B — Terrain : check-in/out & reversement

> **Avancement**
> - **Bloc B1 — Flux 1 (check-in / check-out)** : ✅ livré et testé.
> - **Bloc B2 — Flux 2 (reversement)** : ✅ livré et testé (cœur ; cas particuliers cash/réseau reportés).

## Modèle de revenus (clarifié) — HYBRIDE
- **Plateforme SAVER** : commandes clients payées **en ligne** → le chauffeur ne touche pas l'argent → **pas de reversement** (relève du futur module Courses).
- **Yango** : courses encaissées par le chauffeur → **reversées** (Flux 2, ci-dessous).

## Bloc B2 — ce qui est livré (Flux 2, reversement Yango)
### Données
`Reversement` (1‑1 `ShiftRecord`), `ReversementDepense`, `DetteChauffeur`.
### Règles (lib/reversement.ts)
Montant attendu = recette Yango − dépenses − frais (~1 %). Écart ≤ **tolérance 5 000 F** →
**accepté** ; au-delà → **écart à valider**. **Double validation** Finance + Responsable
terrain → **rapproché** + **création automatique d'une dette** (déduite en paie, Partie D).
### API (server/partA/reversement.ts)
`GET /api/fleet/me/reversement` ; `POST /api/fleet/shifts/:id/reversement` (chauffeur,
check-out requis) ; `GET /api/fleet/reversements` (+ `/:id`) et `POST /:id/valider`
(double validation). Preuves cloisonnées (chauffeur concerné ou Finance/Terrain du site).
### Front
Bloc « Reverser mes recettes » dans l'espace chauffeur ; écran **Reversements**
(Finance / Responsable terrain) avec preuves et double validation.
### Tests
Unit (calcul écart/statut) + e2e (accepté, écart → double validation → dette, RBAC).
**180 tests au total.**

## Reste à faire dans la Partie B (avant déploiement)
- Cas particuliers du reversement : **exception cash** + **réseau indisponible**.
- **Caméra en direct** (anti-galerie) sur les preuves de **check-in/out** (le reversement garde le choix de fichier).
- **Vérification IA** des preuves (cohérence + OCR, blocage auto) — chantier dédié après la Partie B.

Décisions actées :
- **Yango abandonné** : toute la chaîne course/recette se fait dans l'app (module Courses
  après les Parties B‑D). En attendant, la recette sera **déclarée** par le chauffeur (Bloc B2).
- **Empreinte digitale remplacée par le selfie KYC** (app web) → **5 preuves** au check-in.
- **Check-in lié à l'attribution du jour** (Flux 8) : sur le véhicule assigné par le Dispatcher.

## Bloc B1 — ce qui est livré (Flux 1)

### Données
`ShiftRecord` (1‑1 avec `Assignment`) : statut `EN_ATTENTE → EN_COURS → TERMINE`,
preuves de check-in (GPS, km, 4 médias), photos de check-out (4 côtés), km parcourus/durée.

### Règles (lib/shift.ts)
- Check-in **bloqué si permis expiré** ou si une des **5 preuves** manque.
- **Check-out impossible sans check-in** valide.
- **Minuteur 15 min** (lib/shiftAlerts.ts, job toutes les 5 min) : alerte le Responsable
  terrain si un shift n'a pas démarré à l'heure prévue (idempotent).
- Au check-out : mise à jour du **km du véhicule** + historique.

### API (server/partA/checkin.ts)
- `GET /api/fleet/me/shift` — le chauffeur voit son attribution + état du jour ;
- `POST /api/fleet/shifts/:assignmentId/checkin` / `.../checkout` — 5 preuves / 4 photos ;
- `GET /api/fleet/shifts` + `/:id` — supervision (Responsable terrain / Admin), preuves ;
- `/api/media` ouvert aux permissions chauffeur (`self.checkin`…) ; lecture des preuves
  cloisonnée (chauffeur concerné ou superviseur du site).

### Front
- **Espace chauffeur** (`FleetChauffeur.tsx`) : mon véhicule/shift du jour, check-in
  (GPS + 4 photos), service en cours, check-out ; « Besoin d'aide ».
- **Supervision terrain** (`FleetShifts.tsx`) : shifts du jour + consultation des preuves.

### Tests
Unitaires (preuves, permis, horaires/retard, calculs) + e2e (check-in complet, blocages,
check-out, RBAC, supervision). **167 tests au total.**

### Démo
Le chauffeur de démo (`chauffeur@easy.ci`) a une **attribution du jour** (seed) pour
tester le check-in immédiatement.
