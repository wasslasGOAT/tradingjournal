# CLAUDE.md — règles de travail pour Claude Code

> Nom de travail de l'app : **Edgebook** (provisoire, remplaçable partout via `APP_NAME` dans `packages/config`).
> Ne jamais réutiliser le nom, le logo ou les textes de TradeX : l'app s'en inspire fonctionnellement, pas visuellement à l'identique.

## Ce qu'on construit
Un journal de trading multi-plateforme (web + iOS + Android) pour **tous les traders** —
**web d'abord** (app React + Vite installable en PWA, ADR-023), puis iOS et Android en emballant le même code avec Capacitor (P6) :
forex, futures, actions, options, crypto, CFD — comptes perso, démo, prop firm, backtest.
Fonctions cœur : import/synchro des trades, dashboard, calendrier P&L/psychologie, journal,
analytics, règles & checklists, coach IA avec score de performance.

## Où lire avant d'agir
0. `docs/REPRISE.md` — point de reprise : où on en est, ce qui reste, comment relancer l'environnement.
1. `docs/ARCHITECTURE.md` — la carte du système (lire en entier au premier démarrage).
2. `docs/DATA_MODEL.md` — schéma de données et conventions.
3. `docs/ROADMAP.md` — phases, tâches et critères de fin. **Travailler phase par phase.** On construit d'abord le **MVP** (M0–M9 + M1-web, périmètre : ARCHITECTURE §0).
4. `docs/DECISIONS.md` — décisions en vigueur (ADR). Une décision marquée `Acceptée` fait foi.

## Règles non négociables (invariants)
- TypeScript strict partout. Pas de `any` sans commentaire justificatif.
- **Toute logique métier (calculs P&L, stats, score) vit dans `packages/core`**, en fonctions pures, testées. Jamais dans un composant UI ni dans une route.
- **Argent = entiers en unités mineures ou `Decimal`** (lib `decimal.js`), jamais de `number` flottant pour stocker/agréger des montants.
- Dates stockées en UTC (`timestamptz`). Le « jour de trading » se calcule via `packages/core/time` avec le fuseau + l'heure de bascule du compte.
- Sécurité : RLS activée sur chaque table utilisateur. Aucun secret côté client. Identifiants broker chiffrés, jamais loggés.
- Le LLM ne calcule jamais de chiffres : il reçoit des métriques déjà calculées et les commente.
- i18n dès le départ (FR + EN). Aucun texte UI en dur hors fichiers de traduction.
- Chaque PR/commit laisse `pnpm lint && pnpm typecheck && pnpm test` au vert.

## Liberté de modification (important)
Tout ce qui n'est pas dans la liste ci-dessus est **modifiable**. Quand l'utilisateur change d'avis :
1. Mettre à jour (ou créer) l'ADR concerné dans `docs/DECISIONS.md` (statut `Remplacée par ADR-xxx`).
2. Mettre à jour la section concernée de `docs/ARCHITECTURE.md` / `docs/ROADMAP.md`.
3. Ensuite seulement, modifier le code.
Si une consigne de l'utilisateur contredit un document : **l'utilisateur a raison**, mets le document à jour.
En cas d'ambiguïté réelle ayant un impact durable (schéma, paiement, auth), **demander avant de coder**.

## Équipe d'agents (`.claude/agents/`)
La session principale **orchestre** et délègue ; les sous-agents ne se sollicitent pas entre eux.

| Agent | Zone | Quand l'appeler |
|---|---|---|
| `architect` | `docs/`, décisions | Début/fin de phase, toute décision structurante ou changement d'avis |
| `core-engine` | `packages/core`, `packages/schemas` | Tout calcul chiffré + tests golden |
| `database` | `supabase/`, `packages/db` (types générés), schéma Drizzle (post-MVP) | Tables, migrations, RLS, seed |
| `backend` | `apps/server` (routes, jobs, webhooks), `packages/api-client` | Logique serveur |
| `connectors` | `apps/server/src/connectors` | Imports CSV, synchro brokers |
| `app-ui` | `apps/web`, `packages/i18n` (`apps/app` et `packages/ui` **gelés**, ADR-023) | Écrans, design system, navigation |
| `ai-coach` | `apps/server/src/coach` | Conseils, chat, prompts, evals |
| `qa-tests` | E2E (`apps/web/e2e`), intégration | Après implémentation, avant clôture |
| `code-reviewer` | lecture seule | Après chaque tâche significative, avant commit |
| `security-auditor` | lecture seule | Phases données/auth/connecteurs/paiements/IA, avant release |
| `release` | Racine du monorepo, `packages/config`, `scripts/`, CI/CD, hébergement web (Cloudflare Pages), Capacitor/stores (P6) | Build, déploiement, soumission |

