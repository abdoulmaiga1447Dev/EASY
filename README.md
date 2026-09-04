# EV Premium Abidjan

Service de transport de personnes haut de gamme, 100 % électrique, à Abidjan.
Application web full-stack : réservation, devis, suivi de course en temps réel,
gestion des chauffeurs, espaces partenaires (hôtels) et corporate, back-office
administrateur, facturation PDF et rapport écologique.

---

## Stack technique

| Couche | Technologies |
|---|---|
| Front | React 19, Vite 6, Tailwind CSS 4, motion, three.js / react-three-fiber, ogl, Leaflet, Google Maps, recharts |
| Back | Express 4, Prisma 5, Socket.IO 4, JWT (access + refresh), bcrypt, PDFKit |
| Base de données | PostgreSQL |
| Notifications | Brevo (email, avec repli SMTP via nodemailer), Twilio (SMS) |

Le serveur est un fichier unique, `server.ts`. En développement il monte Vite en
middleware : **un seul processus sert l'API et le front**, sur le port 3000.

---

## Prérequis

- **Node.js 20 ou plus** (testé sur Node 24)
- **PostgreSQL** accessible (instance locale ou distante)

---

## Installation

```bash
git clone https://github.com/abdoulmaiga1447Dev/EASY.git
cd EASY
npm install
```

### 1. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env`. Seule `DATABASE_URL` est réellement obligatoire pour démarrer ;
tout le reste est optionnel (voir les commentaires du fichier).

Pour générer les secrets JWT :

```bash
openssl rand -hex 32
```

### 2. Préparer la base de données

```bash
npx prisma generate     # génère le client Prisma
npx prisma db push      # crée les tables à partir de prisma/schema.prisma
npx prisma db seed      # données initiales : admin, véhicules
```

> Le projet n'utilise pas de migrations versionnées : le schéma est appliqué
> directement avec `db push`.

Le seed crée un compte administrateur : **admin@easy.ci**

### 3. Lancer

```bash
npm run dev
```

→ http://localhost:3000

---

## Scripts disponibles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (API + front + HMR) sur le port 3000 |
| `npm run build` | Copie les assets, build Vite, puis bundle le serveur dans `dist/server.cjs` |
| `npm start` | Lance le build de production (`node dist/server.cjs`) |
| `npm run lint` | Vérification des types TypeScript (`tsc --noEmit`) |
| `npm run clean` | Supprime `dist/`, `server.js` et `db.json` |

---

## Structure

```
├── server.ts              API Express + Socket.IO + Prisma (fichier unique)
├── prisma/
│   ├── schema.prisma      Modèle de données
│   ├── seed.ts            Données initiales (admin, véhicules)
│   └── migrate-db.ts      Import ponctuel depuis un ancien db.json
├── src/
│   ├── App.tsx            Routage par hash d'URL (pas de react-router)
│   ├── context/           Auth, langue (FR/EN), segment (public/premium)
│   ├── components/        UI partagée et effets visuels
│   ├── pages/             Une page par écran
│   └── assets/images/     Images utilisées par le front
├── img/                   Images sources, recopiées vers src/assets par `copy-assets.ts`
└── public/                Fichiers servis tels quels
```

---

## Rôles et espaces

| Rôle | Espace |
|---|---|
| `client` | Réservation, devis, suivi de course, historique |
| `chauffeur` | Missions, prise et fin de service (km, photos, rapport) |
| `partenaire` | Hôtels : réservations pour leurs clients, commissions, factures |
| `corporate` | Entreprises : réservations, tableau de bord, factures |
| `admin` | Back-office complet : flotte, chauffeurs, réservations, devis, facturation, configuration |

---

## Tarification

Calculée côté serveur (`server.ts`, fonction `calculatePrice`), en FCFA.

**Tarif de base**, selon la classe du véhicule et la formule :

| Formule | Classe N1 | Classe N2 |
|---|---|---|
| 1 heure | 10 000 | 15 000 |
| 2 heures | — | 28 000 |
| 3 heures | — | 39 000 |
| Demi-journée (8 h) | 45 000 | 60 000 |
| Journée (16 h) | 85 000 | 110 000 |

**Majorations cumulatives**, appliquées au tarif de base :

- Nuit (départ entre 22 h et 6 h) : **+20 %**
- Week-end (samedi ou dimanche) : **+20 %**
- Chauffeur bilingue : **+15 %**
- Accueil aéroport : **+5 000 FCFA** (montant fixe, ajouté après les pourcentages)

Le total est arrondi au multiple de 500 FCFA supérieur.

---

## Temps réel

Socket.IO, avec une room par course (`room_<reservationId>`) :

- `driver:location` — position du chauffeur, également persistée dans `TripLocation`
- `trip:status_update` — changement de statut de la course
