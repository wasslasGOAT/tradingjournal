# Roadmap de construction

> Mode d'emploi pour Claude Code : exécuter **une phase à la fois** (commande `/phase M0`, `/phase M1`…, qui orchestre les agents de `.claude/agents/`), dans l'ordre. En début de phase, relire les sections d'`ARCHITECTURE.md` citées.
> Cocher les cases au fur et à mesure (`- [x]`). Une phase n'est terminée que si tous ses **critères de fin** passent.
> L'utilisateur peut réordonner, fusionner ou supprimer des phases : mettre alors ce fichier à jour.

Statuts : `À faire` · `En cours` · `Terminée` · `Reportée`

---

## MVP (ADR-015, ADR-016, ADR-017)

Périmètre : ARCHITECTURE §0. L'app parle uniquement à Supabase ; tous les calculs passent par `packages/core`.
Agents du MVP : `architect`, `core-engine`, `database`, `app-ui`, `qa-tests`, `code-reviewer`, `security-auditor`, `release`.

**Critères transversaux, vérifiés à la clôture de chaque phase M1–M9** :
- Écrans livrés vérifiés sur **web, iOS et Android**, en thème sombre et clair, en FR et EN.
- Exigences UX d'ADR-017 respectées sur les écrans livrés (squelettes, pas de spinner plein écran, mises à jour optimistes, haptique mobile, listes FlashList, transitions reanimated).
- `pnpm lint && pnpm typecheck && pnpm test` au vert.

Parallélisation possible : M3 (core) peut démarrer en même temps que M1 et M2, après M0 (fait : M3 terminée pendant M1).

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
- ARCHITECTURE §11 cite Playwright dans la CI : non inclus dans `ci.yml`. **En cours** : ajout planifié en M1 (validé le 2026-09-18).
- ~~`docs/RELEASE.md` et `projectId` EAS~~ : aligné le 2026-09-18.
- EAS signale que `runtimeVersion: appVersion` + `updates.url` supposent `expo-updates`, non installé : à ajouter quand les mises à jour OTA seront utilisées (au plus tard M9).

---

## Phase M1 — Design system, shell et animations · `En cours`
Réf. : §6, ADR-012, ADR-017, ADR-011, ADR-021
Agents : `app-ui`, `release` (CI), `code-reviewer` — lancer avec `/phase M1`

