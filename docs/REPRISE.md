# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-25**, au démarrage de la phase M2.
> Le détail fait foi dans `ROADMAP.md` (cases à cocher) et `DECISIONS.md` (ADR).

## État au 2026-09-25 — M0, M1 et M3 `Terminées` ; **M2 `En cours`**

Le travail M1/M3 n'est **pas sur `main`** : il est sur la branche **`wip/m1-m3`** (dernier commit `c8f0780`), dont la **PR #1** « feat: phases M1 (design system) et M3 (moteur de calcul) » est **ouverte vers `main`**. `main` reste au dernier état vert (clôture M0). Pour reprendre : `git checkout wip/m1-m3`. M2 se construit sur cette même branche tant que la PR n'est pas fusionnée.

**M3 (moteur de calcul) — `Terminée` le 2026-09-24.** `packages/core` (money, time, trading, stats, aggregates, format) et `packages/schemas` livrés en fonctions pures testées ; couverture 98,24 % ; chiffres golden au centime (200 000 → −19 743,43 → 180 256,57, −9,87 %). Conventions de calcul dans `DATA_MODEL.md` § « Conventions de calcul (M3) » — **toute évolution exige un ADR**. Dette reportée en M4 : colonne `sequence` sur `executions` (ADR à créer), scission d'exécution lors d'une inversion, seed généré depuis le fixture golden.

