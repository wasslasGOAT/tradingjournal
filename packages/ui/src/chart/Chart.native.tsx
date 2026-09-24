import { Circle, RoundedRect } from '@shopify/react-native-skia';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import type { ChartBounds } from 'victory-native';
import { Area, CartesianChart, getBarWidth, Line, useChartPressState } from 'victory-native';

import { useMotionPreference } from '../motion';
import { useThemeMode } from '../theme/ThemeProvider';
import { useThemeStore } from '../theme/themeStore';
import { pnlColorSchemes, spacing, themes, typography } from '../tokens';
import type { ColorTokens } from '../tokens';
import { ChartEmptyState } from './ChartEmptyState';
import {
  computeDomain,
  computeTicks,
  createLinearScale,
  domainIncludingZero,
  padDomain,
} from './scale';
import type { NumericDomain } from './scale';
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
 * d'axes sont ici des `Text` RN superposés (`ChartAxisOverlay`, calculés depuis
 * les mêmes domaines/`chartBounds` que le tracé Skia via `computeTicks`/
 * `createLinearScale`, capturés hors du `Canvas` par `onChartBoundsChange` —
 * un `<Text>` RN ne peut pas être un enfant direct de `CartesianChart`, ce
 * rendu-prop nourrit le renderer Skia, pas l'arbre React Native) — seul le
 * tracé (ligne/aire/barres) est dessiné dans le `Canvas` lui-même.
 */

const DEFAULT_HEIGHT = 220;
const PRESS_ANIMATION_CONFIG = { type: 'timing', duration: 300 } as const;
/** Nombre de graduations visées par axe (même valeur que l'adaptateur web). */
const AXIS_TICK_COUNT = 4;
/** Place réservée à gauche pour les libellés d'axe Y (`CartesianChart` `padding.left`). */
const Y_AXIS_GUTTER = parseInt(spacing.xl ?? '32px', 10);
/** Place réservée en bas pour les libellés d'axe X (`CartesianChart` `padding.bottom`). */
const X_AXIS_GUTTER = parseInt(spacing.lg ?? '24px', 10);
/** Largeur d'un libellé d'axe X, pour le centrer sur sa graduation. */
const X_TICK_LABEL_WIDTH = parseInt(spacing['2xl'] ?? '48px', 10);
/** Hauteur de ligne d'un libellé d'axe Y, pour le centrer verticalement sur sa graduation. */
const Y_TICK_LABEL_HEIGHT = parseInt(typography.fontSize['2xs']?.[1]?.lineHeight ?? '14px', 10);

interface ThemeContext {
  readonly colors: ColorTokens;
  readonly pnl: ChartPnlPalette;
  readonly animate: boolean;
}

interface ChartAxisOverlayProps {
  readonly chartBounds: ChartBounds;
  readonly xDomain: NumericDomain;
  readonly yDomain: NumericDomain;
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  /**
   * `false` quand `x` n'a pas de sens en tant que nombre (`BarChartNative` avec des
   * catégories non numériques : `x` vaut alors l'index de la barre, jamais une vraie valeur
   * de domaine) — graduations Y seules dans ce cas plutôt que des index trompeurs. Défaut
   * `true`.
   */
  readonly showXAxis?: boolean;
}

/**
 * Graduations d'axes (M1-6, revue M1 Important #4) : `Text` RN superposé au `Canvas` Skia,
 * en sibling de `CartesianChart` (pas un enfant — voir commentaire de fichier), positionné
 * avec `createLinearScale`/`computeTicks` sur le même `chartBounds` que le tracé (capturé
 * via `onChartBoundsChange`, `null` tant que la première mesure n'est pas arrivée).
 */
