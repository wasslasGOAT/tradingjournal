# Release — déploiement web, (EAS gelé), soumission stores

> Réf. : ARCHITECTURE §11 (Environnements, CI/CD, publication), §12 (Observabilité, post-MVP) ; ADR-015/016/020/023/025 ;
> CLAUDE.md (agent `release`).
> Pendant le MVP (ADR-015) : **pas de soumission aux stores**. Depuis ADR-023 (2026-09-25), le MVP est une
> **application web** (`apps/web`, PWA) déployée sur **Cloudflare Pages** (ADR-025, §0 ci-dessous).
> Les sections 1 à 3 et 6 (EAS, Expo Go, OTA) concernent `apps/app`, **gelé** : conservées pour mémoire,
> plus exécutées. Les apps iOS/Android viendront en P6 via Capacitor (procédure à écrire à ce moment-là).

## 0. Déploiement web — Cloudflare Pages (ADR-025)

État : **à mettre en place en M1-web (W-8)** ; le compte Cloudflare est à créer par l'utilisateur (non bloquant pour W-1 à W-7).

- **Build** : `pnpm --filter @repo/web build` → sortie statique `apps/web/dist` (commande et dossier à confirmer en W-2). Version de Node lue depuis `.nvmrc`.
- **Projet Pages** : relié au dépôt GitHub privé ; branche de production = `main` ; une **URL de préproduction fixe** (alias de branche ou projet dédié). Les URL d'aperçu par commit ne sont **pas** ajoutées aux redirections d'auth.
- **Variables** (tableau de bord Pages, jamais dans le dépôt) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` du projet de dev — **uniquement la clé anon**, jamais `service_role`. Documentées dans `apps/web/.env.example`.
- **En-têtes** : fichier `apps/web/public/_headers` (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) ; CSP stricte exigée en M9 (ARCHITECTURE §9). Repli SPA : `_redirects` ou comportement SPA natif de Pages (à vérifier en W-8).
- **PWA** : le service worker ne précharge que le shell ; `sw.js` servi sans cache long (`Cache-Control: no-cache`) pour que les mises à jour arrivent.
- **Supabase** (tableau de bord, jamais `supabase config push`, ADR-020) : ajouter l'URL fixe de préproduction et `http://localhost:<port Vite>` en **liste exacte** dans les redirections d'auth.
- **Accès** : privé tant qu'ADR-018 option B s'applique (URL non diffusée, utilisateurs invités).
- **Vérification** : la CI exécute `check:secrets` sur `apps/web/dist` ; après déploiement, contrôler les en-têtes (`curl -I <url>`) et l'installabilité (Lighthouse).
- Changer d'hébergeur est trivial (site statique) : rebrancher le build et recopier les en-têtes.

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
