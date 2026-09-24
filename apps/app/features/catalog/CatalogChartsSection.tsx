import { Decimal, formatAmount, formatDayNumber, formatNumber } from '@repo/core';
import { resolveLocale } from '@repo/i18n';
import { Chart, binNumericValues } from '@repo/ui';
import type { ChartActivePoint, ChartEmptyStateContent } from '@repo/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import {
  SAMPLE_CHART_CURRENCY,
  SAMPLE_HEATMAP_COLS,
  SAMPLE_HEATMAP_ROWS,
  SAMPLE_LONG_EQUITY_DAYS,
  SAMPLE_LONG_EQUITY_POINTS,
  SAMPLE_PNL_BY_SYMBOL,
  generateSampleHeatmapCells,
  generateSampleRMultiples,
} from './chartSampleData';
import { CatalogSection } from './CatalogSection';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * Démo de l'interface `Chart` (M1-6, ADR-021) : une sous-section par type
 * (ligne/aire, barres, histogramme, heatmap), chacune avec ses trois états
 * (rempli — jeu de données long pour la ligne/aire —, chargement, vide).
 */
export function CatalogChartsSection() {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);

  const emptyState: ChartEmptyStateContent = {
    title: t('catalog.charts.empty.title'),
    description: t('catalog.charts.empty.description'),
  };

  const formatEquityXLabel = (x: number) => {
    const day = SAMPLE_LONG_EQUITY_DAYS[Math.round(x)];
    return day ? formatDayNumber(day, { locale }) : '';
  };
  const formatEquityYLabel = (y: number) =>
    formatAmount(new Decimal(y), SAMPLE_CHART_CURRENCY, { locale, decimals: 0 });
  const formatEquityTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale });

  const formatBarYLabel = (y: number) =>
    formatAmount(new Decimal(y), SAMPLE_CHART_CURRENCY, { locale, decimals: 0 });
  const formatBarTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale });

  const histogramBins = binNumericValues(generateSampleRMultiples(), 14);
  const formatHistogramXLabel = (x: number) =>
    `${formatNumber(new Decimal(x), { locale, decimals: 1 })}R`;
  const formatHistogramYLabel = (y: number) =>
    formatNumber(new Decimal(y), { locale, decimals: 0 });

  const heatmapCells = generateSampleHeatmapCells();
  const formatHeatmapRowLabel = (row: number) =>
    t(`catalog.charts.weekday.${WEEKDAY_KEYS[row] ?? 'mon'}`);
  const formatHeatmapColLabel = (col: number) => `${col}`;
  const formatHeatmapTooltipValue = (point: ChartActivePoint) =>
    formatAmount(new Decimal(point.y), SAMPLE_CHART_CURRENCY, { locale });

  return (
    <>
      <CatalogSection
        testID="catalog-section-charts-line-area"
        title={t('catalog.sections.chartsLineArea')}
      >
        <View className="gap-sm">
          <ChartStateCard
            testID="catalog-chart-line-loaded"
            label={t('catalog.charts.stateLoaded')}
          >
            <Chart
              testID="catalog-chart-line"
              type="area"
              accessibilityLabel={t('catalog.charts.equityAccessibilityLabel')}
              series={[{ id: 'equity', points: SAMPLE_LONG_EQUITY_POINTS, intent: 'accent' }]}
              emptyState={emptyState}
              formatXLabel={formatEquityXLabel}
              formatYLabel={formatEquityYLabel}
              formatTooltipValue={formatEquityTooltipValue}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-line-loading"
            label={t('catalog.charts.stateLoading')}
          >
            <Chart
              testID="catalog-chart-line-loading-instance"
              type="area"
              loading
              accessibilityLabel={t('catalog.charts.equityAccessibilityLabel')}
              series={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testID="catalog-chart-line-empty" label={t('catalog.charts.stateEmpty')}>
            <Chart
              testID="catalog-chart-line-empty-instance"
              type="area"
              accessibilityLabel={t('catalog.charts.equityAccessibilityLabel')}
              series={[{ id: 'equity', points: [], intent: 'accent' }]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </View>
      </CatalogSection>

      <CatalogSection testID="catalog-section-charts-bar" title={t('catalog.sections.chartsBar')}>
        <View className="gap-sm">
          <ChartStateCard testID="catalog-chart-bar-loaded" label={t('catalog.charts.stateLoaded')}>
            <Chart
              testID="catalog-chart-bar"
              type="bar"
              accessibilityLabel={t('catalog.charts.pnlByDayAccessibilityLabel')}
              data={SAMPLE_PNL_BY_SYMBOL}
              emptyState={emptyState}
              formatYLabel={formatBarYLabel}
              formatTooltipValue={formatBarTooltipValue}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-bar-loading"
            label={t('catalog.charts.stateLoading')}
          >
            <Chart
              testID="catalog-chart-bar-loading-instance"
              type="bar"
              loading
              accessibilityLabel={t('catalog.charts.pnlByDayAccessibilityLabel')}
              data={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard testID="catalog-chart-bar-empty" label={t('catalog.charts.stateEmpty')}>
            <Chart
              testID="catalog-chart-bar-empty-instance"
              type="bar"
              accessibilityLabel={t('catalog.charts.pnlByDayAccessibilityLabel')}
              data={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </View>
      </CatalogSection>

      <CatalogSection
        testID="catalog-section-charts-histogram"
        title={t('catalog.sections.chartsHistogram')}
      >
        <View className="gap-sm">
          <ChartStateCard
            testID="catalog-chart-histogram-loaded"
            label={t('catalog.charts.stateLoaded')}
          >
            <Chart
              testID="catalog-chart-histogram"
              type="histogram"
              accessibilityLabel={t('catalog.charts.rDistributionAccessibilityLabel')}
              bins={histogramBins}
              emptyState={emptyState}
              formatXLabel={formatHistogramXLabel}
              formatYLabel={formatHistogramYLabel}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-histogram-loading"
            label={t('catalog.charts.stateLoading')}
          >
            <Chart
              testID="catalog-chart-histogram-loading-instance"
              type="histogram"
              loading
              accessibilityLabel={t('catalog.charts.rDistributionAccessibilityLabel')}
              bins={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-histogram-empty"
            label={t('catalog.charts.stateEmpty')}
          >
            <Chart
              testID="catalog-chart-histogram-empty-instance"
              type="histogram"
              accessibilityLabel={t('catalog.charts.rDistributionAccessibilityLabel')}
              bins={[]}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </View>
      </CatalogSection>

      <CatalogSection
        testID="catalog-section-charts-heatmap"
        title={t('catalog.sections.chartsHeatmap')}
      >
        <View className="gap-sm">
          <ChartStateCard
            testID="catalog-chart-heatmap-loaded"
            label={t('catalog.charts.stateLoaded')}
          >
            <Chart
              testID="catalog-chart-heatmap"
              type="heatmap"
              accessibilityLabel={t('catalog.charts.heatmapAccessibilityLabel')}
              cells={heatmapCells}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
              formatRowLabel={formatHeatmapRowLabel}
              formatColLabel={formatHeatmapColLabel}
              formatTooltipValue={formatHeatmapTooltipValue}
              legendLabels={{
                low: t('catalog.charts.legend.low'),
                high: t('catalog.charts.legend.high'),
              }}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-heatmap-loading"
            label={t('catalog.charts.stateLoading')}
          >
            <Chart
              testID="catalog-chart-heatmap-loading-instance"
              type="heatmap"
              loading
              accessibilityLabel={t('catalog.charts.heatmapAccessibilityLabel')}
              cells={[]}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
            />
          </ChartStateCard>
          <ChartStateCard
            testID="catalog-chart-heatmap-empty"
            label={t('catalog.charts.stateEmpty')}
          >
            <Chart
              testID="catalog-chart-heatmap-empty-instance"
              type="heatmap"
              accessibilityLabel={t('catalog.charts.heatmapAccessibilityLabel')}
              cells={[]}
              rows={SAMPLE_HEATMAP_ROWS}
              cols={SAMPLE_HEATMAP_COLS}
              emptyState={emptyState}
            />
          </ChartStateCard>
        </View>
      </CatalogSection>
    </>
  );
}

interface ChartStateCardProps {
  readonly testID: string;
  readonly label: string;
  readonly children: ReactNode;
}

/** Carte + légende d'état (rempli/chargement/vide) pour une instance de `Chart` du catalogue. */
function ChartStateCard({ testID, label, children }: ChartStateCardProps) {
  return (
    <View testID={testID} className="gap-xs rounded-lg border border-border bg-surface p-md">
      <Text className="font-sans text-xs text-textMuted">{label}</Text>
      {children}
    </View>
  );
}
