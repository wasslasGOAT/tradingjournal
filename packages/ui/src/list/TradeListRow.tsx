import { formatSignedAmount, parseAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { resolvePnlIntent } from '../components/StatTile';
import { haptics } from '../haptics';
import { usePressScale } from '../motion';
import { useThemeMode } from '../theme/ThemeProvider';
import { tabularNumsStyle, themes } from '../tokens';
import type { PnlIntent } from '../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TradeListRowDirection = 'long' | 'short';

export interface TradeListRowProps {
  readonly testID?: string;
  readonly symbol: string;
  readonly direction: TradeListRowDirection;
  /** Libellé de la direction déjà traduit (ex. `t('trades.direction.long')`) — jamais de texte en dur ici (i18n). */
  readonly directionLabel: string;
  /** Date/heure déjà formatée (`@repo/core/format`). */
  readonly dateLabel: string;
  readonly pnl: Decimal | string;
  /** Requis (ADR-005 : pas de montant sans devise). */
  readonly currency: string;
  readonly locale: SupportedLocale;
  readonly hideAmounts?: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel: string;
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: 'text-pnlProfit',
  loss: 'text-pnlLoss',
  flat: 'text-pnlFlat',
};

function toDecimal(value: Decimal | string): Decimal {
  return typeof value === 'string' ? parseAmount(value) : value;
}

/**
 * Ligne de trade (M1-5, prête pour le trade log M4) : symbole + sens, date,
 * P&L coloré. Cible tactile ≥ 44 pt, chiffres tabulaires — mêmes conventions
 * que `DayCell`/`StatTile`. Aucun calcul métier : `pnl`/`dateLabel` déjà
 * calculés/formatés par l'appelant (`@repo/core`).
 */
export function TradeListRow({
  testID,
  symbol,
  direction,
  directionLabel,
  dateLabel,
  pnl,
  currency,
  locale,
  hideAmounts,
  onPress,
  accessibilityLabel,
}: TradeListRowProps) {
  const mode = useThemeMode();
  const colors = themes[mode];
  const { style, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.98 });
  const pnlDecimal = toDecimal(pnl);
  const intent = resolvePnlIntent(pnlDecimal);
  const DirectionIcon = direction === 'long' ? ArrowUpRight : ArrowDownRight;

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
      className="min-h-11 flex-row items-center gap-sm px-md py-sm"
      style={style}
    >
      <View
        accessibilityElementsHidden
        className="h-9 w-9 items-center justify-center rounded-full bg-surfaceAlt"
      >
        <DirectionIcon size={18} color={colors.textSecondary} />
      </View>
      <View className="flex-1 gap-xs">
        <Text className="font-sans-semibold text-sm text-textPrimary" numberOfLines={1}>
          {symbol}
        </Text>
        <Text className="font-sans text-xs text-textMuted" numberOfLines={1}>
          {directionLabel} · {dateLabel}
        </Text>
      </View>
      <Text
        testID={testID ? `${testID}-pnl` : undefined}
        className={`font-sans-semibold text-sm ${PNL_TEXT_CLASS_NAME[intent]}`}
        style={tabularNumsStyle}
        numberOfLines={1}
      >
        {formatSignedAmount(pnlDecimal, currency, { locale, hideAmounts })}
      </Text>
    </AnimatedPressable>
  );
}
