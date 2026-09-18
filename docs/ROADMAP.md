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

Parallélisation possible : M3 (core) peut démarrer en même temps que M1 et M2, après M0.

---

## Phase M0 — Fondations sans serveur · `En cours`
Réf. : §0, §3, §4, §11 · Release : `docs/RELEASE.md`
Agents : `release`, `database`, `app-ui`, `core-engine` — lancer avec `/phase M0`

- [x] `git init`, dépôt GitHub privé `wasslasGOAT/tradingjournal` — commits `4827604` et `e3ade54` poussés sur `main` (2026-09-18)
- [x] Monorepo pnpm + Turborepo, `packages/config` (tsconfig strict, eslint, prettier, `APP_NAME`)
- [x] `apps/app` : Expo + Expo Router + NativeWind, cible web activée, écran « Hello » — vérifié sur web (Playwright) ; iOS/Android : voir « Reste pour clôturer »
- [x] Squelettes de `packages/core`, `packages/schemas`, `packages/ui`, `packages/i18n` (structure MVP : ARCHITECTURE §0.2)
- [x] Supabase (ADR-020) : `supabase init` + lien au projet cloud de dev (UE), migration `app_meta` appliquée (`db:push`), `db:types` (cloud) / `db:types:local` (Docker) → `packages/db` ; `db:reset` = local (CI) — **pas de script `--linked` dédié** (voir Dérives)
- [x] Client Supabase dans `apps/app/lib` (session persistée : SecureStore + AES-256-GCM natif, stockage web), TanStack Query + persistance (AsyncStorage derrière une interface, ARCHITECTURE §10)
- [x] Vitest configuré (94 tests) ; tests RLS (deux sessions, 12 tests verts contre le cloud de dev, après la migration `20260918090000_harden_rls_guard`) ; GitHub Actions : lint + typecheck + test + build web + scan de secrets, Supabase local pour `db reset`, contrôle des types et tests RLS — déclenchée par le push, **résultat à vérifier**
- [x] `.env.example` de l'app (URL + clé anon uniquement), documenté
- [ ] Compte Expo, EAS configuré (projet `@wassimaha/edgebook`, profils development / preview / production) — `expo-dev-client` installé ; **build de dev Android lancé le 2026-09-18** (build `8dab747f-a8e8-4994-aced-79fdc8cdbc31`, en file d’attente pendant un incident EAS) ; iOS via Expo Go non vérifié

Critères de fin :
- [x] `pnpm dev` lance l'app ; `pnpm lint && pnpm typecheck && pnpm test`, `pnpm build`, `pnpm check:secrets` (source, historique, bundle) au vert
- [x] Web : l'app lit `app_meta` (`schema_version = 1`) depuis la base de dev cloud (Playwright)
- [ ] iOS (Expo Go) et Android (build de dev) lisent `app_meta`
- [x] La CI utilise Supabase local (workflow écrit)
- [ ] La CI passe sur GitHub
- [x] Aucun secret autre que la clé anon dans l'app

**Reste pour clôturer** :
1. ~~Premier commit + push~~ (fait). Vérifier la CI : https://github.com/wasslasGOAT/tradingjournal/actions (jobs `quality` et `db`).
2. Build de dev Android : lancé ; récupérer l’APK sur https://expo.dev/accounts/wassimaha/projects/edgebook/builds/8dab747f-a8e8-4994-aced-79fdc8cdbc31, l’installer, puis `pnpm dev:app` et ouvrir le projet dans l’app de dev.
3. Vérification par l'utilisateur sur iPhone (Expo Go) et Android : écran « Hello » + `schema_version = 1`, FR/EN.
4. Optionnel (non bloquant) : Maestro `apps/app/.maestro/hello.yaml` non exécuté sur ce poste ; cas Playwright « configuration absente » ignorés quand `.env` est présent (couverts en CI).

**Dérives relevées à la clôture** (à trancher, voir rapport architecte du 2026-09-18) :
- ADR-020 prévoit un script explicite et confirmé pour `db reset --linked` : absent (seul `db:reset` local existe). Aligner (script `db:reset:linked` avec confirmation, `release`) ou acter.
- ARCHITECTURE §11 cite Playwright dans la CI : non inclus dans `ci.yml`. À ajouter en M1 ou à acter.
- ~~`docs/RELEASE.md` et `projectId` EAS~~ : aligné le 2026-09-18.
- EAS signale que `runtimeVersion: appVersion` + `updates.url` supposent `expo-updates`, non installé : à ajouter quand les mises à jour OTA seront utilisées (au plus tard M9).

---

## Phase M1 — Design system, shell et animations · `À faire`
Réf. : §6, ADR-012, ADR-017, ADR-011
Agents : `app-ui`, `code-reviewer` — lancer avec `/phase M1`

