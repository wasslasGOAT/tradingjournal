# Journal des décisions (ADR)

> Toute décision structurante est notée ici. Pour changer d'avis : ajouter un nouvel ADR qui **remplace** l'ancien (ne pas effacer l'historique), puis mettre à jour les autres docs.
> Statuts : `Proposée` · `Acceptée` · `Remplacée par ADR-xxx` · `Abandonnée`

## Modèle
```
## ADR-XXX — Titre
Statut : Proposée | Date : AAAA-MM-JJ
Contexte : pourquoi la question se pose.
Décision : ce qu'on fait.
Conséquences : ce que ça implique, ce qui devient plus dur.
Alternatives : ce qu'on a écarté et pourquoi.
Réversibilité : facile / moyenne / coûteuse.
```

---

## ADR-001 — Une seule base de code UI avec Expo pour web, iOS et Android
Statut : Remplacée par ADR-023 (2026-09-25) | Date : 2026-09-17
Contexte : l'app doit être disponible en ligne et dans les deux stores, avec une équipe réduite.
Décision : Expo + Expo Router avec sortie web ; code spécifique à une plateforme via `.web.tsx` / `.native.tsx`.
Conséquences : les graphiques et certains composants demandent des adaptateurs ; le SEO du web applicatif est limité (un site vitrine séparé pourra être ajouté).
Alternatives : Next.js + Expo (deux UI à maintenir), Flutter (écosystème TS perdu).
Réversibilité : moyenne. `packages/core`, `schemas` et `api-client` restent réutilisables par un Next.js.

## ADR-002 — Supabase pour la base, l'auth et le stockage
Statut : Acceptée | Date : 2026-09-17
Contexte : besoin de Postgres, d'auth sociale (Apple/Google), de stockage de fichiers et d'isolation par utilisateur.
Décision : Supabase Cloud, région UE, RLS sur toutes les tables utilisateur.
Conséquences : dépendance à Supabase Auth ; les migrations se font en SQL.
Alternatives : Neon + Better Auth + S3 (plus d'assemblage).
Réversibilité : moyenne (Postgres standard, auth à migrer).

## ADR-003 — API métier séparée (Hono) plutôt que tout en Edge Functions
Statut : Remplacée par ADR-016 pendant le MVP (réintroduction prévue après le MVP) | Date : 2026-09-17
Contexte : imports volumineux, synchro longue, streaming IA et secrets des brokers.
Décision : `apps/server` Node + Hono (API) et le même binaire en mode worker (pg-boss).
Conséquences : un service à héberger (Fly.io/Railway).
Alternatives : Supabase Edge Functions (limites de durée), tRPC (moins portable pour les webhooks).
Réversibilité : facile (Hono tourne aussi en edge).

## ADR-004 — Exécutions et trades sur deux niveaux
Statut : Acceptée | Date : 2026-09-17
Contexte : la généralisation aux actions, options, futures et crypto impose de gérer les entrées et sorties partielles.
Décision : `executions` (fills) regroupées en `trades` par un algorithme configurable (FIFO par défaut).
Conséquences : l'import est un peu plus complexe ; les statistiques restent fiables.
Réversibilité : coûteuse.

## ADR-005 — Montants en Decimal, jamais en float
Statut : Acceptée | Date : 2026-09-17
Décision : `numeric` en base, `decimal.js` en TS, chaînes dans l'API.
Précisions (M0, 2026-09-18) :
- Constructeur `Decimal` configuré une seule fois dans `packages/core/src/money` : `precision: 40` (le défaut 20 arrondit silencieusement des sommes de `numeric(20,8)`), arrondi `ROUND_HALF_EVEN` (arrondi bancaire, sans biais sur les agrégats et moyennes).
- Import direct de `decimal.js` interdit hors `packages/core/src/money` (règle ESLint) : tout le code importe `Decimal` depuis `money`.
Précisions (M3, 2026-09-24) :
- **Écriture en base** : tout montant passe par `toDbAmount(montant, scale)` (`ROUND_HALF_EVEN`) — `scale = 8`, `numeric(20,8)` pour les montants, `numeric(24,8)` pour les quantités. Aucun arrondi implicite ailleurs ; l'affichage arrondit sans jamais modifier la valeur stockée.
- **Répartition** d'une commission ou de frais entre plusieurs trades : `allocateProRata(total, poids, scale)` — la somme des parts est strictement égale au total, la **dernière part de poids non nul** absorbe l'écart d'arrondi, un poids nul reçoit exactement 0.
- Détail et conventions statistiques associées : `DATA_MODEL.md` § « Conventions de calcul (M3) ».
Réversibilité : coûteuse.

## ADR-006 — Agrégats journaliers matérialisés
Statut : Remplacée par ADR-016 pendant le MVP (réintroduction prévue après le MVP) | Date : 2026-09-17
Contexte : le dashboard et le calendrier doivent être instantanés sur mobile.
Décision : table `daily_stats` recalculée par le worker après chaque changement.
Conséquences : léger délai après un import ; la fraîcheur des données doit être visible.
Réversibilité : facile.

## ADR-007 — Le LLM ne calcule jamais les chiffres
Statut : Acceptée | Date : 2026-09-17
Contexte : l'app de référence affiche un conseil qui contredit les métriques (« solid win rate » avec 16 %).
Décision : métriques et score déterministes dans `packages/core` ; insights produits par des règles ; le LLM ne fait que formuler et converser, via des outils en lecture seule.
Réversibilité : facile (mais à ne pas faire).

## ADR-008 — Score sur 5 piliers avec pondération versionnée
Statut : Proposée | Date : 2026-09-17
Décision : Rentabilité 30, Gestion du risque 20, Régularité 25, Discipline 15, Exécution 10 (hypothèse calibrée sur la référence : 50,6 → 51). Poids stockés en config versionnée.
Réversibilité : facile. **À valider par l'utilisateur.**

## ADR-009 — Paiements via RevenueCat
Statut : Acceptée | Date : 2026-09-17
Contexte : les abonnements numériques vendus dans les apps passent par les achats intégrés des stores ; le web passe par Stripe.
Décision : RevenueCat comme source unique des droits.
Réversibilité : moyenne.

## ADR-010 — Règles prop firm stockées en données
Statut : Acceptée | Date : 2026-09-17
Décision : `rule_sets` en JSON versionné et évaluateur générique ; ajouter une firme ne demande pas de code.
Réversibilité : facile.

## ADR-011 — Navigation : tab bar sur mobile, sidebar sur le web large
Statut : Acceptée (2026-09-18, version MVP ci-dessous) | Date : 2026-09-17
Contexte : dans la référence, le drawer demande deux taps pour chaque changement d'écran.
Décision : tabs Dashboard, Calendrier, Journal, Coach, Plus.
Réversibilité : facile.
Note MVP (2026-09-17) : reste `Proposée` mais s'applique par défaut dans le MVP (ADR-015). Le Coach étant hors MVP, son onglet est remplacé par **Trades** : Dashboard · Calendrier · Trades · Journal · Plus (Analytics, Règles, Réglages).
Validation (utilisateur, 2026-09-18) : onglets mobile **Dashboard · Calendrier · Trades · Journal · Plus** (Analytics, Règles, Réglages) + **bouton d'ajout rapide global** ; sidebar sur le web ≥ 1024 px. L'onglet Coach sera réintroduit post-MVP (P2) par un nouvel ADR.
Note (2026-09-25, ADR-023) : la décision reste valable telle quelle ; seule l'implémentation change (`apps/web`, TanStack Router, barre d'onglets en CSS `backdrop-filter` au lieu d'`expo-blur`). « Mobile » = largeur < 1024 px dans le navigateur ou la PWA.

## ADR-012 — Identité visuelle et nom
Statut : Acceptée pour la direction visuelle · Proposée pour le nom et le logo | Date : 2026-09-17 (mise à jour 2026-09-17)
Contexte : l'app s'inspire de TradeX mais ne doit pas en reprendre le nom, le logo ni les textes.
Décision initiale : nom de travail « Edgebook », palette sombre avec accent bleu en attendant une identité définitive.
Mise à jour (validée par l'utilisateur) : la **direction visuelle est acceptée** : thème sombre par défaut (clair disponible), accent bleu, profits en bleu avec option vert/rouge (`preferences.pnl_colors`). Niveau de finition visé : comparable à l'app de référence, sans en copier le nom, le logo, les textes ni les maquettes à l'identique (exigences mesurables : ADR-017). Le nom « Edgebook » et le logo restent **provisoires**.
Précision (utilisateur, 2026-09-18) : l'accent bleu est **légèrement décalé** de `#5D99F9` (teinte de la référence) pour ne pas en copier l'identité ; valeur exacte fixée dans `packages/ui/tokens.ts` en M1, contraste AA vérifié.
Précision (2026-09-25, ADR-023/024) : la source unique des tokens reste `packages/ui/src/tokens.data.cjs`, consommée par NativeWind (`apps/app`, gelé) et par le thème Tailwind v4 d'`apps/web` (sous-chemin d'export `@repo/ui/tokens-data`).
Réversibilité : facile (`packages/config`, `packages/ui/tokens.ts`). **Nom et logo à décider par l'utilisateur.**

## ADR-013 — Langues : FR et EN dès la V1
Statut : Acceptée | Date : 2026-09-17
Décision : i18next ; formats de date, de monnaie et premier jour de semaine selon la locale.
Réversibilité : facile.

## ADR-014 — Développement par une équipe de sous-agents Claude Code
Statut : Acceptée | Date : 2026-09-17
Contexte : projet large (3 plateformes, IA, connecteurs, paiements) mené avec Claude Code ; il faut un contexte ciblé par domaine et des relectures indépendantes.
Décision : 11 sous-agents dans `.claude/agents/` avec des zones de fichiers distinctes ; la session principale orchestre via `/phase`. Deux relecteurs en lecture seule (`code-reviewer`, `security-auditor`).
Conséquences : plus de tokens par phase, en échange de revues systématiques et d'un contexte plus propre pour chaque agent.
Alternatives : une seule session sans agents (plus simple, moins de contrôle).
Réversibilité : facile (supprimer ou fusionner des fichiers d'agents).

## ADR-015 — Construire d'abord un MVP à périmètre réduit
Statut : Acceptée — plateformes du MVP remplacées par ADR-023 (2026-09-25) : web responsive + PWA ; iOS/Android via Capacitor en P6 | Date : 2026-09-17
Contexte : le périmètre complet (imports, connecteurs, IA, prop firms, paiements, stores) retarde le moment où le produit est utilisable ; l'utilisateur veut d'abord un MVP très soigné visuellement.
Décision : le MVP couvre, sur **web + iOS + Android en même temps** (vérifiés à chaque phase) : dashboard, calendrier (P&L + Psych), liste/détail des trades, saisie et édition **manuelles** des trades, tags/setups, journal + psychologie (pré/post-session, humeur, émotions, captures), analytics (equity, drawdown, par symbole/setup/session/heure/jour, distribution des R), règles perso + checklists, comptes multiples (perso, démo, backtest, prop saisi à la main), FR/EN, thèmes sombre/clair. Données de démo via le seed.
**Hors MVP** : import CSV (premier chantier après le MVP), synchro/connecteurs brokers, modèles de règles prop firm (`rule_sets`), coach IA et score, abonnements/paywall, publication sur les stores. Les ADR-008, 009 et 010 restent valables mais ne s'appliquent qu'après le MVP.
Priorité n° 1 : qualité visuelle et fluidité (ADR-012, ADR-017).
Conséquences : roadmap restructurée en phases M0–M9 puis « Après le MVP » ; les agents `backend`, `connectors` et `ai-coach` ne sont pas sollicités pendant le MVP ; `packages/api-client` est reporté. Un compte prop se gère comme un compte manuel `prop_challenge`/`prop_funded` avec des règles perso.
Alternatives : garder la roadmap 0–12 (premier usage réel beaucoup plus tard) ; MVP avec import CSV (demande le serveur, ou un parsing côté client à refaire ensuite).
Réversibilité : facile (ordre de construction, aucun choix technique irréversible).

## ADR-016 — MVP sans serveur : client → Supabase, calculs par `packages/core` dans l'app
Statut : Acceptée | Date : 2026-09-17
Remplace pendant le MVP : ADR-003 (API Hono + worker pg-boss) et ADR-006 (`daily_stats` matérialisés par le worker).
Contexte : sans import, synchro, IA ni paiement, aucune fonction du MVP n'exige de secret, de tâche longue ni de tiers ; un serveur ajouterait hébergement, contrat d'API et client généré sans valeur pour l'utilisateur.
Décision :
- L'app parle **uniquement à Supabase** (Auth, Postgres avec RLS, Storage) via `supabase-js` et les types générés (`supabase gen types`). Pas d'`apps/server`, pas de worker, pas de `packages/api-client`.
- **Tous les calculs** (jour de trading, regroupement exécutions → trades, P&L, R, stats, agrégats du calendrier et du dashboard, évaluation des règles perso) sont faits par `packages/core` dans l'app, mis en cache par TanStack Query. Les invariants de `CLAUDE.md` restent inchangés.
- Les valeurs dérivées stockées (`trades.trading_day`, `net_pnl`, `r_multiple`…) sont calculées par `packages/core` avant écriture. Les écritures multi-tables (trade + exécutions + tags + checklist) passent par une **fonction Postgres transactionnelle** (`security invoker`, soumise à la RLS) qui insère des valeurs déjà calculées, **sans aucun calcul en SQL**. *(Modalité à confirmer par l'utilisateur.)*
- Les montants sont lus en chaîne (`colonne::text` dans les `select`) puis convertis en `Decimal` : PostgREST renvoie `numeric` en nombre JSON par défaut.
- `daily_stats` n'est pas créée : le calendrier et le dashboard agrègent à la volée les trades de la période.
Conséquences : aucun service à héberger ; la RLS est la seule barrière de sécurité (tests RLS obligatoires dès M0/M2). Le calcul côté client suffit pour les volumes d'une saisie manuelle (ordre de grandeur : quelques milliers de trades par compte) ; au-delà, ou dès l'import CSV, ADR-006 est réintroduit. Si le fuseau ou l'heure de bascule d'un compte change, l'app recalcule et réécrit `trading_day` des trades concernés. La suppression de compte n'a pas de solution sans `service_role` : voir ADR-018. Les agrégats multi-devises : voir ADR-019.
Réintroduction : après le MVP (import CSV, coach IA, connecteurs), ADR-003 et ADR-006 redeviennent applicables via un nouvel ADR qui remplacera celui-ci. `packages/core` étant pur, le même code tournera côté serveur sans réécriture.
Alternatives : Hono dès le MVP (coût d'infra et de contrat d'API sans besoin) ; Supabase Edge Functions pour les agrégats (runtime Deno, logique hors de `packages/core`) ; vues/fonctions SQL d'agrégation (duplique la logique métier en SQL, contraire aux invariants).
Réversibilité : facile (ajout d'un serveur et d'agrégats sans changer le schéma existant).

## ADR-017 — Exigences de fluidité et de finition UX
Statut : Acceptée — moyens techniques et protocole de mesure remplacés par ADR-023 (2026-09-25) ; les exigences mesurables restent | Date : 2026-09-17
Contexte : la qualité visuelle et la fluidité sont la priorité n° 1 du MVP (ADR-015) ; « pro, ergonomique, fluide » doit devenir vérifiable.
Décision : exigences applicables à chaque écran du MVP, vérifiées en clôture de phase :
- Animations et transitions avec **react-native-reanimated** (durées et courbes en tokens dans `packages/ui`), respect du réglage système « réduire les animations ».
- **Squelettes** de chargement sur tous les écrans de données ; aucun spinner plein écran sur les écrans principaux.
- **Mises à jour optimistes** (TanStack Query, retour arrière en cas d'erreur) pour la création/édition de trades, tags, notes, journal, règles et checklists.
- **Retours haptiques** sur mobile (expo-haptics) : validation, bascules, segmented, suppression, erreur ; interface commune, implémentation web vide.
- **Listes virtualisées** (FlashList) pour toute liste pouvant dépasser 50 éléments.
- **60 fps visés** sur les interactions principales (défilement du trade log, changement de mois du calendrier, ouverture d'une sheet, bascule de segment) ; mesure sur un Android milieu de gamme en build release (moniteur de performance / Flashlight) et avec le profileur de performance du navigateur sur web.
- **Premier affichage du dashboard < 1,5 s** (seed, utilisateur connecté, Android milieu de gamme en build release ; web avec le throttling « mobile » de Lighthouse).
- **Aucune donnée périmée visible** au changement de mois ou de compte : clés de requête complètes (compte, période, mois), pas de `placeholderData` issu d'un autre mois/compte, squelette à la place.
Précision (M1, 2026-09-25) — **statut du critère de fluidité** :
- **La mesure native fait foi.** Protocole : APK **preview** (build release), « Profil de rendu HWUI → barres » (options développeur), 10 ouvertures/fermetures de `Sheet` et 10 bascules de `Segmented`, barres sous la ligne verte. Elle **n'a pas été exécutée** à la clôture de M1 (décision de l'utilisateur : clôturer sans elle) : **reportée, à faire avant toute publication, M9 au plus tard** (ROADMAP M1, dette D1).
- **La mesure web est informative, pas bloquante.** Test Playwright automatique (CPU ralenti ×4) sur un **export de production** (projet `chromium-perf-prod`) — jamais sur le bundle de développement, non représentatif (16,2 / 2,8 fps mesurés). Les seuils (moyenne ≥ 55 fps, aucune image > 50 ms) sont **conservés et rapportés** (annotations Playwright + `console.warn`), mais ne font pas échouer la suite. Raison structurelle : `react-native-reanimated` anime sur le **thread JS** en web (pas de thread UI dédié comme sur natif), donc un ralentissement CPU ×4 calibré pour un Android milieu de gamme pénalise le web de façon disproportionnée ; s'y ajoute, pour `Sheet`, le coût de montage du `Modal` de react-native-web (portail plein écran recréé à chaque ouverture). Mesures de référence M1 : `Segmented` 40–48 fps, `Sheet` 51–56 fps, images 83–567 ms.
- **Seule assertion bloquante côté web** : l'interaction produit bien des images (détecte une régression fonctionnelle, ex. une `Sheet` qui ne s'ouvre plus).
Conséquences : dépendances structurantes compatibles web + natif (reanimated, FlashList, expo-haptics derrière une interface) ; builds de développement EAS nécessaires ; protocole de mesure de performance documenté et exécuté en M9 (et contrôlé à chaque phase sur les écrans livrés).
Alternatives : `Animated` de React Native (animations sur le thread JS, moins fluides) ; Moti (surcouche de reanimated, ajoutable plus tard).
Révision (2026-09-25, ADR-023/024) — les exigences ci-dessus (squelettes, optimiste, virtualisation > 50 éléments, 60 fps, dashboard < 1,5 s, aucune donnée périmée, « réduire les animations ») **restent**. Les moyens deviennent : transitions CSS / `tw-animate-css` (+ `motion` si nécessaire) avec `prefers-reduced-motion` ; `@tanstack/react-virtual` au lieu de FlashList ; interface `Haptics` sans effet sur le web (implémentée par `@capacitor/haptics` en P6). **La mesure web fait désormais foi et est bloquante** : export de production (`vite preview`), CPU ×4, moyenne ≥ 55 fps, aucune image > 50 ms, et dashboard < 1,5 s sous throttling « mobile » de Lighthouse. La mesure HWUI sur APK EAS devient la mesure **Capacitor Android** en P6 (dette D1 transférée). Les précisions M1 ci-dessus portent sur `apps/app` (gelé).
Réversibilité : facile.

## ADR-018 — Suppression de compte pendant le MVP
Statut : Acceptée (2026-09-25, option B) | Date : 2026-09-17
Contexte : supprimer un utilisateur Supabase Auth exige la clé `service_role`, interdite côté client ; le MVP n'a pas de serveur (ADR-016). Apple impose la suppression in-app pour la publication ; le RGPD impose le droit à l'effacement dès qu'il y a des utilisateurs réels.
Options :
- **A. Supabase Edge Function minimale** `delete-account` : vérifie le JWT, purge les fichiers Storage de l'utilisateur, supprime `auth.users` (cascade sur les tables). + Suppression in-app dès le MVP, conforme. − Introduit un runtime (Deno) et un secret hors de l'app ; exception au « sans serveur ».
- **B. Report à la publication sur les stores** : pendant le MVP, suppression sur demande (lien e-mail dans Réglages, traitement manuel dans le tableau de bord Supabase). + Zéro infra. − Processus manuel ; inacceptable pour un lancement public.
- **C. Suppression logique côté client** (`profiles.deleted_at` + effacement des données via RLS, compte Auth conservé), purge réelle post-MVP. + Pas de secret. − Compte Auth résiduel : ce n'est pas une vraie suppression.
Recommandation : **B** si le MVP reste en test privé (utilisateurs invités) ; **A** si le web est ouvert au public pendant le MVP.
Décision (utilisateur, 2026-09-25) : **option B**, tant que l'accès reste privé (utilisateurs invités par le propriétaire).
- Réglages affiche un lien **« demander la suppression de mon compte »** (e-mail pré-rempli) ; le traitement est **manuel**, fait par l'utilisateur-propriétaire depuis le tableau de bord Supabase : suppression de `auth.users` (cascade sur les tables) puis purge des fichiers Storage.
- `profiles.deleted_at` est créée **dès la migration M2-1** (nullable) : elle marque une demande en cours, permet de bloquer l'accès applicatif en attendant la purge, et évite une migration de plus le jour de la bascule (DATA_MODEL § Utilisateur).
- **Bascule vers l'option A** (Edge Function `delete-account`, suppression in-app) **obligatoire avant toute ouverture publique** — déjà listée comme bloquante dans ROADMAP M9 § « Avant toute ouverture publique ». Elle ne demande aucun changement de schéma.
Conséquences : zéro infrastructure pendant le MVP, mais **aucune suppression en libre-service** : tant que B s'applique, l'inscription ne doit pas être ouverte au public et l'app ne peut pas être soumise aux stores (Apple exige la suppression in-app). Dès qu'un utilisateur réel autre que le propriétaire existe, le délai de traitement manuel doit rester compatible avec le RGPD (un mois).
Réversibilité : facile (A et B migrent vers `DELETE /v1/account`, ADR-003).

## ADR-019 — Agrégats multi-devises pendant le MVP
Statut : Acceptée (2026-09-18, option A) | Date : 2026-09-17
Contexte : la vue « Tous les comptes » convertit les comptes dans la devise d'affichage via `fx_rates` (ARCHITECTURE §1.2), table qu'un job serveur devait alimenter ; le MVP n'a pas de serveur et le seed mélange USD et EUR.
Options :
- **A. Regroupement par devise** : « Tous les comptes » affiche un total par devise, sans conversion. + Aucun taux à maintenir, chiffres exacts. − Pas de total unique.
- **B. Taux fournis par migration/seed** (table `fx_rates` lecture publique, mise à jour manuelle). + Total unique. − Taux vite périmés, affichage trompeur.
- **C. Taux saisis par l'utilisateur** dans les préférences. + Contrôle utilisateur. − Friction, erreurs de saisie.
Recommandation : **A** pour le MVP ; conversion réelle réintroduite avec le serveur (job de taux journaliers).
Décision (utilisateur, 2026-09-18) : **option A** — « Tous les comptes » affiche un total par devise, sans conversion. L'API de `packages/core` (agrégation multi-comptes) renvoie une collection par devise et reste prête pour une conversion ultérieure (paramètre de taux optionnel ajoutable sans casser les appelants).
Conséquence (M3, 2026-09-24) : sans table de taux, le P&L d'un trade n'est calculable que dans une seule devise. `grossPnl` suppose donc que l'**instrument est coté dans la devise du compte** et lève `InstrumentCurrencyMismatchError` sinon (erreur typée, jamais un chiffre faux). Un compte en EUR ne peut pas, pendant le MVP, journaliser un instrument coté en USD : la conversion arrivera avec les taux (post-MVP).
Réversibilité : facile.

## ADR-020 — Base Supabase cloud de dev pour le développement local
Statut : Acceptée | Date : 2026-09-17
Contexte : poste Windows 11 Home sans Docker ; l'app doit être testée sur un iPhone et un Android physiques, qui doivent joindre la base. Supabase CLI local exige Docker.
Décision : développement sur un **projet Supabase cloud « dev » (région UE)** lié via `supabase link`. La CI GitHub Actions garde Supabase local (Docker du runner) pour `db reset`, génération des types et tests RLS.
Conséquences :
- `supabase db push` et `supabase db reset --linked` agissent sur la base distante : `db reset --linked` est **destructif** (script explicite, confirmation).
- Utilisateurs de test créés dans le cloud ; confirmation d'e-mail désactivée sur le projet dev uniquement.
- Projet gratuit mis en pause après inactivité : le réactiver avant une session.
- Jamais de `service_role` côté client ni dans les tests (tests RLS avec clé anon + utilisateurs authentifiés).
- Les migrations restent la source de vérité (`supabase/migrations`), rejouées en CI sur base locale.
- Précision (utilisateur, 2026-09-25) — **confirmation d'e-mail** : **désactivée sur le projet de dev** (chaque inscription de test exigerait sinon une boîte mail réelle, et les parcours E2E d'inscription deviendraient instables) ; **activée sur le projet de production**, qui **reste à créer**. Activation et création du projet de production : bloquantes avant toute ouverture publique (ROADMAP M9).
- `supabase config push` est **proscrit** vers tout projet cloud : `supabase/config.toml` porte des réglages locaux permissifs (confirmation d'e-mail désactivée, mot de passe min 6, redirections `http://localhost:8081/**`, `allowed_cidrs 0.0.0.0/0`). L'auth cloud se règle dans le tableau de bord ; aucune redirection d'auth avec joker `/**` sur un domaine public (liste exacte).
Alternatives : Docker Desktop local (non installé sur ce poste, ajoutable plus tard) ; base partagée avec la préproduction (rejetée : isolation).
- Précision (2026-09-25, ADR-023/025) : les redirections locales passent de `http://localhost:8081` au port du serveur Vite d'`apps/web` ; l'URL **fixe** de préproduction Cloudflare Pages s'ajoute en liste exacte dans le tableau de bord. Le test sur téléphone se fait dans le navigateur ou en PWA installée depuis cette URL (HTTPS requis par le service worker) ; plus d'Expo Go ni de build EAS pendant le MVP.
Réversibilité : facile (ajouter Docker local plus tard ; mêmes migrations).

## ADR-021 — Bibliothèques UI du MVP
Statut : Remplacée par ADR-023 (2026-09-25 ; bibliothèques web : ADR-024) — s'applique encore à `apps/app`, gelé | Date : 2026-09-18
Contexte : M1 doit fixer graphiques, police et dépendances natives ; l'utilisateur vérifie sur iPhone via Expo Go (pas de compte Apple payant, donc pas de build de dev iOS) et sur Android via EAS.
Décision :
- **Graphiques** : `victory-native` (Skia) sur natif, `recharts` sur web, derrière l'interface `Chart` (`.native.tsx` / `.web.tsx`). **Heatmap** sans bibliothèque (grille de vues/`DayCell`).
- **Police** : Inter via `@expo-google-fonts/inter`, graisses 400/500/600 ; **chiffres tabulaires** (`fontVariant: ['tabular-nums']`) pour tous les montants.
- **Règle de dépendances** : uniquement des bibliothèques natives **incluses dans Expo Go pour le SDK courant** (vérification iPhone sans compte Apple payant). Une bibliothèque hors Expo Go est refusée, ou isolée derrière un adaptateur avec repli fonctionnel sous Expo Go.
- **Builds Android** : nouveaux builds EAS (dev, puis preview en build release pour les mesures de performance) acceptés sur le quota gratuit.
Conséquences : l'interface `Chart` doit rester commune aux deux adaptateurs (rendus proches, pas identiques) ; les versions suivent le SDK Expo (`npx expo install`) ; toute dépendance native nouvelle est vérifiée contre la liste Expo Go avant ajout.
Alternatives : Skia partout y compris web (CanvasKit lourd au premier chargement) ; ECharts sur web (poids, style moins natif) ; lib de heatmap dédiée (dépendance inutile) ; police système (rendu inégal entre plateformes, chiffres non tabulaires partout) ; builds de dev iOS (compte Apple payant requis).
Réversibilité : facile (graphiques derrière `Chart`, police en token) ; la règle Expo Go sera levée avec un compte Apple développeur (au plus tard P6).

## ADR-022 — Périmètre d'authentification et valeurs par défaut de l'onboarding (MVP)
Statut : Acceptée | Date : 2026-09-25
Contexte : M2 livre l'auth et l'onboarding. Deux questions se posaient : (a) faut-il des connexions sociales dès le MVP ? (b) d'où viennent le premier jour de semaine et la devise d'affichage d'un nouvel utilisateur ?
Décision (utilisateur, 2026-09-25) :
- **Authentification du MVP** : **e-mail + mot de passe** et **magic link** uniquement. **Ni Google ni Sign in with Apple.** Raison : dès qu'une app iOS propose une connexion sociale tierce, Apple impose Sign in with Apple, donc un compte Apple Developer payant — hors périmètre du MVP (ADR-021 : vérification iPhone via Expo Go, sans compte payant). Question rouverte en **P6** (publication sur les stores) ; ROADMAP § « Décisions mises de côté » n° 6, tranchée.
- **Valeurs par défaut de l'onboarding** : premier jour de semaine et devise d'affichage sont **déduits de la locale** (FR → lundi / EUR, EN → dimanche / USD, ADR-013), **pré-remplis et modifiables** sur le dernier écran de l'onboarding, puis stockés dans `preferences.week_starts_on` et `profiles.display_currency`. La dérivation est une **fonction pure de `packages/core`** (aucune règle de locale codée dans un écran).
Conséquences : pas de fournisseur OAuth à configurer dans Supabase pendant le MVP ; la liste des redirections d'auth reste courte (magic link + réinitialisation) ; ajouter un fournisseur plus tard ne change pas le schéma (`auth.identities` est géré par Supabase). Le choix de la devise d'affichage n'est pas une conversion : « Tous les comptes » reste groupé par devise (ADR-019).
Alternatives : Google dès le MVP (impose Sign in with Apple, donc le compte payant, pour un gain faible en test privé) ; demander explicitement le jour de semaine et la devise sans valeur par défaut (un écran d'onboarding de plus, friction inutile).
Précision (2026-09-25, ADR-023) : la justification citait Expo Go ; la conclusion tient avec Capacitor (P6) — dès qu'un login social tiers est proposé dans l'app iOS, Sign in with Apple devient obligatoire.
Réversibilité : facile (ajout d'un fournisseur social sans migration ; valeurs par défaut modifiables dans les Réglages).

## ADR-023 — MVP d'abord en application web (React + Vite + shadcn/ui, PWA), mobile natif ensuite via Capacitor
Statut : Acceptée (décision utilisateur, 2026-09-25) | Date : 2026-09-25
Remplace : ADR-001 (entièrement), ADR-021 (entièrement). Remplace partiellement : ADR-015 (plateformes du MVP), ADR-017 (moyens techniques et protocole de mesure ; les exigences mesurables restent).
Contexte : après M0–M3, la chaîne mobile freine plus qu'elle ne sert : Metro/Windows (`EMFILE` → bundle tronqué silencieux), IP Metro changeante, règle Expo Go (ADR-021), builds EAS lents ; fluidité web médiocre de react-native-web (Reanimated sur le thread JS : `Segmented` 40–48 fps ; `Modal` recréé à chaque `Sheet`, ADR-017). L'utilisateur veut voir l'app avancer à l'écran. Le MVP n'a pas de serveur (ADR-016) ni de besoin natif indispensable : un navigateur mobile suffit à l'utiliser.
Options :
- **A. Garder Expo, cibler seulement le web.** + Conserve le code M1 (shell, primitives, `Chart`), réversible à coût nul. − Garde tous les coûts web (Metro, NativeWind/Tailwind 3, Reanimated sur le thread JS, `Modal` de react-native-web) ; pas d'accès à l'écosystème web (shadcn/ui, Radix, Tailwind 4) ; rendu « RN porté ».
- **B. Nouvelle app `apps/web` : React + Vite + TypeScript strict + Tailwind + shadcn/ui + recharts, responsive mobile-first, installable (PWA) ; stores iOS/Android plus tard en emballant ce même code avec Capacitor** *(choix utilisateur)*. + Boucle de dev instantanée (HMR Vite, sans téléphone ni Metro) ; composants accessibles et soignés (Radix via shadcn) ; animations CSS sur le compositeur ; un seul code web + stores. − Refaire en DOM le shell, les primitives et les écrans M1 ; WebView moins fluide qu'une UI native sur Android d'entrée de gamme ; risque de refus Apple 4.2 (« site emballé ») à compenser par de vraies fonctions natives ; limites PWA sur iOS.
- **C. Next.js.** + Écosystème, SSR utile à un site vitrine. − SSR/server components poussent vers un serveur (contraire à ADR-016) ; Capacitor impose `output: 'export'`, qui retire l'essentiel de Next ; plus lourd que Vite pour une SPA authentifiée sans enjeu SEO. Un site vitrine pourra être séparé.
- **D. Continuer Expo multi-plateforme.** + Cible stores native, rien de jeté. − C'est précisément ce qui freinait (outillage Windows, Expo Go, EAS, fluidité web) ; vérification 3 plateformes à chaque phase.
Décision : **B**.
- `apps/web` est l'application du MVP. Vérification de chaque phase : navigateur de bureau, navigateur mobile (iOS Safari, Android Chrome, largeur ≤ 430 px) et PWA installée.
- **`apps/app` (Expo) est gelé** : conservé, plus développé, ni vérifié en clôture de phase, exclu des commandes par défaut et de la CI. Idem **`packages/ui`** (primitives React Native), sauf ses données de tokens (ADR-012) exposées au web.
- Réutilisés tels quels : `packages/core`, `packages/schemas`, `packages/i18n`, `packages/db`, `packages/config`, `supabase/`. Invariants inchangés (calculs dans `packages/core`, Decimal, RLS, i18n, LLM qui ne calcule pas) ; ADR-016 reste en vigueur.
- Capacitor : pas avant P6. Dès maintenant, toute dépendance doit fonctionner dans une WebView (pas d'API Node, pas de cookie tiers).
- Couche données d'`apps/web` (clés de requête, lectures/écritures Supabase, mutations optimistes) écrite **sans dépendance au DOM** dans `apps/web/src/data/` (extractible en `packages/data`).
Conséquences :
- Shell (ADR-011), design system (tokens ADR-012 réutilisés), Dashboard, Calendrier, Réglages refaits dans `apps/web` (phase M1-web de la ROADMAP).
- ADR-017 : moyens et protocole révisés (voir la révision dans ADR-017) ; la mesure web fait foi ; la mesure native devient celle de Capacitor Android en P6 (dette D1).
- Session web : `localStorage` via supabase-js (ARCHITECTURE §9) + CSP stricte (M9). Le chiffrement SecureStore/AES-GCM d'`apps/app` n'est pas porté ; stockage sécurisé natif choisi en P6 (plugin Capacitor).
- PWA : le service worker ne précharge que le shell statique, **jamais** les réponses Supabase (données dans TanStack Query persisté, clé propre à chaque utilisateur, M2-11).
- ADR-022 (Sign in with Apple si login social sur iOS) et ADR-009 (RevenueCat : SDK Capacitor, Stripe sur le web) restent valables. Point Apple 4.2 à traiter en P6.
- Deep links `edgebook://` remplacés par une liste blanche de routes web pendant le MVP ; le scheme revient avec Capacitor.
- Maestro, EAS et `expo-updates` sortent du MVP.
Alternatives : A, C, D (voir Options).
Réversibilité : **moyenne**. Retour à une app Expo native : (1) `packages/core`, `schemas`, `i18n`, `db` et `supabase/` sont indépendants de la plateforme ; (2) `apps/app` et `packages/ui` restent dans le dépôt, à dégeler en les réintégrant aux commandes et à la CI (rattraper l'API de core) ; (3) la couche `apps/web/src/data/` sans DOM s'extrait en `packages/data` et se branche sur Expo ; (4) tokens à source unique (`tokens.data.cjs`). Seules les vues sont à réécrire.

## ADR-024 — Stack UI de l'application web
Statut : Acceptée (décision utilisateur, 2026-09-25) | Date : 2026-09-25
Contexte : ADR-023 crée `apps/web` ; il faut fixer les bibliothèques (remplace, pour le web, ADR-021).
Décision :
- **Routeur** : TanStack Router, routage par fichiers (plugin Vite). Paramètres d'URL typés (compte, période dans l'URL, ARCHITECTURE §6.1), `beforeLoad` pour les gardes d'auth, préchargement via TanStack Query.
- **Styles** : Tailwind CSS v4 (`@tailwindcss/vite`), `@theme` généré depuis `packages/ui/src/tokens.data.cjs` (sous-chemin `@repo/ui/tokens-data`) ; thèmes sombre/clair et couleurs P&L par variables CSS.
- **Composants** : shadcn/ui (Radix) copiés dans `apps/web/src/components/ui` ; icônes `lucide-react`. Le barrel `@repo/ui` (React Native) est interdit dans `apps/web` (règle ESLint).
- **Graphiques** : composant chart de shadcn (sur recharts) derrière un composant `Chart` qui reprend les types de `packages/ui/src/chart/types.ts` ; heatmap en grille CSS.
- **i18n** : react-i18next sur `@repo/i18n` ; locale initiale = `navigator.languages` → `resolveLocale` (pas de lib de détection). ADR-013 inchangé.
- **Police** : `@fontsource-variable/inter`, `font-variant-numeric: tabular-nums` pour les montants.
- **Listes** : `@tanstack/react-virtual` au-delà de 50 éléments.
- **Animations** : transitions CSS / `tw-animate-css`, `motion` seulement si une transition l'exige ; `prefers-reduced-motion` respecté.
- **PWA** : `vite-plugin-pwa`, précache du shell uniquement.
- **Formulaires, état** : react-hook-form + zod, Zustand (inchangés).
- **Tests E2E** : Playwright sur `apps/web` (`vite` pour les parcours, `vite preview` pour la fluidité) ; specs d'`apps/app` gelées ; Maestro hors MVP.
- **React** : même version majeure.mineure qu'`apps/app` (19.2.x) tant qu'il reste dans le workspace (`nodeLinker: hoisted`, éviter deux copies de React).
Conséquences : Tailwind 3 (NativeWind, `apps/app`) et 4 cohabitent dans le workspace hoisté — à vérifier à l'installation (W-2). Toute nouvelle dépendance doit fonctionner dans le navigateur et dans une WebView Capacitor.
Alternatives : React Router 7 (plus simple, paramètres d'URL non typés) ; Tailwind 3 (shadcn cible v4) ; lib de détection de langue (redondante avec `resolveLocale`) ; ECharts (poids).
Réversibilité : facile (chaque choix est local à `apps/web`).

## ADR-025 — Hébergement de l'application web
Statut : Acceptée (décision utilisateur, 2026-09-25) | Date : 2026-09-25
Contexte : la PWA doit être servie en HTTPS pour être installée sur téléphone (service worker) ; il faut une préproduction à URL fixe (redirections d'auth en liste exacte, ADR-020) et des en-têtes CSP (ARCHITECTURE §9).
Décision : **Cloudflare Pages** — site statique (`apps/web/dist`), en-têtes (CSP) via `_headers`, repli SPA, une URL de préproduction **fixe**. Compte à créer par l'utilisateur plus tard : non bloquant pour W-1 à W-7 (développement local), requis pour W-8.
Conséquences : aucun serveur (ADR-016) ; les URL d'aperçu par branche ne sont pas ajoutées aux redirections d'auth (seule l'URL fixe l'est) ; accès privé tant qu'ADR-018 option B s'applique (URL non diffusée, inscription réservée aux invités).
Alternatives : **Vercel** (considéré ; offre gratuite limitée à un usage non commercial) ; Netlify (équivalent, quotas gratuits plus serrés).
Réversibilité : **facile** — site statique sans code propre à l'hébergeur ; changer d'hébergeur = rebrancher le build et recopier les en-têtes.
