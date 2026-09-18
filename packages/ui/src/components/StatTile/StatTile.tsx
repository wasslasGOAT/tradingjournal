import { parseAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { Text, View } from 'react-native';

import { tabularNumsStyle } from '../../tokens';
import { formatStatTileValue, resolveStatTileClassName } from './statTileValue';

interface StatTileBaseProps {
  readonly testID?: string;
  /** Libellé de la statistique (déjà traduit, ex. `t('dashboard.netPnl')`). */
  readonly label: string;
  /** Valeur : `Decimal` déjà calculé, ou chaîne décimale brute (colonne `numeric`, ADR-005) convertie via `parseAmount`. */
  readonly value: Decimal | string;
  readonly locale: SupportedLocale;
  /** Masquage global des montants (icône œil) — répercuté par les formateurs `@repo/core`. */
  readonly hideAmounts?: boolean;
  readonly decimals?: number;
}

/** `currency` requis uniquement pour un montant (ADR-005 : pas de montant sans devise). */
export type StatTileProps =
  | (StatTileBaseProps & { readonly kind: 'amount' | 'signedAmount'; readonly currency: string })
  | (StatTileBaseProps & { readonly kind: 'percent' | 'number'; readonly currency?: undefined });

function toDecimal(value: Decimal | string): Decimal {
  return typeof value === 'string' ? parseAmount(value) : value;
}

/**
 * Tuile de statistique (M1-3, ARCHITECTURE §6.2) : libellé + valeur formatée
 * (`@repo/core/format`), couleur P&L selon le signe (tokens `pnl*` du thème
 * actif), chiffres tabulaires. Aucun calcul ici — `value` est déjà le résultat
 * d'un calcul de `packages/core` (stats/dashboard, ROADMAP M3+).
 */
export function StatTile({
  testID,
  label,
  value,
  kind,
  locale,
  currency,
  hideAmounts,
  decimals,
}: StatTileProps) {
  const decimalValue = toDecimal(value);
  const formatted = formatStatTileValue({ kind, value: decimalValue, locale, currency, hideAmounts, decimals });
  const colorClassName = resolveStatTileClassName(kind, decimalValue);

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label} ${formatted}`}
      className="min-w-24 gap-xs rounded-md bg-surfaceAlt p-md"
    >
      <Text className="font-sans text-sm text-textSecondary">{label}</Text>
      <Text
        testID={testID ? `${testID}-value` : undefined}
        className={`font-sans-semibold text-lg ${colorClassName}`}
        style={tabularNumsStyle}
        numberOfLines={1}
      >
        {formatted}
      </Text>
    </View>
  );
}
