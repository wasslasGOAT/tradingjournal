# Roadmap de construction

> Mode d'emploi pour Claude Code : exécuter **une phase à la fois** (commande `/phase M0`, `/phase M1`…, qui orchestre les agents de `.claude/agents/`), dans l'ordre. En début de phase, relire les sections d'`ARCHITECTURE.md` citées.
> Cocher les cases au fur et à mesure (`- [x]`). Une phase n'est terminée que si tous ses **critères de fin** passent.
> L'utilisateur peut réordonner, fusionner ou supprimer des phases : mettre alors ce fichier à jour.

Statuts : `À faire` · `En cours` · `Terminée` · `Reportée`

---

## MVP (ADR-015, ADR-016, ADR-017, ADR-023)

Périmètre : ARCHITECTURE §0. L'app parle uniquement à Supabase ; tous les calculs passent par `packages/core`.
**Changement de cap du 2026-09-25 (ADR-023/024/025)** : le MVP est d'abord une **application web** (`apps/web` : React + Vite + shadcn/ui, PWA) ; iOS/Android via Capacitor en P6. `apps/app` (Expo) et `packages/ui` sont **gelés**. Les phases M0, M1 (Expo) et M3 restent acquises ; la phase **M1-web** refait le shell et les premiers écrans dans `apps/web` avant la suite de M2.
Agents du MVP : `architect`, `core-engine`, `database`, `app-ui`, `qa-tests`, `code-reviewer`, `security-auditor`, `release`.

**Critères transversaux, vérifiés à la clôture de chaque phase M1–M9** :
- Écrans livrés vérifiés sur **navigateur de bureau, navigateur mobile (iOS Safari, Android Chrome, largeur ≤ 430 px) et PWA installée**, en thème sombre et clair, en FR et EN (ADR-023).
- Exigences UX d'ADR-017 respectées sur les écrans livrés (squelettes, pas de spinner plein écran, mises à jour optimistes, listes virtualisées `@tanstack/react-virtual`, transitions CSS respectant `prefers-reduced-motion` — révision ADR-017 du 2026-09-25).
- `pnpm lint && pnpm typecheck && pnpm test` au vert.

Parallélisation possible : M3 (core) peut démarrer en même temps que M1 et M2, après M0 (fait : M3 terminée pendant M1). La vague 1 de M2 (`database`) et la vague 2 (`core-engine`) peuvent avancer en parallèle de M1-web.

---

## Phase M0 — Fondations sans serveur · `Terminée` (2026-09-18)
Réf. : §0, §3, §4, §11 · Release : `docs/RELEASE.md`
Agents : `release`, `database`, `app-ui`, `core-engine` — lancer avec `/phase M0`

- [x] `git init`, dépôt GitHub privé `wasslasGOAT/tradingjournal` — commits `4827604` et `e3ade54` poussés sur `main` (2026-09-18)
- [x] Monorepo pnpm + Turborepo, `packages/config` (tsconfig strict, eslint, prettier, `APP_NAME`)
- [x] `apps/app` : Expo + Expo Router + NativeWind, cible web activée, écran « Hello » — vérifié sur web (Playwright) ; iOS vérifié par l'utilisateur (Expo Go), Android : build de dev EAS
- [x] Squelettes de `packages/core`, `packages/schemas`, `packages/ui`, `packages/i18n` (structure MVP : ARCHITECTURE §0.2)
- [x] Supabase (ADR-020) : `supabase init` + lien au projet cloud de dev (UE), migration `app_meta` appliquée (`db:push`), `db:types` (cloud) / `db:types:local` (Docker) → `packages/db` ; `db:reset` = local (CI) — **pas de script `--linked` dédié** (voir Dérives)
- [x] Client Supabase dans `apps/app/lib` (session persistée : SecureStore + AES-256-GCM natif, stockage web), TanStack Query + persistance (AsyncStorage derrière une interface, ARCHITECTURE §10)
- [x] Vitest configuré (94 tests) ; tests RLS (deux sessions, 12 tests verts contre le cloud de dev, après la migration `20260918090000_harden_rls_guard`) ; GitHub Actions : lint + typecheck + test + build web + scan de secrets, Supabase local pour `db reset`, contrôle des types et tests RLS — verte sur GitHub (run `35389269536`, commit `b0a87cd`), types comparés après normalisation (`scripts/normalize-db-types.mjs`)
- [x] `.env.example` de l'app (URL + clé anon uniquement), documenté
- [x] Compte Expo, EAS configuré (projet `@wassimaha/edgebook`, profils development / preview / production) — `expo-dev-client` installé ; build de dev Android terminé (build `8dab747f-a8e8-4994-aced-79fdc8cdbc31`, APK disponible) ; iOS via Expo Go vérifié

Critères de fin :
- [x] `pnpm dev` lance l'app ; `pnpm lint && pnpm typecheck && pnpm test`, `pnpm build`, `pnpm check:secrets` (source, historique, bundle) au vert
- [x] Web : l'app lit `app_meta` (`schema_version = 1`) depuis la base de dev cloud (Playwright)
- [x] iOS (Expo Go) lit `app_meta` — iPhone vérifié par l'utilisateur (« Schema version: 1 »)
- [ ] Android (build de dev) lit `app_meta`, et bascule FR/EN vérifiée sur téléphone — APK construit, **à vérifier sur l'appareil en début de M1** (reliquat accepté à la clôture)
- [x] La CI utilise Supabase local (workflow écrit)
- [x] La CI passe sur GitHub (run `35389269536` : jobs qualité et Supabase verts, tests RLS inclus)
- [x] Aucun secret autre que la clé anon dans l'app

**Bilan (2026-09-18)** : fondations en place (monorepo, app Expo web/iOS/Android, Supabase dev + RLS testée, CI verte, EAS). Les trois premiers runs CI échouaient sur la comparaison des types (bloc `__InternalSupabase` présent seulement côté cloud), corrigé par normalisation. Reliquat accepté : vérification Android sur l'appareil et bascule FR/EN sur téléphone, à faire en début de M1. Non bloquant : Maestro non exécuté sur ce poste. Retour utilisateur : textes gris secondaires peu lisibles sur téléphone → tâche M1.

**Dérives relevées à la clôture** (encore ouvertes, à trancher) :
- ADR-020 prévoit un script explicite et confirmé pour `db reset --linked` : absent (seul `db:reset` local existe). Aligner (script `db:reset:linked` avec confirmation, `release`) ou acter.
- ~~ARCHITECTURE §11 cite Playwright dans la CI~~ : **résolue en M1** (job `e2e-web` dans `ci.yml`, 2026-09-25) — reste à confirmer par un run GitHub (branche non poussée).
- ~~`docs/RELEASE.md` et `projectId` EAS~~ : aligné le 2026-09-18.
- ~~EAS signale que `runtimeVersion: appVersion` + `updates.url` supposent `expo-updates`, non installé~~ : **sans objet** depuis ADR-023 (`apps/app` et EAS gelés).

