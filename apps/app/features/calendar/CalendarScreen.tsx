import {
  Decimal,
  formatDayNumber,
  formatMonthLabel,
  formatWeekdayShort,
  parseAmount,
} from '@repo/core';
import { resolveLocale } from '@repo/i18n';
import { DayCell, Screen, StatTile, useVisibilityStore } from '@repo/ui';
import { useTranslation } from 'react-i18next';
import { Text, View, useWindowDimensions } from 'react-native';

import { buildCalendarGrid } from './buildCalendarGrid';
import { isNarrowCalendarLayout } from './calendarLayout';
import { resolveCalendarDayStateKey } from './resolveCalendarDayStateKey';
import {
  SAMPLE_CALENDAR_CURRENCY,
  SAMPLE_CALENDAR_DAYS,
  SAMPLE_CALENDAR_MONTH,
  SAMPLE_MONTH_LABEL_DAY,
  SAMPLE_MONTH_STATS,
  SAMPLE_TODAY,
} from './sampleData';
import { WeekTotalCell } from './WeekTotalCell';

/** Premier jour de la semaine par locale (`date-fns`, ARCHITECTURE §5.5) — `packages/core` n'expose pas
 * encore ce réglage par préférence utilisateur (M2+) : valeur par locale en attendant. */
const WEEK_STARTS_ON: Record<'fr' | 'en', 0 | 1> = { fr: 1, en: 0 };

/**
 * Écran Calendrier (M1-8, ARCHITECTURE §5.5) : grille du mois (`DayCell` par
 * jour, `WeekTotalCell` par semaine) + stats du mois en tuiles. Données
 * factices (`sampleData.ts`) — le vrai calendrier (agrégats `@repo/core` sur
 * les trades du mois filtré par compte/période) arrive en M3.
 */
