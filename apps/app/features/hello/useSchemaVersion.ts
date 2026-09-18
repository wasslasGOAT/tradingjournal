import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { getSupabaseClientState } from '@/lib/supabase/client';
import type { SupabaseEnvField, SupabaseEnvInvalidIssue } from '@/lib/supabase/env';

/** Clé de requête TanStack Query : pas de filtre (compte/période) pour cette valeur système. */
export const schemaVersionQueryKey = ['app_meta', 'schema_version'] as const;

async function fetchSchemaVersion(): Promise<string | null> {
  const state = getSupabaseClientState();
  if (state.status !== 'ready') {
    // Ne devrait pas se produire : la requête est désactivée (`enabled`) tant que
    // le client n'est pas prêt (voir `useSchemaVersion`).
    throw new Error('supabase-client-not-ready');
  }

  // ADR-016 : montants lus en chaîne puis convertis par `packages/core` — sans
  // objet ici (`value` est déjà `text` en base), mais même principe de lecture
  // directe des colonnes sans calcul dans le composant.
  const { data, error } = await state.client
    .from('app_meta')
    .select('value')
    .eq('key', 'schema_version')
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
}

export type SchemaVersionResult =
  | { status: 'missing-env'; missing: SupabaseEnvField[] }
  | { status: 'invalid-env'; invalid: SupabaseEnvInvalidIssue[] }
  | { status: 'query'; query: UseQueryResult<string | null, Error> };

/**
 * Lit `app_meta.schema_version` (écran Hello, T6). Distingue l'absence
 * (`missing-env`) ou l'invalidité (`invalid-env`, correctif revue M0 — Mineur
 * 9) de la configuration Supabase — aucune des deux ne dépend du réseau — de
 * l'état de la requête elle-même (chargement / vide / erreur / rempli), pour
 * que l'écran puisse afficher un message dédié dans chacun des deux premiers cas.
 */
export function useSchemaVersion(): SchemaVersionResult {
  const clientState = getSupabaseClientState();

  // Toujours appelé (règle des Hooks), désactivé tant que le client n'est pas prêt.
  const query = useQuery<string | null, Error>({
    queryKey: schemaVersionQueryKey,
    queryFn: fetchSchemaVersion,
    enabled: clientState.status === 'ready',
  });

  if (clientState.status === 'missing-env') {
    return { status: 'missing-env', missing: clientState.missing };
  }
  if (clientState.status === 'invalid-env') {
    return { status: 'invalid-env', invalid: clientState.invalid };
  }
  return { status: 'query', query };
}
