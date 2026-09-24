import { Circle, RoundedRect } from '@shopify/react-native-skia';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { Area, CartesianChart, getBarWidth, Line, useChartPressState } from 'victory-native';

import { useMotionPreference } from '../motion';
import { useThemeMode } from '../theme/ThemeProvider';
import { useThemeStore } from '../theme/themeStore';
import { pnlColorSchemes, themes } from '../tokens';
import type { ColorTokens } from '../tokens';
import { ChartEmptyState } from './ChartEmptyState';
import { computeDomain, padDomain } from './scale';
import { ChartSkeleton } from './ChartSkeleton';
import { ChartTooltipBubble } from './ChartTooltipBubble';
import type { ChartPnlPalette } from './colors';
import { resolveChartColor } from './colors';
import { HeatmapGrid } from './HeatmapGrid';
import { mergeLineSeries } from './mergeLineSeries';
import type {
  ChartActivePoint,
  ChartBarProps,
  ChartHistogramProps,
  ChartLineAreaProps,
  ChartProps,
} from './types';

/**
 * `Chart.native.tsx` (M1-6, ADR-021) : adaptateur `victory-native` (Skia) —
 * même API que `Chart.web.tsx` (`ChartProps`, `types.ts`). Les axes/graduations
 * texte de victory-native exigent une police Skia chargée séparément
 * (`useFont`) ; pour rester cohérent avec la typo Inter posée par NativeWind
 * partout ailleurs sans dupliquer le chargement de police, les libellés
 * d'axes sont ici des `Text` RN superposés (calculés depuis les mêmes
 * `points`/`chartBounds` que le tracé Skia), pas du texte Skia — seul le
 * tracé (ligne/aire/barres) est dessiné dans le `Canvas` de `CartesianChart`.
 */

const DEFAULT_HEIGHT = 220;
const PRESS_ANIMATION_CONFIG = { type: 'timing', duration: 300 } as const;

interface ThemeContext {
  readonly colors: ColorTokens;
  readonly pnl: ChartPnlPalette;
  readonly animate: boolean;
}

function isChartEmpty(props: ChartProps): boolean {
  switch (props.type) {
    case 'line':
    case 'area':
      return props.series.every((s) => s.points.length === 0);
    case 'bar':
      return props.data.length === 0;
    case 'histogram':
      return props.bins.length === 0;
    case 'heatmap':
      return props.cells.length === 0;
  }
}

function formatActivePointLabel(
  point: ChartActivePoint,
  formatXLabel: ((value: number) => string) | undefined,
): string {
  return formatXLabel ? formatXLabel(point.x) : `${point.x}`;
}

function formatActivePointValue(
  point: ChartActivePoint,
  formatTooltipValue: ((point: ChartActivePoint) => string) | undefined,
  formatYLabel: ((value: number) => string) | undefined,
): string {
  if (formatTooltipValue) return formatTooltipValue(point);
  if (formatYLabel) return formatYLabel(point.y);
  return `${point.y}`;
}

interface ActiveTooltipOverlayProps {
  readonly point: ChartActivePoint | null;
  /** Valeurs partagées (pixel) du toucher actif — lues côté UI thread dans `useAnimatedStyle` pour un suivi fluide indépendant des rendus React (`activePoint` ne change, lui, qu'à chaque changement d'index de donnée le plus proche). */
  readonly xPosition: SharedValue<number>;
  readonly yPosition: SharedValue<number>;
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
}

/** Infobulle positionnée par-dessus le `Canvas` Skia (M1-6) — mêmes coordonnées pixel que le marqueur tracé dedans. */
function ActiveTooltipOverlay({
  point,
  xPosition,
  yPosition,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
}: ActiveTooltipOverlayProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: xPosition.value - 44 },
      { translateY: Math.max(yPosition.value - 64, 0) },
    ],
  }));

  if (!point) return null;

  return (
    <Animated.View pointerEvents="none" className="absolute left-0 top-0" style={style}>
      <ChartTooltipBubble
        label={formatActivePointLabel(point, formatXLabel)}
        value={formatActivePointValue(point, formatTooltipValue, formatYLabel)}
      />
    </Animated.View>
  );
}