- [ ] **Reliquat M0 (en premier)** : sur le téléphone Android (build de dev ou Expo Go), lecture de `app_meta` et bascule FR/EN vérifiées
- [x] Tokens v2 (thèmes sombre/clair par variables CSS, accent bleu décalé de `#5D99F9` — ADR-012, couleurs P&L bleu/gris et vert/rouge par thème, typo, rayons, espacements, **durées et courbes d'animation**) branchés sur NativeWind ; police Inter 400/500/600, chiffres tabulaires pour les montants (ADR-021) — vérifié par l'utilisateur sur iPhone (2026-09-18)
- [x] `packages/ui/src` inclus dans le `content` de Tailwind (classes des primitives générées)
- [ ] Primitives : **livrées** `Screen`, `Card`, `GlowCard`, `StatTile`, `Button`, `IconButton`, `Skeleton`, `ShimmerBar`, `ProgressBar`, `DayCell`, `EmptyState` ; **restent (M1-4)** `Segmented`, `Select`, `DateRangePicker`, `Sheet`, `Toast`
- [x] Animations reanimated (entrées de cartes, press states), respect de « réduire les animations » — à compléter pour `Sheet` et `Segmented` avec M1-4
- [x] Interface `Haptics` (`.native` expo-haptics / `.web` vide) utilisée par les primitives interactives
- [ ] **M1-5** Wrapper de liste virtualisée (FlashList) avec états vide / chargement / fin de liste
- [ ] **M1-6** Interface `Chart` + adaptateurs `.web` (recharts) / `.native` (victory-native, Skia) : ligne/aire, barres, histogramme ; heatmap sans bibliothèque (ADR-021 ; dépendances natives limitées à Expo Go)
- [ ] **M1-7** i18n FR/EN ; affichage des montants/dates/nombres en **consommant `packages/core/format`** (livré par M3, propriétaire `core-engine`)
- [x] Layout connecté (ADR-011) : shell à onglets Dashboard · Calendrier · Trades · Journal · Plus + bouton d'ajout rapide global, sidebar web ≥ 1024 px, header avec sélecteur de compte + période (données factices), transitions entre onglets
- [ ] **M1-9** Bascule de thème et de couleurs P&L sans rechargement + masquage des montants (icône œil) : **persistance** des bascules ; **catalogue exclu du bundle de production**
- [x] Page « catalogue » interne (dev only) affichant les composants et leurs états (`apps/app/app/(dev)/catalog.tsx`) — à compléter au fil des primitives restantes
- [x] Contraste AA des textes secondaires (`textMuted` / `textSecondary`, petites tailles), §6.2 — retour utilisateur M0 traité, relu sur iPhone (2026-09-18)
- [ ] **Correctif** (remonté le 2026-09-24) : montants tronqués dans les cellules du calendrier (`DayCell`) — adapter taille et troncature aux montants longs et aux grandes tailles de police, vérifié sur les 3 plateformes
- [ ] **Q1** Tests des primitives et du shell (rendu, états, « réduire les animations »)
- [ ] Job Playwright dans la CI (`ci.yml`, propriétaire `release`) — résout la dérive M0
- [ ] Build EAS Android **dev** (vérification sur l'appareil) puis **preview** (build release) pour la mesure de fluidité (ADR-021, quota gratuit)

**Critères de fin** : le catalogue s'affiche sur iOS, Android et web, en sombre et en clair ; changement de thème instantané ; avec « réduire les animations » activé, aucune animation de déplacement ne joue ; fluidité :
- **Android** : sur l'APK preview (build release), « Profil de rendu HWUI → barres » (options développeur) activé, 10 ouvertures/fermetures de `Sheet` et 10 bascules de `Segmented` : barres sous la ligne verte ;
- **Web** : test Playwright automatique (CPU ralenti ×4) sur les mêmes interactions : moyenne ≥ 55 fps, aucune image > 50 ms ;
- mesure Flashlight reportée à M9.

---

## Phase M2 — Auth, onboarding et comptes · `À faire`
Réf. : §5.1, §5.11, ADR-018, ADR-019
Agents : `database`, `app-ui`, `qa-tests`, `security-auditor` — lancer avec `/phase M2`

- [ ] Tables `profiles`, `preferences`, `accounts`, `cash_movements` + RLS + tests RLS (B ne lit ni n'écrit rien de A)
- [ ] Écrans login / signup / mot de passe oublié / magic link (Google et Sign in with Apple mis de côté, voir « Décisions mises de côté » n° 6)
- [ ] Onboarding animé : prénom, marchés, style, devise d'affichage, fuseau, premier compte (manuel)
- [ ] Gestion des comptes : créer / éditer / archiver ; type (`personal`, `demo`, `backtest`, `prop_challenge`, `prop_funded`, `paper`), devise, solde initial, fuseau, heure de bascule ; dépôts/retraits
- [ ] Sélecteur de compte global (« Tous les comptes » selon ADR-019) branché sur les vraies données, persisté (Zustand + URL web)
- [ ] Préférences : langue, thème, couleurs P&L, premier jour de semaine, masquage des montants
- [ ] Splash « Bon retour, {prénom} » court (< 1 s), préchargement des requêtes du dashboard
- [ ] Déconnexion ; suppression de compte selon la décision d'ADR-018
- [ ] Sécurité session : sur `SIGNED_OUT`, `queryClient.clear()` + suppression du cache persisté ; clé de persistance du cache propre à chaque utilisateur
- [ ] Web : `flowType: 'pkce'` ; `detectSessionInUrl` activé uniquement avec PKCE (magic link, reset)
- [ ] Deep links (`scheme edgebook`) : liste blanche de chemins ; jamais de redirection dérivée d'un paramètre entrant
- [ ] Auth cloud (tableau de bord, ADR-020) : mot de passe ≥ 8 caractères avec exigences ; redirections d'auth en liste exacte
- [ ] Chaque nouvelle table : `revoke all` + `grant` explicites ; fonctions avec `search_path` figé ; tests RLS A/B ; `--passWithNoTests` interdit sur `test:rls`

**Critères de fin** : un nouvel utilisateur s'inscrit sur mobile, termine l'onboarding, crée un deuxième compte et retrouve tout sur le web ; les tests RLS de ces tables passent (`test:rls` échoue s'il n'y a aucun test) ; les créations/éditions de compte sont optimistes ; test : après déconnexion de A puis connexion de B sur le même appareil, aucune donnée de A n'est restaurée depuis le cache.

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
- [ ] Trade log FlashList : filtres (compte, période, symbole, tag, setup, résultat), tri, pagination par curseur
- [ ] Détail en sheet : édition, suppression, tags/setups, notes, captures (upload Storage)
- [ ] Gestion des tags et setups (création, couleur, type)
- [ ] Mises à jour optimistes sur création/édition/suppression, invalidation ciblée des requêtes calendrier/dashboard

**Critères de fin** : avec le seed, le trade log filtré sur `Prop Challenge 200k` et mars 2026 liste 24 trades ; un trade créé sur mobile apparaît immédiatement (optimiste) puis sur le web après rafraîchissement ; défilement du trade log à 60 fps avec 1 000 trades générés ; tests RLS (tables + Storage) verts.

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

**Critères de fin** : avec le seed, sur les 3 plateformes, mars 2026 affiche exactement 24 trades, −17 527,71 et 3 jours gagnants / 7 perdants ; le dashboard de `Prop Challenge 200k` (toute la période) affiche un solde de 180 256,57 $ et −9,87 % ; test E2E : passer de mars à avril n'affiche jamais un chiffre de mars ; premier affichage du dashboard < 1,5 s (protocole ADR-017).

---

## Phase M6 — Journal et psychologie · `À faire`
Réf. : §5.6
Agents : `database`, `app-ui`, `qa-tests`, `security-auditor` — lancer avec `/phase M6`
Dépend de : M5

- [ ] Table `journal_entries` + RLS ; captures du journal via `attachments` + Storage
- [ ] Check-in pré-session (humeur, sommeil, plan, biais) et débrief post-session (humeur, respect du plan, notes, leçons), émotions en tags
- [ ] Brouillon local persistant (mobile et web) jusqu'à l'enregistrement
- [ ] Mode Psych du calendrier (couleur par humeur) et lien jour ↔ journal
- [ ] Seed : entrées de journal des 12 et 13 septembre 2026 sans trade

**Critères de fin** : les 12 et 13 septembre 2026 s'affichent comme « journal seul » et le mode Psych les colore selon l'humeur ; une entrée avec capture créée sur mobile est visible sur le web ; un brouillon survit à la fermeture de l'app ; enregistrement optimiste.

---

## Phase M7 — Analytics · `À faire`
Réf. : §5.4
Agents : `core-engine`, `app-ui`, `qa-tests` — lancer avec `/phase M7`
Dépend de : M5 (peut avancer en parallèle de M6)

- [ ] Écran Analytics avec filtres partagés (compte, période, tag, setup) et graphiques `Chart`
- [ ] Rapports : equity & drawdown, par symbole, setup, tag, session, heure, jour de semaine, distribution des R
- [ ] Heatmap heure × jour ; tuiles de stats (win rate, PF, espérance, ratio moyen, séries)
- [ ] Transitions animées entre rapports, squelettes par graphique

**Critères de fin** : avec le seed, sur `Prop Challenge 200k` toute période : win rate 16 %, profit factor 0,56, ratio moyen 2,92 ; pire jour affiché = 30 mars 2026 ; chaque rapport concorde avec les fonctions de `packages/core` (tests sur fixtures) ; identique sur les 3 plateformes.

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

## Phase M9 — Finition, performance et QA 3 plateformes · `À faire`
Réf. : §6, §9, §10, §11, ADR-017
Agents : `qa-tests`, `app-ui`, `security-auditor`, `code-reviewer`, `release` — lancer avec `/phase M9`
Dépend de : M1–M8

- [ ] Protocole de performance ADR-017 documenté et exécuté : 60 fps (trade log, calendrier, sheets, segments), dashboard < 1,5 s, résultats consignés
- [ ] Passe de finition visuelle écran par écran (espacements, états vides, erreurs, transitions, haptique) en sombre et clair
- [ ] Playwright (parcours web principaux) + Maestro (parcours iOS et Android principaux) : inscription, onboarding, saisie de trade, calendrier, journal, analytics, règles
- [ ] Audit accessibilité (tailles dynamiques, contraste AA, lecteurs d'écran) et i18n (aucun texte en dur, FR/EN complets)
- [ ] Audit sécurité : RLS de toutes les tables et du Storage, aucun secret client, session sécurisée
- [ ] Déploiement web de préproduction (hébergement statique) et builds EAS internes (pas de soumission aux stores)
- [ ] CSP stricte sur l'hébergement web (jetons en `localStorage`, pas de cookie `httpOnly` sans serveur — ADR-016, ARCHITECTURE §9)

**Critères de fin** : suites Playwright et Maestro vertes sur web, iOS et Android ; mesures ADR-017 atteintes et consignées ; aucun point bloquant de `security-auditor` ni de `code-reviewer` ; web de préproduction et builds internes utilisables avec le compte démo ; en-tête CSP vérifié sur la préproduction.

**Avant toute ouverture publique** (bloquant, même hors stores) : confirmation d'e-mail activée sur le projet de production ; ADR-018 tranché et implémenté ; export RGPD des données ; politique de confidentialité ; disclaimer financier (pas de conseil en investissement).

---

## Décisions mises de côté (à trancher plus tard)

> Notées le 2026-09-17 à la demande de l'utilisateur. Aucune n'est validée. En attendant, on applique le **choix provisoire** (le moins engageant) pour ne pas bloquer les phases. Le trancher → `/decide <sujet>`.

| # | Sujet | Proposition de Claude | Choix provisoire en attendant | Au plus tard |
|---|---|---|---|---|
| 1 | Suppression de compte (ADR-018) | B (report) si test privé ; A (Edge Function) si web public | B — report | Avant toute ouverture publique |
| 2 | « Tous les comptes » multi-devises (ADR-019) | A — un total par devise, sans conversion | **Tranchée le 2026-09-18 : A** (ADR-019 `Acceptée`) | — |
| 3 | Écritures atomiques (ADR-016) | Fonction Postgres transactionnelle (trade + exécutions + tags + checklist), valeurs déjà calculées par `packages/core`, aucun calcul SQL | Appliquée | M4 |
| 4 | Règle `max_total_loss` (perte max vs solde initial) | L'ajouter pour garder le critère « 256,57 $ restants » | Ajoutée | M8 |
| 5 | Onglets MVP (ADR-011) | Dashboard · Calendrier · Trades · Journal · Plus | **Tranchée le 2026-09-18** (ADR-011 `Acceptée`, + ajout rapide global) | — |
| 6 | Google + Sign in with Apple | Selon les comptes développeur disponibles | Reportés : email + mot de passe + magic link uniquement | P6 (stores) |
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

## Phase P6 — Conformité et publication sur les stores · `Reportée`
Réf. : §5.11, §9, §11, §12
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
- Application desktop (Tauri) si demande