**Pendant le MVP** (phases M0–M9, ADR-015/016/023) : pas de serveur ; `backend`, `connectors` et `ai-coach` ne sont pas sollicités. L'application est `apps/web` ; `apps/app` (Expo) et `packages/ui` sont gelés (ni modifiés ni vérifiés, sauf le sous-chemin de tokens `@repo/ui/tokens-data`). L'ordre type devient `database` → `core-engine` → `app-ui` (dans `apps/web`) → `qa-tests` → `code-reviewer` (+ `security-auditor`).

Règles de délégation :
- Une tâche = un agent propriétaire. Si elle traverse plusieurs zones, la découper (ex. nouvelle métrique : `core-engine` → `database` si matérialisée → `backend` → `app-ui`).
- Ordre type d'une fonctionnalité : `database` → `core-engine` → `backend`/`connectors`/`ai-coach` → `app-ui` → `qa-tests` → `code-reviewer` (+ `security-auditor`).
- Toujours transmettre à l'agent : la tâche, les fichiers, le critère de vérification, les sections de docs à lire.
- Tâches triviales (typo, renommage local) : pas besoin de déléguer.

Commandes : `/phase <id>` (exécute une phase complète : `M0`…`M9` et `M1-web` pour le MVP, `P1`… après), `/review` (revue qualité + sécurité), `/decide <sujet>` (acter ou changer une décision).

## Conventions
- Monorepo pnpm + Turborepo. Code et identifiants en anglais, docs en français.
- Commits : Conventional Commits (`feat(calendar): …`).
- Composants : un dossier par feature (`features/calendar/…`), pas de dossiers « utils » fourre-tout.
- Pendant le MVP : pas de suffixes `.web.tsx` / `.native.tsx` (une seule cible, le navigateur). Ce qui deviendra natif avec Capacitor (haptique, stockage sécurisé, partage) passe par une interface commune avec une implémentation web.
- Couche données d'`apps/web` dans `apps/web/src/data/` : requêtes/mutations Supabase et clés TanStack Query **sans aucune dépendance au DOM** (extractible en `packages/data`, ADR-023). `apps/web` n'importe jamais depuis `apps/*` ni le barrel `@repo/ui`.
- Nouvelle dépendance : vérifier qu'elle fonctionne dans le navigateur **et** dans une WebView Capacitor (pas d'API Node, pas de cookie tiers), la noter dans l'ADR si structurante (stack UI : ADR-024).
- Utiliser les dernières versions stables au moment de l'installation ; ne pas figer de version dans les docs.

## Commandes
```bash
pnpm dev            # MVP : app web ; post-MVP : app web + server en parallèle
pnpm dev:web        # app web (Vite)
pnpm dev:app-legacy # ancienne app Expo, GELÉE (ADR-023)
pnpm dev:server     # post-MVP : API + worker
pnpm db:reset       # Supabase local : migrations + seed
pnpm db:types       # types TypeScript générés depuis le schéma Supabase
pnpm test           # Vitest (core ; server post-MVP)
pnpm e2e:web        # Playwright (apps/web)
# pnpm e2e:mobile   # Maestro — GELÉ avec apps/app ; tests natifs Capacitor en P6
```
(`dev:web`, `dev:app-legacy` et le nouveau `e2e:web` sont créés en M1-web, tâche W-1 ; `dev:server` en P1.)

## Fin de tâche
Résumer : ce qui a été fait, ce qui reste, décisions prises (et ADR créés), commandes pour vérifier.
