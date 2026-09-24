# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-24**, à la clôture de la phase M3.
> Le détail fait foi dans `ROADMAP.md` (cases à cocher) et `DECISIONS.md` (ADR).

## État au 2026-09-24 — travail en cours sur la branche `wip/m1-m3`

Le travail M1/M3 n'est **pas sur `main`** : il est sur la branche **`wip/m1-m3`**. `main` reste au dernier état vert (clôture M0). Pour reprendre : `git checkout wip/m1-m3`.

**M3 (moteur de calcul) — `Terminée` le 2026-09-24.**
- Livré : `packages/core` (`format`, `money`, `time`, `trading`, `stats`, `aggregates`) et `packages/schemas` (compte, exécution, trade, mouvement de trésorerie, messages = clés i18n).
- Vérifié : `@repo/core` 278 tests verts (521 sur tout le dépôt), couverture **98,24 %** (seuil 90 % bloquant) ; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm test:rls` (12) verts ; chiffres golden au centime (200 000 → −19 743,43 → 180 256,57, −9,87 %, mars 24 trades −17 527,71, pire jour 30/03).
- Conventions de calcul consignées dans `DATA_MODEL.md` § « Conventions de calcul (M3) » ; ADR-005 et ADR-019 complétés. **Toute évolution de ces conventions exige un ADR.**
- Dette reportée en M4 (inscrite dans ROADMAP) : colonne `sequence` sur `executions` (ADR à créer), scission d'une exécution lors d'une inversion de position, seed généré depuis le fixture golden.

**M1 (design system, shell) — `En cours`** — état au 2026-09-24 au soir, commit `d2b3d29` (608 tests, lint/typecheck/format verts).
- Livré : tokens v2 (thèmes sombre/clair, P&L par thème, Inter, contrastes AA vérifiés sur iPhone), haptique et animations reanimated, primitives de base, **M1-4** (`Segmented`, `Sheet`, `Select`, `DateRangePicker`, `Toast` + header branché), **M1-5** (liste FlashList + `TradeListRow`), **M1-6** (`Chart` : ligne/aire, barres, histogramme, heatmap ; courbe d'equity sur le dashboard), catalogue interne, shell à onglets + sidebar web + header.
- **Retours utilisateur traités** : calendrier élargi en pleine largeur avec montants compacts ; **tab bar flottante** (détachée des bords, coins arrondis, ombre) et translucide via `expo-blur` (voile 0,3/0,45, `blurMethod: 'dimezisBlurView'` sur Android) ; axe vertical des graphiques cadré sur les données (`padDomain`) — sans quoi une courbe autour de 24 000 était écrasée en haut, donc invisible.
- Reste : ajouter graphiques et listes au **catalogue** (agent coupé par une erreur réseau), M1-7 (i18n complet), M1-9 (persistance des bascules, catalogue exclu du bundle de production), tests Q1, Playwright en CI, builds EAS Android (dev puis preview — `expo-blur` a été ajouté depuis le dernier build), revue et clôture.
- Vérifications utilisateur restantes : Android (lecture d'`app_meta`, bascule FR/EN), fluidité sur l'APK preview, rendu de la barre flottante et de la courbe sur téléphone.

**Piège Windows réglé** : Metro dépassait la limite de descripteurs (`EMFILE`) et renvoyait alors au téléphone une erreur de 2 Ko à la place du bundle — l'app restait donc sur son ancienne version, sans message d'erreur. `apps/app/metro.config.js` plafonne désormais `maxWorkers` à 4 sur Windows ; en cas de rechute, relancer avec `npx expo start --max-workers 2`. **Vérifier la taille du bundle** (`curl .../entry.bundle?platform=ios&dev=true`, plusieurs Mo attendus) avant de conclure qu'un changement n'a pas pris.

**Lancer l'app sur téléphone** : `pnpm dev:app`, puis Expo Go sur `exp://<IP du PC>:8081`. **L'IP change** (DHCP, changement de réseau) : la relire dans la sortie d'Expo à chaque session, ne pas réutiliser celle d'hier ; PC et téléphone sur le même Wi-Fi.

