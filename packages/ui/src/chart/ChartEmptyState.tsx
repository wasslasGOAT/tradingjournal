import { ChartNoAxesCombined } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import type { ChartEmptyStateContent } from './types';

export interface ChartEmptyStateProps {
  readonly testID?: string;
  readonly height: number;
  readonly content: ChartEmptyStateContent;
}

/**
 * État vide de `Chart` (M1-6, ADR-017 : « EmptyState + action » — ici sans
 * action, un graphique vide se résout en ajoutant des trades ailleurs dans
 * l'écran). `content` (titre/description) toujours fourni par l'appelant
 * (i18n, CLAUDE.md) — partagé par `Chart.native.tsx`/`Chart.web.tsx`.
 */
export function ChartEmptyState({ testID, height, content }: ChartEmptyStateProps) {
  return (
    <View testID={testID} className="w-full items-center justify-center" style={{ height }}>
      <EmptyState
        icon={ChartNoAxesCombined}
        title={content.title}
        description={content.description}
      />
    </View>
  );
}
