-- app_meta: table de référence système (DATA_MODEL.md § Système).
-- Lecture publique (anon + authenticated) ; aucune écriture via l'API, seulement
-- via migrations/seed (rôle postgres, propriétaire de la table).
--
-- Convention de droits (gabarit pour toutes les tables de référence de M2,
-- voir supabase/tests/README.md « Convention pour chaque nouvelle table ») :
-- ne jamais compter sur les grants implicites de la plateforme. Toujours
-- `revoke all ... from anon, authenticated` puis regranter explicitement
-- (`select` seul pour une table de référence ; select/insert/update/delete
-- ciblés, filtrés par policy RLS sur `user_id`, pour une table utilisateur).

-- Fonction générique de mise à jour d'`updated_at`, réutilisable par toutes les
-- tables futures qui suivent la convention `created_at`/`updated_at` (DATA_MODEL §Conventions).
-- `search_path` figé à '' et `security invoker` (défaut) : la fonction ne dépend
-- d'aucun objet résolu implicitement, elle est donc qualifiée en toutes lettres
-- (`public.app_meta` etc. si un jour elle référence un objet).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Personne n'appelle cette fonction directement via l'API (uniquement via un
-- trigger) : on révoque l'exécution directe pour anon/authenticated/public.
-- Correction (revue M0, mineur 12) : cette fonction n'est PAS `security
-- definer`, donc un trigger qui l'exécute le fait avec les droits du rôle
-- *appelant* (l'utilisateur qui fait l'update), pas ceux du propriétaire de la
-- table. Le `revoke execute` ci-dessus n'empêche pas son déclenchement par le
-- trigger : les privilèges d'exécution d'une fonction utilisée par un trigger
-- ne sont vérifiés qu'une fois, par le rôle qui exécute `CREATE TRIGGER`
-- (ici `postgres`, propriétaire), jamais à chaque invocation du trigger. Le
-- `revoke` sert uniquement à empêcher un appel direct via `rpc()` (voir test
-- « set_updated_at n'est pas appelable », supabase/tests/app_meta.rls.test.ts).
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create table public.app_meta (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_app_meta_updated_at
  before update on public.app_meta
  for each row
  execute function public.set_updated_at();

alter table public.app_meta enable row level security;

-- Lecture publique pour anon et authenticated (table de référence).
create policy "app_meta_select_all"
  on public.app_meta
  for select
  to anon, authenticated
  using (true);

-- Droits explicites plutôt que de reposer sur les grants implicites de la
-- plateforme (`auto_expose_new_tables`) : on repart de zéro puis on regrante
-- uniquement ce qui est nécessaire. Aucune policy insert/update/delete :
-- anon et authenticated ne peuvent pas écrire (défense en profondeur avec RLS).
revoke all on public.app_meta from anon, authenticated;
grant select on public.app_meta to anon, authenticated;

insert into public.app_meta (key, value) values ('schema_version', '1');

-- Garde-fou générique (revue M0, important 5) : liste les tables du schéma
-- `public` dont la RLS n'est PAS activée. Attendu : toujours vide. Sans accès
-- `service_role` ni SQL direct, les tests RLS (clé anon uniquement) ne peuvent
-- pas interroger `pg_class` eux-mêmes ; cette fonction leur donne un accès en
-- lecture seule, restreint aux noms de table (aucune donnée métier exposée).
--
-- `security definer` : nécessaire pour que la fonction (propriétaire
-- `postgres`) puisse lire `pg_class`/`pg_namespace` même quand elle est
-- appelée par un rôle qui n'aurait autrement pas les privilèges nécessaires.
-- `set search_path = ''` + objets qualifiés (`pg_catalog.pg_class`) : évite
-- toute résolution implicite d'un objet placé par un appelant dans un schéma
-- qu'il contrôlerait (précaution standard pour toute fonction `security
-- definer`, voir doc Postgres « Writing SECURITY DEFINER Functions Safely »).
create or replace function public.rls_disabled_tables()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p') -- tables ordinaires + tables partitionnées
    and not c.relrowsecurity;
$$;

-- Contrairement à `set_updated_at`, celle-ci DOIT être appelable directement
-- via l'API (c'est le seul moyen, pour un client clé anon, de faire tourner ce
-- garde-fou) : on grante `execute` explicitement plutôt que de compter sur un
-- défaut de plateforme.
revoke all on function public.rls_disabled_tables() from public;
grant execute on function public.rls_disabled_tables() to anon, authenticated;
