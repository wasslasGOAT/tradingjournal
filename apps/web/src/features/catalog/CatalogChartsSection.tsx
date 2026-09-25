import { Decimal, formatAmount, formatDayNumber, formatNumber } from "@repo/core"
import { resolveLocale } from "@repo/i18n"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Chart, binNumericValues } from "@/components/chart"
import type { ChartActivePoint, ChartEmptyStateContent } from "@/components/chart"

import { CatalogSection } from "./CatalogSection"
import {
  SAMPLE_CHART_CURRENCY,
  SAMPLE_HEATMAP_COLS,
  SAMPLE_HEATMAP_ROWS,
  SAMPLE_LONG_EQUITY_DAYS,
  SAMPLE_LONG_EQUITY_POINTS,
  SAMPLE_PNL_BY_SYMBOL,
  generateSampleHeatmapCells,
  generateSampleRMultiples,
} from "./chartSampleData"

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

/**
 * Démo de l'interface `Chart` (W-4, ARCHITECTURE §6) : une sous-section par
 * type (ligne/aire, barres, histogramme, heatmap), chacune avec ses trois
 * états (rempli, chargement, vide) — même rôle que
 * `apps/app/features/catalog/CatalogChartsSection.tsx` (gelé).
 */
export function CatalogChartsSection() {
  const { t, i18n } = useTranslation()
  const locale = resolveLocale(i18n.language)

  const emptyState: ChartEmptyStateContent = {
    title: t("catalog.charts.empty.title"),
    description: t("catalog.charts.empty.description"),
  }

  const formatEquityXLabel = (x: number) => {
    const day = SAMPLE_LONG_EQUITY_DAYS[Math.round(x)]
    return day ? formatDayNumber(day, { locale }) : ""
  }
  const formatEquityYLabel = (y: number) =>
    formatAmount(new Decimal(y), SAMPLE_CHART_CURRENCY, { locale, decimals: 0 })
  const formatEquityTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale })

  const formatBarYLabel = (y: number) =>
    formatAmount(new Decimal(y), SAMPLE_CHART_CURRENCY, { locale, decimals: 0 })
  const formatBarTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale })

  const histogramBins = binNumericValues(generateSampleRMultiples(), 14)
  const formatHistogramXLabel = (x: number) => `${formatNumber(new Decimal(x), { locale, decimals: 1 })}R`
  const formatHistogramYLabel = (y: number) => formatNumber(new Decimal(y), { locale, decimals: 0 })

  const heatmapCells = generateSampleHeatmapCells()
  const formatHeatmapRowLabel = (row: number) => t(`catalog.charts.weekday.${WEEKDAY_KEYS[row] ?? "mon"}`)
  const formatHeatmapColLabel = (col: number) => `${col}`
  const formatHeatmapTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale })

  return (
    <>
      <CatalogSection testId="catalog-section-charts-line-area" title={t("catalog.sections.chartsLineArea")}>
        <div className="flex flex-col gap-2">
          <ChartStateCard testId="catalog-chart-line-loaded" label={t("catalog.charts.stateLoaded")}>
            <Chart
              type="area"
              accessibilityLabel={t("catalog.charts.equityAccessibilityLabel")}
              series={[{ id: "equity", points: SAMPLE_LONG_EQUITY_POINTS, intent: "accent" }]}
              emptyState={emptyState}
              formatXLabel={formatEquityXLabel}
              formatYLabel={formatEquityYLabel}
              formatTooltipValue={formatEquityTooltipValue}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-line-loading" label={t("catalog.charts.stateLoading")}>
            <Chart
              type="area"
              loading
              accessibilityLabel={t("catalog.charts.equityAccessibilityLabel")}
              series={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-line-empty" label={t("catalog.charts.stateEmpty")}>
            <Chart
              type="area"
              accessibilityLabel={t("catalog.charts.equityAccessibilityLabel")}
              series={[{ id: "equity", points: [], intent: "accent" }]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-charts-bar" title={t("catalog.sections.chartsBar")}>
        <div className="flex flex-col gap-2">
          <ChartStateCard testId="catalog-chart-bar-loaded" label={t("catalog.charts.stateLoaded")}>
            <Chart
              type="bar"
              accessibilityLabel={t("catalog.charts.pnlByDayAccessibilityLabel")}
              data={SAMPLE_PNL_BY_SYMBOL}
              emptyState={emptyState}
              formatYLabel={formatBarYLabel}
              formatTooltipValue={formatBarTooltipValue}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-bar-loading" label={t("catalog.charts.stateLoading")}>
            <Chart
              type="bar"
              loading
              accessibilityLabel={t("catalog.charts.pnlByDayAccessibilityLabel")}
              data={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-bar-empty" label={t("catalog.charts.stateEmpty")}>
            <Chart
              type="bar"
              accessibilityLabel={t("catalog.charts.pnlByDayAccessibilityLabel")}
              data={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </div>
      </CatalogSection>

      <CatalogSection
        testId="catalog-section-charts-histogram"
        title={t("catalog.sections.chartsHistogram")}
      >
        <div className="flex flex-col gap-2">
          <ChartStateCard testId="catalog-chart-histogram-loaded" label={t("catalog.charts.stateLoaded")}>
            <Chart
              type="histogram"
              accessibilityLabel={t("catalog.charts.rDistributionAccessibilityLabel")}
              bins={histogramBins}
              emptyState={emptyState}
              formatXLabel={formatHistogramXLabel}
              formatYLabel={formatHistogramYLabel}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-histogram-loading" label={t("catalog.charts.stateLoading")}>
            <Chart
              type="histogram"
              loading
              accessibilityLabel={t("catalog.charts.rDistributionAccessibilityLabel")}
              bins={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-histogram-empty" label={t("catalog.charts.stateEmpty")}>
            <Chart
              type="histogram"
              accessibilityLabel={t("catalog.charts.rDistributionAccessibilityLabel")}
              bins={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-charts-heatmap" title={t("catalog.sections.chartsHeatmap")}>
        <div className="flex flex-col gap-2">
          <ChartStateCard testId="catalog-chart-heatmap-loaded" label={t("catalog.charts.stateLoaded")}>
            <Chart
              type="heatmap"
              accessibilityLabel={t("catalog.charts.heatmapAccessibilityLabel")}
              cells={heatmapCells}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
              formatRowLabel={formatHeatmapRowLabel}
              formatColLabel={formatHeatmapColLabel}
              formatTooltipValue={formatHeatmapTooltipValue}
              legendLabels={{ low: t("catalog.charts.legend.low"), high: t("catalog.charts.legend.high") }}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-heatmap-loading" label={t("catalog.charts.stateLoading")}>
            <Chart
              type="heatmap"
              loading
              accessibilityLabel={t("catalog.charts.heatmapAccessibilityLabel")}
              cells={[]}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testId="catalog-chart-heatmap-empty" label={t("catalog.charts.stateEmpty")}>
            <Chart
              type="heatmap"
              accessibilityLabel={t("catalog.charts.heatmapAccessibilityLabel")}
              cells={[]}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </div>
      </CatalogSection>
    </>
  )
}

interface ChartStateCardProps {
  readonly testId: string
  readonly label: string
  readonly children: ReactNode
}

/** Carte + légende d'état (rempli/chargement/vide) pour une instance de `Chart` du catalogue. */
function ChartStateCard({ testId, label, children }: ChartStateCardProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
