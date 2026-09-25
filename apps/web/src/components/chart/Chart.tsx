import { useEffect, useMemo } from "react"
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
} from "recharts"

import { useThemeStore } from "@/features/preferences/theme-store"
import { useReducedMotion } from "@/lib/motion/useReducedMotion"
import { pnlColorSchemes, themes, typography } from "@/lib/theme/tokens"
import type { ColorTokens } from "@/lib/theme/tokens"

import { ChartEmptyState } from "./ChartEmptyState"
import { ChartSkeleton } from "./ChartSkeleton"
import { ChartTooltipBubble } from "./ChartTooltipBubble"
import type { ChartPnlPalette } from "./colors"
import { resolveChartColor } from "./colors"
import { HeatmapGrid } from "./HeatmapGrid"
import { mergeLineSeries } from "./mergeLineSeries"
import { computeDomain, computeTicks, domainIncludingZero, padDomain } from "./scale"
import type {
  ChartActivePoint,
  ChartBarProps,
  ChartHistogramProps,
  ChartLineAreaProps,
  ChartProps,
} from "./types"

/**
 * `Chart` (W-4, ARCHITECTURE §6) : adaptateur `recharts` reprenant l'API de
 * `packages/ui/src/chart/Chart.web.tsx` (gelé, ADR-023) — mêmes types
 * (`ChartProps`), même comportement (axe Y qui ne part pas de `0` pour une
 * ligne/aire, ligne de base à `0` toujours visible pour les barres/
 * histogrammes, dernier point mis en valeur, infobulle au survol).
 */

const DEFAULT_HEIGHT = 220

const AXIS_TICK_STYLE = {
  fontSize: parseInt(typography.fontSize["2xs"]?.[0] ?? "10px", 10),
  fontFamily: "var(--font-sans)",
}

interface ThemeContext {
  readonly colors: ColorTokens
  readonly pnl: ChartPnlPalette
  readonly animate: boolean
}

function isChartEmpty(props: ChartProps): boolean {
  switch (props.type) {
    case "line":
    case "area":
      return props.series.every((s) => s.points.length === 0)
    case "bar":
      return props.data.length === 0
    case "histogram":
      return props.bins.length === 0
    case "heatmap":
      return props.cells.length === 0
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

interface TooltipBridgeProps {
  readonly active?: boolean
  readonly label?: unknown
  readonly payload?: ReadonlyArray<{ readonly dataKey?: unknown; readonly value?: unknown }>
  readonly formatXLabel?: (value: number) => string
  readonly formatYLabel?: (value: number) => string
  readonly formatTooltipValue?: (point: ChartActivePoint) => string
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void
}

/** Pont entre le `content` de `<Tooltip>` (recharts) et `onActivePointChange`. */
function TooltipBridge({
  active,
  label,
  payload,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
}: TooltipBridgeProps) {
  const entry = payload?.[0]
  const point: ChartActivePoint | null =
    active && isFiniteNumber(label) && entry && isFiniteNumber(entry.value)
      ? {
          x: label,
          y: entry.value,
          seriesId: typeof entry.dataKey === "string" ? entry.dataKey : undefined,
        }
      : null

  // Dépendances par valeur (pas par référence) : `point` est un objet recréé à chaque
  // rendu de recharts (même position) — dépendre de ses champs scalaires évite une
  // invalidation en boucle. `point` lui-même volontairement exclu de la liste.
  useEffect(() => {
    onActivePointChange?.(point)
  }, [point?.x, point?.y, point?.seriesId, onActivePointChange])

  if (!point) return null

  const xLabel = formatXLabel ? formatXLabel(point.x) : `${point.x}`
  const value = formatTooltipValue
    ? formatTooltipValue(point)
    : formatYLabel
      ? formatYLabel(point.y)
      : `${point.y}`

  return <ChartTooltipBubble label={xLabel} value={value} />
}

interface DotProps {
  readonly cx?: number
  readonly cy?: number
  readonly index?: number
}

/** Cercle visible uniquement sur le dernier point de la série ("dernier point mis en valeur"). */
function makeLastPointDot(lastIndex: number, color: string, strokeColor: string) {
  return (dotProps: DotProps) => {
    const { cx, cy, index } = dotProps
    if (cx === undefined || cy === undefined) return <circle cx={0} cy={0} r={0} />
    const isLast = index === lastIndex
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isLast ? 5 : 0}
        fill={color}
        stroke={isLast ? strokeColor : "none"}
        strokeWidth={isLast ? 2 : 0}
      />
    )
  }
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
  const { colors, pnl } = theme
  const data = useMemo(() => mergeLineSeries(series), [series])
  const xDomain = useMemo(() => computeDomain(data.map((row) => row.x)), [data])
  const xTicks = useMemo(() => computeTicks(xDomain, 4), [xDomain])
  // Axe vertical cadré sur les valeurs (avec marge) : sans cela, recharts part de 0 et une
  // courbe d'equity autour de 24 000 est écrasée contre le haut, donc invisible.
  const yDomain = useMemo(() => {
    const values = series.flatMap((s) => s.points.map((point) => point.y))
    return values.length > 0 ? padDomain(computeDomain(values)) : undefined
  }, [series])
  const lastIndex = data.length - 1
  const ChartComponent = type === "area" ? AreaChart : LineChart
  const dotRenderers = useMemo(
    () =>
      new Map(
        series.map((s) => [
          s.id,
          makeLastPointDot(lastIndex, resolveChartColor(s.intent, colors, pnl), colors.surface),
        ]),
      ),
    [series, lastIndex, colors, pnl],
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => {
            const color = resolveChartColor(s.intent, colors, pnl)
            return (
              <linearGradient id={`chart-gradient-${s.id}`} key={s.id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )
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
          const color = resolveChartColor(s.intent, colors, pnl)
          const dot = dotRenderers.get(s.id)
          return type === "area" ? (
            <Area
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={color}
              strokeWidth={2}
              fill={`url(#chart-gradient-${s.id})`}
              // `false` en dur (pas `animate`/reduceMotion) : l'animation d'entrée par défaut de
              // recharts dessine la courbe progressivement sur ~1,5 s — pendant ce laps de temps le
              // graphique semble vide (seul le dernier point, hors animation, est visible), ce qui
              // ressemble à un bug de courbe invisible au premier affichage (retour utilisateur W-6).
              // Les données doivent être visibles immédiatement, jamais révélées par une animation.
              isAnimationActive={false}
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
              isAnimationActive={false}
              activeDot={{ r: 5, fill: color, stroke: colors.surface, strokeWidth: 2 }}
              connectNulls
            />
          )
        })}
      </ChartComponent>
    </ResponsiveContainer>
  )
}