**M1 (design system, shell) — `Terminée` le 2026-09-25.**
- Livré : tokens v2 (thèmes sombre/clair basculables sans rechargement, couleurs P&L par thème, Inter, contrastes AA testés), haptique, animations reanimated respectant « réduire les animations », ~20 primitives (dont `Sheet`, `Select`, `DateRangePicker`, `Segmented`, `Toast`, `VirtualizedList`/FlashList, `Chart`), shell à onglets (ADR-011) + sidebar web ≥ 1024 px + header, **tab bar flottante translucide** (`expo-blur`), Dashboard (courbe d'equity), Calendrier pleine largeur, Réglages avec **préférences persistées**, catalogue interne **exclu des builds de production**.
- Vérifié : `pnpm lint`, `pnpm typecheck`, `pnpm test` (**647 tests**), `pnpm format:check`, `pnpm check:secrets` verts ; `pnpm e2e:web` **16 passés, 3 ignorés** (Supabase non configuré), 0 échec, sur les projets `chromium` (serveur de dev) et `chromium-perf-prod` (export de production).
- Builds EAS Android **development** (`deaad95b-…`) et **preview** release (`84443209-…`) terminés, APK disponibles.
- Revue `code-reviewer` : 2 bloquants + 8 points importants corrigés (agrégat P&L remonté dans `packages/core` via `sumAmountStrings` ; écran blanc au démarrage si la lecture des préférences échoue ; axes natifs, `react-hooks` sur `packages/ui`, piège à focus de la `Sheet`).
- **Fluidité (ADR-017, décision utilisateur du 2026-09-25)** : clôture **sans** la mesure sur appareil. La mesure **native** (barres HWUI sur l'APK preview) **fait foi** et reste à faire — **avant toute publication, M9 au plus tard**. La mesure **web** est désormais **informative** (Reanimated anime sur le thread JS en web : le CPU ×4 y est disproportionné) ; seule assertion bloquante : l'interaction produit bien des images. Mesuré : `Segmented` 40–48 fps, `Sheet` 51–56 fps, images 83–567 ms.
- **Dette M1** (tableau D1–D7 dans `ROADMAP.md`, phase M1) : mesure native reportée, vérifications utilisateur sur Android et bascule FR/EN non confirmées, cibles tactiles de la heatmap < 44 pt, navigation clavier du `Select` web, libellés d'accessibilité du `DateRangePicker`, graphiques natifs multi-séries sans infobulle, **CI jamais exécutée sur ce code** (branche non poussée).

**Phase en cours : M2 — auth, onboarding et comptes** (plan détaillé M2-1 à M2-19, vagues 1 à 5 et fenêtre d'installation unique : `ROADMAP.md`, phase M2).
**Les 5 décisions bloquantes ont été tranchées par l'utilisateur le 2026-09-25** :
1. **Suppression de compte** : option **B** (ADR-018 `Acceptée`) — lien « demander la suppression » dans Réglages, traitement manuel ; `profiles.deleted_at` créée dès la migration M2-1 ; bascule vers l'Edge Function (option A) **obligatoire avant toute ouverture publique** (M9).
2. **Confirmation d'e-mail** : désactivée sur le projet de **dev** (sinon chaque inscription de test exige une boîte mail et les E2E deviennent instables), activée sur le projet de **production**, **qui reste à créer** (ADR-020, bloquant M9).
3. **Google / Sign in with Apple** : **non** en M2 — e-mail + mot de passe + magic link uniquement (un login social tiers imposerait Sign in with Apple, donc un compte Apple Developer payant). Rouvert en P6 (ADR-022, mise de côté n° 6 tranchée).
4. **Onboarding** : premier jour de semaine et devise d'affichage **déduits de la locale** (FR → lundi/EUR, EN → dimanche/USD), pré-remplis et modifiables, stockés dans `preferences.week_starts_on` et `profiles.display_currency` (ADR-022).
5. **Données factices** : seuls les **comptes** factices disparaissent en M2 (`sampleAccounts`) ; les **trades** factices du dashboard et du calendrier restent jusqu'à M4/M5, où le seed issu du fixture golden prend le relais.

Point de vigilance technique du schéma M2 : **`cash_movements.user_id` est dénormalisé** (RLS directe, pas de policy croisée sur `accounts`) et la création du profil passe par un trigger `security definer` à `search_path` figé — détail dans `DATA_MODEL.md` § « Précisions M2 ».

**Catalogue** : activé par le **mode développement** (`apps/app/lib/flags.ts` + `metro.config.js`), surchargeable par `EXPO_PUBLIC_ENABLE_CATALOG`. Aucun fichier `.env` n'est versionné : le hook anti-secrets a bloqué une tentative en ce sens, la règle reste sans exception.

**Piège Windows réglé** : Metro dépassait la limite de descripteurs (`EMFILE`) et renvoyait alors au téléphone une erreur de 2 Ko à la place du bundle — l'app restait donc sur son ancienne version, sans message d'erreur. `apps/app/metro.config.js` plafonne désormais `maxWorkers` à 4 sur Windows ; en cas de rechute, relancer avec `npx expo start --max-workers 2`. **Vérifier la taille du bundle** (`curl .../entry.bundle?platform=ios&dev=true`, plusieurs Mo attendus) avant de conclure qu'un changement n'a pas pris.

**Lancer l'app sur téléphone** : `pnpm dev:app`, puis Expo Go sur `exp://<IP du PC>:8081`. **L'IP change** (DHCP, changement de réseau) : la relire dans la sortie d'Expo à chaque session, ne pas réutiliser celle d'hier ; PC et téléphone sur le même Wi-Fi.

**Incident connu** : `packages/ui/node_modules/@repo/core` peut redevenir une copie physique au lieu d'une jonction (pnpm bloqué, `ERR_PNPM_PACKAGE_MANAGER_SYMLINK_FAILED`) → supprimer le dossier puis `pnpm install`.

## Où on en est

- **Périmètre** : on construit d'abord le **MVP** (phases M0 → M9, ARCHITECTURE §0). Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **M0** `Terminée` (2026-09-18) — dérives encore ouvertes : voir ROADMAP, phase M0 (script `db:reset:linked`, `expo-updates`). La dérive « Playwright absent de la CI » est **résolue** (job `e2e-web` dans `ci.yml`, M1).
- **M3** `Terminée` (2026-09-24), **M1** `Terminée` (2026-09-25).
- **M2** (auth, onboarding, comptes) : **`En cours`** depuis le 2026-09-25 (décisions tranchées, plan M2-1 à M2-19 écrit, aucun code encore livré).
- **Décisions en vigueur** : ADR-011 (onglets + ajout rapide global), ADR-019 (total par devise), ADR-021 (victory-native/recharts, Inter, libs incluses dans Expo Go), ADR-017 complétée le 2026-09-25 (mesure native qui fait foi, mesure web informative), **ADR-018 `Acceptée` (option B)**, **ADR-020 complétée (confirmation d'e-mail)**, **ADR-022 (périmètre d'auth du MVP et valeurs par défaut de l'onboarding)**.
- **CI** : `gh` (GitHub CLI) est installé et authentifié sur ce PC (`gh run list`, `gh run view`). **Dernier run : `35389707958` sur `main` (2026-09-18)** — la branche `wip/m1-m3` n'a jamais été poussée, donc la CI n'a jamais vu le code M1/M3.

## Comptes et ressources

| Ressource | Valeur |
|---|---|
| Dépôt GitHub (privé) | `wasslasGOAT/tradingjournal` — `main` (état M0), travail en cours sur `wip/m1-m3`, **PR #1 ouverte vers `main`** |
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

Voir la section « Décisions mises de côté » de `ROADMAP.md`. Tranchées : n° 1 (suppression de compte, 2026-09-25), n° 2 (multi-devises), n° 5 (onglets), n° 6 (Google/Apple, 2026-09-25), n° 9.
Restent ouvertes : **n° 3** (écritures atomiques, à appliquer en M4), **n° 4** (règle `max_total_loss`, M8), **n° 7** (nom et logo, avant P6), **n° 8** (pondération du score, P2). Chacune a un choix provisoire appliqué ; la trancher avec `/decide <sujet>`.

## Leçons de la session M0 (pour l'orchestration)

- Une seule installation de dépendances à la fois : quand plusieurs agents tournent en parallèle, un seul a le droit de lancer `pnpm add`.
- Les agents ne sortent pas de leur zone (`.claude/agents/*.md`) : les fichiers sans propriétaire sont faits par la session principale.
- Toujours faire relire (`code-reviewer`) : la revue a trouvé un vrai bug de calcul du jour de trading autour des changements d'heure, et une règle ESLint qui s'annulait sans erreur.
- Une migration appliquée sur la base de dev ne se modifie plus : créer une nouvelle migration.
