# Release — déploiement web, (EAS gelé), soumission stores

> Réf. : ARCHITECTURE §11 (Environnements, CI/CD, publication), §12 (Observabilité, post-MVP) ; ADR-015/016/020/023/025 ;
> CLAUDE.md (agent `release`).
> Pendant le MVP (ADR-015) : **pas de soumission aux stores**. Depuis ADR-023 (2026-09-25), le MVP est une
> **application web** (`apps/web`, PWA) déployée sur **Cloudflare Pages** (ADR-025, §0 ci-dessous).
> Les sections 1 à 3 et 6 (EAS, Expo Go, OTA) concernent `apps/app`, **gelé** : conservées pour mémoire,
> plus exécutées. Les apps iOS/Android viendront en P6 via Capacitor (procédure à écrire à ce moment-là).

## 0. Déploiement web — Cloudflare Pages (ADR-025)

État : **mis en place en M1-web (W-8)**, mode manuel (option 1 ci-dessous) ; **aucun déploiement
n'a encore été effectué** (le compte Cloudflare vient d'être créé par l'utilisateur, `wrangler
login` reste à faire — §0.3).

### 0.1 Mode de déploiement retenu : option 1 (`wrangler pages deploy`, manuel, PC)

Trois options étaient possibles (voir la consigne W-8) :

1. **`wrangler pages deploy` depuis le PC** *(retenue maintenant)*.
2. Intégration Git Cloudflare (build fait par Cloudflare).
3. Déploiement depuis GitHub Actions (jeton API).

**Choix : option 1**, pour ces raisons :
- **Immédiat** : ne dépend d'aucun secret à stocker côté GitHub/Cloudflare avant de pouvoir
  déployer une première fois — juste `wrangler login` (une fois) puis une commande.
- **Fiable pour ce monorepo** : l'option 2 (build fait par Cloudflare) demanderait à Cloudflare
  Pages de comprendre un monorepo pnpm 12 avec `nodeLinker: hoisted` et Node 24 — configurable
  (racine du projet Pages = `apps/web`, commande `pnpm --filter @repo/web build`, dossier de
  sortie `apps/web/dist`, variable `NODE_VERSION`/`.nvmrc`), mais c'est une source classique
  d'échecs de build (résolution de `pnpm-workspace.yaml`, version de pnpm) à diagnostiquer sans
  accès interactif facile pour l'utilisateur. Testable plus tard sans rien casser (site statique,
  ADR-025).
- **Un seul artefact de vérité** : le même `apps/web/dist` que celui vérifié en local (`pnpm
  build`) et en CI (`check:secrets` dessus) est celui envoyé — aucune divergence possible entre
  « ce qui a été testé » et « ce qui est en ligne ».
- L'**option 3** (GitHub Actions + jeton API) est la cible naturelle une fois le premier
  déploiement manuel validé : automatise `main` → production et les branches → preview, sans
  dépendre du PC de l'utilisateur. Repoussée à plus tard (préférence utilisateur) : demande de
  créer un jeton API Cloudflare scoped "Pages: Edit" et de le stocker en secret GitHub Actions
  (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) — aucune de ces deux valeurs n'existe encore.

`wrangler` n'est **pas** installé en dépendance du monorepo : le script de déploiement l'invoque
via `pnpm dlx wrangler` (téléchargé à la volée, mis en cache par pnpm, jamais ajouté à
`pnpm-lock.yaml`) — conforme à la consigne de ne pas installer pendant qu'un autre agent
travaille sur le dépôt.

### 0.2 Build et sortie statique

- **Build** : `pnpm --filter @repo/web build` (`vite build`) → sortie statique `apps/web/dist`.
  Version de Node lue depuis `.nvmrc` (24).
- **Projet Pages** : nom **`edgebook`**, relié au dépôt GitHub privé (pour l'option 3, plus tard) ;
  branche de production = **`main`**. Toute autre branche (ex. `wip/m1-m3`) déployée avec
  `wrangler pages deploy --branch=<branche>` obtient une **URL de preview fixe par branche**
  (`https://<branche-normalisée>.edgebook.pages.dev`, stable d'un déploiement à l'autre depuis
  cette branche) — **jamais** l'URL d'aperçu par commit (qui change à chaque déploiement et n'est
  **pas** ajoutée aux redirections d'auth Supabase, ADR-020/ADR-025).
- **Variables** : avec l'option 1, `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` sont injectées au
  **build local** depuis `apps/web/.env` (jamais commité, voir `.gitignore` et
  `apps/web/.env.example`) — Vite les lit automatiquement depuis ce fichier, aucune variable à
  saisir dans le tableau de bord Pages tant que l'option 1 est utilisée. **Uniquement la clé
  anon/publishable**, jamais `service_role` (`pnpm check:secrets` le vérifie avant tout build en
  CI, et peut être relancé en local avant un déploiement).
- **En-têtes** : `apps/web/public/_headers`, copié tel quel dans `apps/web/dist/_headers` par
  Vite (dossier `public/`, vérifié après build). Voir §0.4 pour le contenu.
- **Repli SPA** : `apps/web/public/_redirects` avec `/* /index.html 200` — explicite plutôt que
  de dépendre du comportement par défaut de Pages (qui sert déjà `index.html` sans `404.html`
  personnalisé, mais de façon moins prévisible sur des chemins avec point). Les fichiers statiques
  réels (`/assets/*`, `/sw.js`…) restent toujours servis avant cette règle catch-all.
- **PWA** : le service worker (`vite-plugin-pwa`, mode `generateSW`) ne précache que le shell
  statique (JS/CSS/HTML/polices/icônes) — jamais les réponses Supabase (`runtimeCaching: []`,
  `apps/web/vite.config.ts`). `sw.js` et `manifest.webmanifest` servis sans cache long
  (`Cache-Control: no-cache`) pour que les mises à jour arrivent ; `/assets/*` (noms hashés par
  Vite) en cache long immuable.

### 0.3 Étapes pour l'utilisateur (à transmettre)

**Une seule fois**, dans un terminal PowerShell, à la racine du projet :

1. `pnpm dlx wrangler login`
   → ouvre le navigateur, demande d'autoriser Wrangler à accéder au compte Cloudflare. Une fois
   l'autorisation donnée dans le navigateur, revenir au terminal : il doit afficher un message de
   succès (« Successfully logged in »).

**Ensuite, pour chaque déploiement** (depuis la racine du projet, avec `apps/web/.env` déjà
rempli — voir `apps/web/.env.example`) :

2. `pnpm deploy:web`
   → construit `apps/web` puis déploie `apps/web/dist` sur le projet Pages `edgebook`, sur la
   branche de preview correspondant à la branche git courante (ou en production si la branche
   git courante est `main`). Le script affiche l'URL de déploiement à la fin.

Rien d'autre à saisir : ni jeton, ni identifiant. Le nom du projet Pages (`edgebook`) est créé
automatiquement par `wrangler pages deploy` s'il n'existe pas encore, au premier déploiement.

### 0.4 En-têtes (`apps/web/public/_headers`)

CSP « de base » (pas encore la CSP **stricte** exigée en M9, ARCHITECTURE §9 — voir les
commentaires dans le fichier lui-même pour le détail de chaque directive) :

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
```

`connect-src` autorise `https://*.supabase.co` et `wss://*.supabase.co` (API REST/Auth/Storage et
canal realtime de supabase-js) — jamais un domaine plus large. `script-src`/`style-src` gardent
`'unsafe-inline'` pour le script anti-flash d'`index.html` et les styles posés dynamiquement
(React/Radix, graphiques) : à retirer en M9 (CSP stricte) via un hash ou un nonce pour le script,
à réévaluer pour les styles.