---

## Phase M1 — Design system, shell et animations (Expo) · `Terminée` (2026-09-25)
> Livrée dans `apps/app`, **gelé depuis ADR-023** ; refaite pour le web en phase M1-web. Les acquis réutilisés sont les tokens (`tokens.data.cjs`), les fonctions pures et les contrats (`Chart`, préférences).
Réf. : §6, ADR-012, ADR-017, ADR-011, ADR-021
Agents : `app-ui`, `release` (CI), `code-reviewer` — lancer avec `/phase M1`

- [x] Tokens v2 (thèmes sombre/clair par variables CSS, **basculables sans rechargement**, accent bleu décalé de `#5D99F9` — ADR-012, couleurs P&L bleu/gris et vert/rouge par thème, typo, rayons, espacements, durées et courbes d'animation) branchés sur NativeWind ; police Inter 400/500/600, chiffres tabulaires pour les montants (ADR-021)
- [x] `packages/ui/src` inclus dans le `content` de Tailwind (classes des primitives générées)
- [x] Primitives (~20) : `Screen`, `Card`, `GlowCard`, `StatTile`, `Button`, `IconButton`, `Skeleton`, `ShimmerBar`, `ProgressBar`, `DayCell`, `EmptyState`, `Segmented`, `Select`, `DateRangePicker`, `Sheet`, `Toast`, `VirtualizedList` (FlashList), `Chart` (ligne/aire, barres, histogramme, heatmap)
- [x] Animations reanimated (entrées de cartes, press states, `Sheet`, `Segmented`), respect de « réduire les animations »
- [x] Interface `Haptics` (`.native` expo-haptics / `.web` vide) utilisée par les primitives interactives
- [x] **M1-5** Wrapper de liste virtualisée (FlashList) avec états vide / chargement / fin de liste (+ `TradeListRow`)
- [x] **M1-6** Interface `Chart` + adaptateurs `.web` (recharts) / `.native` (victory-native, Skia) : ligne/aire, barres, histogramme ; heatmap sans bibliothèque (ADR-021) ; axe vertical cadré sur les données (`padDomain`)
- [x] **M1-7** i18n FR/EN ; montants/dates/nombres affichés en consommant `packages/core/format` (livré par M3)
- [x] **M1-8** Layout connecté (ADR-011) : shell à onglets Dashboard · Calendrier · Trades · Journal · Plus + bouton d'ajout rapide global, sidebar web ≥ 1024 px, header (compte, période, masquage des montants), transitions entre onglets ; **tab bar flottante et translucide** (`expo-blur`), contenu qui défile réellement sous la barre
- [x] **M1-9** Bascule de thème et de couleurs P&L sans rechargement + masquage des montants, **persistés** entre deux lancements (avec la langue) ; écran Réglages ; **catalogue exclu des builds de production**
- [x] Page « catalogue » interne (dev only, `apps/app/app/(dev)/catalog.tsx`) : primitives, graphiques et listes avec leurs états
- [x] Contraste AA des textes secondaires (`textMuted` / `textSecondary`, petites tailles), §6.2 — **testé**
- [x] **Correctif** (2026-09-24) : calendrier élargi en pleine largeur, montants compacts non tronqués dans `DayCell`
- [x] **Q1** Tests des primitives et du shell (rendu, états, « réduire les animations ») — 647 tests sur le dépôt
- [x] Job Playwright dans la CI (`ci.yml`, job `e2e-web` dédié, propriétaire `release`) — résout la dérive M0 *(jamais exécuté sur GitHub : la branche `wip/m1-m3` n'est pas poussée, voir bilan)*
- [x] Builds EAS Android **development** (`deaad95b-…`) et **preview** release (`84443209-…`) — APK disponibles
- [x] Revue `code-reviewer` : 2 bloquants et 8 points importants corrigés (voir bilan)

**Critères de fin** : le catalogue s'affiche sur iOS, Android et web, en sombre et en clair ; changement de thème instantané ; avec « réduire les animations » activé, aucune animation de déplacement ne joue ; fluidité :
- [x] **Web** : test Playwright automatique (CPU ralenti ×4) sur un **export de production**, projet `chromium-perf-prod` — 10 ouvertures/fermetures de `Sheet` et 10 bascules de `Segmented`. Seuils ADR-017 (moyenne ≥ 55 fps, aucune image > 50 ms) **conservés mais informatifs sur le web** : Reanimated anime sur le thread JS en web (pas de thread UI dédié), le ralentissement ×4 y est disproportionné (ADR-017, précision du 2026-09-25). Seule assertion bloquante : l'interaction produit bien des images. Mesuré : `Segmented` 40–48 fps, `Sheet` 51–56 fps, images 83–567 ms.
- [ ] **Android** : barres HWUI sur l'APK preview — **non réalisée, reportée** (décision utilisateur du 2026-09-25). Mesure qui **fait foi** pour ADR-017 : à exécuter avant toute publication, **M9 au plus tard**.
- mesure Flashlight reportée à M9.

**Bilan (2026-09-25)** : design system, shell et écrans de démonstration livrés sur les 3 plateformes. Vérifié : `pnpm lint`, `pnpm typecheck`, `pnpm test` (**647 tests**), `pnpm format:check`, `pnpm check:secrets` verts ; `pnpm e2e:web` **16 passés, 3 ignorés** (cas Supabase non configuré), 0 échec, sur deux projets Playwright (`chromium` sur serveur de dev, `chromium-perf-prod` sur export de production). Revue `code-reviewer` : **2 bloquants corrigés** — agrégat P&L sorti de l'UI vers `packages/core` (`sumAmountStrings`, testée ; invariant CLAUDE.md « toute logique métier dans `packages/core` ») et risque d'écran blanc au démarrage si la lecture des préférences échoue — et **8 points importants** (axes des graphiques natifs, `react-hooks` activé sur `packages/ui`, piège à focus de la `Sheet`…), mineurs traités. Retours utilisateur traités : calendrier élargi, montants compacts, tab bar flottante translucide, axe vertical des graphiques cadré, défilement sous la barre. Piège Windows réglé : Metro plafonné à 4 workers (EMFILE renvoyait un bundle tronqué sans message d'erreur). Catalogue activé par le mode développement (`apps/app/lib/flags.ts` + `metro.config.js`, surchargeable par `EXPO_PUBLIC_ENABLE_CATALOG`) ; **aucun fichier `.env` versionné** (le hook anti-secrets a bloqué une tentative, la règle reste sans exception). **Point ouvert** : la CI GitHub n'a jamais tourné sur ce code (branche `wip/m1-m3` non poussée) — à vérifier à la fusion dans `main`.

**Dette et mesures reportées (M1)** — assumée à la clôture, à traiter aux échéances indiquées :
| # | Élément | Échéance | Propriétaire |
|---|---|---|---|
| D1 | **Mesure de fluidité native** : transférée par ADR-023 — la mesure **web** fait foi en M1-web (W-9) ; mesure native sur **Capacitor Android** | **P6** | `qa-tests` |
| D2 | ~~Reliquat M0 : téléphone Android (Expo), `app_meta` et bascule FR/EN~~ — **sans objet** (ADR-023) ; remplacé par la vérification sur navigateur mobile / PWA (W-8, M2-19) | — | — |
| D3 | Cibles tactiles de la heatmap sous 44 px (à respecter dans `apps/web`) | M7 (écran Analytics) | `app-ui` |
| D4 | Navigation clavier du `Select` web — couverte par le `Select` shadcn/Radix | M1-web (W-4), vérifiée en M2-18 | `app-ui` |
| D5 | Libellés d'accessibilité du `DateRangePicker` | M5 | `app-ui` |
| D6 | ~~Graphiques natifs multi-séries sans infobulle~~ — **sans objet** (`apps/app` gelé) ; infobulles multi-séries exigées dans `Chart` web | M7 | `app-ui` |
| D7 | CI jamais exécutée sur le code M1/M3 (branche non poussée) | M1-web (W-8) | `release` |

---

## Phase M1-web — Application web : shell, Dashboard, Calendrier · `En cours` (démarrée le 2026-09-25)
Réf. : ADR-023, ADR-024, ADR-025, ADR-011, ADR-012, ADR-017 ; ARCHITECTURE §0, §3, §4, §6
Agents : `architect`, `release`, `app-ui`, `core-engine`, `qa-tests`, `code-reviewer` — lancer avec `/phase M1-web`
Dépend de : M0, M1 (tokens), M3

| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| W-0 | ADR-023/024/025 `Acceptée` ; docs, `CLAUDE.md`, fiches agents et `/phase` alignés | `architect` | validation utilisateur | Plus aucune référence à Expo comme cible du MVP dans `docs/` |
| W-1 | Racine : scripts `dev` (= web), `dev:web`, `dev:app-legacy`, `e2e:web` → `@repo/web`, filtres `--filter=!@repo/app` sur `lint`/`typecheck`/`build`, `vitest.config.ts` (exclure `apps/app`, inclure `apps/web`), préréglage ESLint navigateur + `restrictImports` (interdit `react-native*`, `expo*`, barrel `@repo/ui`, `apps/*`), `check-secrets` (`VITE_*`, `apps/web/.env`, `apps/web/dist`) | `release` | W-0 | `pnpm lint && pnpm typecheck && pnpm test` verts **sans** `apps/app` |
| W-2 | **Fenêtre d'installation unique** : création d'`apps/web` (Vite, React 19.2.x aligné sur `apps/app`, TS strict, Tailwind v4, shadcn init, TanStack Router + Query, react-i18next, recharts, `@tanstack/react-virtual`, `@fontsource-variable/inter`, `tw-animate-css`, `vite-plugin-pwa`, supabase-js, react-hook-form, `@hookform/resolvers`, zustand — absorbe M2-6) ; `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | `app-ui` | W-1 | `pnpm dev:web` affiche une page ; `pnpm build` vert ; cohabitation Tailwind 3/4 vérifiée |
| W-3 | Tokens : sous-chemin `@repo/ui/tokens-data`, `@theme` Tailwind généré, thèmes sombre/clair sans rechargement, couleurs P&L, test de contraste AA repris | `app-ui` | W-2 | Bascule de thème instantanée ; test de contraste vert |
| W-4 | Primitives shadcn thémées (Card, StatTile, Button, IconButton, Segmented, Select, Sheet, Skeleton, Toast, EmptyState, DayCell, DateRangePicker) + `Chart` (ligne/aire, barres, histogramme, heatmap CSS) ; route `/dev/catalog` | `app-ui` | W-3 | Catalogue visible en dev, absent du build de production ; `Select` pilotable au clavier (D4) |
| W-5 | Shell (ADR-011) : onglets bas < 1024 px (flottants, `backdrop-blur`), sidebar ≥ 1024 px, header (compte, période, masquage), ajout rapide global, i18n FR/EN, préférences persistées (thème, P&L, masquage, langue) | `app-ui` | W-4 | Navigation clavier ; rechargement sur route profonde OK ; FR/EN, sombre/clair |
| W-6 | Dashboard et Calendrier sur les **données factices actuelles** (copiées depuis `apps/app/features/*/sampleData.ts` et `sampleAccounts` — jamais importées depuis `apps/*`) ; agrégats via `packages/core` ; couche `src/data` sans DOM | `app-ui` | W-5 | Chiffres identiques à l'app Expo sur les mêmes données |
| W-6b | Examen de `buildCalendarGrid` / `calendarLayout` (`apps/app`) : logique de dates → `packages/core` (testée), sinon copie dans `apps/web` | `core-engine` | — (parallèle à W-4) | Tests portés verts |
| W-7 | PWA : manifeste, icônes, service worker précachant **uniquement** le shell | `app-ui` | W-5 | Lighthouse « installable » ; aucune réponse Supabase en cache |
| W-8 | CI (`quality` + `e2e-web` sur `apps/web`), branche poussée (solde D7) ; préproduction Cloudflare Pages à URL fixe + `_headers` (CSP de base) — **compte à créer par l'utilisateur** | `release` | W-2 (parallèle à W-3…W-7) | CI verte sur GitHub ; l'utilisateur ouvre l'URL sur son téléphone et installe la PWA |
| W-9 | Playwright sur `apps/web` : navigation, préférences, calendrier, graphiques ; fluidité **bloquante** sur `vite preview` (CPU ×4, ≥ 55 fps, aucune image > 50 ms) | `qa-tests` | W-6 | `pnpm e2e:web` vert |
| W-10 | Revue | `code-reviewer` | W-9 | Aucun point bloquant |

**Parallélisation** : W-8 en parallèle de W-3…W-7 ; W-6b en parallèle de W-4 ; W-9 démarre dès W-5 (tests de navigation). Vagues 1–2 de M2 possibles en parallèle.

- [x] **W-0** Décisions et docs (2026-09-25)
- [ ] **W-1** Racine, scripts, lint, secrets
- [ ] **W-2** Création d'`apps/web` (installation unique)
- [ ] **W-3** Tokens et thèmes
- [ ] **W-4** Primitives + `Chart` + catalogue
- [ ] **W-5** Shell (onglets, sidebar, header, préférences)
- [ ] **W-6** Dashboard + Calendrier (données factices) · **W-6b** grille du calendrier
- [ ] **W-7** PWA
- [ ] **W-8** CI + préproduction Cloudflare Pages
- [ ] **W-9** Playwright (parcours + fluidité)
- [ ] **W-10** Revue `code-reviewer`

**Critères de fin** :
- [ ] `pnpm dev:web` ouvre le shell ; Dashboard et Calendrier affichent les données factices avec les mêmes chiffres que l'app Expo.
- [ ] Thème sombre/clair et FR/EN basculables sans rechargement, persistés ; « réduire les animations » respecté.
- [ ] PWA installable ; service worker sans données Supabase en cache.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e:web` verts, `apps/app` exclu ; CI verte sur GitHub.
- [ ] Fluidité web ADR-017 (révision 2026-09-25) atteinte sur l'export de production.
- [ ] Vérification par l'utilisateur sur téléphone (navigateur ou PWA) — via la préproduction si le compte Cloudflare existe, sinon reportée à W-8.
- [ ] Aucun point bloquant de `code-reviewer`.

---

## Phase M2 — Auth, onboarding et comptes · `En cours` (démarrée le 2026-09-25)
Réf. : §5.1, §5.11, ADR-018, ADR-019, ADR-020, ADR-022 · Données : DATA_MODEL § Utilisateur, § Comptes
Agents : `database`, `core-engine`, `app-ui`, `qa-tests`, `security-auditor`, `release`, `code-reviewer` — lancer avec `/phase M2`
Dépend de : M0, M1, M3 ; **vagues 3 à 5 : M1-web** (implémentées dans `apps/web`, ADR-023). Vagues 1 et 2 : indépendantes de l'UI.

**Décisions actées le 2026-09-25** (ne pas rouvrir sans nouvel ADR) :
- Suppression de compte : **option B** — lien « demander la suppression » dans Réglages + traitement manuel ; `profiles.deleted_at` créée dès M2-1 ; bascule vers l'Edge Function avant toute ouverture publique (ADR-018, M9).
- Confirmation d'e-mail : **désactivée sur le projet de dev**, activée sur le projet de production (à créer) — ADR-020, bloquant M9.
- Connexion : **e-mail + mot de passe + magic link uniquement**, ni Google ni Apple (ADR-022 ; rouvert en P6).
- Onboarding : premier jour de semaine et devise d'affichage **déduits de la locale**, pré-remplis et modifiables (ADR-022).
- Données factices : seuls les **comptes** factices disparaissent en M2 (`sampleAccounts`) ; les **trades** factices du dashboard et du calendrier restent jusqu'à M4/M5 (seed issu du fixture golden).
- Plateforme : écrans dans **`apps/web`** (ADR-023) ; garde de navigation via `beforeLoad` de TanStack Router (ADR-024).

### Vague 1 — base de données (`database`, séquentiel ; rien d'autre en parallèle sur `supabase/`)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-1 | Migration des 4 tables `profiles`, `preferences`, `accounts`, `cash_movements` : `profiles.deleted_at`, `profiles.display_currency`, `preferences.week_starts_on`, **`cash_movements.user_id` dénormalisé** (DATA_MODEL § Comptes), `revoke all` + `grant` explicites, index (`accounts.user_id`, `cash_movements(account_id, occurred_at)`), trigger `set_updated_at` | `database` | — | `pnpm db:push` puis `pnpm db:types` sans diff inattendu ; `rls_disabled_tables()` vide |
| M2-2 | RLS des 4 tables : `using`/`with check` sur `user_id = auth.uid()`, **aucune policy croisée via `accounts`** (c'est la raison de la dénormalisation de M2-1) ; `deleted_at` non nul bloque l'accès applicatif | `database` | M2-1 | Tests RLS A/B verts |
| M2-3 | Trigger de création de profil et de préférences à l'inscription (`handle_new_user` sur `auth.users`, `security definer`, **`search_path` figé**, non exécutable par `anon`/`authenticated`) | `database` | M2-1 | Une inscription crée exactement 1 `profiles` + 1 `preferences` ; fonction absente de l'API PostgREST |
| M2-4 | Tests RLS A/B des 4 tables (lecture, écriture, mise à jour croisée, `cash_movements` d'autrui) ; `--passWithNoTests` interdit sur `test:rls` | `database` | M2-2, M2-3 | `pnpm test:rls` vert et **en échec** si aucun test n'est collecté |
| M2-5 | Réglages d'auth du projet cloud (tableau de bord, **jamais `supabase config push`**) : mot de passe ≥ 8 caractères avec exigences, redirections en **liste exacte** (magic link, réinitialisation ; `localhost` Vite + URL fixe de préproduction, ADR-020/025), confirmation d'e-mail **désactivée sur dev** (ADR-020) ; `supabase/config.toml` local : `localhost:8081` → port Vite (`database`) | `release` | — | Réglages consignés dans `docs/RELEASE.md` ; aucun joker `/**` sur un domaine public |

### Fenêtre d'installation unique (une seule à la fois ; personne d'autre ne lance `pnpm add`)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-6 | ~~Installer `react-hook-form`, `@hookform/resolvers`, `zustand`~~ — **absorbée par W-2** (M1-web, ADR-023) | — | — | Voir W-2 |

### Vague 2 — calculs purs (`core-engine`, en parallèle de la vague 1 et de M1-web)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-7 | `packages/core` : dérivation **locale → premier jour de semaine + devise d'affichage** (FR → lundi/EUR, EN → dimanche/USD), fonction pure testée (ADR-022) | `core-engine` | — | Tests FR, EN et locale inconnue (repli documenté) |
| M2-8 | `packages/schemas` : schémas zod `profile`, `preferences`, `onboarding` ; complément de `account` et `cashMovement` (livrés en M3) ; messages = clés i18n (`VALIDATION_KEYS`) | `core-engine` | — | `pnpm --filter @repo/schemas test` vert ; aucun texte en dur |

### Vague 3 — auth et session (`app-ui`, dans `apps/web`, après M2-1 à M2-5 et M1-web)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-9 | Client auth (`apps/web/src/lib/supabase`) : `flowType: 'pkce'`, `detectSessionInUrl` activé **uniquement** avec PKCE ; **liste blanche des routes de retour**, jamais de redirection dérivée d'un paramètre entrant (le scheme `edgebook://` reviendra avec Capacitor en P6) | `app-ui` | M2-5 | Une URL du type `/auth/callback?redirect=https://evil` ne quitte jamais l'app ni la liste blanche |
| M2-10 | Écrans login / signup / mot de passe oublié / magic link (**ni Google ni Apple**, ADR-022) : états d'erreur traduits FR/EN, squelettes, haptique | `app-ui` | M2-9 | Parcours complet sur navigateur de bureau et mobile (PWA), en sombre et en clair |
| M2-11 | Sécurité de session : sur `SIGNED_OUT`, `queryClient.clear()` + suppression du cache persisté ; **clé de persistance propre à chaque utilisateur** | `app-ui` | M2-9 | E2E : déconnexion de A puis connexion de B sur le même appareil → aucune donnée de A restaurée |
| M2-12 | Garde de navigation : pas de session → écrans d'auth ; `onboarding_completed_at` nul → onboarding ; `profiles.deleted_at` non nul → écran « suppression demandée » | `app-ui` | M2-10 | Un rechargement web sur une route profonde conserve la bonne destination |

### Vague 4 — onboarding, comptes et préférences (`app-ui`, séquentiel après la vague 3)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-13 | Onboarding animé : prénom, marchés, style, fuseau, **premier jour de semaine et devise d'affichage pré-remplis depuis la locale et modifiables** (M2-7), premier compte manuel ; écrit `profiles`, `preferences` et `accounts` | `app-ui` | M2-7, M2-12 | Un nouvel utilisateur termine l'onboarding sur téléphone (PWA) et retrouve tout sur le navigateur de bureau |
| M2-14 | Gestion des comptes : créer / éditer / archiver ; `kind` (`personal`, `demo`, `backtest`, `prop_challenge`, `prop_funded`, `paper`), devise, solde initial, fuseau, heure de bascule, méthode de regroupement ; **mises à jour optimistes** | `app-ui` | M2-13 | Création visible immédiatement puis confirmée ; retour arrière propre en cas d'erreur |
| M2-15 | Dépôts et retraits (`cash_movements`) : saisie, liste, suppression ; signes selon DATA_MODEL § Conventions de calcul, point 7 | `app-ui` | M2-14 | Le solde suit `solde initial + Σ P&L net + mouvements` calculé par `packages/core` |
| M2-16 | Sélecteur de compte global branché sur les **vraies** données (**`sampleAccounts` supprimé**), « Tous les comptes » groupé par devise (ADR-019), persisté (Zustand + URL web). Les **trades** factices du dashboard et du calendrier **restent** jusqu'à M4/M5 | `app-ui` | M2-14 | `sampleAccounts` absent du dépôt ; le compte choisi survit à un rechargement |
| M2-17 | Préférences en base (langue, thème, couleurs P&L, premier jour de semaine, masquage des montants) : lecture au démarrage, écriture optimiste, repli local si la requête échoue (garde-fou M1 conservé) | `app-ui` | M2-13 | Un changement de préférence sur téléphone se retrouve sur le bureau après reconnexion |
| M2-18 | Réglages : déconnexion, **lien « demander la suppression de mon compte »** (ADR-018, option B) ; splash « Bon retour, {prénom} » < 1 s avec préchargement des requêtes du dashboard ; **dette M1 D4** : vérifier la navigation clavier du `Select` (shadcn/Radix, W-4) | `app-ui` | M2-17 | Splash mesuré < 1 s ; `Select` pilotable au clavier (Tab, flèches, Entrée, Échap) |

### Vague 5 — vérification (après la vague 4)
| # | Tâche | Agent | Dépend de | Vérification |
|---|---|---|---|---|
| M2-19 | E2E web (inscription → onboarding → 2e compte → déconnexion / reconnexion ; projet Playwright en émulation mobile), vérification par l'utilisateur sur téléphone (PWA : données réelles + bascule FR/EN), revue `code-reviewer` puis `security-auditor` (auth, RLS, deep links, cache de session) | `qa-tests`, puis `code-reviewer` et `security-auditor` | M2-18 | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rls && pnpm e2e:web` verts ; aucun point bloquant |

**Parallélisation** : vague 1 (`database`) et vague 2 (`core-engine`) en parallèle une fois M2-6 passée ; dans la vague 3, M2-10 et M2-11 peuvent avancer ensemble après M2-9. Les vagues 4 et 5 sont séquentielles.

**Critères de fin** :
- [ ] Un nouvel utilisateur s'inscrit sur téléphone (navigateur ou PWA), termine l'onboarding, crée un deuxième compte et retrouve tout sur le navigateur de bureau.
- [ ] Tests RLS des 4 tables verts ; `test:rls` **échoue** s'il ne collecte aucun test ; `rls_disabled_tables()` vide.
- [ ] Créations et éditions de compte **optimistes** ; squelettes, aucun spinner plein écran (ADR-017).
- [ ] Après déconnexion de A puis connexion de B sur le même appareil, **aucune donnée de A** n'est restaurée depuis le cache.
- [ ] `sampleAccounts` supprimé ; le sélecteur de compte lit la base (les trades factices restent jusqu'à M4/M5).
- [ ] Critères transversaux M1–M9 (bureau + mobile + PWA, sombre et clair, FR et EN, `lint` / `typecheck` / `test` verts).
- [ ] Aucun point bloquant de `code-reviewer` ni de `security-auditor`.

**Dérives ouvertes suivies en M2** (héritées de M0 — aligner ou acter) :
| Dérive | Écart | Propriétaire | Échéance |
|---|---|---|---|
| Script `db:reset:linked` | ADR-020 prévoit un script explicite et confirmé pour `supabase db reset --linked` (destructif) ; seul `db:reset` (local) existe | `release` | M2 (le schéma va changer plusieurs fois) |
| ~~`expo-updates` absent~~ | **Sans objet** depuis ADR-023 (EAS gelé avec `apps/app`) | — | — |

---

## Phase M3 — Moteur de trading (core) · `Terminée` (2026-09-24)
Réf. : §5.2, §5.4, DATA_MODEL · Conventions : DATA_MODEL § « Conventions de calcul (M3) »
Agents : `core-engine`, `code-reviewer` — lancer avec `/phase M3` (parallélisable avec M1/M2)

- [x] Types `Money`, `Decimal`, `TradingDay` ; calcul du jour de trading (fuseau + bascule)
- [x] Regroupement exécutions → trades (FIFO, moyenne), positions partielles, long/short, inversion de position
- [x] P&L brut/net, multiplicateur de contrat, R multiple ; solde = solde initial + Σ P&L net + mouvements de trésorerie
- [x] Stats : win rate, profit factor, espérance, gain/perte moyens, ratio moyen, drawdown (montant, %), séries
- [x] Agrégats : par jour de trading (cellules du calendrier, totaux hebdo, stats du mois), série d'equity (`tradingEquity` + `balance`), par dimension (symbole, setup, tag, session, heure, jour de semaine), distribution des R
- [x] Agrégation multi-comptes selon ADR-019 (total par devise, API prête pour une conversion ultérieure)
- [x] Formatage localisé monnaie/date/nombre (`packages/core/format`), FR/EN — consommé par M1
- [x] Schémas zod des formulaires dans `packages/schemas` : trade, exécution, compte, mouvement de trésorerie (journal → M6 ; règle, checklist → M8) ; messages = clés i18n (`VALIDATION_KEYS`)
- [x] Conventions statistiques documentées (code + DATA_MODEL § « Conventions de calcul (M3) », points 1 à 8) : trade à 0 neutre, drawdown depuis un pic **incluant le solde initial** et mesuré sur l'equity de trading ; tout changement ultérieur passe par un ADR
- [x] **Jeu golden synthétique** (validé le 2026-09-18) : 25 trades (24 en mars 2026 + 1 le 1er avril) respectant exactement les chiffres de référence ; compte `Europe/Paris`, bascule 00:00 ; fixture JSON dans `packages/core/test/golden/`, **réutilisé tel quel par le seed en M4**
- [x] Second fixture « cas limites » : sorties partielles, inversion de position, trade ouvert, break-even, dépôt/retrait, bascule 17:00, exécutions simultanées
- [x] **Tests golden** sur ces jeux ; couverture ≥ 90 % sur `packages/core`

**Critères de fin** : `pnpm --filter @repo/core test` et `pnpm --filter @repo/core test:coverage` (≥ 90 %) sont verts ; au centime près : solde initial 200 000, P&L −19 743,43 → rendement −9,87 %, win rate 16 %, ratio moyen 2,92, profit factor 0,56 ; mars 2026 = 24 trades, −17 527,71, 3 jours gagnants / 7 perdants ; 1er avril = −2 215,72 ; pire jour = 30 mars 2026.
- [x] Vérifié le 2026-09-24 : `@repo/core` 278 tests verts (521 sur tout le dépôt), couverture **98,24 %** (seuil 90 % bloquant) ; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` et `pnpm test:rls` (12) verts.
- [x] Chiffres golden retrouvés : 200 000 → −19 743,43 → **180 256,57** (−9,87 %) ; mars 24 trades −17 527,71, 3 jours gagnants / 7 perdants ; 1er avril −2 215,72 ; win rate 16 %, PF 0,56, ratio moyen 2,92 ; pire jour 30/03/2026 ; marge restante « perte max 10 % » 256,57 (critère M8 déjà couvert).

**Bilan (2026-09-24)** : `packages/core` (money, time, trading, stats, aggregates, format) et `packages/schemas` livrés en fonctions pures testées. Deux boucles `code-reviewer` puis une passe finale : tous les points bloquants et importants corrigés, revérifiés par sondes indépendantes (break-even exact en FIFO **et** en moyenne, inversion refusée par le formulaire y compris sur la dernière exécution, vente antérieure à l'achat refusée, part de poids nul sans reste, jours actifs ne comptant que les jours avec trade). Conventions de calcul consignées dans DATA_MODEL ; ADR-005 (écriture en base) et ADR-019 (P&L dans la devise du compte) complétés. Aucun ADR nouveau : ces conventions relèvent du modèle de données, mais **toute évolution ultérieure exige un ADR**.

**Dette reportée en M4** : colonne `sequence` sur `executions`, scission d'exécution lors d'une inversion, seed issu du fixture golden (voir M4).

---

## Phase M4 — Saisie manuelle et trade log · `À faire`
Réf. : §5.2, §0.3, ADR-004, ADR-016
Agents : `database`, `core-engine`, `app-ui`, `qa-tests`, `security-auditor` — lancer avec `/phase M4`
Dépend de : M1, M2, M3

- [ ] Tables `instruments` (catalogue de base en lecture publique + instruments créés par l'utilisateur), `executions`, `trades`, `tags`, `trade_tags`, `trade_notes`, `attachments` + bucket Storage + RLS (tables et Storage)
- [ ] Fonction Postgres transactionnelle d'écriture d'un trade (valeurs calculées par `packages/core`, aucun calcul SQL) — ADR-016
- [ ] **Dette M3 — ADR à créer** : colonne d'**ordre de saisie** (`sequence`) sur `executions` (deux exécutions au même horodatage gardent leur ordre de saisie, sinon le sens du trade dépend de l'UUID), fournie par le formulaire, l'import CSV et la synchro — impact schéma, donc ADR au moment de l'implémentation
- [ ] **Dette M3** : lors d'une **inversion de position**, l'exécution qui appartient à deux trades est **scindée en deux lignes** à l'écriture (`executions.trade_id` reste une clé étrangère simple)
- [ ] Seed : utilisateur démo, comptes `Prop Challenge 200k` (USD, type `prop_challenge`) et `Compte perso actions` (EUR), jeu de mars 2026 + 1er avril **généré à partir du fixture golden de `packages/core`** (M3) — UUID v5 déterministes, swap porté par la ligne de trade
- [ ] Formulaire de saisie (react-hook-form + zod) : mode simple (entrée/sortie → 2 exécutions) et mode avancé (exécutions partielles) ; aperçu P&L/R en direct via `packages/core` ; bouton d'ajout rapide accessible depuis tous les onglets
- [ ] Trade log virtualisé (`@tanstack/react-virtual`) : filtres (compte, période, symbole, tag, setup, résultat), tri, pagination par curseur
- [ ] Détail en sheet : édition, suppression, tags/setups, notes, captures (upload Storage)
- [ ] Gestion des tags et setups (création, couleur, type)
- [ ] Mises à jour optimistes sur création/édition/suppression, invalidation ciblée des requêtes calendrier/dashboard

**Critères de fin** : avec le seed, le trade log filtré sur `Prop Challenge 200k` et mars 2026 liste 24 trades ; un trade créé sur téléphone (PWA) apparaît immédiatement (optimiste) puis sur le bureau après rafraîchissement ; défilement du trade log à 60 fps avec 1 000 trades générés (export de production, CPU ×4) ; tests RLS (tables + Storage) verts.

---

## Phase M5 — Dashboard et calendrier · `À faire`
Réf. : §5.1, §5.5, §10, ADR-017
Agents : `app-ui`, `core-engine`, `qa-tests` — lancer avec `/phase M5`
Dépend de : M4

- [ ] Hooks de données : trades de la période → agrégats `packages/core`, clés de requête (compte, période, mois) — aucun agrégat stocké
- [ ] Dashboard : carte solde, tuiles P&L et rendement, courbe d'equity, stats clés, accès rapides, masquage des montants (pas de carte score)
- [ ] Calendrier : cellules (profit / perte / journal seul / aujourd'hui / vide), modes P&L ($, %, R), total hebdo, stats du mois, bouton Aujourd'hui, swipe animé entre les mois
- [ ] Squelettes ; **aucune donnée périmée au changement de mois ou de compte**
- [ ] Tap sur un jour → sheet du jour (trades du jour + accès au journal)

**Critères de fin** : avec le seed, sur bureau et mobile (navigateur/PWA), mars 2026 affiche exactement 24 trades, −17 527,71 et 3 jours gagnants / 7 perdants ; le dashboard de `Prop Challenge 200k` (toute la période) affiche un solde de 180 256,57 $ et −9,87 % ; test E2E : passer de mars à avril n'affiche jamais un chiffre de mars ; premier affichage du dashboard < 1,5 s (protocole ADR-017).

---

## Phase M6 — Journal et psychologie · `À faire`
Réf. : §5.6
Agents : `database`, `app-ui`, `qa-tests`, `security-auditor` — lancer avec `/phase M6`
Dépend de : M5

- [ ] Table `journal_entries` + RLS ; captures du journal via `attachments` + Storage
- [ ] Check-in pré-session (humeur, sommeil, plan, biais) et débrief post-session (humeur, respect du plan, notes, leçons), émotions en tags
- [ ] Brouillon local persistant (navigateur et PWA) jusqu'à l'enregistrement
- [ ] Mode Psych du calendrier (couleur par humeur) et lien jour ↔ journal
- [ ] Seed : entrées de journal des 12 et 13 septembre 2026 sans trade

**Critères de fin** : les 12 et 13 septembre 2026 s'affichent comme « journal seul » et le mode Psych les colore selon l'humeur ; une entrée avec capture créée sur téléphone est visible sur le bureau ; un brouillon survit à la fermeture de l'onglet / de la PWA ; enregistrement optimiste.

---

## Phase M7 — Analytics · `À faire`
Réf. : §5.4
Agents : `core-engine`, `app-ui`, `qa-tests` — lancer avec `/phase M7`
Dépend de : M5 (peut avancer en parallèle de M6)

- [ ] Écran Analytics avec filtres partagés (compte, période, tag, setup) et graphiques `Chart`
- [ ] Rapports : equity & drawdown, par symbole, setup, tag, session, heure, jour de semaine, distribution des R
- [ ] Heatmap heure × jour ; tuiles de stats (win rate, PF, espérance, ratio moyen, séries)
- [ ] Transitions animées entre rapports, squelettes par graphique

**Critères de fin** : avec le seed, sur `Prop Challenge 200k` toute période : win rate 16 %, profit factor 0,56, ratio moyen 2,92 ; pire jour affiché = 30 mars 2026 ; chaque rapport concorde avec les fonctions de `packages/core` (tests sur fixtures) ; identique sur bureau et mobile.

---

## Phase M8 — Règles perso et checklists · `À faire`
Réf. : §5.7 (partie MVP)
Agents : `core-engine`, `database`, `app-ui`, `qa-tests` — lancer avec `/phase M8`
Dépend de : M4 ; M7 pour le rapport par confluence

- [ ] Tables `rules`, `checklists`, `checklist_results` + RLS
- [ ] Évaluateur pur `packages/core/rules` (règles perso) + tests : violations et marges restantes
- [ ] Écran Règles : création/édition, jauges de progression, marges restantes, alertes in-app à 80 % et 100 % (pas de push)
- [ ] Checklist pré-trade (confluences) dans le formulaire de trade, résultats attachés au trade
- [ ] Rapport « win rate par confluence » dans Analytics

**Critères de fin** : sur le compte seed `Prop Challenge 200k` (−9,87 %), une règle perso de perte maximale de 10 % du solde initial affiche une alerte « 256,57 $ restants » *(type de règle `max_total_loss` à confirmer, voir questions ouvertes)* ; une checklist cochée à la saisie apparaît dans le détail du trade et dans le rapport par confluence.

---

## Phase M9 — Finition, performance et QA web/PWA · `À faire`
Réf. : §6, §9, §10, §11, ADR-017
Agents : `qa-tests`, `app-ui`, `security-auditor`, `code-reviewer`, `release` — lancer avec `/phase M9`
Dépend de : M1–M8

- [ ] Protocole de performance ADR-017 (révision 2026-09-25) exécuté sur l'export de production : 60 fps (trade log, calendrier, sheets, segments), dashboard < 1,5 s (Lighthouse mobile), résultats consignés
- [ ] Passe de finition visuelle écran par écran (espacements, états vides, erreurs, transitions) en sombre et clair, bureau et mobile
- [ ] Playwright (bureau + émulation mobile) : inscription, onboarding, saisie de trade, calendrier, journal, analytics, règles ; vérification manuelle sur iOS Safari et Android Chrome (PWA installée)
- [ ] Audit accessibilité (tailles dynamiques, contraste AA, lecteurs d'écran) et i18n (aucun texte en dur, FR/EN complets)
- [ ] Audit sécurité : RLS de toutes les tables et du Storage, aucun secret client, session sécurisée, service worker sans données utilisateur en cache
- [ ] Préproduction Cloudflare Pages à jour (ADR-025) ; pas d'app native (Capacitor en P6)
- [ ] CSP stricte via `_headers` Cloudflare Pages (jetons en `localStorage`, pas de cookie `httpOnly` sans serveur — ADR-016, ARCHITECTURE §9)

**Critères de fin** : suite Playwright verte (bureau + mobile) ; PWA vérifiée sur iOS Safari et Android Chrome ; mesures ADR-017 atteintes et consignées ; aucun point bloquant de `security-auditor` ni de `code-reviewer` ; préproduction utilisable avec le compte démo ; en-tête CSP vérifié sur la préproduction.

**Avant toute ouverture publique** (bloquant, même hors stores) :
- [ ] **Projet Supabase de production créé** (il n'existe pas encore) avec **confirmation d'e-mail activée** — elle reste désactivée sur le projet de dev (ADR-020, précision du 2026-09-25).
- [ ] **Bascule d'ADR-018 de l'option B vers l'option A** : Edge Function `delete-account` et suppression **in-app** (le lien de demande manuel livré en M2 ne suffit plus). Aucun changement de schéma (`profiles.deleted_at` existe depuis M2).
- [ ] Export RGPD des données ; politique de confidentialité ; disclaimer financier (pas de conseil en investissement).

---

## Décisions mises de côté (à trancher plus tard)

> Notées le 2026-09-17 à la demande de l'utilisateur. Aucune n'est validée. En attendant, on applique le **choix provisoire** (le moins engageant) pour ne pas bloquer les phases. Le trancher → `/decide <sujet>`.

| # | Sujet | Proposition de Claude | Choix provisoire en attendant | Au plus tard |
|---|---|---|---|---|
| 1 | Suppression de compte (ADR-018) | B (report) si test privé ; A (Edge Function) si web public | **Tranchée le 2026-09-25 : B** (ADR-018 `Acceptée`) — lien de demande + `profiles.deleted_at` ; bascule vers A obligatoire | Avant toute ouverture publique |
| 2 | « Tous les comptes » multi-devises (ADR-019) | A — un total par devise, sans conversion | **Tranchée le 2026-09-18 : A** (ADR-019 `Acceptée`) | — |
| 3 | Écritures atomiques (ADR-016) | Fonction Postgres transactionnelle (trade + exécutions + tags + checklist), valeurs déjà calculées par `packages/core`, aucun calcul SQL | Appliquée | M4 |
| 4 | Règle `max_total_loss` (perte max vs solde initial) | L'ajouter pour garder le critère « 256,57 $ restants » | Ajoutée | M8 |
| 5 | Onglets MVP (ADR-011) | Dashboard · Calendrier · Trades · Journal · Plus | **Tranchée le 2026-09-18** (ADR-011 `Acceptée`, + ajout rapide global) | — |
| 6 | Google + Sign in with Apple | Selon les comptes développeur disponibles | **Tranchée le 2026-09-25 : non** (ADR-022) — e-mail + mot de passe + magic link uniquement ; un login social tiers imposerait Sign in with Apple, donc un compte Apple Developer payant | Rouverte en P6 (stores) |
| 7 | Nom et logo (ADR-012) | « Edgebook » provisoire | Edgebook | Avant P6 |
| 8 | Pondération du score (ADR-008) | 30 / 20 / 25 / 15 / 10 | — (score hors MVP) | P2 |
| 9 | Fichiers d'agents `database.md` (Drizzle dans `apps/server`) et `app-ui.md` (`packages/api-client`) à aligner sur le MVP | Ajuster les deux fichiers | **Validé le 2026-09-17** : note « MVP » dans les deux fichiers (types dans `packages/db` ; données via `apps/app/lib/supabase` + TanStack Query) | M0 |

---

## Après le MVP

Ordre indicatif, à reconfirmer à la fin du MVP. Chaque phase réintroduisant un élément reporté commence par un ADR (ex. remplacement d'ADR-016).

## Phase P1 — Serveur, worker et import CSV · `Reportée`
Réf. : §5.3, §8, ADR-003, ADR-006
Agents : `architect`, `backend`, `connectors`, `database`, `core-engine`, `app-ui`, `qa-tests`
- [ ] ADR réintroduisant ADR-003 et ADR-006 (remplace ADR-016)
- [ ] `apps/server` (Hono + zod-openapi, `/v1/health`, Dockerfile, rôle `api`/`worker`), `packages/api-client`, hébergement
- [ ] Table `daily_stats` + job `recompute-stats` ; dashboard et calendrier basculent sur les agrégats
- [ ] Table `imports`, connecteurs `csv-generic` (assistant de mapping, aperçu) et `csv-mt5`, déduplication, normalisation des symboles
- [ ] Route `DELETE /v1/account` (si ADR-018 n'a pas déjà livré la suppression)

**Critères de fin** : importer deux fois le même CSV MT5 ne crée aucun doublon ; `daily_stats` est à jour moins de 10 s après l'import.

## Phase P2 — Coach IA et score · `Reportée`
Réf. : §5.8, ADR-007, ADR-008
- [ ] `packages/core/score` (5 piliers, config versionnée), job `score-snapshot`, écran « Analyse du score »
- [ ] Moteur d'insights déterministe (≥ 10 règles), job `coach-tips`, `CoachProvider`, chat SSE avec outils en lecture seule, onglet Coach
- [ ] Quotas, suivi des coûts, disclaimer ; tests « un conseil ne contredit jamais ses chiffres »

**Critères de fin** : avec le seed (win rate 16 %, PF 0,56), aucun conseil ne dit que la stratégie est rentable ; le chat répond « quel est mon pire jour de mars ? » avec le 30 mars.

## Phase P3 — Modèles de règles prop firm · `Reportée`
Réf. : §5.7, ADR-010
- [ ] Tables `rule_sets`, `rule_violations` ; évaluateur étendu (perte max statique et suiveuse, perte journalière, objectif, jours minimum, consistency)
- [ ] Seed de 3 modèles prop firm (paramètres à vérifier par l'utilisateur) ; modèle par compte ; alertes push à 80 % et 100 %

**Critères de fin** : le compte seed avec un modèle type FTMO (perte max 10 %) affiche « 256,57 $ restants » et envoie une notification.

## Phase P4 — Connecteurs API · `Reportée`
Réf. : §5.3, §9
- [ ] Table `connections`, chiffrement des identifiants, écran Connexions
- [ ] MT4/MT5 via MetaApi, crypto via CCXT, (optionnel) Tradovate, IBKR Flex ; synchro planifiée + statut + notification

**Critères de fin** : un compte démo MT5 se synchronise de bout en bout et les soldes broker et calculés sont comparés.

## Phase P5 — Abonnements · `Reportée`
Réf. : §5.9, ADR-009
- [ ] RevenueCat (iOS, Android, Stripe web), paywall, restauration ; webhook → `subscriptions` ; `plans.ts`

**Critères de fin** : un achat sandbox iOS débloque Pro sur le web.

## Phase P6 — Apps natives (Capacitor), conformité et publication sur les stores · `Reportée`
Réf. : §5.11, §9, §11, §12, ADR-023
- [ ] Capacitor iOS/Android autour d'`apps/web` ; stockage sécurisé de session (plugin), `@capacitor/haptics` derrière l'interface `Haptics`, deep links (`edgebook://`, liste blanche), push ; fonctions natives suffisantes pour la règle Apple 4.2
- [ ] **Dette D1** : mesure de fluidité native sur Capacitor Android (build release, Android milieu de gamme) ; tests E2E natifs (Maestro ou équivalent)
- [ ] Sentry + PostHog + événements clés ; export RGPD ; suppression de compte in-app définitive ; Sign in with Apple si reporté
- [ ] Pages légales, fiches stores, compte de démo pour la review, privacy manifest, Data safety
- [ ] Déploiement production (web, server, DB) + soumission des stores

**Critères de fin** : app publiée sur l'App Store et Google Play, web en production, alertes Sentry actives.

---

## Backlog (idées non planifiées)
- Rappel quotidien de journal (notification locale)
- Mode hors-ligne complet (file d'écritures rejouée à la reconnexion)
- Replay de trade sur graphique (TradingView Lightweight Charts)
- Import par capture d'écran (OCR + vision)
- Partage d'une carte de performance (image)
- Mode mentor / coach humain (accès en lecture partagé)
- Widgets iOS/Android (P&L du jour)
- Apple Watch : rappel de règles
- Application desktop (Tauri) si demande — la PWA couvre déjà l'installation sur ordinateur
