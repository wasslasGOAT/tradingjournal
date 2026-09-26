# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-26** (clôture de M1-web).
> Le détail fait foi dans `ROADMAP.md` (cases à cocher, dettes) et `DECISIONS.md` (ADR).

## État au 2026-09-26 — M1-web `Terminée` ; prochaine phase : M2

- **Phases terminées** : M0 (2026-09-18), M3 (2026-09-24), M1 Expo (2026-09-25, gelée depuis ADR-023), **M1-web (2026-09-26, avec dette DW1 à DW6)**.
- **Application du MVP** : `apps/web` (React + Vite + shadcn/ui, PWA, ADR-023/024). Shell, Dashboard et Calendrier sur **données factices**, thèmes sombre/clair, FR/EN, PWA installable. `apps/app` (Expo) et `packages/ui` sont gelés.
- **Préproduction** : Cloudflare Pages, https://wip-m1-m3.edgebook-bs9.pages.dev (ADR-025), à redéployer après le commit de clôture.
- **Branche** : `wip/m1-m3` (PR #1 vers `main`). Commit de clôture de M1-web à faire par la session principale, puis push.
- **Vérifié le 2026-09-26** : `lint`, `typecheck`, `test` (853 tests), `test:tz`, `build`, `check:secrets`, `format:check` verts ; `e2e:web` 32 passés, 3 échecs de fluidité seulement (DW1).
- **M3 (moteur de calcul)** : conventions dans `DATA_MODEL.md` § « Conventions de calcul (M3) », toute évolution exige un ADR. Dette reportée en M4 : colonne `sequence`, scission lors d'une inversion, seed issu du fixture golden.

### Dettes ouvertes de M1-web (détail : ROADMAP § Phase M1-web)
| # | Quoi | Quand |
|---|---|---|
| DW1 | Fluidité sous le seuil (`Segmented`, `Sheet`, changement de mois) ; job CI `e2e-web-perf` non bloquant (ADR-017) | 3 runs CI au seuil, ou décision utilisateur |
| DW2 | Cloudflare Access sur la préproduction | Avant M2 (auth) |
| DW3 / DW4 | CSP stricte ; propagation de la CSP aux PWA installées | M9 |
| DW5 | **Désactiver l'inscription Supabase** (action utilisateur) | Avant tout partage du lien et avant M2 |
| DW6 | **Confirmer la CI verte** sur GitHub (causes corrigées, pas encore vues par un run) | Push du commit de clôture ; si rouge, M1-web repasse `En cours` |

### Actions de l'utilisateur
1. **Désactiver l'inscription** sur le projet Supabase de dev : tableau de bord → Authentication → « Allow new users to sign up » → désactivé (audit sécurité E1, élevé). L'URL et la clé anon sont publiques dans la preview.
2. **Tester sur téléphone** : ouvrir l'URL de préproduction une fois redéployée, parcourir Dashboard et Calendrier, puis « Ajouter à l'écran d'accueil » (PWA). Donner le ressenti de fluidité (il décide de DW1).
3. Recommandé avant M2 : activer **Cloudflare Access** sur la préproduction (DW2, avec `release`).

## Prochaine phase : M2 — Auth, onboarding et comptes

Plan complet et critères : ROADMAP § Phase M2. Décisions déjà actées (ADR-018 option B, ADR-020, ADR-022) : ne pas les rouvrir sans nouvel ADR.
- **Prérequis** : DW5 et DW6 soldées ; DW2 recommandée.
- **Vague 1** (`database`, séquentiel) : M2-1 migration des 4 tables → M2-2 RLS → M2-3 trigger de création de profil → M2-4 tests RLS. En parallèle, M2-5 (`release`) : réglages d'auth du projet cloud, redirections en liste exacte (`localhost` Vite + URL fixe de préproduction).
- **Vague 2** (`core-engine`, en parallèle de la vague 1) : M2-7 valeurs par défaut déduites de la locale, M2-8 schémas zod.
- **Vague 3** (`app-ui`, dans `apps/web`) : M2-9 client auth PKCE et liste blanche des routes de retour → M2-10 écrans d'auth et M2-11 sécurité de session (en parallèle) → M2-12 garde de navigation (`beforeLoad` de TanStack Router).
- **Vague 4** (`app-ui`, séquentiel) : M2-13 onboarding → M2-14 comptes → M2-15 dépôts/retraits → M2-16 sélecteur de compte sur vraies données (`sampleAccounts` supprimé) → M2-17 préférences en base → M2-18 Réglages.
- **Vague 5** : M2-19, E2E web + vérification sur téléphone + revues `code-reviewer` et `security-auditor`.

**Ce qui change par rapport au plan d'origine** (ADR-023) :
- **M2-9** vise des **routes web** (`apps/web/src/lib/supabase`, routes de retour en liste blanche) et plus le scheme `edgebook://`, qui reviendra avec Capacitor en P6.
- **M2-6** (installation de `react-hook-form`, `@hookform/resolvers`, `zustand`) est **absorbée par W-2** : pas de fenêtre d'installation en M2 sauf besoin nouveau.
- Toutes les vérifications « sur téléphone » se font sur navigateur mobile ou PWA via la préproduction, plus via Expo Go.
- **Point à trancher avant M2-16** : les agrégats multi-comptes à série unique lèvent `MixedCurrencyAggregationError` si les devises diffèrent (précision ADR-019 du 2026-09-26). Il faut décider de l'affichage de « Tous les comptes » en multi-devise avant le code.
- Point de vigilance du schéma : **`cash_movements.user_id` est dénormalisé**, et le trigger de profil est `security definer` avec un `search_path` figé (`DATA_MODEL.md` § « Précisions M2 »).

## Lancer l'app

**Web (MVP)** :
```bash
pnpm dev:web          # serveur Vite → http://localhost:5173 (catalogue de composants : /dev/catalog)
```
- Tester en largeur mobile : outils de développement du navigateur (mode appareil).
- Sur le téléphone : via l'URL de préproduction Cloudflare Pages, puis « Ajouter à l'écran d'accueil » pour installer la PWA (HTTPS obligatoire pour le service worker).
- Variables : `apps/web/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), existe sur ce PC ; ailleurs, à créer depuis `apps/web/.env.example` — **jamais la clé `service_role`** (`env.ts` refuse une clé dont le rôle n'est pas `anon`).
- Pièges : après un changement de `vite.config.ts`, redémarrer le serveur de dev ; ne jamais nommer des tokens `--spacing-*` (collision avec Tailwind v4, utiliser `--space-*`).

**Ancienne app Expo (gelée)** : `pnpm dev:app-legacy`. Pièges connus conservés pour mémoire : Metro plafonné à 4 workers sous Windows (`EMFILE`) ; `packages/ui/node_modules/@repo/core` peut redevenir une copie physique → supprimer le dossier puis `pnpm install`.

## Où on en est

- **Périmètre** : MVP (phases M0 → M9, ARCHITECTURE §0), web d'abord. Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **Dérive ouverte** héritée de M0 : script `db:reset:linked` (ROADMAP § Phase M2).
- **Décisions en vigueur** : ADR-023 (web d'abord, Expo gelé), ADR-024 (stack UI web), ADR-025 (Cloudflare Pages), ADR-011 (onglets + ajout rapide), ADR-017 révisée (mesure web qui fait foi ; job CI de fluidité non bloquant jusqu'au retrait, DW1), ADR-018 (option B), ADR-019 (+ précision du 2026-09-26), ADR-020, ADR-022. ADR-001 et ADR-021 sont remplacées.
- **CI** : `gh` installé et authentifié (`gh run list --branch wip/m1-m3`, `gh run view <id>`). Jobs : `quality`, `e2e-web`, `e2e-web-perf` (non bloquant), `db` (CLI Supabase épinglée en 2.117.0, RELEASE §5.1).

## Comptes et ressources

| Ressource | Valeur |
|---|---|
| Dépôt GitHub (privé) | `wasslasGOAT/tradingjournal` — `main` (état M0), travail sur `wip/m1-m3`, PR #1 ouverte vers `main` |
| Supabase (base de dev, UE) | projet `vgqgalksrbprdslhegde`, lié via `npx supabase link` |
| Hébergement web | Cloudflare Pages (ADR-025), projet `edgebook` (hôte `edgebook-bs9.pages.dev` ; ne **jamais** repasser `--force`) ; wrangler connecté sur ce PC — RELEASE §0 |
| Expo / EAS (gelé) | projet `@wassimaha/edgebook` (id `dd23ce8e-9296-4435-b7a9-d94b4ae3147b`) |
| Migrations appliquées | `20260917172440_app_meta`, `20260918090000_harden_rls_guard` |

## Reprendre sur ce PC

Les fichiers `.env` **ne sont pas dans git** (volontairement) : `apps/web/.env`, `apps/app/.env` (gelé), `supabase/tests/.env`. Sur un autre PC, les recréer depuis les `.env.example` (tableau de bord Supabase → Project Settings → API ; **jamais la clé `service_role`**), puis `pnpm install`, `npx supabase login` + `npx supabase link --project-ref vgqgalksrbprdslhegde`.

**Terminal Windows** : si PowerShell ne trouve pas `pnpm`, ajouter `C:\Users\wasst\AppData\Roaming\npm` (et `C:\Program Files\nodejs`) au `Path` de l'utilisateur, puis rouvrir le terminal.

## Commandes utiles

```bash
pnpm dev:web                      # app web (Vite)
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @repo/core test:tz  # tests core sous plusieurs fuseaux hôtes
pnpm e2e:web                      # Playwright (apps/web) ; les 3 tests de fluidité peuvent échouer (DW1)
pnpm deploy:web                   # build + en-têtes + scan anti-secrets + déploiement preview (branche courante)
pnpm deploy:web --dry-run         # affiche ce qui serait fait, sans build ni déploiement
pnpm deploy:web --allow-dirty     # autorise un arbre non commité (visible dans l'historique Cloudflare)
pnpm deploy:web --prod            # seul moyen de déployer depuis main ; confirmation « DEPLOY PRODUCTION »
pnpm test:rls                     # tests d'isolation RLS contre la base de dev
pnpm db:push                      # applique les nouvelles migrations sur la base de dev
pnpm db:types                     # régénère packages/db depuis la base de dev
```
`deploy:web` refuse un arbre non propre (sauf `--allow-dirty`) et échoue si `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` manquent ; détail en RELEASE §0.3.

## Décisions en attente

Voir la section « Décisions mises de côté » de `ROADMAP.md`. Restent ouvertes : **n° 3** (écritures atomiques, M4), **n° 4** (règle `max_total_loss`, M8), **n° 7** (nom et logo, avant P6), **n° 8** (pondération du score, P2). S'y ajoute l'affichage multi-devise des agrégats à série unique (précision ADR-019, avant M2-16).

## Leçons d'orchestration

- Une seule installation de dépendances à la fois : quand plusieurs agents tournent en parallèle, un seul a le droit de lancer `pnpm add` (W-2 a été celle de M1-web ; aucune n'est prévue en M2).
- Les agents ne sortent pas de leur zone (`.claude/agents/*.md`) : les fichiers sans propriétaire sont faits par la session principale.
- Toujours faire relire (`code-reviewer`) : la revue a déjà trouvé un vrai bug de jour de trading et une règle ESLint qui s'annulait sans erreur.
- Une migration appliquée sur la base de dev ne se modifie plus : créer une nouvelle migration.
- `apps/web` n'importe jamais depuis `apps/*` ni le barrel `@repo/ui` (React Native) : copier les données factices, utiliser `@repo/ui/tokens-data`.
