// Tests RLS de `app_meta` (T7, M0). Table de référence système : lecture publique
// (anon + authenticated), aucune écriture via l'API (migration
// `20260917172440_app_meta.sql`). Deux clients authentifiés avec la clé anon
// uniquement — jamais `service_role` (CLAUDE.md, ARCHITECTURE §9).
import { beforeAll, describe, expect, it } from 'vitest';

import { createAnonClient, createTestUserPair } from './helpers/clients';
import type { TestUser } from './helpers/clients';

describe('app_meta RLS', () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    ({ userA, userB } = await createTestUserPair());
  });

  describe('lecture (table de référence, publique)', () => {
    it('anon peut lire schema_version', async () => {
      const anon = createAnonClient();
      const { data, error } = await anon
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();

      expect(error).toBeNull();
      expect(data?.value).toBe('1');
    });

    it('un utilisateur authentifié peut lire schema_version', async () => {
      const { data, error } = await userA.client
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();

      expect(error).toBeNull();
      expect(data?.value).toBe('1');
    });
  });

  // Convention (revue M0, important 5 — voir README « Convention pour chaque
  // nouvelle table ») : `expect(error).not.toBeNull()` seul passe aussi pour
  // une erreur réseau, une mauvaise URL ou une mauvaise clé — ça ne prouve pas
  // que c'est bien la RLS/les GRANT qui ont bloqué l'opération. `app_meta` n'a
  // ni policy ni GRANT insert/update/delete pour anon/authenticated : Postgres
  // refuse donc au niveau du privilège de table, avant même d'évaluer une
  // policy RLS, avec le code `42501` (permission denied). On vérifie ce code
  // précis plutôt qu'une simple présence d'erreur.
  describe('écriture (aucune, ni RLS ni GRANT ne l’autorisent)', () => {
    it('anon ne peut pas insérer de ligne', async () => {
      const anon = createAnonClient();
      const key = `rls-test-anon-insert-${crypto.randomUUID()}`;

      const { error } = await anon.from('app_meta').insert({ key, value: 'x' });
      expect(error?.code).toBe('42501');

      const { data } = await anon.from('app_meta').select('key').eq('key', key).maybeSingle();
      expect(data).toBeNull();
    });

    it('un utilisateur authentifié ne peut pas insérer de ligne', async () => {
      const key = `rls-test-auth-insert-${crypto.randomUUID()}`;

      const { error } = await userA.client.from('app_meta').insert({ key, value: 'x' });
      expect(error?.code).toBe('42501');

      const { data } = await userA.client
        .from('app_meta')
        .select('key')
        .eq('key', key)
        .maybeSingle();
      expect(data).toBeNull();
    });

    it('anon ne peut pas modifier schema_version', async () => {
      const anon = createAnonClient();

      const { error } = await anon
        .from('app_meta')
        .update({ value: 'hacked-by-anon' })
        .eq('key', 'schema_version');
      expect(error?.code).toBe('42501');

      const { data } = await anon
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();
      expect(data?.value).toBe('1');
    });

    it('un utilisateur authentifié ne peut pas modifier schema_version', async () => {
      const { error } = await userA.client
        .from('app_meta')
        .update({ value: 'hacked-by-authenticated' })
        .eq('key', 'schema_version');
      expect(error?.code).toBe('42501');

      const { data } = await userA.client
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();
      expect(data?.value).toBe('1');
    });

    it('anon ne peut pas supprimer schema_version', async () => {
      const anon = createAnonClient();

      const { error } = await anon.from('app_meta').delete().eq('key', 'schema_version');
      expect(error?.code).toBe('42501');

      const { data } = await anon
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();
      expect(data?.value).toBe('1');
    });

    it('un utilisateur authentifié ne peut pas supprimer schema_version', async () => {
      const { error } = await userA.client.from('app_meta').delete().eq('key', 'schema_version');
      expect(error?.code).toBe('42501');

      const { data } = await userA.client
        .from('app_meta')
        .select('value')
        .eq('key', 'schema_version')
        .single();
      expect(data?.value).toBe('1');
    });
  });

  describe('fonctions internes non exposées', () => {
    it('set_updated_at (fonction de trigger) ne peut pas être appelée via rpc()', async () => {
      const anon = createAnonClient();

      // `set_updated_at` retourne `trigger` (pseudo-type Postgres) : `supabase
      // gen types` l'exclut volontairement de `Database['public']['Functions']`
      // (une fonction de trigger n'est de toute façon jamais appelable via
      // PostgREST). Le client typé ne permet donc pas de construire cet appel
      // directement ; on caste le nom vers un nom de fonction connu du type
      // (même signature réelle : aucun argument) plutôt que d'utiliser `any`.
      const { error } = await anon.rpc('set_updated_at' as unknown as 'rls_disabled_tables');

      expect(error).not.toBeNull();
      // Deux codes sont acceptables selon la façon dont PostgREST résout
      // l'appel, et les deux traduisent la même propriété (« fonction interne
      // non appelable ») :
      // - `PGRST202` : PostgREST ne liste, dans son schema cache, que les
      //   fonctions pour lesquelles le rôle appelant a `execute`
      //   (`has_function_privilege`). Comme l'exécution est révoquée pour
      //   anon/authenticated (migration `20260917172440_app_meta.sql`), la
      //   fonction n'apparaît simplement pas -> « function not found ».
      // - `42501` : si le schema cache la connaît malgré tout, Postgres refuse
      //   l'exécution au moment de l'appel (permission denied).
      // Le comportement exact de mise en cache de PostgREST n'est pas garanti
      // par contrat ; on accepte les deux plutôt que de figer un détail
      // d'implémentation externe.
      expect(['PGRST202', '42501']).toContain(error?.code);
    });
  });

  describe('garde-fou : RLS activée sur tout le schéma public', () => {
    // Migration `20260918090000_harden_rls_guard.sql` (revue M0, boucle 2) :
    // `rls_disabled_tables()` est passée en `security invoker` et n'est plus
    // exécutable par `anon` (seule `authenticated` conserve `execute`) — avec
    // la clé anon, n'importe quel visiteur aurait pu savoir quelle table de
    // `public` n'a pas la RLS activée, avant même de s'authentifier.
    it('un utilisateur authentifié : rls_disabled_tables() ne retourne aucune table (RLS activée partout)', async () => {
      const { data, error } = await userA.client.rpc('rls_disabled_tables');

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('anon ne peut pas appeler rls_disabled_tables()', async () => {
      const anon = createAnonClient();

      const { data, error } = await anon.rpc('rls_disabled_tables');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      // Même alternative que pour `set_updated_at` ci-dessus (README « Assertion
      // précise ») : selon que le schema cache de PostgREST connaît encore la
      // fonction pour `anon`, l'appel échoue soit par « function not found »
      // (`PGRST202`, l'exécution étant révoquée pour ce rôle), soit par un
      // refus Postgres explicite au moment de l'appel (`42501`).
      expect(['PGRST202', '42501']).toContain(error?.code);
    });
  });

  // Renommé (revue M0, important 5) : ce bloc teste l'authentification (deux
  // sessions distinctes obtenues via `createTestUserPair`), pas la RLS —
  // `app_meta` n'a aucune donnée par utilisateur pour vérifier une isolation.
  // Il sert de prérequis réutilisable par les tests A/B des tables
  // utilisateur de M2 (`profiles`, `preferences`, `accounts`,
  // `cash_movements`), qui eux testeront une véritable isolation RLS.
  describe('prérequis : deux sessions authentifiées distinctes (A et B)', () => {
    it('les utilisateurs A et B ont des sessions authentifiées distinctes', async () => {
      const [resultA, resultB] = await Promise.all([
        userA.client.auth.getUser(),
        userB.client.auth.getUser(),
      ]);

      expect(resultA.error).toBeNull();
      expect(resultB.error).toBeNull();
      expect(resultA.data.user?.id).toBeTruthy();
      expect(resultB.data.user?.id).toBeTruthy();
      expect(resultA.data.user?.id).not.toBe(resultB.data.user?.id);
      expect(resultA.data.user?.email).toBe(userA.email);
      expect(resultB.data.user?.email).toBe(userB.email);
    });
  });
});
