import type { PnlIntent } from '@/lib/theme/tokens';

/**
 * Interface commune de `Chart` (W-4, ARCHITECTURE §6) : copie web de
 * `packages/ui/src/chart/types.ts` (gelé, ADR-023 — non importable ici,
 * `apps/web` ne possède que `@repo/ui/tokens-data`). Même forme de props que
 * la version native pour faciliter un futur retour Expo — recharts
 * (`Chart.tsx`) plutôt que Skia côté web. Aucun calcul métier ici — tous les
 * points sont déjà des `number` (l'appelant convertit les `Decimal` de
 * `@repo/core` en amont) et tous les libellés passent par une fonction fournie
 * par l'appelant (`format*Label`), qui consomme elle-même `@repo/core/format`.
 */

/** Intention de couleur d'une série/d'un point : P&L (`profit`/`loss`/`flat`) ou neutre. */
export type ChartIntent = PnlIntent | 'accent' | 'neutral';

/** Point cartésien : `x`/`y` déjà des nombres (ex. `x` = index ou epoch jour, `y` = montant en unité d'affichage). */
export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/** Série ligne/aire — un `Chart` peut en superposer plusieurs (ex. equity + référence). */
export interface ChartLineSeries {
  readonly id: string;
  readonly points: readonly ChartPoint[];
  /** Couleur de la série. Défaut `'accent'`. */
  readonly intent?: ChartIntent;
}

/** Une barre (diagramme en barres catégoriel, ex. P&L par symbole/setup). */
export interface ChartBarDatum {
  readonly x: number | string;
  readonly y: number;
  readonly intent?: ChartIntent;
}

/** Classe d'histogramme déjà découpée (ex. `packages/core` `computeRDistribution`, ou {@link binNumericValues} pour une démo générique). */
export interface ChartHistogramBin {
  readonly x0: number;
  readonly x1: number;
  /** Hauteur de la classe : nombre de trades, ou tout autre total (ex. netPnl) — au choix de l'appelant. */
  readonly value: number;
  readonly intent?: ChartIntent;
}

/** Cellule de heatmap (ex. heure × jour de semaine, `packages/core` `computeHeatmap`). */
export interface ChartHeatmapCell {
  readonly row: number;
  readonly col: number;
  readonly value: number;
}

/** Point actif (survol web / tap), en coordonnées de domaine (pas en pixels). */
export interface ChartActivePoint {
  readonly x: number;
  readonly y: number;
  readonly seriesId?: string;
}

/** Contenu de l'état vide — jamais de texte en dur dans `Chart` (i18n) : toujours fourni par l'appelant. */
export interface ChartEmptyStateContent {
  readonly title: string;
  readonly description: string;
}

interface ChartCommonProps {
  readonly testID?: string;
  readonly accessibilityLabel: string;
  /** Hauteur en px. Largeur : 100 % du conteneur parent. Défaut `220`. */
  readonly height?: number;
  readonly loading?: boolean;
  /** Requis (pas de texte par défaut ici) : titre/description traduits par l'appelant. */
  readonly emptyState: ChartEmptyStateContent;
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  /** Formate la valeur affichée dans l'infobulle du point actif. Défaut : `formatYLabel` si fourni, sinon la valeur brute. */
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  /** Appelé au survol/tap — `null` quand aucun point n'est actif. */
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
}

export type ChartLineAreaProps = ChartCommonProps & {
  readonly type: 'line' | 'area';
  readonly series: readonly ChartLineSeries[];
};

export type ChartBarProps = ChartCommonProps & {
  readonly type: 'bar';
  readonly data: readonly ChartBarDatum[];
};

export type ChartHistogramProps = ChartCommonProps & {
  readonly type: 'histogram';
  readonly bins: readonly ChartHistogramBin[];
};

export type ChartHeatmapProps = ChartCommonProps & {
  readonly type: 'heatmap';
  readonly cells: readonly ChartHeatmapCell[];
  readonly rows: number;
  readonly cols: number;
  readonly formatRowLabel?: (row: number) => string;
  readonly formatColLabel?: (col: number) => string;
  readonly legendLabels?: { readonly low: string; readonly high: string };
};

export type ChartProps =
  ChartLineAreaProps | ChartBarProps | ChartHistogramProps | ChartHeatmapProps;
