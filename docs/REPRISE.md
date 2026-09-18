# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-18**, au lancement des phases M1 et M3.
> Le détail fait foi dans `ROADMAP.md` (cases à cocher) et `DECISIONS.md` (ADR).

## ⚠️ Arrêt du 2026-09-18 au soir — travail en cours sur la branche `wip/m1-m3`

Le travail M1/M3 n'est **pas sur `main`** : il est sur la branche **`wip/m1-m3`** (poussée sur GitHub). `main` reste au dernier état vert (clôture M0). Pour reprendre : `git checkout wip/m1-m3`.

**M3 (moteur de calcul) — terminé, reste la revue et la clôture :**
- Livré : `packages/core` `format` (sans `number`), `money` (Money, total par devise), `time/session`, `trading` (regroupement FIFO/moyenne, inversion de position, P&L, R, solde), `stats`, `aggregates` ; `packages/schemas` (compte, exécution, trade, mouvement de trésorerie).
- Jeu golden synthétique `packages/core/test/golden/` (25 trades, Europe/Paris) : **tous les chiffres de référence retrouvés au centime** ; 220 tests, couverture 99 % (seuil 90 % bloquant).
- Conventions **validées par l'utilisateur** : trade à 0 = neutre (hors win rate et PF, casse une série) ; drawdown depuis un pic incluant le solde initial. À consigner dans les docs à la clôture.
- À faire : revue `code-reviewer` (interrompue, à relancer), puis clôture `architect`.
- Point pour M4 : lors d'une inversion de position, une même exécution appartient à deux trades → la scinder en deux lignes lors de l'écriture en base.

**M1 (design system) — en cours :**
- Fait et vérifié : dépendances UI installées (toutes compatibles Expo Go), tokens v2 (thèmes sombre/clair par variables CSS, P&L par thème, Inter, accent décalé, **contrastes AA testés**). Vérifié par l'utilisateur sur iPhone : texte gris lisible, bascule en mode clair OK.
- **Interrompu en cours de route** (agent `app-ui` arrêté) : M1-2 (haptique, motion) et M1-3 (primitives `packages/ui/src/components/**`) + **catalogue** (`apps/app/app/(dev)/`, `features/catalog/`, bouton « Voir le catalogue » sur Hello — demandé par l'utilisateur pour voir l'app avancer). État : tests et typecheck verts, **1 erreur de lint** (`apps/app`, variable `preference` inutilisée). À relire et terminer avant tout le reste.
- Reste ensuite : M1-4 (Segmented, Select, Sheet, DateRangePicker, Toast), M1-5 (liste FlashList), M1-6 (Chart), M1-7 (i18n), M1-8 (onglets + header), M1-9 (bascules persistées, catalogue exclu de la prod), build EAS Android de dev (B1) et preview (B2), Playwright en CI, tests Q1, revue, clôture.
- Vérifications utilisateur restantes : Android (Expo Go `exp://<IP du PC>:8081`), bascule FR/EN sur téléphone.

**Incident réglé** : `packages/ui/node_modules/@repo/core` était une copie physique au lieu d'une jonction (pnpm bloqué, `ERR_PNPM_PACKAGE_MANAGER_SYMLINK_FAILED`) → supprimée + `pnpm install`. Si ça réapparaît : même remède.

## Où on en est

- **Périmètre** : on construit d'abord le **MVP** (phases M0 → M9, ARCHITECTURE §0). Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **Phase M0 (fondations)** : `Terminée` le 2026-09-18 (CI verte, build Android de dev EAS, vérifiée sur iPhone ; reste à vérifier sur Android et la bascule FR/EN sur téléphone, en début de M1). Dérives encore ouvertes : voir ROADMAP, Phase M0.
- **Phases M1 (design system, shell) et M3 (moteur de calcul) : `En cours`** depuis le 2026-09-18, en parallèle. M1 commence par le reliquat M0 (Android + FR/EN sur téléphone) ; M3 livre `packages/core/format` (consommé par M1) et le fixture golden synthétique (réutilisé par le seed en M4).
- **Décisions du 2026-09-18** : ADR-011 (onglets + ajout rapide global) et ADR-019 (total par devise) `Acceptées` ; ADR-021 (victory-native/recharts, Inter, uniquement des libs incluses dans Expo Go) ; accent bleu décalé de la référence (ADR-012).
- **Ensuite** : M2 (auth, onboarding, comptes).
- **CI** : `gh` (GitHub CLI) est installé et authentifié sur ce PC ; la session peut lire les runs elle-même (`gh run list`, `gh run view`).

## Comptes et ressources

| Ressource | Valeur |
|---|---|
| Dépôt GitHub (privé) | `wasslasGOAT/tradingjournal`, branche `main` |
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
