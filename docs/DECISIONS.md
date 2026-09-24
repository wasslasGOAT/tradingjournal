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
Statut : Acceptée | Date : 2026-09-17
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

## ADR-012 — Identité visuelle et nom
Statut : Acceptée pour la direction visuelle · Proposée pour le nom et le logo | Date : 2026-09-17 (mise à jour 2026-09-17)
Contexte : l'app s'inspire de TradeX mais ne doit pas en reprendre le nom, le logo ni les textes.
Décision initiale : nom de travail « Edgebook », palette sombre avec accent bleu en attendant une identité définitive.
Mise à jour (validée par l'utilisateur) : la **direction visuelle est acceptée** : thème sombre par défaut (clair disponible), accent bleu, profits en bleu avec option vert/rouge (`preferences.pnl_colors`). Niveau de finition visé : comparable à l'app de référence, sans en copier le nom, le logo, les textes ni les maquettes à l'identique (exigences mesurables : ADR-017). Le nom « Edgebook » et le logo restent **provisoires**.
Précision (utilisateur, 2026-09-18) : l'accent bleu est **légèrement décalé** de `#5D99F9` (teinte de la référence) pour ne pas en copier l'identité ; valeur exacte fixée dans `packages/ui/tokens.ts` en M1, contraste AA vérifié.
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
Statut : Acceptée | Date : 2026-09-17
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
Statut : Acceptée | Date : 2026-09-17
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
Conséquences : dépendances structurantes compatibles web + natif (reanimated, FlashList, expo-haptics derrière une interface) ; builds de développement EAS nécessaires ; protocole de mesure de performance documenté et exécuté en M9 (et contrôlé à chaque phase sur les écrans livrés).
Alternatives : `Animated` de React Native (animations sur le thread JS, moins fluides) ; Moti (surcouche de reanimated, ajoutable plus tard).
Réversibilité : facile.

## ADR-018 — Suppression de compte pendant le MVP
Statut : Proposée | Date : 2026-09-17
Contexte : supprimer un utilisateur Supabase Auth exige la clé `service_role`, interdite côté client ; le MVP n'a pas de serveur (ADR-016). Apple impose la suppression in-app pour la publication ; le RGPD impose le droit à l'effacement dès qu'il y a des utilisateurs réels.
Options :
- **A. Supabase Edge Function minimale** `delete-account` : vérifie le JWT, purge les fichiers Storage de l'utilisateur, supprime `auth.users` (cascade sur les tables). + Suppression in-app dès le MVP, conforme. − Introduit un runtime (Deno) et un secret hors de l'app ; exception au « sans serveur ».
- **B. Report à la publication sur les stores** : pendant le MVP, suppression sur demande (lien e-mail dans Réglages, traitement manuel dans le tableau de bord Supabase). + Zéro infra. − Processus manuel ; inacceptable pour un lancement public.
- **C. Suppression logique côté client** (`profiles.deleted_at` + effacement des données via RLS, compte Auth conservé), purge réelle post-MVP. + Pas de secret. − Compte Auth résiduel : ce n'est pas une vraie suppression.
Recommandation : **B** si le MVP reste en test privé (utilisateurs invités) ; **A** si le web est ouvert au public pendant le MVP.
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
- `supabase config push` est **proscrit** vers tout projet cloud : `supabase/config.toml` porte des réglages locaux permissifs (confirmation d'e-mail désactivée, mot de passe min 6, redirections `http://localhost:8081/**`, `allowed_cidrs 0.0.0.0/0`). L'auth cloud se règle dans le tableau de bord ; aucune redirection d'auth avec joker `/**` sur un domaine public (liste exacte).
Alternatives : Docker Desktop local (non installé sur ce poste, ajoutable plus tard) ; base partagée avec la préproduction (rejetée : isolation).
Réversibilité : facile (ajouter Docker local plus tard ; mêmes migrations).

## ADR-021 — Bibliothèques UI du MVP
Statut : Acceptée | Date : 2026-09-18
Contexte : M1 doit fixer graphiques, police et dépendances natives ; l'utilisateur vérifie sur iPhone via Expo Go (pas de compte Apple payant, donc pas de build de dev iOS) et sur Android via EAS.
Décision :
- **Graphiques** : `victory-native` (Skia) sur natif, `recharts` sur web, derrière l'interface `Chart` (`.native.tsx` / `.web.tsx`). **Heatmap** sans bibliothèque (grille de vues/`DayCell`).
- **Police** : Inter via `@expo-google-fonts/inter`, graisses 400/500/600 ; **chiffres tabulaires** (`fontVariant: ['tabular-nums']`) pour tous les montants.
- **Règle de dépendances** : uniquement des bibliothèques natives **incluses dans Expo Go pour le SDK courant** (vérification iPhone sans compte Apple payant). Une bibliothèque hors Expo Go est refusée, ou isolée derrière un adaptateur avec repli fonctionnel sous Expo Go.
- **Builds Android** : nouveaux builds EAS (dev, puis preview en build release pour les mesures de performance) acceptés sur le quota gratuit.
Conséquences : l'interface `Chart` doit rester commune aux deux adaptateurs (rendus proches, pas identiques) ; les versions suivent le SDK Expo (`npx expo install`) ; toute dépendance native nouvelle est vérifiée contre la liste Expo Go avant ajout.
Alternatives : Skia partout y compris web (CanvasKit lourd au premier chargement) ; ECharts sur web (poids, style moins natif) ; lib de heatmap dédiée (dépendance inutile) ; police système (rendu inégal entre plateformes, chiffres non tabulaires partout) ; builds de dev iOS (compte Apple payant requis).
Réversibilité : facile (graphiques derrière `Chart`, police en token) ; la règle Expo Go sera levée avec un compte Apple développeur (au plus tard P6).
