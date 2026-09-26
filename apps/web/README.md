# @repo/web

Application web d'Edgebook (React + Vite + TypeScript, Tailwind v4, shadcn/ui,
TanStack Router/Query, PWA — ADR-023/024). MVP-first ; emballée plus tard avec
Capacitor pour iOS/Android (P6).

## Démarrer

```bash
cp .env.example .env   # renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
pnpm dev:web            # depuis la racine du monorepo — http://localhost:5173
```

Sans `.env`, le shell se charge quand même (client Supabase tolérant à
l'absence de configuration, `src/lib/supabase`) — utile pour W-2 à W-5 avant
le branchement des données réelles (W-6).

## Structure

Voir `docs/ARCHITECTURE.md` §4 : `src/{routes,features,components/ui,data,lib}`.

- `src/routes` — TanStack Router, routage par fichiers.
- `src/data` — requêtes/mutations Supabase, sans dépendance au DOM.
- `src/lib` — client Supabase, i18n, utilitaires.

## `apps/app` (Expo)

Gelé depuis ADR-023 : ne pas importer depuis `apps/app` ni depuis le barrel
`@repo/ui` (React Native). Seul `@repo/ui/tokens-data` est autorisé.
