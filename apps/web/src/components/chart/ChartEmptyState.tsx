import { ChartNoAxesCombined } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import type { ChartEmptyStateContent } from './types';

export interface ChartEmptyStateProps {
  readonly height: number;
  readonly content: ChartEmptyStateContent;
  readonly testId?: string;
}

/**
 * État vide de `Chart` (W-4, ADR-017 : « EmptyState + action » — ici sans
 * action, un graphique vide se résout en ajoutant des trades ailleurs dans
 * l'écran). `content` (titre/description) toujours fourni par l'appelant
 * (i18n) — même rôle que `packages/ui/src/chart/ChartEmptyState.tsx` (gelé).
 */
export function ChartEmptyState({ height, content, testId }: ChartEmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex w-full items-center justify-center"
      style={{ height }}
    >
      <EmptyState
        icon={ChartNoAxesCombined}
        title={content.title}
        description={content.description}
      />
    </div>
  );
}
