import { resolveLocale } from '@repo/i18n';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import type {
  DateRangePickerLabels,
  DateRangeShortcut,
  TradingDayRange,
} from '@/components/ui/date-range-picker';
import { formatDateRangeLabel } from '@/lib/format/formatDateRangeLabel';

import { resolveApproximateToday } from './filters';

export interface PeriodSelectorProps {
  readonly dateRange: TradingDayRange;
  readonly dateRangeShortcut: DateRangeShortcut;
  readonly onChange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void;
}

/**
 * Sélecteur de période du header (W-5, ARCHITECTURE §6.1) — `DateRangePicker`
 * (`components/ui`, W-4), reflété dans l'URL par l'appelant (`_shell.tsx`).
 */
export function PeriodSelector({ dateRange, dateRangeShortcut, onChange }: PeriodSelectorProps) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const labels: DateRangePickerLabels = {
    today: t('header.period.today'),
    last7Days: t('header.period.last7Days'),
    currentMonth: t('header.period.currentMonth'),
    previousMonth: t('header.period.previousMonth'),
    custom: t('header.period.custom'),
    apply: t('header.period.apply'),
    cancel: t('header.period.cancel'),
    close: t('close'),
    previousMonthNav: t('header.period.previousMonthNav'),
    nextMonthNav: t('header.period.nextMonthNav'),
  };

  return (
    <DateRangePicker
      testId="header-period"
      value={dateRange}
      shortcut={dateRangeShortcut}
      today={resolveApproximateToday()}
      locale={locale}
      onChange={onChange}
      triggerLabel={formatDateRangeLabel(dateRange, locale)}
      label={t('header.period.triggerAccessibility')}
      labels={labels}
    />
  );
}
