# Point de reprise

> À lire en premier pour reprendre le travail. Mis à jour le **2026-09-18**, à la fin de la session qui a construit la phase M0.
> Le détail fait foi dans `ROADMAP.md` (cases à cocher) et `DECISIONS.md` (ADR).

## Où on en est

- **Périmètre** : on construit d'abord le **MVP** (phases M0 → M9, ARCHITECTURE §0). Pas de serveur, pas de broker, pas d'import CSV, pas de coach IA (ADR-015/016).
- **Phase M0 (fondations)** : `En cours`, techniquement terminée. Il reste trois vérifications (voir ci-dessous).
- **Phases suivantes** : M1 (design system, shell, animations), puis M2 (auth, onboarding, comptes). **M3 (moteur de calcul) peut démarrer en parallèle de M1/M2.**

## Pour clôturer M0

1. **CI GitHub** : vérifier que les jobs `quality` et `db` sont verts. <https://github.com/wasslasGOAT/tradingjournal/actions>
2. **Build Android de dev** : lancé le 2026-09-18 (build `8dab747f-…`). Télécharger l'APK depuis <https://expo.dev/accounts/wassimaha/projects/edgebook/builds/8dab747f-a8e8-4994-aced-79fdc8cdbc31> et l'installer sur le téléphone Android.
3. **Test sur téléphones** : lancer `pnpm dev:app`, puis ouvrir l'app sur iPhone (Expo Go) et Android (app de dev). Attendu : « Edgebook » et `schema_version = 1`, en FR et en EN.
4. Ensuite : demander à Claude la clôture de M0 (statut `Terminée`), puis lancer `/phase M1`.

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
