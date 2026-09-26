import { formatDayNumber, formatMonthLabel, formatWeekdayShort, toTradingDay } from '@repo/core';
import type { SupportedLocale, TradingDay } from '@repo/core';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '../../haptics';
import { useThemeMode } from '../../theme/ThemeProvider';
import { tabularNumsStyle, themes } from '../../tokens';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Sheet } from '../Sheet';
import type { DateRangeShortcut, TradingDayRange } from './dateRangeShortcuts';
import {
  buildDateRangeGrid,
  resolveDateRangeGridCellIntent,
  resolveDateRangeShortcut,
  resolveRangeSelection,
} from './dateRangeShortcuts';

export type { DateRangeShortcut, TradingDayRange } from './dateRangeShortcuts';

const SHORTCUTS: readonly Exclude<DateRangeShortcut, 'custom'>[] = [
  'today',
  'last7Days',
  'currentMonth',
  'previousMonth',
];

export interface DateRangePickerLabels {
  readonly today: string;
  readonly last7Days: string;
  readonly currentMonth: string;
  readonly previousMonth: string;
  readonly custom: string;
  readonly apply: string;
  readonly cancel: string;
  readonly close: string;
  readonly previousMonthNav: string;
  readonly nextMonthNav: string;
}

export interface DateRangePickerProps {
  readonly testID?: string;
  readonly value: TradingDayRange;
  /** Raccourci actif (`'custom'` si `value` vient d'une plage personnalisée). */
  readonly shortcut: DateRangeShortcut;
  /** Jour de référence pour les raccourcis (« aujourd'hui ») — fourni par l'appelant (testabilité, cohérent avec `DayCell`/`CalendarScreen` : pas de `new Date()` dans `packages/ui`). */
  readonly today: TradingDay;
  readonly locale: SupportedLocale;
  /** `0` = dimanche, `1` = lundi (convention `date-fns`, ARCHITECTURE §5.5). Défaut `1`. */
  readonly weekStartsOn?: 0 | 1;
  readonly onChange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void;
  /** Libellé déjà formaté du déclencheur (ex. « 1 – 15 sept. 2026 », `@repo/core/format`) — aucun calcul de date au-delà de la grille elle-même dans ce composant. */
  readonly triggerLabel: string;
  /** Libellé du groupe — titre de la sheet et description par défaut du déclencheur. */
  readonly label: string;
  readonly triggerAccessibilityLabel?: string;
  readonly labels: DateRangePickerLabels;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = (month - 1 + delta + 1200) % 12;
  const yearDelta = Math.floor((month - 1 + delta) / 12);
  return { year: year + yearDelta, month: zeroBased + 1 };
}

function monthOf(day: TradingDay): { year: number; month: number } {
  const [yearText = '1970', monthText = '01'] = day.split('-');
  return { year: Number(yearText), month: Number(monthText) };
}

/**
 * Choix de période (M1-4, ARCHITECTURE §6.1) : raccourcis (Aujourd'hui / 7
 * derniers jours / Mois en cours / Mois précédent), plus une grille de
 * calendrier simple pour une plage personnalisée (sélection en 2 appuis).
 * Fait maison, sans dépendance — s'ouvre dans une `Sheet`. Remplace le
 * sélecteur de période provisoire du header (`PeriodSelector`, M1-8).
 */