### 0.5 Supabase — redirections d'auth

**Manuel, tableau de bord Supabase, jamais `supabase config push` (ADR-020)** : ajouter, en
**liste exacte** (jamais de joker `/**` sur un domaine public) :
- `http://localhost:5173/**` (serveur de dev Vite) ;
- l'URL fixe de préproduction Cloudflare Pages une fois le premier déploiement fait depuis
  `wip/m1-m3` (ex. `https://wip-m1-m3.edgebook.pages.dev/**`) — **jamais** une URL d'aperçu par
  commit.

### 0.6 Accès et vérification

- **Accès** : privé tant qu'ADR-018 option B s'applique (URL non diffusée, utilisateurs invités).
- **Vérification** : la CI exécute `check:secrets` sur `apps/web/dist` (job `quality`) ; après
  déploiement, contrôler les en-têtes (`curl -I <url>`, doit renvoyer les en-têtes de §0.4) et
  l'installabilité (Lighthouse, ou « Ajouter à l'écran d'accueil » sur téléphone).
- Changer d'hébergeur est trivial (site statique) : rebrancher le build et recopier
  `_headers`/`_redirects`.

## 1. Ce qui est déjà en place (fait par `release`, sans compte) — `apps/app`, gelé

- `apps/app/eas.json` : `cli.appVersionSource: "remote"` (versions natives gérées par EAS,
  jamais committées), profils `development` (developmentClient, distribution `internal`,
  Android `apk`), `preview` (distribution `internal`, channel `preview`), `production`
  (channel `production`, `autoIncrement: true`). **Aucun bloc `submit`** : pas de soumission
  possible tant qu'il n'est pas ajouté explicitement (post-MVP).