**Incident connu** : `packages/ui/node_modules/@repo/core` peut redevenir une copie physique au lieu d'une jonction (pnpm bloqué, `ERR_PNPM_PACKAGE_MANAGER_SYMLINK_FAILED`) → supprimer le dossier puis `pnpm install`.

## Où on en est

- **Périmètre** : on construit d'abord le **MVP** (phases M0 → M9, ARCHITECTURE §0). Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **Phase M0 (fondations)** : `Terminée` le 2026-09-18 (CI verte, build Android de dev EAS, vérifiée sur iPhone ; reste à vérifier sur Android et la bascule FR/EN sur téléphone, en début de M1). Dérives encore ouvertes : voir ROADMAP, Phase M0.
- **Phase M3 (moteur de calcul)** : `Terminée` le 2026-09-24 (voir ci-dessus). Elle livre `packages/core/format` (consommé par M1) et le fixture golden (réutilisé par le seed en M4).
- **Phase M1 (design system, shell)** : `En cours` depuis le 2026-09-18 ; reliquat M0 (Android + FR/EN sur téléphone) toujours ouvert.
- **Décisions du 2026-09-18** : ADR-011 (onglets + ajout rapide global) et ADR-019 (total par devise) `Acceptées` ; ADR-021 (victory-native/recharts, Inter, uniquement des libs incluses dans Expo Go) ; accent bleu décalé de la référence (ADR-012).
- **Ensuite** : M2 (auth, onboarding, comptes).
- **CI** : `gh` (GitHub CLI) est installé et authentifié sur ce PC ; la session peut lire les runs elle-même (`gh run list`, `gh run view`).

## Comptes et ressources

| Ressource | Valeur |
|---|---|
| Dépôt GitHub (privé) | `wasslasGOAT/tradingjournal` — `main` (état M0), travail en cours sur `wip/m1-m3` |
| Supabase (base de dev, UE) | projet `vgqgalksrbprdslhegde`, lié via `npx supabase link` |
| Expo / EAS | projet `@wassimaha/edgebook` (id `dd23ce8e-9296-4435-b7a9-d94b4ae3147b`) |
| Migrations appliquées | `20260917172440_app_meta`, `20260918090000_harden_rls_guard` |

## Reprendre sur ce PC

Les fichiers `.env` **ne sont pas dans git** (volontairement). Ils existent sur ce PC :
- `apps/app/.env` : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` ;
- `supabase/tests/.env` : `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

Sur un autre PC, il faut les recréer à partir des `.env.example` (valeurs dans le tableau de bord Supabase → Project Settings → API ; **jamais la clé `service_role`**). Il faut aussi relancer `pnpm install`, `npx supabase login` + `npx supabase link --project-ref vgqgalksrbprdslhegde` et `npx eas-cli login`.

**Terminal Windows** : si PowerShell ne trouve pas `pnpm`, ajouter `C:\Users\wasst\AppData\Roaming\npm` (et `C:\Program Files\nodejs`) au `Path` de l'utilisateur, puis rouvrir le terminal.

## Commandes utiles

```bash
pnpm dev:app          # lance l'app (w = web ; QR code pour les téléphones)
pnpm lint && pnpm typecheck && pnpm test
pnpm test:rls         # tests d'isolation RLS contre la base de dev
pnpm e2e:web          # Playwright
pnpm db:push          # applique les nouvelles migrations sur la base de dev
pnpm db:types         # régénère packages/db depuis la base de dev
```

## Décisions en attente

Voir la section « Décisions mises de côté » de `ROADMAP.md` (suppression de compte, multi-devises, connexion Google/Apple, nom et logo…). Chacune a un choix provisoire appliqué ; la trancher avec `/decide <sujet>`.

## Leçons de la session M0 (pour l'orchestration)

- Une seule installation de dépendances à la fois : quand plusieurs agents tournent en parallèle, un seul a le droit de lancer `pnpm add`.
- Les agents ne sortent pas de leur zone (`.claude/agents/*.md`) : les fichiers sans propriétaire sont faits par la session principale.
- Toujours faire relire (`code-reviewer`) : la revue a trouvé un vrai bug de calcul du jour de trading autour des changements d'heure, et une règle ESLint qui s'annulait sans erreur.
- Une migration appliquée sur la base de dev ne se modifie plus : créer une nouvelle migration.