function ChartAxisOverlay({
  chartBounds,
  xDomain,
  yDomain,
  formatXLabel,
  formatYLabel,
  showXAxis = true,
}: ChartAxisOverlayProps) {
  const yScale = createLinearScale(yDomain, [chartBounds.bottom, chartBounds.top]);
  const yTicks = computeTicks(yDomain, AXIS_TICK_COUNT);
  const xScale = createLinearScale(xDomain, [chartBounds.left, chartBounds.right]);
  const xTicks = showXAxis ? computeTicks(xDomain, AXIS_TICK_COUNT) : [];

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {yTicks.map((tick) => (
        <Text
          key={`y-${tick}`}
          numberOfLines={1}
          className="absolute font-sans text-2xs text-textMuted"
          style={{
            left: 0,
            width: Y_AXIS_GUTTER - 4,
            top: yScale(tick) - Y_TICK_LABEL_HEIGHT / 2,
            textAlign: 'right',
          }}
        >
          {formatYLabel ? formatYLabel(tick) : `${tick}`}
        </Text>
      ))}
      {xTicks.map((tick) => (
        <Text
          key={`x-${tick}`}
          numberOfLines={1}
          className="absolute font-sans text-2xs text-textMuted"
          style={{
            left: xScale(tick) - X_TICK_LABEL_WIDTH / 2,
            width: X_TICK_LABEL_WIDTH,
            top: chartBounds.bottom + 4,
            textAlign: 'center',
          }}
        >
          {formatXLabel ? formatXLabel(tick) : `${tick}`}
        </Text>
      ))}
    </View>
  );
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
  // Mesuré via `onChartBoundsChange` (`ChartAxisOverlay` a besoin du même rectangle que le
  // tracé Skia, mais ne peut pas le lire depuis le rendu-prop — voir commentaire de fichier).
  const [chartBounds, setChartBounds] = useState<ChartBounds | null>(null);

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
  const xDomain = computeDomain(points.map((point) => point.x));
  const [yMin, yMax] = padDomain(computeDomain(points.map((point) => point.y)));
  const yDomain: [number, number] = [yMin, yMax];

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={points as SingleSeriesRow[]}
        xKey="x"
        yKeys={['y']}
        chartPressState={state}
        padding={{ left: Y_AXIS_GUTTER, bottom: X_AXIS_GUTTER }}
        domainPadding={{ left: 8, right: 8, top: 20, bottom: 8 }}
        domain={{ y: yDomain }}
        onChartBoundsChange={setChartBounds}
      >
        {({ points: chartPoints, chartBounds: skiaChartBounds }) => {
          const lastPoint = chartPoints.y.at(-1);
          return (
            <Fragment>
              {type === 'area' ? (
                <Area
                  points={chartPoints.y}
                  y0={skiaChartBounds.bottom}
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
      {chartBounds ? (
        <ChartAxisOverlay
          chartBounds={chartBounds}
          xDomain={xDomain}
          yDomain={yDomain}
          formatXLabel={formatXLabel}
          formatYLabel={formatYLabel}
        />
      ) : null}
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

/**
 * Plusieurs séries superposées (ex. catalogue). `onActivePointChange`/`formatTooltipValue`
 * — acceptés par `ChartLineAreaProps` (interface commune à `LineAreaChartNative`) — sont
 * délibérément ignorés ici, à la différence de `SingleSeriesLineArea` : un seul point pressé
 * ne désigne pas clairement quelle série afficher avec plusieurs courbes superposées.
 * Limitation acceptée pour M1 (revue M1, Important #5) ; rendue explicite ci-dessous en
 * déstructurant puis en ignorant volontairement ces deux props (au lieu de les omettre
 * silencieusement de la signature), pour qu'un futur appelant qui en dépendrait le
 * remarque à la lecture plutôt qu'en observant un `onActivePointChange` jamais appelé.
 */
function MultiSeriesLineArea({
  type,
  series,
  formatXLabel,
  formatYLabel,
  formatTooltipValue: _formatTooltipValue,
  onActivePointChange: _onActivePointChange,
  theme,
}: ChartLineAreaProps & { readonly theme: ThemeContext }) {
  const data = useMemo(() => mergeLineSeries(series), [series]);
  const yKeys = useMemo(() => series.map((s) => s.id), [series]);
  const animate = theme.animate ? PRESS_ANIMATION_CONFIG : undefined;
  const [chartBounds, setChartBounds] = useState<ChartBounds | null>(null);

  const xDomain = computeDomain(data.map((row) => row.x));
  // `padDomain` sur le domaine fusionné de toutes les séries — comme l'adaptateur web et
  // `SingleSeriesLineArea` — plutôt qu'absent : sans lui, une série loin de zéro est écrasée
  // en haut du graphique (revue M1, Important #5, même défaut que M1-6 pour la série unique).
  const [yMin, yMax] = padDomain(computeDomain(series.flatMap((s) => s.points.map((p) => p.y))));
  const yDomain: [number, number] = [yMin, yMax];

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={yKeys}
        padding={{ left: Y_AXIS_GUTTER, bottom: X_AXIS_GUTTER }}
        domainPadding={{ left: 8, right: 8, top: 20, bottom: 8 }}
        domain={{ y: yDomain }}
        onChartBoundsChange={setChartBounds}
      >
        {({ points, chartBounds: skiaChartBounds }) => (
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
                      y0={skiaChartBounds.bottom}
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
      {chartBounds ? (
        <ChartAxisOverlay
          chartBounds={chartBounds}
          xDomain={xDomain}
          yDomain={yDomain}
          formatXLabel={formatXLabel}
          formatYLabel={formatYLabel}
        />
      ) : null}
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
  /** Voir `ChartAxisOverlayProps.showXAxis` — `false` pour `BarChartNative` en catégories non numériques (`x` = index de barre, sans signification). Défaut `true`. */
  readonly showXAxis?: boolean;
}

/** Barres (diagramme en barres et histogramme partagent ce rendu : lignes déjà `{x,y,intent}`) — une `RoundedRect` par barre pour une couleur propre à chacune (`victory-native` `Bar` ne dessine qu'un seul tracé/une seule couleur par appel). */
function CategoricalBarChart({
  rows,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
  showXAxis = true,
}: CategoricalBarChartProps) {
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });
  const [activePoint, setActivePoint] = useState<ChartActivePoint | null>(null);
  const [chartBounds, setChartBounds] = useState<ChartBounds | null>(null);

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
  // négatives (ex. P&L par symbole) via `domainIncludingZero`.
  // Copie mutable : `CartesianChart` attend un tuple `[number, number]` modifiable.
  const [yDomainMin, yDomainMax] = domainIncludingZero(rows.map((row) => row.y));
  const yDomain: [number, number] = [yDomainMin, yDomainMax];
  const xDomain = computeDomain(rows.map((row) => row.x));

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CartesianChart
        data={rows as CategoricalRow[]}
        xKey="x"
        yKeys={['y']}
        chartPressState={state}
        padding={{ left: Y_AXIS_GUTTER, bottom: showXAxis ? X_AXIS_GUTTER : 0 }}
        domainPadding={{ left: 16, right: 16, top: 20, bottom: 8 }}
        domain={{ y: yDomain }}
        onChartBoundsChange={setChartBounds}
      >
        {({ points, chartBounds: skiaChartBounds, yScale }) => {
          const barWidth = getBarWidth({
            points: points.y,
            chartBounds: skiaChartBounds,
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
      {chartBounds ? (
        <ChartAxisOverlay
          chartBounds={chartBounds}
          xDomain={xDomain}
          yDomain={yDomain}
          formatXLabel={formatXLabel}
          formatYLabel={formatYLabel}
          showXAxis={showXAxis}
        />
      ) : null}
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
      // Catégories non numériques (ex. symboles) : `rows[].x` est un index de barre sans
      // signification, pas une vraie valeur de domaine — pas de graduations X (`ChartAxisOverlay`).
      showXAxis={isNumericX}
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
