import { resolveLocale } from '@repo/i18n';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type {
  DateRangePickerLabels,
  DateRangeShortcut,
  TradingDayRange,
} from '@/components/ui/date-range-picker';
import { DayCell } from '@/components/ui/day-cell';
import { EmptyState } from '@/components/ui/empty-state';
import { resolveDateRangeShortcut } from '@/components/ui/date-range-shortcuts';
import { Segmented } from '@/components/ui/segmented';
import type { SegmentedOption } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveSheet } from '@/components/ui/sheet-responsive';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { useToast } from '@/components/ui/use-toast';
import { formatDateRangeLabel } from '@/lib/format/formatDateRangeLabel';

import { CatalogChartsSection } from './CatalogChartsSection';
import { CatalogControls } from './CatalogControls';
import { CatalogHeader } from './CatalogHeader';
import { CatalogListSection } from './CatalogListSection';
import { CatalogSection } from './CatalogSection';
import { SAMPLE_CURRENCY, SAMPLE_DAY_CELLS, SAMPLE_STAT_TILES, SAMPLE_TODAY } from './sampleData';

const DAY_CELL_LABEL_KEYS = ['profit', 'loss', 'journalOnly', 'empty', 'today'] as const;

type CatalogViewMode = 'amount' | 'percent' | 'rMultiple';

/**
 * Catalogue de composants (W-4) : vérification visuelle des primitives web
 * (`src/components/ui`, `src/components/chart`) sur bureau/mobile, en un
 * seul écran — **développement uniquement** (route `/dev/catalog`, exclue de
 * `dist` en production, voir `vite.config.ts`). Même rôle que
 * `apps/app/features/catalog/CatalogScreen.tsx` (gelé).
 */