- `apps/app/app.config.ts` : `runtimeVersion: { policy: 'appVersion' }` (une build OTA
  n'est proposée qu'aux binaires natifs de même `version`) ; `owner: 'wassimaha'` ;
  `extra.eas.projectId` et `updates.url` utilisent l'identifiant du projet EAS
  `@wassimaha/edgebook` (`dd23ce8e-…`, écrit dans `app.config.ts` : ce n'est pas un secret).
  La variable d'environnement `EAS_PROJECT_ID`, si elle est définie, le remplace (autre projet).
- CI (`.github/workflows/ci.yml`) : lint, typecheck, tests, tests RLS, build web,
  `check:secrets` (source + historique + bundle web). Aucune étape EAS dans la CI pendant le
  MVP (pas de compte, pas de secret EAS à y stocker) ; à ajouter quand le premier build EAS
  sera nécessaire en continu (post-M0).

## 2. Ce que l'utilisateur doit faire (compte requis, aucune commande lancée par l'agent) — `apps/app`, gelé

Toutes les commandes ci-dessous sont à exécuter par l'utilisateur, depuis `apps/app`, une
fois qu'un compte Expo (gratuit) existe.

### 2.1 Connexion et création du projet EAS

```bash
cd apps/app
npx eas-cli login
npx eas-cli init
```

**Fait le 2026-09-18** : projet `@wassimaha/edgebook` créé (`eas-cli init --account wassimaha`).
`app.config.ts` étant dynamique, `eas-cli init` ne peut pas y écrire : le `projectId` y a été
ajouté à la main (constante `EAS_PROJECT_ID`, surchargeable par la variable d'environnement
du même nom). Le `projectId` n'est pas un secret.

### 2.2 Build de développement Android

```bash
npx eas-cli build --profile development --platform android
```

- Nécessite un compte Expo gratuit (quota de builds gratuits limité — suffisant pour du
  développement occasionnel).
- Produit un `.apk` installable directement (profil `development` : `distribution:
  "internal"`, `android.buildType: "apk"`) — pas de compte Google Play nécessaire à ce
  stade.
- Une fois le build terminé, EAS affiche un lien de téléchargement (et un QR code) :
  installer l'APK sur un appareil Android physique ou un émulateur.

### 2.3 Lancer le bundle JS contre ce build de dev

```bash
npx expo start --dev-client
```

Ouvrir l'app de dev installée (§2.2) : elle se connecte au serveur Metro local comme le
ferait Expo Go, mais avec le code natif du projet (modules natifs éventuels inclus).

### 2.4 iOS pendant le MVP : Expo Go, pas de build de dev

Un compte Apple Developer payant (99 $/an) est nécessaire pour tout build de
développement/interne iOS (signature de code). Tant qu'il n'est pas souscrit :

```bash
npx expo start
```

puis ouvrir le projet dans l'app **Expo Go** (App Store) sur un appareil iOS ou le
simulateur. Limite connue : les modules nécessitant du code natif custom (hors SDK Expo géré)
ne fonctionnent pas dans Expo Go — aucun de ces modules n'est utilisé en M0
(`expo-secure-store`, etc. sont supportés par Expo Go).

Quand le compte Apple Developer sera actif (décision utilisateur, hors périmètre M0) :
`npx eas-cli build --profile development --platform ios` deviendra possible, et ce document
sera mis à jour en conséquence.

## 3. Mises à jour OTA — `apps/app`, gelé (sans objet depuis ADR-023)

```bash
npx eas-cli update --branch preview --message "..."
```

Ne fonctionne qu'avec au moins un build natif
existant sur le même canal (`runtimeVersion` doit correspondre, §1). Pas encore câblé en CI
(`main` → staging → `eas update --channel preview`, voir ARCHITECTURE §11) : à faire quand
le premier build `preview` existera réellement, pour éviter une étape CI qui échouerait
faute de projet EAS.

## 4. Checklist stores (à revalider à la soumission — hors périmètre M0/MVP)

Rappel ARCHITECTURE §11 : **pas de soumission aux stores pendant le MVP** (ADR-015). Les binaires
seront produits par **Capacitor** en P6 (ADR-023) ; ajouter à la checklist le risque Apple 4.2
(« site emballé ») : fonctions natives réelles requises (haptique, stockage sécurisé, partage, push). Cette
checklist est conservée ici pour la phase où la soumission sera décidée par l'utilisateur ;
elle doit être revérifiée à ce moment-là (les règles Apple/Google évoluent) :

- [ ] Compte Apple Developer (99 $/an) et Google Play Console (25 $ une fois) actifs.
- [ ] Politique de confidentialité et CGU hébergées (URL publique, dans les deux stores).
- [ ] Suppression de compte accessible in-app (voir ADR-018 : solution MVP sans
      `service_role` ; à revoir si un serveur existe déjà à ce moment-là).
- [ ] Sign in with Apple proposé si un autre login social l'est (règle Apple).
- [ ] Privacy manifest iOS (`PrivacyInfo.xcprivacy`) à jour avec les API "required reason"
      réellement utilisées.
- [ ] Fiche Data safety Android (Play Console) reflétant les données réellement collectées.
- [ ] Disclaimer « ceci n'est pas un conseil financier » visible (app + fiches stores).
- [ ] Compte de démo fourni aux reviewers (identifiants + données d'exemple), documenté dans
      les notes de review des deux stores.
- [ ] Captures d'écran et description FR + EN à jour sur les deux fiches store.
- [ ] Avant de soumettre : relire les Apple App Review Guidelines et les Google Play
      Developer Program Policies en vigueur (elles changent régulièrement) — ne jamais se
      fier uniquement à cette checklist figée.

**Aucune soumission ni déploiement production ne doit être lancé sans confirmation explicite
de l'utilisateur** (CLAUDE.md, mandat de l'agent `release`).

## 5. `db:types` vs `db:types:local`

`pnpm db:types` (`supabase gen types typescript --linked`) régénère les types depuis le
projet Supabase cloud « dev » (ADR-020) : à utiliser en local après `supabase link`, pour
que le schéma versionné reflète la base réellement utilisée en développement. `pnpm
db:types:local` (`--local`) régénère depuis la base Supabase locale (Docker) rejouée avec
`supabase/migrations/**` : c'est cette variante que la CI utilise pour comparer
`packages/db/src/database.types.ts` (job `quality`, ARCHITECTURE §7) — à préférer localement
si l'on veut reproduire exactement le résultat de cette vérification CI sans dépendre du
projet cloud.

## 6. Vérifications faites sans compte (T11) — `apps/app`, gelé

- `apps/app/eas.json` : JSON valide, formaté Prettier.
- `npx expo config --type public` (depuis `apps/app`) : `owner`, `extra.eas.projectId` et
  `updates.url` (`https://u.expo.dev/<projectId>`) présents ; `npx eas-cli project:info`
  → `@wassimaha/edgebook` (vérifié le 2026-09-18).
- `tsc --noEmit` (depuis `apps/app`) : `app.config.ts` type-checke.