function BarChartView({
  data,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: ChartBarProps & { readonly theme: ThemeContext }) {
  const { colors, pnl } = theme
  const rows = useMemo(
    () => data.map((datum, index) => ({ ...datum, key: `${datum.x}-${index}` })),
    [data],
  )
  const isNumericX = typeof data[0]?.x === "number"
  const xDomain = isNumericX ? computeDomain(data.map((d) => d.x as number)) : undefined
  const yDomain = domainIncludingZero(data.map((d) => d.y))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          type={isNumericX ? "number" : "category"}
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
        {/* `isAnimationActive={false}` : voir le commentaire de `LineAreaChartView` (courbe/barres visibles immédiatement). */}
        <Bar dataKey="y" isAnimationActive={false} radius={[4, 4, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.key} fill={resolveChartColor(row.intent, colors, pnl)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function HistogramChartView({
  bins,
  formatXLabel,
  formatYLabel,
  formatTooltipValue,
  onActivePointChange,
  theme,
}: ChartHistogramProps & { readonly theme: ThemeContext }) {
  const { colors, pnl } = theme
  const rows = useMemo(
    () =>
      bins.map((bin) => ({
        x: (bin.x0 + bin.x1) / 2,
        y: bin.value,
        intent: bin.intent,
        key: `${bin.x0}`,
      })),
    [bins],
  )
  const xDomain = computeDomain(rows.map((row) => row.x))
  const yDomain = domainIncludingZero(rows.map((row) => row.y))

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
        <Bar dataKey="y" isAnimationActive={false} radius={[2, 2, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.key} fill={resolveChartColor(row.intent, colors, pnl)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Chart(props: ChartProps) {
  const { accessibilityLabel, height = DEFAULT_HEIGHT, loading, emptyState, testID } = props
  const mode = useThemeStore((state) => state.resolvedMode)
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme)
  const reduceMotion = useReducedMotion()
  const theme: ThemeContext = {
    colors: themes[mode],
    pnl: pnlColorSchemes[mode][pnlColorScheme],
    animate: !reduceMotion,
  }

  if (loading) return <ChartSkeleton height={height} testId={testID} />
  if (isChartEmpty(props)) {
    return <ChartEmptyState height={height} content={emptyState} testId={testID} />
  }

  if (props.type === "heatmap") {
    return (
      <div data-testid={testID} role="img" aria-label={accessibilityLabel}>
        <HeatmapGrid
          cells={props.cells}
          rows={props.rows}
          cols={props.cols}
          formatRowLabel={props.formatRowLabel}
          formatColLabel={props.formatColLabel}
          formatTooltipValue={props.formatTooltipValue}
          legendLabels={props.legendLabels}
          onActivePointChange={props.onActivePointChange}
        />
      </div>
    )
  }

  return (
    <div data-testid={testID} role="img" aria-label={accessibilityLabel} style={{ width: "100%", height }}>
      {props.type === "bar" ? (
        <BarChartView {...props} theme={theme} />
      ) : props.type === "histogram" ? (
        <HistogramChartView {...props} theme={theme} />
      ) : (
        <LineAreaChartView {...props} theme={theme} />
      )}
    </div>
  )
}