export function CatalogScreen() {
  const { t, i18n } = useTranslation();
  const [hideAmounts, setHideAmounts] = useState(false);
  const [viewMode, setViewMode] = useState<CatalogViewMode>('amount');
  const [selectedOption, setSelectedOption] = useState('optionA');
  const [dateRange, setDateRange] = useState<TradingDayRange>(() =>
    resolveDateRangeShortcut('currentMonth', SAMPLE_TODAY),
  );
  const [dateRangeShortcut, setDateRangeShortcut] = useState<DateRangeShortcut>('currentMonth');
  const [sheetOpen, setSheetOpen] = useState(false);
  const locale = resolveLocale(i18n.language);
  const { show } = useToast();

  const segmentedOptions: readonly SegmentedOption<CatalogViewMode>[] = [
    { value: 'amount', label: t('catalog.segmented.amount') },
    { value: 'percent', label: t('catalog.segmented.percent') },
    { value: 'rMultiple', label: t('catalog.segmented.rMultiple') },
  ];

  const selectOptions = [
    { value: 'optionA', label: t('catalog.select.optionA') },
    { value: 'optionB', label: t('catalog.select.optionB') },
    { value: 'optionC', label: t('catalog.select.optionC') },
  ];

  const dateRangePickerLabels: DateRangePickerLabels = {
    today: t('header.period.today'),
    last7Days: t('header.period.last7Days'),
    currentMonth: t('header.period.currentMonth'),
    previousMonth: t('header.period.previousMonth'),
    custom: t('header.period.custom'),
    apply: t('header.period.apply'),
    cancel: t('header.period.cancel'),
    close: t('common.close'),
    previousMonthNav: t('header.period.previousMonthNav'),
    nextMonthNav: t('header.period.nextMonthNav'),
  };

  return (
    <main data-testid="catalog-screen" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <CatalogHeader />
      <CatalogControls
        hideAmounts={hideAmounts}
        onToggleHideAmounts={() => setHideAmounts((value) => !value)}
      />

      <CatalogSection testId="catalog-section-stat-tiles" title={t('catalog.sections.statTiles')}>
        <div className="flex flex-wrap gap-2">
          <StatTile
            testId="catalog-stat-tile-profit"
            label={t('catalog.statTiles.netPnl')}
            kind="signedAmount"
            value={SAMPLE_STAT_TILES.netPnlPositive}
            currency={SAMPLE_CURRENCY}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testId="catalog-stat-tile-loss"
            label={t('catalog.statTiles.loss')}
            kind="signedAmount"
            value={SAMPLE_STAT_TILES.netPnlNegative}
            currency={SAMPLE_CURRENCY}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testId="catalog-stat-tile-win-rate"
            label={t('catalog.statTiles.winRate')}
            kind="percent"
            value={SAMPLE_STAT_TILES.winRate}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testId="catalog-stat-tile-trades"
            label={t('catalog.statTiles.trades')}
            kind="number"
            value={SAMPLE_STAT_TILES.tradesCount}
            locale={locale}
            hideAmounts={hideAmounts}
          />
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-buttons" title={t('catalog.sections.buttons')}>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="catalog-button-primary" type="button" variant="default">
            {t('catalog.buttons.primary')}
          </Button>
          <Button data-testid="catalog-button-secondary" type="button" variant="secondary">
            {t('catalog.buttons.secondary')}
          </Button>
          <Button data-testid="catalog-button-ghost" type="button" variant="ghost">
            {t('catalog.buttons.ghost')}
          </Button>
          <Button data-testid="catalog-button-danger" type="button" variant="destructive">
            {t('catalog.buttons.danger')}
          </Button>
          <Button data-testid="catalog-button-disabled" type="button" variant="default" disabled>
            {t('catalog.buttons.disabled')}
          </Button>
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-loaders" title={t('catalog.sections.loaders')}>
        <div className="flex flex-col gap-2">
          <Skeleton data-testid="catalog-skeleton-line" className="h-4 w-3/5" />
          <Skeleton data-testid="catalog-skeleton-block" className="h-16 w-full rounded-lg" />
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-empty-state" title={t('catalog.sections.emptyState')}>
        <Card data-testid="catalog-empty-state-card">
          <EmptyState
            testId="catalog-empty-state"
            icon={Inbox}
            title={t('catalog.emptyState.title')}
            description={t('catalog.emptyState.description')}
            action={{ label: t('catalog.emptyState.action'), onClick: () => {} }}
          />
        </Card>
      </CatalogSection>

      <CatalogSection testId="catalog-section-calendar" title={t('catalog.sections.calendar')}>
        <div className="flex gap-2">
          {SAMPLE_DAY_CELLS.map((cell, index) => (
            <DayCell
              key={cell.day}
              testId={`catalog-day-cell-${cell.day}`}
              dayLabel={cell.day}
              pnl={cell.pnl}
              hasJournalEntry={cell.hasJournalEntry}
              isToday={cell.isToday}
              currency={SAMPLE_CURRENCY}
              locale={locale}
              hideAmounts={hideAmounts}
              amountVariant="compact"
              aria-label={t(`catalog.dayCell.${DAY_CELL_LABEL_KEYS[index] ?? 'empty'}`)}
            />
          ))}
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-segmented" title={t('catalog.sections.segmented')}>
        <Segmented
          testId="catalog-segmented"
          options={segmentedOptions}
          value={viewMode}
          onChange={setViewMode}
          aria-label={t('catalog.segmented.label')}
        />
      </CatalogSection>

      <CatalogSection testId="catalog-section-select" title={t('catalog.sections.select')}>
        <Select value={selectedOption} onValueChange={setSelectedOption}>
          <SelectTrigger data-testid="catalog-select" aria-label={t('catalog.select.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogSection>

      <CatalogSection
        testId="catalog-section-date-range-picker"
        title={t('catalog.sections.dateRangePicker')}
      >
        <DateRangePicker
          testId="catalog-date-range-picker"
          value={dateRange}
          shortcut={dateRangeShortcut}
          today={SAMPLE_TODAY}
          locale={locale}
          onChange={(range, shortcut) => {
            setDateRange(range);
            setDateRangeShortcut(shortcut);
          }}
          triggerLabel={formatDateRangeLabel(dateRange, locale)}
          label={t('catalog.dateRangePicker.label')}
          labels={dateRangePickerLabels}
        />
      </CatalogSection>

      <CatalogSection testId="catalog-section-sheet" title={t('catalog.sections.sheet')}>
        <Button
          data-testid="catalog-sheet-trigger"
          type="button"
          variant="secondary"
          onClick={() => setSheetOpen(true)}
        >
          {t('catalog.sheet.trigger')}
        </Button>
        <ResponsiveSheet
          testId="catalog-sheet"
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={t('catalog.sheet.title')}
          closeLabel={t('common.close')}
        >
          <p className="text-sm text-muted-foreground">{t('catalog.sheet.body')}</p>
        </ResponsiveSheet>
      </CatalogSection>

      <CatalogSection testId="catalog-section-toast" title={t('catalog.sections.toast')}>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="catalog-toast-success"
            type="button"
            variant="secondary"
            onClick={() => show(t('catalog.toast.successMessage'), 'success')}
          >
            {t('catalog.toast.success')}
          </Button>
          <Button
            data-testid="catalog-toast-error"
            type="button"
            variant="secondary"
            onClick={() => show(t('catalog.toast.errorMessage'), 'error')}
          >
            {t('catalog.toast.error')}
          </Button>
          <Button
            data-testid="catalog-toast-info"
            type="button"
            variant="secondary"
            onClick={() => show(t('catalog.toast.infoMessage'), 'info')}
          >
            {t('catalog.toast.info')}
          </Button>
        </div>
      </CatalogSection>

      <CatalogSection testId="catalog-section-cards" title={t('catalog.sections.cards')}>
        <div className="flex flex-col gap-2">
          <Card data-testid="catalog-card" className="gap-1 p-4">
            <p className="text-base font-semibold text-foreground">
              {t('catalog.cards.cardTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t('catalog.cards.cardBody')}</p>
          </Card>
        </div>
      </CatalogSection>

      <CatalogChartsSection />
      <CatalogListSection />
    </main>
  );
}
