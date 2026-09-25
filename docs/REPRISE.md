# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-25**, au changement de cap vers le web (ADR-023).
> Le détail fait foi dans `ROADMAP.md` (cases à cocher) et `DECISIONS.md` (ADR).

## État au 2026-09-25 — M0, M1 (Expo) et M3 `Terminées` ; **M1-web `En cours`** ; M2 `En cours` (aucun code livré)

**Changement de cap (décision utilisateur du 2026-09-25, ADR-023/024/025)** : le MVP devient d'abord une **application web** — nouvelle app `apps/web` en React + Vite + TypeScript strict + Tailwind v4 + shadcn/ui + recharts, routeur TanStack Router, responsive mobile-first et **installable (PWA)**. iOS/Android viendront en **P6** en emballant ce même code avec **Capacitor**. Hébergement : **Cloudflare Pages** (compte à créer par l'utilisateur, nécessaire seulement à la tâche W-8).
- **`apps/app` (Expo) est gelé** : conservé, plus développé, exclu des commandes par défaut et de la CI (une fois W-1 fait). Même chose pour **`packages/ui`** (primitives React Native), dont seules les données de tokens (`tokens.data.cjs`) servent encore.
- Réutilisés tels quels : `packages/core`, `packages/schemas`, `packages/i18n`, `packages/db`, `packages/config`, `supabase/`.
- Raison : la chaîne mobile (Metro sous Windows, Expo Go, EAS, fluidité de react-native-web) freinait ; l'utilisateur veut voir l'app avancer à l'écran.

