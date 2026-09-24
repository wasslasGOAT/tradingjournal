import { FlashList } from '@shopify/flash-list';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import type { EmptyStateAction } from '../components/EmptyState';
import { useThemeMode } from '../theme/ThemeProvider';
import { themes } from '../tokens';
import { ListSkeleton } from './ListSkeleton';
import { buildSectionedRows, countItems } from './listSections';
import type { ListSection } from './types';

export interface VirtualizedListEmptyState {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly action?: EmptyStateAction;
}

export interface VirtualizedListProps<TItem> {
  readonly testID?: string;
  readonly sections: readonly ListSection<TItem>[];
  readonly renderItem: (item: TItem, index: number) => ReactElement;
  readonly keyExtractor: (item: TItem, index: number) => string;
  readonly loading?: boolean;
  readonly loadingRowCount?: number;
  /** Requis (pas de texte par défaut, CLAUDE.md) : icône/titre/description traduits par l'appelant. */
  readonly emptyState: VirtualizedListEmptyState;
  /** Texte de pied de liste (« fin de liste ») — omis, ou `hasMore` à `true`, -> aucun pied de liste. */
  readonly endOfListLabel?: string;
  readonly hasMore?: boolean;
  readonly onEndReached?: () => void;
  /** Séparateur fin entre les lignes. Défaut `true`. */
  readonly separators?: boolean;
}

/**
 * Wrapper `FlashList` (M1-5, ADR-017 : « listes virtualisées au-delà de 50
 * éléments ») : états chargement (squelette)/vide/fin de liste, séparateurs,
 * en-têtes de section (`stickyHeaderIndices`, hérité de `ScrollViewProps`).
 * Aucun calcul métier : `sections`/`renderItem` sont fournis par l'écran
 * appelant (ex. trade log filtré, groupé par jour — M4).
 */
export function VirtualizedList<TItem>({
  testID,
  sections,
  renderItem,
  keyExtractor,
  loading,
  loadingRowCount,
  emptyState,
  endOfListLabel,
  hasMore,
  onEndReached,
  separators = true,
}: VirtualizedListProps<TItem>) {
  const mode = useThemeMode();
  const colors = themes[mode];

  const { rows, stickyHeaderIndices } = useMemo(
    () => buildSectionedRows(sections, keyExtractor),
    [sections, keyExtractor],
  );

  if (loading) {
    return (
      <ListSkeleton testID={testID ? `${testID}-skeleton` : undefined} rowCount={loadingRowCount} />
    );
  }

  if (countItems(sections) === 0) {
    return (
      <View testID={testID} className="items-center justify-center">
        <EmptyState
          testID={testID ? `${testID}-empty` : undefined}
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </View>
    );
  }

  return (
    <FlashList
      testID={testID}
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.kind}
      stickyHeaderIndices={[...stickyHeaderIndices]}
      renderItem={({ item: row }) =>
        row.kind === 'header' ? (
          <View className="bg-background px-xs py-xs">
            <Text className="font-sans-semibold text-sm text-textSecondary">{row.title}</Text>
          </View>
        ) : (
          renderItem(row.item, row.index)
        )
      }
      ItemSeparatorComponent={
        separators
          ? () => <View style={{ height: 1, backgroundColor: colors.border }} />
          : undefined
      }
      ListFooterComponent={
        endOfListLabel !== undefined && !hasMore ? (
          <View className="items-center py-md">
            <Text className="font-sans text-xs text-textMuted">{endOfListLabel}</Text>
          </View>
        ) : null
      }
      onEndReached={onEndReached ?? undefined}
      onEndReachedThreshold={0.4}
    />
  );
}