export function DateRangePicker({
  testID,
  value,
  shortcut,
  today,
  locale,
  weekStartsOn = 1,
  onChange,
  triggerLabel,
  label,
  triggerAccessibilityLabel,
  labels,
}: DateRangePickerProps) {
  const mode = useThemeMode();
  const [open, setOpen] = useState(false);
  const [draftShortcut, setDraftShortcut] = useState<DateRangeShortcut>(shortcut);
  const [draftRange, setDraftRange] = useState<{
    readonly start: TradingDay;
    readonly end: TradingDay | null;
  }>({ start: value.start, end: value.end });
  const [displayedMonth, setDisplayedMonth] = useState(() => monthOf(value.start));
  // Trace la dernière valeur de `open` déjà « consommée » pour ré-initialiser le brouillon une
  // seule fois par ouverture, ajusté pendant le rendu plutôt que dans un effet : « Adjusting
  // state when a prop changes » (https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-based-on-a-prop-change)
  // — évite un rendu jetable avec l'ancien brouillon avant que l'effet ne s'exécute
  // (`react-hooks/set-state-in-effect`, revue M1, Important #3). `shortcut`/`value` lus
  // seulement à l'ouverture, pas à chaque changement de prop pendant que la sheet est ouverte.
  const [openSnapshot, setOpenSnapshot] = useState(open);
  if (open !== openSnapshot) {
    setOpenSnapshot(open);
    if (open) {
      setDraftShortcut(shortcut);
      setDraftRange({ start: value.start, end: value.end });
      setDisplayedMonth(monthOf(value.start));
    }
  }

  const applyShortcut = (nextShortcut: Exclude<DateRangeShortcut, 'custom'>) => {
    haptics.selection();
    onChange(resolveDateRangeShortcut(nextShortcut, today), nextShortcut);
    setOpen(false);
  };

  const handleCustomPress = () => {
    haptics.selection();
    setDraftShortcut('custom');
  };

  const handleDayPress = (day: TradingDay) => {
    haptics.selection();
    setDraftRange((current) => resolveRangeSelection(current, day));
  };

  const handleApply = () => {
    if (draftRange.end === null) return;
    haptics.selection();
    onChange({ start: draftRange.start, end: draftRange.end }, 'custom');
    setOpen(false);
  };

  const handleCancel = () => {
    haptics.selection();
    setOpen(false);
  };

  const weeks = buildDateRangeGrid(displayedMonth.year, displayedMonth.month, weekStartsOn);
  const monthLabel = formatMonthLabel(
    toTradingDay(
      `${String(displayedMonth.year).padStart(4, '0')}-${String(displayedMonth.month).padStart(2, '0')}-01`,
    ),
    { locale },
  );
  const weekdayLabels =
    weeks[0]?.map((cell) => formatWeekdayShort(cell.tradingDay, { locale })) ?? [];

  return (
    <View testID={testID}>
      <Button
        testID={testID ? `${testID}-trigger` : undefined}
        label={triggerLabel}
        variant="secondary"
        size="sm"
        icon={<ChevronDown size={14} color={themes[mode].textPrimary} />}
        accessibilityLabel={triggerAccessibilityLabel ?? label}
        onPress={() => setOpen(true)}
      />
      <Sheet
        testID={testID ? `${testID}-sheet` : undefined}
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        accessibilityLabel={label}
        closeAccessibilityLabel={labels.close}
      >
        <View className="gap-md">
          <View className="flex-row flex-wrap gap-xs">
            {SHORTCUTS.map((key) => (
              <Button
                key={key}
                testID={testID ? `${testID}-shortcut-${key}` : undefined}
                label={labels[key]}
                variant={draftShortcut === key ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => applyShortcut(key)}
              />
            ))}
            <Button
              testID={testID ? `${testID}-shortcut-custom` : undefined}
              label={labels.custom}
              variant={draftShortcut === 'custom' ? 'primary' : 'secondary'}
              size="sm"
              onPress={handleCustomPress}
            />
          </View>

          {draftShortcut === 'custom' ? (
            <View testID={testID ? `${testID}-grid` : undefined} className="gap-sm">
              <View className="flex-row items-center justify-between">
                <IconButton
                  testID={testID ? `${testID}-prev-month` : undefined}
                  icon={ChevronLeft}
                  accessibilityLabel={labels.previousMonthNav}
                  onPress={() => {
                    haptics.selection();
                    setDisplayedMonth((current) => addMonths(current.year, current.month, -1));
                  }}
                />
                <Text className="font-sans-semibold text-sm text-textPrimary">{monthLabel}</Text>
                <IconButton
                  testID={testID ? `${testID}-next-month` : undefined}
                  icon={ChevronRight}
                  accessibilityLabel={labels.nextMonthNav}
                  onPress={() => {
                    haptics.selection();
                    setDisplayedMonth((current) => addMonths(current.year, current.month, 1));
                  }}
                />
              </View>

              <View className="flex-row gap-xs">
                {weekdayLabels.map((weekdayLabel, index) => (
                  <Text
                    key={`weekday-${index}`}
                    className="flex-1 text-center font-sans text-xs text-textMuted"
                    numberOfLines={1}
                  >
                    {weekdayLabel}
                  </Text>
                ))}
              </View>

              <View className="gap-xs">
                {weeks.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} className="flex-row gap-xs">
                    {week.map((cell) => {
                      const intent = resolveDateRangeGridCellIntent(cell.tradingDay, draftRange);
                      const backgroundClassName =
                        intent === 'edge'
                          ? 'bg-accent'
                          : intent === 'inRange'
                            ? 'bg-accentMuted'
                            : 'bg-transparent';
                      const textClassName =
                        intent === 'edge' ? 'text-onAccent' : 'text-textPrimary';

                      return (
                        <Pressable
                          key={cell.tradingDay}
                          testID={testID ? `${testID}-day-${cell.tradingDay}` : undefined}
                          accessibilityRole="button"
                          accessibilityState={{ selected: intent !== 'none' }}
                          accessibilityLabel={formatDayNumber(cell.tradingDay, { locale })}
                          onPress={() => handleDayPress(cell.tradingDay)}
                          className={`min-h-11 flex-1 items-center justify-center rounded-md ${backgroundClassName} ${cell.inCurrentMonth ? '' : 'opacity-40'}`}
                        >
                          <Text
                            className={`font-sans text-sm ${textClassName}`}
                            style={tabularNumsStyle}
                          >
                            {formatDayNumber(cell.tradingDay, { locale })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              <View className="flex-row justify-end gap-sm">
                <Button
                  testID={testID ? `${testID}-cancel` : undefined}
                  label={labels.cancel}
                  variant="ghost"
                  size="sm"
                  onPress={handleCancel}
                />
                <Button
                  testID={testID ? `${testID}-apply` : undefined}
                  label={labels.apply}
                  variant="primary"
                  size="sm"
                  disabled={draftRange.end === null}
                  onPress={handleApply}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}