export function CalendarScreen() {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const { width } = useWindowDimensions();
  // M1-4 (correctif largeur) : sous 360 px, la colonne « Total » ne tient plus à côté
  // de 7 colonnes de jour carrées — elle se replie en ligne pleine largeur sous la
  // semaine (`WeekTotalCell` en `variant="row"`, voir `calendarLayout.ts`).
  const narrow = isNarrowCalendarLayout(width);

  const weeks = buildCalendarGrid(
    SAMPLE_CALENDAR_MONTH.year,
    SAMPLE_CALENDAR_MONTH.month,
    WEEK_STARTS_ON[locale],
  );
  const dayByTradingDay = new Map(SAMPLE_CALENDAR_DAYS.map((day) => [day.tradingDay, day]));
  const monthLabel = formatMonthLabel(SAMPLE_MONTH_LABEL_DAY, { locale });
  const weekdayLabels =
    weeks[0]?.map((cell) => formatWeekdayShort(cell.tradingDay, { locale })) ?? [];

  return (
    <Screen
      testID="screen-calendar"
      scroll
      edges={{ top: false, bottom: false }}
      contentClassName="gap-lg pb-xl"
    >
      <View className="gap-xs">
        <Text className="font-sans-semibold text-lg text-textPrimary">{t('calendar.title')}</Text>
        <Text className="font-sans text-sm text-textSecondary">{monthLabel}</Text>
      </View>

      <View
        testID="calendar-grid"
        // Pleine largeur : annule le padding latéral de `Screen` (`px-lg`) pour que la
        // grille respire sur mobile (retour utilisateur M1 : « calendrier trop étroit »),
        // sans carte ni bordure qui mangeraient encore de la place.
        className="-mx-lg w-auto max-w-xl gap-sm self-stretch px-xs sm:mx-0 sm:self-center sm:px-0"
      >
        <View className="flex-row gap-xs">
          {weekdayLabels.map((label, index) => (
            <Text
              key={`weekday-${index}`}
              className="flex-1 text-center font-sans text-xs text-textMuted"
              numberOfLines={1}
            >
              {label}
            </Text>
          ))}
          {narrow ? null : (
            <Text className="w-12 text-center font-sans text-xs text-textMuted" numberOfLines={1}>
              {t('calendar.weekTotal')}
            </Text>
          )}
        </View>

        <View className="gap-xs">
          {weeks.map((week, weekIndex) => {
            const weekTotal = week
              .filter((cell) => cell.inCurrentMonth)
              .reduce((total, cell) => {
                const day = dayByTradingDay.get(cell.tradingDay);
                return day?.pnl != null ? total.plus(parseAmount(day.pnl)) : total;
              }, new Decimal(0));

            return (
              <View key={`week-${weekIndex}`} className="gap-xs">
                <View className="flex-row gap-xs">
                  {week.map((cell) => {
                    const day = dayByTradingDay.get(cell.tradingDay);
                    const isToday = cell.tradingDay === SAMPLE_TODAY;
                    const stateKey = resolveCalendarDayStateKey(
                      day?.pnl ?? null,
                      day?.hasJournalEntry ?? false,
                      isToday,
                    );
                    const dayNumberLabel = formatDayNumber(cell.tradingDay, { locale });

                    const dayCell = (
                      <DayCell
                        testID={`calendar-day-${cell.tradingDay}`}
                        dayLabel={dayNumberLabel}
                        pnl={day?.pnl ?? null}
                        hasJournalEntry={day?.hasJournalEntry ?? false}
                        isToday={isToday}
                        currency={SAMPLE_CALENDAR_CURRENCY}
                        locale={locale}
                        hideAmounts={hideAmounts}
                        amountVariant="compact"
                        accessibilityLabel={t('calendar.dayAccessibility', {
                          day: dayNumberLabel,
                          state: t(`calendar.dayState.${stateKey}`),
                        })}
                      />
                    );

                    // `aspectRatio: 1` (M1-4, correctif largeur) : cellule carrée quelle que
                    // soit la largeur de colonne obtenue (`flex-1`) — sauf plancher
                    // d'accessibilité `min-h-11` (44 pt, posé par `DayCell` lui-même, prioritaire
                    // sur le carré exact aux toutes petites largeurs).
                    return cell.inCurrentMonth ? (
                      <View key={cell.tradingDay} className="flex-1" style={{ aspectRatio: 1 }}>
                        {dayCell}
                      </View>
                    ) : (
                      <View
                        key={cell.tradingDay}
                        className="flex-1 opacity-40"
                        style={{ aspectRatio: 1 }}
                      >
                        {dayCell}
                      </View>
                    );
                  })}
                  {narrow ? null : (
                    <WeekTotalCell
                      testID={`calendar-week-total-${weekIndex}`}
                      total={weekTotal}
                      currency={SAMPLE_CALENDAR_CURRENCY}
                      locale={locale}
                      hideAmounts={hideAmounts}
                      label={t('calendar.weekTotal')}
                    />
                  )}
                </View>
                {narrow ? (
                  <WeekTotalCell
                    testID={`calendar-week-total-${weekIndex}`}
                    total={weekTotal}
                    currency={SAMPLE_CALENDAR_CURRENCY}
                    locale={locale}
                    hideAmounts={hideAmounts}
                    label={t('calendar.weekTotal')}
                    variant="row"
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-sm">
        <StatTile
          testID="calendar-stat-net-pnl"
          label={t('calendar.monthStats.netPnl')}
          kind="signedAmount"
          value={SAMPLE_MONTH_STATS.netPnl}
          currency={SAMPLE_CALENDAR_CURRENCY}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testID="calendar-stat-winning-days"
          label={t('calendar.monthStats.winningDays')}
          kind="number"
          value={SAMPLE_MONTH_STATS.winningDays}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testID="calendar-stat-losing-days"
          label={t('calendar.monthStats.losingDays')}
          kind="number"
          value={SAMPLE_MONTH_STATS.losingDays}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testID="calendar-stat-trades-count"
          label={t('calendar.monthStats.tradesCount')}
          kind="number"
          value={SAMPLE_MONTH_STATS.tradesCount}
          locale={locale}
          hideAmounts={hideAmounts}
        />
      </View>
    </Screen>
  );
}