- [ ] Tokens (couleurs sombre/clair, accent bleu, couleurs P&L bleu/gris et vert/rouge, typo, rayons, espacements, **durées et courbes d'animation**) branchés sur NativeWind
- [ ] Primitives : `Screen`, `Card`, `GlowCard`, `StatTile`, `Button`, `IconButton`, `Segmented`, `Select`, `DateRangePicker`, `Sheet`, `Skeleton`, `ShimmerBar`, `ProgressBar`, `DayCell`, `EmptyState`, `Toast`
- [ ] Animations reanimated (entrées de cartes, sheet, segmented, press states), respect de « réduire les animations »
- [ ] Interface `Haptics` (`.native` expo-haptics / `.web` vide) utilisée par les primitives interactives
- [ ] Wrapper de liste virtualisée (FlashList) avec états vide / chargement / fin de liste
- [ ] Interface `Chart` + adaptateurs `.web` (recharts) / `.native` (victory-native) : ligne/aire, barres, histogramme, heatmap
- [ ] i18n FR/EN, formatage monnaie/date/nombre selon la locale (`packages/core/format`)
- [ ] Layout connecté (ADR-011 appliqué par défaut) : tab bar mobile Dashboard · Calendrier · Trades · Journal · Plus, sidebar web ≥ 1024 px, header avec sélecteur de compte + période (données factices), transitions entre onglets
- [ ] Bascule de thème et de couleurs P&L sans rechargement ; masquage des montants (icône œil)
- [ ] Page « catalogue » interne (dev only) affichant tous les composants et leurs états

**Critères de fin** : le catalogue s'affiche sur iOS, Android et web, en sombre et en clair ; changement de thème instantané ; avec « réduire les animations » activé, aucune animation de déplacement ne joue ; ouverture/fermeture d'une `Sheet` et bascule de `Segmented` à 60 fps sur Android milieu de gamme (build release).

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

## Phase M3 — Moteur de trading (core) · `À faire`
Réf. : §5.2, §5.4, DATA_MODEL
Agents : `core-engine`, `code-reviewer` — lancer avec `/phase M3` (parallélisable avec M1/M2)

- [ ] Types `Money`, `Decimal`, `TradingDay` ; calcul du jour de trading (fuseau + bascule)
- [ ] Regroupement exécutions → trades (FIFO, moyenne), positions partielles, long/short
- [ ] P&L brut/net, multiplicateur de contrat, R multiple ; solde = solde initial + Σ P&L net + mouvements de trésorerie
- [ ] Stats : win rate, profit factor, espérance, gain/perte moyens, ratio moyen, drawdown (montant, %), séries
- [ ] Agrégats : par jour de trading (cellules du calendrier, totaux hebdo, stats du mois), série d'equity, par dimension (symbole, setup, tag, session, heure, jour de semaine), distribution des R
- [ ] Agrégation multi-comptes selon ADR-019
- [ ] Schémas zod des formulaires dans `packages/schemas` (trade, exécution, compte, journal, règle, checklist)
- [ ] **Tests golden** sur le jeu de référence ; couverture ≥ 90 % sur `packages/core`

**Critères de fin** : `pnpm test --filter core` est vert ; au centime près : solde initial 200 000, P&L −19 743,43 → rendement −9,87 %, win rate 16 %, ratio moyen 2,92, profit factor 0,56 ; mars 2026 = 24 trades, −17 527,71, 3 jours gagnants / 7 perdants ; 1er avril = −2 215,72 ; pire jour = 30 mars 2026.

---

## Phase M4 — Saisie manuelle et trade log · `À faire`
Réf. : §5.2, §0.3, ADR-004, ADR-016
Agents : `database`, `core-engine`, `app-ui`, `qa-tests`, `security-auditor` — lancer avec `/phase M4`
Dépend de : M1, M2, M3

- [ ] Tables `instruments` (catalogue de base en lecture publique + instruments créés par l'utilisateur), `executions`, `trades`, `tags`, `trade_tags`, `trade_notes`, `attachments` + bucket Storage + RLS (tables et Storage)
- [ ] Fonction Postgres transactionnelle d'écriture d'un trade (valeurs calculées par `packages/core`, aucun calcul SQL) — ADR-016
- [ ] Seed : utilisateur démo, comptes `Prop Challenge 200k` (USD, type `prop_challenge`) et `Compte perso actions` (EUR), jeu de mars 2026 + 1er avril
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
| 2 | « Tous les comptes » multi-devises (ADR-019) | A — un total par devise, sans conversion | A | M5 |
| 3 | Écritures atomiques (ADR-016) | Fonction Postgres transactionnelle (trade + exécutions + tags + checklist), valeurs déjà calculées par `packages/core`, aucun calcul SQL | Appliquée | M4 |
| 4 | Règle `max_total_loss` (perte max vs solde initial) | L'ajouter pour garder le critère « 256,57 $ restants » | Ajoutée | M8 |
| 5 | Onglets MVP (ADR-011) | Dashboard · Calendrier · Trades · Journal · Plus | Appliqués | M1 |
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
