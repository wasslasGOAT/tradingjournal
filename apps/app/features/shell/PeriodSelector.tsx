import { Button, Card, themes, useThemeMode } from '@repo/ui';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DropdownOption } from './DropdownOption';
import type { FilterPeriod } from './filterStore';
import { FILTER_PERIODS, useFilterStore } from './filterStore';

const PERIOD_LABEL_KEY: Record<FilterPeriod, string> = {
  day: 'header.period.day',
  week: 'header.period.week',
  month: 'header.period.month',
  year: 'header.period.year',
};

/**
 * Sélecteur de période du header (M1-8, ARCHITECTURE §6.1) : Jour / Semaine /
 * Mois / Année. Liste simple en attendant `Sheet`/`Select` (M1-4) — voir
 * `AccountSelector`.
 */
export function PeriodSelector() {
  const { t } = useTranslation('common');
  const mode = useThemeMode();
  const [open, setOpen] = useState(false);
  const period = useFilterStore((state) => state.period);
  const setPeriod = useFilterStore((state) => state.setPeriod);

  return (
    <View testID="header-period" className="relative">
      <Button
        testID="header-period-trigger"
        label={t(PERIOD_LABEL_KEY[period])}
        variant="secondary"
        size="sm"
        icon={<ChevronDown size={14} color={themes[mode].textPrimary} />}
        accessibilityLabel={t('header.period.triggerAccessibility')}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <Card
          testID="header-period-options"
          className="absolute top-12 right-0 z-50 min-w-40 gap-xs p-xs"
        >
          {FILTER_PERIODS.map((value) => (
            <DropdownOption
              key={value}
              testID={`header-period-option-${value}`}
              label={t(PERIOD_LABEL_KEY[value])}
              selected={period === value}
              onPress={() => {
                setPeriod(value);
                setOpen(false);
              }}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}