// `type` (pas `interface`) : nécessaire pour l'inférence générique de
// `CartesianChart` (`RawData extends Record<string, unknown>`) — un type
// littéral obtient un index de signature implicite compatible, une
// `interface` non (limitation connue de TypeScript).
type SingleSeriesRow = {
  readonly x: number;
  readonly y: number;
};

interface SingleSeriesLineAreaProps {
  readonly type: 'line' | 'area';
  readonly points: readonly SingleSeriesRow[];
  readonly color: string;
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
  readonly theme: ThemeContext;
}

/** Série unique, interactive (toucher -> infobulle) — le cas du dashboard (une seule courbe d'equity). */
function SingleSeriesLineArea({
  type,
  points,
  color,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: SingleSeriesLineAreaProps) {
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });
  const [activePoint, setActivePoint] = useState<ChartActivePoint | null>(null);

  useAnimatedReaction(
    () => (state.isActive.value ? state.x.value.value : null),
    (xValue, previousXValue) => {
      if (xValue === previousXValue) return;
      if (xValue === null) {
        runOnJS(setActivePoint)(null);
      } else {
        runOnJS(setActivePoint)({ x: xValue, y: state.y.y.value.value });
      }
    },
    [state],
  );

  useEffect(() => {
    onActivePointChange?.(activePoint);
  }, [activePoint, onActivePointChange]);

  const animate = theme.animate ? PRESS_ANIMATION_CONFIG : undefined;
  // Même cadrage que l'adaptateur web : axe vertical sur la plage réelle des valeurs, avec
  // marge. Sinon une courbe d'equity loin de zéro est écrasée en haut du graphique (M1-6).
  // Copie mutable : `CartesianChart` attend un tuple `[number, number]` modifiable.
  const [yMin, yMax] = padDomain(computeDomain(points.map((point) => point.y)));
  const yDomain: [number, number] = [yMin, yMax];

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={points as SingleSeriesRow[]}
        xKey="x"
        yKeys={['y']}
        chartPressState={state}
        domainPadding={{ left: 8, right: 8, top: 20, bottom: 8 }}
        domain={{ y: yDomain }}
      >
        {({ points: chartPoints, chartBounds }) => {
          const lastPoint = chartPoints.y.at(-1);
          return (
            <Fragment>
              {type === 'area' ? (
                <Area
                  points={chartPoints.y}
                  y0={chartBounds.bottom}
                  color={color}
                  opacity={0.18}
                  curveType="natural"
                  animate={animate}
                />
              ) : null}
              <Line
                points={chartPoints.y}
                color={color}
                strokeWidth={2}
                curveType="natural"
                animate={animate}
              />
              {lastPoint && typeof lastPoint.y === 'number' ? (
                <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} color={color} />
              ) : null}
              {isActive ? (
                <Circle cx={state.x.position} cy={state.y.y.position} r={5} color={color} />
              ) : null}
            </Fragment>
          );
        }}
      </CartesianChart>
      <ActiveTooltipOverlay
        point={isActive ? activePoint : null}
        xPosition={state.x.position}
        yPosition={state.y.y.position}
        formatXLabel={formatXLabel}
        formatYLabel={formatYLabel}
        formatTooltipValue={formatTooltipValue}
      />
    </View>
  );
}

