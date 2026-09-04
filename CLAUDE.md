# CLAUDE.md

Contexte du projet pour Claude Code. Voir `README.md` pour l'installation.

## Langue

**Le projet et les échanges se font en français.** Code, commentaires, messages
de commit, textes d'interface : français (l'interface est bilingue FR/EN via
`LanguageContext`, avec le français par défaut).

## Méthode de travail

L'utilisateur pilote la refonte **partie par partie, un prompt à la fois**.

- Traiter strictement le périmètre du prompt en cours, le terminer complètement,
  puis s'arrêter et attendre le prompt suivant.
- **Ne pas anticiper** sur les parties suivantes, ne pas développer plusieurs
  chantiers d'un coup.
- Les incohérences repérées en dehors du périmètre : les **signaler** sans les
  corriger spontanément.

Le chantier global couvre **le design et la logique métier**, avec correction de
toutes les incohérences. Le périmètre des ajouts sera défini par un **fichier
PowerPoint fourni par l'utilisateur** — le lire et en tirer une liste de
fonctionnalités avant d'écrire du code. Tant qu'il n'est pas fourni, ne pas
inventer le contenu manquant.

## Architecture

Application de transport électrique haut de gamme à Abidjan (EV Premium
Abidjan). 5 rôles : `client`, `chauffeur`, `partenaire` (hôtels), `corporate`,
`admin`.

- **`server.ts`** — fichier unique de ~4 500 lignes : Express + Prisma +
  Socket.IO + JWT + PDFKit + notifications. En développement, Vite est monté en
  middleware dans ce même processus : **un seul serveur sur le port 3000** pour
  l'API et le front.
- **`src/`** — front React 19. Routage maison par `window.location.hash` dans
  `App.tsx` (pas de react-router). État global via trois contextes : `Auth`,
  `Language`, `Segment` (public / premium).
- **`prisma/schema.prisma`** — PostgreSQL, pas de migrations versionnées
  (`db push` uniquement).

### Fichiers les plus lourds

| Fichier | Lignes |
|---|---|
| `server.ts` | ~4 500 |
| `src/pages/Admin.tsx` | ~4 050 |
| `src/pages/Reservation.tsx` | ~1 370 |
| `src/pages/Chauffeur.tsx` | ~1 220 |
| `src/pages/Partenaire.tsx` | ~1 160 |

Ces fichiers sont trop gros pour être lus intégralement : cibler les lectures
(`grep -n` puis `sed -n 'X,Yp'`).

### Tarification

Toute la logique de prix vit dans `calculatePrice` (`server.ts`). Voir le
tableau des tarifs et majorations dans le `README.md`. **Ne jamais dupliquer ce
calcul côté front** : passer par `POST /api/reservations/calculate`.

## Incohérences connues (à corriger au fil des chantiers)

Recensées le 2026-09-04, avant le début de la refonte. Ne pas les corriger
spontanément : attendre le prompt correspondant.

1. **`src/types.ts` ne correspond pas au back.** L'interface `Vehicle` du front
   (`image`, `capacity`, `autonomy`, `power`, `hourlyRate`…) n'a rien à voir
   avec le modèle Prisma `Vehicle` (`category`, `brand`, `immatriculation`,
   `batteryLevel`, `photoFront`…). Aucun contrat de types partagé entre client
   et serveur ; les types sont redéclarés en double dans `server.ts`.

2. **`App.tsx` : les deux listes `allowedPages` diffèrent.** Celle de l'état
   initial (ligne ~37) contient `"admin"`, celle du gestionnaire `hashchange`
   (ligne ~59) ne l'a pas. Conséquence : naviguer vers `#admin` par le bouton
   Précédent/Suivant du navigateur renvoie sur l'accueil.

3. **Statuts de réservation hétérogènes.** `Reservation.status` mélange l'anglais
   et le français : `pending_assignment`, `confirmed`, `completed`,
   `cancelled`, `assigned`, `en_route`, `arrived`, `in_progress` — et `"Payée"`.

4. **Double représentation des options de réservation.** `Reservation.options`
   est un JSON sérialisé *et* il existe une table `ReservationOption`.

5. **Aucune relation Prisma.** Le schéma n'utilise que des identifiants `String`
   sans `@relation` : pas d'intégrité référentielle, pas de jointures, tout est
   recomposé à la main dans `server.ts`.

6. **Toutes les dates sont des `String`**, jamais des `DateTime`. Tri et
   comparaisons se font sur du texte.

7. **Secrets JWT en dur en repli** (`server.ts`, constantes
   `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`). Si `JWT_SECRET` et
   `JWT_REFRESH_SECRET` sont absents de `.env`, des valeurs publiques sont
   utilisées. Inacceptable en production.

8. **Poids des images : 60 Mo sur 63.** `img/` (23 Mo) est la source recopiée
   vers `src/assets/images/` par `copy-assets.ts` au build, d'où des doublons
   versionnés. Des `.png` de 3 Mo sont servis tels quels. Conversion WebP et
   dédoublonnage à prévoir.

9. **`prisma/dev.db`** — base SQLite résiduelle alors que le schéma cible
   PostgreSQL. Ignorée par git, mais toujours présente sur disque.

## Conventions

- Fins de ligne **LF** partout (imposé par `.gitattributes`).
- Ne jamais commiter de `.env` — seul `.env.example` est versionné.
- Le push initial de gros volumes échouait en `HTTP 408` : envoyer les assets
  volumineux en plusieurs commits d'environ 5 Mo plutôt qu'en un seul.
