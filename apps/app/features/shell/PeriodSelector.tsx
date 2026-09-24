import { DateRangePicker } from '@repo/ui';
import type { DateRangePickerLabels } from '@repo/ui';
import { resolveLocale } from '@repo/i18n';
import { useTranslation } from 'react-i18next';

import { formatDateRangeLabel } from './formatDateRangeLabel';
import { resolveApproximateToday, useFilterStore } from './filterStore';

/**
 * Sélecteur de période du header (M1-4/M1-8, ARCHITECTURE §6.1) —
 * `DateRangePicker` (`packages/ui`, M1-4) : remplace l'ancien réglage
 * jour/semaine/mois/année par de vraies plages de dates (raccourcis +
 * personnalisée).
 */
export function PeriodSelector() {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dateRange = useFilterStore((state) => state.dateRange);
  const dateRangeShortcut = useFilterStore((state) => state.dateRangeShortcut);
  const setDateRange = useFilterStore((state) => state.setDateRange);

  const labels: DateRangePickerLabels = {
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
    <DateRangePicker
      testID="header-period"
      value={dateRange}
      shortcut={dateRangeShortcut}
      today={resolveApproximateToday()}
      locale={locale}
      onChange={setDateRange}
      triggerLabel={formatDateRangeLabel(dateRange, locale)}
      label={t('header.period.triggerAccessibility')}
      labels={labels}
    />
  );
}
