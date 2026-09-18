# `apps/app` — Edgebook (Expo · web + iOS + Android)

App Expo Router (une seule base de code, web + iOS + Android — ARCHITECTURE §3).
MVP sans serveur (ADR-016) : les données passent par `lib/supabase` (client
`@supabase/supabase-js` typé par `@repo/db`) + TanStack Query (`lib/query`),
avec cache persisté (AsyncStorage natif / `localStorage` web).

## Prérequis

- Node ≥ 24, pnpm (voir `package.json` à la racine du monorepo).
- Dépendances installées : `pnpm install` **à la racine du monorepo** (pas
  seulement dans `apps/app` — workspace pnpm).
- Un projet Supabase cloud « dev » (région UE, ADR-020). S'il n'existe pas
  encore, le créer sur [supabase.com](https://supabase.com) puis appliquer les
  migrations (`supabase/migrations`, voir la doc Supabase CLI) — hors périmètre
  de ce README, propriétaire : agent `database`.

## Configurer `.env`

Aucune vraie clé n'est commitée dans le repo — seul `.env.example` l'est
(`.gitignore` racine). À faire une fois par poste :

```bash
cp apps/app/.env.example apps/app/.env
```

Puis renseigner dans `apps/app/.env` :

- `EXPO_PUBLIC_SUPABASE_URL` — tableau de bord Supabase → projet → **Project
  Settings → API → Project URL**.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — même page → **anon public** (ou
  « Publishable key », préfixe `sb_publishable_…`, sur les projets récents).

⚠️ Ne jamais y mettre la clé `service_role` (voir les avertissements dans
`.env.example` et `CLAUDE.md`) : le MVP n'a pas de serveur, seule la clé anon
est autorisée côté client.

**Sans `.env` renseigné**, l'app démarre quand même (pas d'écran blanc) : l'écran
d'accueil affiche un état d'erreur explicite et localisé (« Configuration
manquante ») au lieu de planter — voir `lib/supabase/client.ts` et
`features/hello/HelloScreen.tsx`.

## Lancer en développement

Depuis la racine du monorepo :

```bash
pnpm dev:app
# puis, dans le terminal Expo : i = iOS, a = Android, w = web
```

Ou directement depuis `apps/app` :

```bash
pnpm dev
```

### Web

`w` dans le terminal Expo, ou `pnpm --filter @repo/app exec expo start --web`.
Ouvre un onglet navigateur automatiquement.

### Tester sur un téléphone physique avec Expo Go

1. Installer **Expo Go** depuis l'App Store / le Play Store sur le téléphone.
2. Lancer `pnpm dev:app`, scanner le QR code affiché dans le terminal (iOS :
   appareil photo ; Android : scanner intégré à Expo Go).
3. Le projet Supabase est **dans le cloud** (ADR-020) : contrairement à un
   Supabase local (Docker), il n'y a **aucune IP locale à configurer** — le
   téléphone doit juste avoir accès à Internet (pas besoin d'être sur le même
   réseau Wi-Fi que le poste de dev, sauf si Expo utilise la connexion LAN pour
   le bundle JS lui-même ; en cas de souci, relancer avec `--tunnel`).
4. Toutes les dépendances natives ajoutées en T6 (`expo-secure-store`,
   `expo-crypto`, `@react-native-async-storage/async-storage`) font partie du
   client Expo Go standard : aucun build de développement (EAS) n'est
   nécessaire pour tester l'écran Hello sur iOS **ou** Android avec Expo Go.
   `docs/ROADMAP.md` (critères de fin M0) prévoit malgré tout un build de dev
   EAS pour Android en prévision des futurs modules natifs (imports, brokers) —
   à mettre en place quand ce besoin apparaîtra réellement (agent `release`).

## Vérifier

Depuis la racine du monorepo :

```bash
pnpm lint && pnpm typecheck && pnpm test   # doit être au vert avant toute PR
pnpm check:secrets                          # aucun secret dans le repo
pnpm --filter @repo/app exec expo export --platform web
pnpm --filter @repo/app exec expo export --platform android
pnpm --filter @repo/app exec expo export --platform ios
rm -rf apps/app/dist                        # nettoyer après vérification
```

## Structure (T6)

```
lib/
  storage/     # interface stockage clé/valeur commune + adaptateur web sûr
  supabase/    # client Supabase typé, lecture des variables d'env, session
               # (SecureStore + AsyncStorage chiffré sur natif, localStorage web)
  query/       # QueryClient + persistance (AsyncStorage natif / localStorage web)
features/
  hello/       # écran Hello (M0) : 4 états (squelette, vide, erreur, rempli)
```

Tests Vitest (`lib/**/*.test.ts` uniquement — pas de rendu React Native en M0,
voir `vitest.config.ts`) : logique pure (lecture des variables d'env,
chiffrement de la session, adaptateur de stockage web).
