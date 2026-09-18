-- Durcissement de public.rls_disabled_tables() (revue M0, boucle 2).
-- pg_catalog.pg_class / pg_namespace sont lisibles par PUBLIC (catalogue
-- système standard) : la fonction n'a besoin d'aucun privilège élevé pour les
-- lire, donc `security definer` était superflu et élargissait inutilement la
-- surface d'exécution (le corps tournerait avec les droits de `postgres`,
-- son propriétaire, plutôt que ceux de l'appelant) ; `security invoker`
-- suffit. Par ailleurs, la rendre exécutable par `anon` révèle, avec la seule
-- clé anon (publique par nature), si une table de `public` n'a pas la RLS
-- activée — une information réservée aux utilisateurs authentifiés (tests
-- RLS), pas à un visiteur non authentifié.
--
-- Rappel : `revoke all on function public.rls_disabled_tables() from public;`
-- a déjà été fait dans `20260917172440_app_meta.sql` (migration déjà
-- appliquée sur le cloud de dev, non modifiée ici) ; seuls `anon` et
-- `authenticated` avaient ensuite reçu `execute` explicitement. On retire ici
-- `execute` pour `anon` et on repasse la fonction en `security invoker`
-- (défaut Postgres), sans toucher à son corps.

alter function public.rls_disabled_tables() security invoker;

revoke execute on function public.rls_disabled_tables() from anon;
-- `authenticated` conserve `execute` : le garde-fou reste appelable par les
-- tests RLS (supabase/tests/app_meta.rls.test.ts, client authentifié).
