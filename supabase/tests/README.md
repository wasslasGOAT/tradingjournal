# Tests RLS (`pnpm test:rls`)

Vérifient, pour chaque table utilisateur, qu'un utilisateur **B** ne peut ni lire ni
modifier les lignes d'un utilisateur **A** (deux clients `supabase-js` authentifiés
avec la clé **anon**, jamais `service_role` — CLAUDE.md, ARCHITECTURE §9).

Squelette préparé en T3 ; premier test en T7 (`app_meta`, M0, correction d'audit
sécurité) ; tests des tables utilisateur (`profiles`, `preferences`, `accounts`,
`cash_movements`) en M2.

## Convention pour chaque nouvelle table

Gabarit posé par la migration `20260917172440_app_meta.sql` (M0, T7), à reprendre
pour chaque table de M2 et suivantes :

- **RLS activée** sur la table, avec des policies explicites par opération
  (`select`/`insert`/`update`/`delete`) — jamais de policy générique `for all`.
- **Droits GRANT explicites**, en défense en profondeur par rapport à RLS : ne
  jamais compter sur les grants implicites de la plateforme
  (`auto_expose_new_tables`). Toujours repartir de zéro puis regranter
  uniquement ce qui est nécessaire :
  - table de référence (écriture service_role uniquement) :
    `revoke all on public.<table> from anon, authenticated;`
    puis `grant select on public.<table> to anon, authenticated;`.
  - table utilisateur (`user_id`, RLS filtrée) :
    `revoke all on public.<table> from anon, authenticated;`
    puis `grant select, insert, update, delete on public.<table> to authenticated;`
    (RLS restreint chaque opération aux lignes de `auth.uid()` ; `anon` ne
    reçoit aucun droit d'écriture).
- **Fonctions** utilisées en trigger (ex. `set_updated_at`) : `set search_path = ''`
  et `revoke execute on function ... from public, anon, authenticated;` — elles
  ne sont jamais appelées directement via l'API, seulement par un trigger.
- **Un test RLS par table** dans ce dossier (`<table>.rls.test.ts`) prouvant
  qu'un utilisateur B ne peut ni lire ni modifier les lignes d'un utilisateur A
  (voir `app_meta.rls.test.ts` pour le cas d'une table de référence : lecture
  publique, écriture bloquée pour anon **et** authenticated).
- **Assertion précise, pas juste « il y a une erreur »** :
  `expect(error).not.toBeNull()` seul passe aussi pour une erreur réseau, une
  mauvaise URL ou une mauvaise clé — ça ne prouve rien sur la RLS/les GRANT.
  Vérifier le **code Postgres attendu** :
  - `42501` (`permission denied`) pour un insert/update/delete refusé — que ce
    soit un GRANT de table manquant ou une policy RLS qui refuse (`with
    check`/`using` évalué à `false`). Cas particulier à connaître : un
    `update`/`delete` **avec** GRANT mais dont la policy RLS filtre toutes les
    lignes ciblées ne renvoie **pas** d'erreur — 0 ligne affectée, silencieux
    (`error` est `null`, `data` est vide). Dans ce cas, asserter sur l'absence
    d'effet (relire la ligne, vérifier qu'elle est inchangée), pas sur un code
    d'erreur, et commenter pourquoi.
  - `PGRST202` pour un appel `rpc()` vers une fonction dont l'exécution a été
    révoquée pour le rôle appelant : PostgREST ne liste dans son schema cache
    que les fonctions pour lesquelles le rôle a `execute`, donc l'appel échoue
    par « function not found » plutôt que par un refus de permission explicite
    (`42501` reste possible selon l'état du cache — accepter les deux, voir
    `app_meta.rls.test.ts`).
- **Garde-fou RLS globale** : `public.rls_disabled_tables()` (fonction
  `security invoker`, `set search_path = ''`, définie dans la migration
  `20260917172440_app_meta.sql`, durcie par `20260918090000_harden_rls_guard.sql`
  — revue M0, boucle 2) liste les tables de `public` sans RLS activée.
  `security invoker` suffit : `pg_catalog.pg_class`/`pg_namespace` sont
  lisibles par PUBLIC, la fonction n'a besoin d'aucun privilège élevé.
  Réservée aux utilisateurs **authentifiés** (`execute` révoqué pour `anon` :
  avec la seule clé anon, publique par nature, n'importe quel visiteur aurait
  pu savoir quelle table n'a pas la RLS activée) : appelable via
  `userA.client.rpc('rls_disabled_tables')` dans les tests. Toute nouvelle
  table doit maintenir une liste vide.

## Configuration

1. Copier `.env.example` en `.env` (jamais commité).
2. Renseigner :
   - `SUPABASE_URL` — URL du projet (local en CI via `supabase start` ; cloud « dev »
     sur le poste, ADR-020).
   - `SUPABASE_ANON_KEY` — clé **anon** du projet (jamais `service_role`).
3. Prérequis sur le projet cible : confirmation d'e-mail désactivée
   (`[auth.email] enable_confirmations = false` dans `supabase/config.toml`, ou
   équivalent dans les réglages Auth du projet cloud) pour permettre l'inscription
   et la connexion immédiates des utilisateurs de test.

## Nettoyage des utilisateurs de test (projet cloud de dev)

Chaque exécution de `pnpm test:rls` crée deux nouveaux utilisateurs Auth
(`createTestUserPair`, `supabase/tests/helpers/clients.ts`) et ne les supprime
jamais — sur le projet Supabase local (`supabase start`), c'est sans
conséquence (base éphémère, repartie de zéro à chaque `supabase db reset` /
redémarrage). Sur le projet **cloud** de dev (ADR-020, tant que la CI ne tourne
pas contre un Supabase local éphémère), ces utilisateurs s'accumulent :

- Ils sont reconnaissables au préfixe d'e-mail
  `edgebook-rls-test-<a|b>-<uuid>@example.com` (`randomTestEmail`,
  `helpers/clients.ts`).
- Nettoyage manuel : tableau de bord Supabase → Authentication → Users, filtrer
  sur `edgebook-rls-test-` et supprimer en masse.
- Solution durable à privilégier dès que possible : faire tourner
  `pnpm test:rls` en CI contre un Supabase **local** (`supabase start`) plutôt
  que contre le projet cloud, pour repartir d'une base éphémère à chaque run.

## Exécution

```bash
pnpm test:rls
```

## Dépendances

`@supabase/supabase-js` est hoistée dans le monorepo (dépendance d'`apps/app`,
`nodeLinker: hoisted` — voir `pnpm-workspace.yaml`) : pas de dépendance propre à
déclarer ici. `supabase/tests` n'étant pas un package du workspace pnpm
(`apps/*`/`packages/*` uniquement), `helpers/clients.ts` importe le type
`Database` via un chemin relatif vers `packages/db/src/database.types.ts`
plutôt que via `@repo/db`.
