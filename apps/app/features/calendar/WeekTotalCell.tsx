import { formatSignedAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { formatCompactSignedAmount, tabularNumsStyle } from '@repo/ui';
import { Text, View } from 'react-native';

export interface WeekTotalCellProps {
  readonly testID?: string;
  readonly total: Decimal;
  readonly currency: string;
  readonly locale: SupportedLocale;
  readonly hideAmounts?: boolean;
  /** Libellé (ex. « Total »). Toujours utilisé pour l'accessibilité ; affiché
   * visuellement seulement en `variant="row"` (pas de répétition à côté d'une
   * colonne d'en-tête déjà libellée, correctif M1-4). */
  readonly label: string;
  /**
   * `'column'` (défaut) : 8ᵉ colonne étroite à largeur fixe, à côté des 7
   * `DayCell` de la semaine — l'en-tête de la grille (`CalendarScreen`) porte
   * seul le libellé visible.
   * `'row'` : ligne pleine largeur sous la semaine (< `NARROW_CALENDAR_BREAKPOINT`,
   * `calendarLayout.ts`) — les 7 `DayCell` gagnent alors toute la largeur pour
   * rester carrées ; le libellé est répété ici car il n'y a plus de colonne
   * d'en-tête à laquelle se référer.
   */
  readonly variant?: 'column' | 'row';
}

function pnlTextClassName(total: Decimal): string {
  if (total.isZero()) return 'text-pnlFlat';
  return total.isNegative() ? 'text-pnlLoss' : 'text-pnlProfit';
}

/**
 * Total hebdomadaire du calendrier (M1-8/M1-4, ARCHITECTURE §5.5 : « colonne
 * total hebdo »), en notation compacte (`formatCompactSignedAmount`, sans
 * devise) comme `DayCell` en mode `compact`.
 */
export function WeekTotalCell({
  testID,
  total,
  currency,
  locale,
  hideAmounts,
  label,
  variant = 'column',
}: WeekTotalCellProps) {
  const fullFormatted = formatSignedAmount(total, currency, { locale, hideAmounts });
  const compactFormatted = formatCompactSignedAmount(total, { locale, hideAmounts });
  const valueClassName = `font-sans-semibold text-2xs ${pnlTextClassName(total)}`;

  if (variant === 'row') {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={`${label} ${fullFormatted}`}
        className="flex-row items-center justify-between rounded-md bg-surface px-sm py-xs"
      >
        <Text className="font-sans text-2xs text-textMuted" numberOfLines={1}>
          {label}
        </Text>
        <Text
          testID={testID ? `${testID}-value` : undefined}
          className={valueClassName}
          style={tabularNumsStyle}
          numberOfLines={1}
        >
          {compactFormatted}
        </Text>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label} ${fullFormatted}`}
      className="min-h-11 w-12 items-center justify-center rounded-md bg-surface p-xs"
    >
      <Text
        testID={testID ? `${testID}-value` : undefined}
        className={valueClassName}
        style={tabularNumsStyle}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {compactFormatted}
      </Text>
    </View>
  );
}
