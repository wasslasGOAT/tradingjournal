import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HelloContent } from './HelloContent';
import { HelloEmptyState } from './HelloEmptyState';
import { HelloErrorState } from './HelloErrorState';
import { HelloRefreshErrorNotice } from './HelloRefreshErrorNotice';
import { HelloSkeleton } from './HelloSkeleton';
import { useSchemaVersion } from './useSchemaVersion';

/**
 * Écran « Hello » (M0/T6) : lit `app_meta.schema_version` via Supabase +
 * TanStack Query et couvre les 4 états requis par chaque écran de données
 * (CLAUDE.md, ADR-017) : chargement (squelette, jamais de spinner plein écran),
 * vide, erreur (avec Réessayer), rempli. Inclut les états supplémentaires
 * « configuration manquante » et « configuration invalide » quand
 * `apps/app/.env` n'est pas renseigné ou contient une valeur mal formée
 * (correctif revue M0 — Mineur 9).
 *
 * Ordre des branches (correctif revue M0 — Important 7, ADR-017) : une donnée
 * déjà connue (`result.query.data !== undefined`, restaurée du cache persisté
 * ou issue d'un fetch précédent réussi) est toujours affichée en priorité sur
 * un échec de refetch concurrent — jamais remplacée par l'état « erreur » tant
 * qu'une donnée valide (même « vide », `data === null`) est disponible. Un
 * refetch en échec se traduit alors par un indicateur discret
 * (`HelloRefreshErrorNotice` / `HelloEmptyState.refreshFailed`) plutôt qu'un
 * écran d'erreur plein écran.
 */
export function HelloScreen() {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const result = useSchemaVersion();

  return (
    <View
      testID="hello-screen"
      className="flex-1 items-center justify-center gap-sm bg-background px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {result.status === 'missing-env' ? (
        <HelloErrorState
          testID="hello-config-error"
          title={t('hello.configError.title')}
          description={t('hello.configError.description')}
        />
      ) : result.status === 'invalid-env' ? (
        <HelloErrorState
          testID="hello-invalid-env"
          title={t('hello.invalidEnv.title')}
          description={result.invalid
            .map((issue) =>
              issue.code === 'secret-key'
                ? t('hello.invalidEnv.secretKey')
                : t('hello.invalidEnv.url'),
            )
            .join(' ')}
        />
      ) : result.query.data !== undefined ? (
        result.query.data == null ? (
          <HelloEmptyState
            title={t('hello.empty.title')}
            description={t('hello.empty.description')}
            onRetry={() => void result.query.refetch()}
            isRefreshing={result.query.isFetching}
            refreshFailed={result.query.isError}
          />
        ) : (
          <>
            <HelloContent schemaVersion={result.query.data} />
            {result.query.isError ? (
              <HelloRefreshErrorNotice
                onRetry={() => void result.query.refetch()}
                isRefreshing={result.query.isFetching}
              />
            ) : null}
          </>
        )
      ) : result.query.isPending ? (
        <HelloSkeleton />
      ) : (
        <HelloErrorState
          testID="hello-error"
          title={t('hello.error.title')}
          description={t('hello.error.description')}
          onRetry={() => void result.query.refetch()}
          isRefreshing={result.query.isFetching}
        />
      )}
    </View>
  );
}