Le travail est sur la branche **`wip/m1-m3`** (PR #1 ouverte vers `main`, jamais poussée depuis M1 : la CI n'a jamais vu ce code). Pour reprendre : `git checkout wip/m1-m3`.

**Phase en cours : M1-web** (tâches W-0 à W-10, `ROADMAP.md`). W-0 (décisions et docs) est fait. Suite : W-1 (`release` : scripts racine, lint, secrets) → W-2 (`app-ui` : création d'`apps/web`, **fenêtre d'installation unique**) → W-3…W-7 (tokens, primitives shadcn, shell, Dashboard + Calendrier sur données factices, PWA) ; W-8 (CI + Cloudflare) en parallèle ; W-9 (Playwright) ; W-10 (revue).
**M2** (auth, onboarding, comptes) : les vagues 1 (`database`) et 2 (`core-engine`) peuvent avancer **en parallèle** de M1-web ; les vagues 3 à 5 (écrans) se font dans `apps/web` après M1-web. Les 5 décisions M2 du 2026-09-25 restent valables (ADR-018 option B, ADR-020 confirmation d'e-mail, ADR-022).

**M3 (moteur de calcul)** — `Terminée` le 2026-09-24 : `packages/core` et `packages/schemas`, couverture 98,24 %, chiffres golden au centime. Conventions dans `DATA_MODEL.md` § « Conventions de calcul (M3) » — toute évolution exige un ADR. Dette reportée en M4 (colonne `sequence`, scission lors d'une inversion, seed issu du fixture golden).

**M1 (Expo)** — `Terminée` le 2026-09-25, désormais gelée. Dettes réaffectées par ADR-023 : D1 (mesure native) → **P6** (Capacitor Android) ; D2 → sans objet ; D4 → couverte par le `Select` shadcn (W-4) ; D6 → sans objet ; D7 (CI jamais exécutée) → **W-8**.

Point de vigilance technique du schéma M2 : **`cash_movements.user_id` est dénormalisé** et la création du profil passe par un trigger `security definer` à `search_path` figé (`DATA_MODEL.md` § « Précisions M2 »).

## Lancer l'app

**Web (MVP)** — disponible une fois W-2 fait :
```bash
pnpm dev:web          # serveur Vite ; ouvrir l'URL affichée dans le navigateur
```
- Tester en largeur mobile : outils de développement du navigateur (mode appareil).
- Sur le téléphone : via l'URL de préproduction Cloudflare Pages (W-8), puis « Ajouter à l'écran d'accueil » pour installer la PWA (HTTPS obligatoire pour le service worker). Plus d'Expo Go, plus d'IP à recopier.
- Variables : `apps/web/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), à créer depuis `apps/web/.env.example` — **jamais la clé `service_role`**.

**Ancienne app Expo (gelée)** : `pnpm dev:app-legacy` (nom donné en W-1 ; avant W-1 : `pnpm dev:app`). Pièges connus conservés pour mémoire : Metro plafonné à 4 workers sous Windows (`EMFILE`) ; `packages/ui/node_modules/@repo/core` peut redevenir une copie physique → supprimer le dossier puis `pnpm install`.

## Où on en est

- **Périmètre** : MVP (phases M0 → M9, ARCHITECTURE §0), web d'abord. Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **M0** `Terminée` (2026-09-18) — dérive encore ouverte : script `db:reset:linked` (ROADMAP M2). La dérive `expo-updates` est sans objet (ADR-023).
- **M1** (Expo) et **M3** `Terminées` ; **M1-web** `En cours` ; **M2** `En cours`.
- **Décisions en vigueur** : ADR-023 (web d'abord, Expo gelé), ADR-024 (stack UI web), ADR-025 (Cloudflare Pages), ADR-011 (onglets + ajout rapide), ADR-017 révisée (mesure web qui fait foi et bloquante), ADR-018 (option B), ADR-019, ADR-020, ADR-022. ADR-001 et ADR-021 sont remplacées.
- **CI** : `gh` installé et authentifié (`gh run list`, `gh run view`). Dernier run : `35389707958` sur `main` (2026-09-18).

## Comptes et ressources

| Ressource | Valeur |
|---|---|
| Dépôt GitHub (privé) | `wasslasGOAT/tradingjournal` — `main` (état M0), travail sur `wip/m1-m3`, PR #1 ouverte vers `main` |
| Supabase (base de dev, UE) | projet `vgqgalksrbprdslhegde`, lié via `npx supabase link` |
| Hébergement web | Cloudflare Pages (ADR-025) — **compte à créer par l'utilisateur** (W-8) |
| Expo / EAS (gelé) | projet `@wassimaha/edgebook` (id `dd23ce8e-9296-4435-b7a9-d94b4ae3147b`) |
| Migrations appliquées | `20260917172440_app_meta`, `20260918090000_harden_rls_guard` |

## Reprendre sur ce PC

Les fichiers `.env` **ne sont pas dans git** (volontairement) : `apps/web/.env` (à créer en W-2), `apps/app/.env` (gelé), `supabase/tests/.env`. Sur un autre PC, les recréer depuis les `.env.example` (tableau de bord Supabase → Project Settings → API ; **jamais la clé `service_role`**), puis `pnpm install`, `npx supabase login` + `npx supabase link --project-ref vgqgalksrbprdslhegde`.

**Terminal Windows** : si PowerShell ne trouve pas `pnpm`, ajouter `C:\Users\wasst\AppData\Roaming\npm` (et `C:\Program Files\nodejs`) au `Path` de l'utilisateur, puis rouvrir le terminal.

## Commandes utiles

```bash
pnpm dev:web          # app web (Vite)
pnpm lint && pnpm typecheck && pnpm test
pnpm test:rls         # tests d'isolation RLS contre la base de dev
pnpm e2e:web          # Playwright (apps/web à partir de W-9)
pnpm db:push          # applique les nouvelles migrations sur la base de dev
pnpm db:types         # régénère packages/db depuis la base de dev
```

## Décisions en attente

Voir la section « Décisions mises de côté » de `ROADMAP.md`. Restent ouvertes : **n° 3** (écritures atomiques, M4), **n° 4** (règle `max_total_loss`, M8), **n° 7** (nom et logo, avant P6), **n° 8** (pondération du score, P2).

## Leçons d'orchestration

- Une seule installation de dépendances à la fois : quand plusieurs agents tournent en parallèle, un seul a le droit de lancer `pnpm add` (W-2 est la fenêtre d'installation de M1-web).
- Les agents ne sortent pas de leur zone (`.claude/agents/*.md`) : les fichiers sans propriétaire sont faits par la session principale.
- Toujours faire relire (`code-reviewer`) : la revue a déjà trouvé un vrai bug de jour de trading et une règle ESLint qui s'annulait sans erreur.
- Une migration appliquée sur la base de dev ne se modifie plus : créer une nouvelle migration.
- `apps/web` n'importe jamais depuis `apps/*` ni le barrel `@repo/ui` (React Native) : copier les données factices, utiliser `@repo/ui/tokens-data`.
