import { formatSignedAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { tabularNumsStyle } from '@repo/ui';
import { Text, View } from 'react-native';

export interface WeekTotalCellProps {
  readonly testID?: string;
  readonly total: Decimal;
  readonly currency: string;
  readonly locale: SupportedLocale;
  readonly hideAmounts?: boolean;
  readonly label: string;
}

function pnlTextClassName(total: Decimal): string {
  if (total.isZero()) return 'text-pnlFlat';
  return total.isNegative() ? 'text-pnlLoss' : 'text-pnlProfit';
}

/** 8ᵉ colonne de chaque semaine du calendrier (M1-8, ARCHITECTURE §5.5 : « colonne total hebdo »). */
export function WeekTotalCell({
  testID,
  total,
  currency,
  locale,
  hideAmounts,
  label,
}: WeekTotalCellProps) {
  const formatted = formatSignedAmount(total, currency, { locale, hideAmounts });

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label} ${formatted}`}
      className="min-h-11 min-w-11 flex-1 items-center justify-center gap-xs rounded-md bg-surface p-xs"
    >
      <Text className="font-sans text-xs text-textMuted" numberOfLines={1}>
        {label}
      </Text>
      <Text
        testID={testID ? `${testID}-value` : undefined}
        className={`font-sans-semibold text-xs ${pnlTextClassName(total)}`}
        style={tabularNumsStyle}
        numberOfLines={1}
      >
        {formatted}
      </Text>
    </View>
  );
}