/** Plusieurs séries superposées (ex. catalogue) — pas d'infobulle au toucher (limitation acceptée pour M1, voir rapport de tâche). */
function MultiSeriesLineArea({
  type,
  series,
  theme,
}: ChartLineAreaProps & { readonly theme: ThemeContext }) {
  const data = useMemo(() => mergeLineSeries(series), [series]);
  const yKeys = useMemo(() => series.map((s) => s.id), [series]);
  const animate = theme.animate ? PRESS_ANIMATION_CONFIG : undefined;

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={yKeys}
        domainPadding={{ left: 8, right: 8, top: 20, bottom: 8 }}
      >
        {({ points, chartBounds }) => (
          <Fragment>
            {series.map((s) => {
              const color = resolveChartColor(s.intent, theme.colors, theme.pnl);
              const seriesPoints = points[s.id] ?? [];
              const lastPoint = seriesPoints.at(-1);
              return (
                <Fragment key={s.id}>
                  {type === 'area' ? (
                    <Area
                      points={seriesPoints}
                      y0={chartBounds.bottom}
                      color={color}
                      opacity={0.18}
                      curveType="natural"
                      animate={animate}
                    />
                  ) : null}
                  <Line
                    points={seriesPoints}
                    color={color}
                    strokeWidth={2}
                    curveType="natural"
                    animate={animate}
                  />
                  {lastPoint && typeof lastPoint.y === 'number' ? (
                    <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} color={color} />
                  ) : null}
                </Fragment>
              );
            })}
          </Fragment>
        )}
      </CartesianChart>
    </View>
  );
}

// `type`, même raison que {@link SingleSeriesRow}.
type CategoricalRow = {
  readonly x: number;
  readonly y: number;
  readonly intent: ChartBarProps['data'][number]['intent'];
};

interface CategoricalBarChartProps {
  readonly rows: readonly CategoricalRow[];
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
  readonly theme: ThemeContext;
}

/** Barres (diagramme en barres et histogramme partagent ce rendu : lignes déjà `{x,y,intent}`) — une `RoundedRect` par barre pour une couleur propre à chacune (`victory-native` `Bar` ne dessine qu'un seul tracé/une seule couleur par appel). */
function CategoricalBarChart({
  rows,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: CategoricalBarChartProps) {
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });
  const [activePoint, setActivePoint] = useState<ChartActivePoint | null>(null);

  useAnimatedReaction(
    () => (state.isActive.value ? state.x.value.value : null),
    (xValue, previousXValue) => {
      if (xValue === previousXValue) return;
      if (xValue === null) {
        runOnJS(setActivePoint)(null);
      } else {
        runOnJS(setActivePoint)({ x: xValue, y: state.y.y.value.value });
      }
    },
    [state],
  );

  useEffect(() => {
    onActivePointChange?.(activePoint);
  }, [activePoint, onActivePointChange]);

  // La ligne de base (0) doit toujours être dans le domaine visible, sinon
  // `yScale(0)` extrapole hors du canvas et les barres semblent flotter
  // (revue interne M1-6) — domaine explicite plutôt que le calcul par défaut
  // de `CartesianChart` (`[min(data), max(data)]`, qui n'inclut pas 0 pour un
  // histogramme de comptages tous positifs). Couvre aussi les valeurs
  // négatives (ex. P&L par symbole) : `Math.min(0, …)`/`Math.max(0, …)`.
  const yValues = rows.map((row) => row.y);
  const yDomain: [number, number] = [Math.min(0, ...yValues), Math.max(0, ...yValues)];

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={rows as CategoricalRow[]}
        xKey="x"
        yKeys={['y']}
        chartPressState={state}
        domainPadding={{ left: 16, right: 16, top: 20, bottom: 8 }}
        domain={{ y: yDomain }}
      >
        {({ points, chartBounds, yScale }) => {
          const barWidth = getBarWidth({
            points: points.y,
            chartBounds,
            innerPadding: 0.3,
            barCount: rows.length,
          });
          const baselineY = yScale(0);

          return (
            <Fragment>
              {points.y.map((point, index) => {
                if (typeof point.y !== 'number') return null;
                const row = rows[index];
                const color = resolveChartColor(row?.intent, theme.colors, theme.pnl);
                const top = Math.min(point.y, baselineY);
                const barHeight = Math.max(Math.abs(baselineY - point.y), 1);
                return (
                  <RoundedRect
                    key={`${point.x}-${index}`}
                    x={point.x - barWidth / 2}
                    y={top}
                    width={barWidth}
                    height={barHeight}
                    r={3}
                    color={color}
                  />
                );
              })}
              {isActive ? (
                <Circle
                  cx={state.x.position}
                  cy={state.y.y.position}
                  r={4}
                  color={theme.colors.accent}
                />
              ) : null}
            </Fragment>
          );
        }}
      </CartesianChart>
      <ActiveTooltipOverlay
        point={isActive ? activePoint : null}
        xPosition={state.x.position}
        yPosition={state.y.y.position}
        formatXLabel={formatXLabel}
        formatYLabel={formatYLabel}
        formatTooltipValue={formatTooltipValue}
      />
    </View>
  );
}

