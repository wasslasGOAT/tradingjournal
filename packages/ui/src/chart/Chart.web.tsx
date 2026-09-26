import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useMotionPreference } from '../motion';
import { useThemeMode } from '../theme/ThemeProvider';
import { useThemeStore } from '../theme/themeStore';
import { pnlColorSchemes, themes, typography } from '../tokens';
import type { ColorTokens } from '../tokens';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartSkeleton } from './ChartSkeleton';
import { ChartTooltipBubble } from './ChartTooltipBubble';
import type { ChartPnlPalette } from './colors';
import { resolveChartColor } from './colors';
import { HeatmapGrid } from './HeatmapGrid';
import { mergeLineSeries } from './mergeLineSeries';
import { computeDomain, computeTicks, domainIncludingZero, padDomain } from './scale';
import type {
  ChartActivePoint,
  ChartBarProps,
  ChartHistogramProps,
  ChartLineAreaProps,
  ChartProps,
} from './types';

/**
 * `Chart.web.tsx` (M1-6, ADR-021) : adaptateur `recharts` — même API que
 * `Chart.native.tsx` (`ChartProps`, `types.ts`). Jamais de Skia/`victory-native`
 * ici : le bundle web ne doit embarquer aucune dépendance native (vérifié par
 * `expo export --platform web` + recherche de `react-native-skia` dans `dist/`).
 */

const DEFAULT_HEIGHT = 220;
// Depuis les tokens plutôt qu'en dur (revue M1, Mineur #11) : même graisse/famille qu'ailleurs
// dans l'app (`typography.fontFamily.sans`, ADR-021), même échelle de taille que les
// libellés d'axe natifs (`Chart.native.tsx`, `text-2xs`).
const AXIS_TICK_STYLE = {
  fontSize: parseInt(typography.fontSize['2xs']?.[0] ?? '10px', 10),
  fontFamily: (typography.fontFamily.sans ?? ['Inter_400Regular', 'sans-serif']).join(', '),
};

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

interface TooltipBridgeProps {
  readonly active?: boolean;
  readonly label?: unknown;
  readonly payload?: ReadonlyArray<{ readonly dataKey?: unknown; readonly value?: unknown }>;
  readonly formatXLabel?: (value: number) => string;
  readonly formatYLabel?: (value: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
}

/** Pont entre le `content` de `<Tooltip>` (recharts) et `onActivePointChange` — même bulle que le natif (`ChartTooltipBubble`). */
function TooltipBridge({
  active,
  label,
  payload,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
}: TooltipBridgeProps) {
  const entry = payload?.[0];
  const point: ChartActivePoint | null =
    active && isFiniteNumber(label) && entry && isFiniteNumber(entry.value)
      ? {
          x: label,
          y: entry.value,
          seriesId: typeof entry.dataKey === 'string' ? entry.dataKey : undefined,
        }
      : null;

  // Dépendances par valeur (pas par référence) : `point` est un objet recréé
  // à chaque rendu de `recharts` (même position) — dépendre de ses champs
  // scalaires évite une invalidation en boucle. `point` lui-même exclu
  // volontairement de la liste (revue M1, Important #3).
  useEffect(() => {
    onActivePointChange?.(point);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.x, point?.y, point?.seriesId, onActivePointChange]);

  if (!point) return null;

  const xLabel = formatXLabel ? formatXLabel(point.x) : `${point.x}`;
  const value = formatTooltipValue
    ? formatTooltipValue(point)
    : formatYLabel
      ? formatYLabel(point.y)
      : `${point.y}`;

  return <ChartTooltipBubble label={xLabel} value={value} />;
}

interface DotProps {
  readonly cx?: number;
  readonly cy?: number;
  readonly index?: number;
}

/** Cercle visible uniquement sur le dernier point de la série ("dernier point mis en valeur", ARCHITECTURE §6). */
function makeLastPointDot(lastIndex: number, color: string, strokeColor: string) {
  return (dotProps: DotProps) => {
    const { cx, cy, index } = dotProps;
    if (cx === undefined || cy === undefined) return <circle cx={0} cy={0} r={0} />;
    const isLast = index === lastIndex;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isLast ? 5 : 0}
        fill={color}
        stroke={isLast ? strokeColor : 'none'}
        strokeWidth={isLast ? 2 : 0}
      />
    );
  };
}

