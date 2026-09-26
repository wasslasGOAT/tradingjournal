import { useVirtualizer } from '@tanstack/react-virtual';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import type { EmptyStateAction } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

import { buildSectionedRows, countItems } from './list-sections';
import type { ListSection } from './list-sections';

export interface VirtualizedListEmptyState {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly action?: EmptyStateAction;
}

export interface VirtualizedListProps<TItem> {
  readonly testId?: string;
  readonly sections: readonly ListSection<TItem>[];
  readonly renderItem: (item: TItem, index: number) => ReactElement;
  /** Doit être référentiellement stable d'un rendu à l'autre (mémoïsée par l'appelant). */
  readonly keyExtractor: (item: TItem, index: number) => string;
  readonly loading?: boolean;
  readonly loadingRowCount?: number;
  /** Requis (pas de texte par défaut) : icône/titre/description traduits par l'appelant. */
  readonly emptyState: VirtualizedListEmptyState;
  /** Texte de pied de liste (« fin de liste ») — omis -> aucun pied de liste. */
  readonly endOfListLabel?: string;
  readonly separators?: boolean;
  /** Hauteur (px) du conteneur défilant. */
  readonly height?: number;
}

const ITEM_HEIGHT = 60;
const HEADER_HEIGHT = 36;
const DEFAULT_LOADING_ROW_COUNT = 8;

/**
 * Wrapper `@tanstack/react-virtual` (W-4, ADR-017 : « listes virtualisées
 * au-delà de 50 éléments ») — même rôle que
 * `packages/ui/src/list/VirtualizedList.tsx` (gelé, `FlashList` côté natif) :
 * états chargement (squelette)/vide/fin de liste, séparateurs, en-têtes de
 * section. Aucun calcul métier : `sections`/`renderItem` fournis par l'écran
 * appelant.
 */
export function VirtualizedList<TItem>({
  testId,
  sections,
  renderItem,
  keyExtractor,
  loading,
  loadingRowCount = DEFAULT_LOADING_ROW_COUNT,
  emptyState,
  endOfListLabel,
  separators = true,
  height = 420,
}: VirtualizedListProps<TItem>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { rows } = useMemo(
    () => buildSectionedRows(sections, keyExtractor),
    [sections, keyExtractor],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT),
    overscan: 8,
  });

  if (loading) {
    return (
      <div
        data-testid={testId ? `${testId}-skeleton` : undefined}
        className="flex flex-col gap-2 p-2"
      >
        {Array.from({ length: loadingRowCount }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (countItems(sections) === 0) {
    return (
      <div data-testid={testId} className="flex items-center justify-center py-6">
        <EmptyState
          testId={testId ? `${testId}-empty` : undefined}
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      data-testid={testId}
      ref={parentRef}
      className="h-full w-full overflow-y-auto"
      style={{ height }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={row.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={separators && row.kind === 'item' ? 'border-b border-border' : undefined}
            >
              {row.kind === 'header' ? (
                <div className="bg-background px-2 py-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">{row.title}</p>
                </div>
              ) : (
                renderItem(row.item, row.index)
              )}
            </div>
          );
        })}
      </div>
      {endOfListLabel !== undefined ? (
        <div className="flex items-center justify-center py-4">
          <p className="text-xs text-muted-foreground">{endOfListLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
