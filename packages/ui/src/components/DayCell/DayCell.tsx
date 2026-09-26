import { formatSignedAmount, parseAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { NotebookPen } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatCompactSignedAmount } from '../../format/compactAmount';
import { haptics } from '../../haptics';
import { usePressScale } from '../../motion';
import { useThemeMode } from '../../theme/ThemeProvider';
import { tabularNumsStyle, themes } from '../../tokens';
import type { PnlIntent } from '../../tokens';
import { resolveDayCellContentState, resolveDayCellPnlIntent } from './dayCellState';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface DayCellProps {
  readonly testID?: string;
  /** Quantième déjà formaté (ex. `formatDayNumber` de `@repo/core`), ex. `"14"`. */
  readonly dayLabel: string;
  /** P&L net du jour, `null` si aucun trade. `Decimal` déjà calculé ou chaîne décimale brute. */
  readonly pnl: Decimal | string | null;
  readonly hasJournalEntry?: boolean;
  readonly isToday?: boolean;
  /** Requis dès qu'un P&L existe (ADR-005 : pas de montant sans devise). */
  readonly currency?: string;
  readonly locale: SupportedLocale;
  readonly hideAmounts?: boolean;
  /**
   * `'compact'` (M1-4, correctif calendrier) : montant sans symbole de devise,
   * en notation compacte (`formatCompactSignedAmount`, ex. `+1,3k`), police
   * `2xs` — pour les grilles très étroites (calendrier, 8 colonnes dès 320 px).
   * `'full'` (défaut) : `formatSignedAmount`, montant complet avec devise.
   */
  readonly amountVariant?: 'full' | 'compact';
  readonly onPress?: () => void;
  readonly accessibilityLabel: string;
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: 'text-pnlProfit',
  loss: 'text-pnlLoss',
  flat: 'text-pnlFlat',
};

function toDecimalOrNull(value: Decimal | string | null): Decimal | null {
  if (value === null) return null;
  return typeof value === 'string' ? parseAmount(value) : value;
}

/**
 * Cellule de calendrier (M1-3, ARCHITECTURE §6.2) : profit/perte (montant
 * coloré selon le signe), journal seul (icône), vide, et « aujourd'hui »
 * (bordure accent, modificateur indépendant du contenu — voir `dayCellState.ts`).
 */
export function DayCell({
  testID,
  dayLabel,
  pnl,
  hasJournalEntry = false,
  isToday = false,
  currency,
  locale,
  hideAmounts,
  amountVariant = 'full',
  onPress,
  accessibilityLabel,
}: DayCellProps) {
  const mode = useThemeMode();
  const { style, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.94 });
  const pnlDecimal = toDecimalOrNull(pnl);
  const contentState = resolveDayCellContentState(pnlDecimal, hasJournalEntry);
  const intent = resolveDayCellPnlIntent(pnlDecimal);

  const backgroundClassName = contentState === 'empty' ? 'bg-surface' : 'bg-surfaceAlt';
  const borderClassName = isToday ? 'border-2 border-accent' : 'border border-border';

  const handlePressIn = () => {
    if (!onPress) return;
    haptics.selection();
    onPressIn();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      className={`min-h-11 min-w-11 flex-1 gap-xs rounded-md p-xs ${backgroundClassName} ${borderClassName}`}
      style={style}
    >
      <Text className="font-sans text-xs text-textMuted">{dayLabel}</Text>
      {contentState === 'trades' && intent !== null && pnlDecimal !== null && currency ? (
        <Text
          className={`font-sans-semibold ${amountVariant === 'compact' ? 'text-2xs' : 'text-xs'} ${PNL_TEXT_CLASS_NAME[intent]}`}
          style={tabularNumsStyle}
          numberOfLines={1}
          adjustsFontSizeToFit={amountVariant === 'compact'}
          minimumFontScale={0.85}
        >
          {amountVariant === 'compact'
            ? formatCompactSignedAmount(pnlDecimal, { locale, hideAmounts })
            : formatSignedAmount(pnlDecimal, currency, { locale, hideAmounts })}
        </Text>
      ) : null}
      {contentState === 'journalOnly' ? (
        <NotebookPen size={14} color={themes[mode].textMuted} />
      ) : null}
    </AnimatedPressable>
  );
}