function BarChartNative(props: ChartBarProps & { readonly theme: ThemeContext }) {
  const { data, formatXLabel, formatYLabel, formatTooltipValue, onActivePointChange, theme } =
    props;
  const isNumericX = typeof data[0]?.x === 'number';
  const rows: CategoricalRow[] = useMemo(
    () =>
      data.map((datum, index) => ({
        x: isNumericX ? (datum.x as number) : index,
        y: datum.y,
        intent: datum.intent,
      })),
    [data, isNumericX],
  );

  return (
    <CategoricalBarChart
      rows={rows}
      formatXLabel={isNumericX ? formatXLabel : undefined}
      formatYLabel={formatYLabel}
      formatTooltipValue={formatTooltipValue}
      onActivePointChange={onActivePointChange}
      theme={theme}
    />
  );
}

function HistogramChartNative(props: ChartHistogramProps & { readonly theme: ThemeContext }) {
  const { bins, formatXLabel, formatYLabel, formatTooltipValue, onActivePointChange, theme } =
    props;
  const rows: CategoricalRow[] = useMemo(
    () => bins.map((bin) => ({ x: (bin.x0 + bin.x1) / 2, y: bin.value, intent: bin.intent })),
    [bins],
  );

  return (
    <CategoricalBarChart
      rows={rows}
      formatXLabel={formatXLabel}
      formatYLabel={formatYLabel}
      formatTooltipValue={formatTooltipValue}
      onActivePointChange={onActivePointChange}
      theme={theme}
    />
  );
}

function LineAreaChartNative(props: ChartLineAreaProps & { readonly theme: ThemeContext }) {
  const {
    series,
    type,
    formatXLabel,
    formatYLabel,
    formatTooltipValue,
    onActivePointChange,
    theme,
  } = props;

  if (series.length === 1) {
    const only = series[0]!;
    return (
      <SingleSeriesLineArea
        type={type}
        points={only.points}
        color={resolveChartColor(only.intent, theme.colors, theme.pnl)}
        formatXLabel={formatXLabel}
        formatYLabel={formatYLabel}
        formatTooltipValue={formatTooltipValue}
        onActivePointChange={onActivePointChange}
        theme={theme}
      />
    );
  }

  return <MultiSeriesLineArea {...props} />;
}

export function Chart(props: ChartProps) {
  const { testID, accessibilityLabel, height = DEFAULT_HEIGHT, loading, emptyState } = props;
  const mode = useThemeMode();
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);
  const { reduceMotion } = useMotionPreference();
  const theme: ThemeContext = {
    colors: themes[mode],
    pnl: pnlColorSchemes[mode][pnlColorScheme],
    animate: !reduceMotion,
  };

  if (loading) return <ChartSkeleton testID={testID} height={height} />;
  if (isChartEmpty(props))
    return <ChartEmptyState testID={testID} height={height} content={emptyState} />;

  if (props.type === 'heatmap') {
    return (
      <View testID={testID} accessibilityLabel={accessibilityLabel}>
        <HeatmapGrid
          testID={testID ? `${testID}-heatmap` : undefined}
          cells={props.cells}
          rows={props.rows}
          cols={props.cols}
          formatRowLabel={props.formatRowLabel}
          formatColLabel={props.formatColLabel}
          formatTooltipValue={props.formatTooltipValue}
          legendLabels={props.legendLabels}
          onActivePointChange={props.onActivePointChange}
        />
      </View>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={{ width: '100%', height }}>
      {props.type === 'bar' ? (
        <BarChartNative {...props} theme={theme} />
      ) : props.type === 'histogram' ? (
        <HistogramChartNative {...props} theme={theme} />
      ) : (
        <LineAreaChartNative {...props} theme={theme} />
      )}
    </View>
  );
}