function LineAreaChartView({
  type,
  series,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: ChartLineAreaProps & { readonly theme: ThemeContext }) {
  const { colors, pnl, animate } = theme;
  const data = useMemo(() => mergeLineSeries(series), [series]);
  const xDomain = useMemo(() => computeDomain(data.map((row) => row.x)), [data]);
  const xTicks = useMemo(() => computeTicks(xDomain, 4), [xDomain]);
  // Axe vertical cadré sur les valeurs (avec marge) : sans cela, recharts part de 0 et une
  // courbe d'equity autour de 24 000 est écrasée contre le haut, donc invisible (M1-6).
  const yDomain = useMemo(() => {
    const values = series.flatMap((s) => s.points.map((point) => point.y));
    return values.length > 0 ? padDomain(computeDomain(values)) : undefined;
  }, [series]);
  const lastIndex = data.length - 1;
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  // Mémoïsé (revue M1, Mineur #16) : `makeLastPointDot` est une fabrique — sans `useMemo`,
  // chaque rendu recréait une fonction `dot` de nouvelle identité par série, invalidant sa
  // mémoïsation interne côté `recharts`.
  const dotRenderers = useMemo(
    () =>
      new Map(
        series.map((s) => [
          s.id,
          makeLastPointDot(lastIndex, resolveChartColor(s.intent, colors, pnl), colors.surface),
        ]),
      ),
    [series, lastIndex, colors, pnl],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => {
            const color = resolveChartColor(s.intent, colors, pnl);
            return (
              <linearGradient id={`chart-gradient-${s.id}`} key={s.id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain}
          ticks={xTicks}
          tickFormatter={formatXLabel}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={{ stroke: colors.border }}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatYLabel}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: colors.border }}
          content={(tooltipProps) => (
            <TooltipBridge
              {...tooltipProps}
              formatXLabel={formatXLabel}
              formatYLabel={formatYLabel}
              formatTooltipValue={formatTooltipValue}
              onActivePointChange={onActivePointChange}
            />
          )}
        />
        {series.map((s) => {
          const color = resolveChartColor(s.intent, colors, pnl);
          const dot = dotRenderers.get(s.id);
          return type === 'area' ? (
            <Area
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={color}
              strokeWidth={2}
              fill={`url(#chart-gradient-${s.id})`}
              isAnimationActive={animate}
              dot={dot}
              activeDot={{ r: 5, fill: color, stroke: colors.surface, strokeWidth: 2 }}
              connectNulls
            />
          ) : (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={color}
              strokeWidth={2}
              dot={dot}
              isAnimationActive={animate}
              activeDot={{ r: 5, fill: color, stroke: colors.surface, strokeWidth: 2 }}
              connectNulls
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

function BarChartView({
  data,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: ChartBarProps & { readonly theme: ThemeContext }) {
  const { colors, pnl, animate } = theme;
  const rows = useMemo(
    () => data.map((datum, index) => ({ ...datum, key: `${datum.x}-${index}` })),
    [data],
  );
  const isNumericX = typeof data[0]?.x === 'number';
  const xDomain = isNumericX ? computeDomain(data.map((d) => d.x as number)) : undefined;
  // La ligne de base (0) doit rester dans le domaine visible (sinon la barre
  // "flotte", `recharts` calcule sa hauteur depuis `baseValue = 0` quel que
  // soit le domaine affiché) — couvre aussi les valeurs négatives.
  const yDomain = domainIncludingZero(data.map((d) => d.y));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          type={isNumericX ? 'number' : 'category'}
          domain={xDomain}
          tickFormatter={isNumericX ? formatXLabel : undefined}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={{ stroke: colors.border }}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatYLabel}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: colors.surfaceAlt }}
          content={(tooltipProps) => (
            <TooltipBridge
              {...tooltipProps}
              formatXLabel={isNumericX ? formatXLabel : undefined}
              formatYLabel={formatYLabel}
              formatTooltipValue={formatTooltipValue}
              onActivePointChange={onActivePointChange}
            />
          )}
        />
        <Bar dataKey="y" isAnimationActive={animate} radius={[4, 4, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.key} fill={resolveChartColor(row.intent, colors, pnl)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HistogramChartView({
  bins,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: ChartHistogramProps & { readonly theme: ThemeContext }) {
  const { colors, pnl, animate } = theme;
  const rows = useMemo(
    () =>
      bins.map((bin) => ({
        x: (bin.x0 + bin.x1) / 2,
        y: bin.value,
        intent: bin.intent,
        key: `${bin.x0}`,
      })),
    [bins],
  );
  const xDomain = computeDomain(rows.map((row) => row.x));
  const yDomain = domainIncludingZero(rows.map((row) => row.y));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain}
          tickFormatter={formatXLabel}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={{ stroke: colors.border }}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatYLabel}
          tick={{ fill: colors.textMuted, ...AXIS_TICK_STYLE }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: colors.surfaceAlt }}
          content={(tooltipProps) => (
            <TooltipBridge
              {...tooltipProps}
              formatXLabel={formatXLabel}
              formatYLabel={formatYLabel}
              formatTooltipValue={formatTooltipValue}
              onActivePointChange={onActivePointChange}
            />
          )}
        />
        <Bar dataKey="y" isAnimationActive={animate} radius={[2, 2, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.key} fill={resolveChartColor(row.intent, colors, pnl)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
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
        <BarChartView {...props} theme={theme} />
      ) : props.type === 'histogram' ? (
        <HistogramChartView {...props} theme={theme} />
      ) : (
        <LineAreaChartView {...props} theme={theme} />
      )}
    </View>
  );
}
