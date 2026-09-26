import { parseAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';
import { memo } from 'react';

import { cn } from '@/lib/utils';

import { formatStatTileValue, resolveStatTileClassName } from './stat-tile-value';

interface StatTileBaseProps {
  readonly testId?: string;
  /** Libellé de la statistique (déjà traduit, ex. `t('dashboard.netPnl')`). */
  readonly label: string;
  /** Valeur : `Decimal` déjà calculé, ou chaîne décimale brute (colonne `numeric`, ADR-005) convertie via `parseAmount`. */
  readonly value: Decimal | string;
  readonly locale: SupportedLocale;
  /** Masquage global des montants (icône œil) — répercuté par les formateurs `@repo/core`. */
  readonly hideAmounts?: boolean;
  readonly decimals?: number;
  readonly className?: string;
}

/** `currency` requis uniquement pour un montant (ADR-005 : pas de montant sans devise). */
export type StatTileProps =
  | (StatTileBaseProps & { readonly kind: 'amount' | 'signedAmount'; readonly currency: string })
  | (StatTileBaseProps & { readonly kind: 'percent' | 'number'; readonly currency?: undefined });

function toDecimal(value: Decimal | string): Decimal {
  return typeof value === 'string' ? parseAmount(value) : value;
}

/**
 * Tuile de statistique (W-4, ARCHITECTURE §6.2) : libellé + valeur formatée
 * (`@repo/core/format`), couleur P&L selon le signe, chiffres tabulaires.
 * Aucun calcul ici — `value` est déjà le résultat d'un calcul de
 * `packages/core`. Même API/rôle que
 * `packages/ui/src/components/StatTile/StatTile.tsx` (gelé).
 */
function StatTileComponent({
  testId,
  label,
  value,
  kind,
  locale,
  currency,
  hideAmounts,
  decimals,
  className,
}: StatTileProps) {
  const decimalValue = toDecimal(value);
  const formatted = formatStatTileValue({
    kind,
    value: decimalValue,
    locale,
    currency,
    hideAmounts,
    decimals,
  });
  const colorClassName = resolveStatTileClassName(kind, decimalValue);

  return (
    <div
      data-testid={testId}
      aria-label={`${label} ${formatted}`}
      className={cn('min-w-24 gap-1 rounded-md bg-muted p-4', className)}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        data-testid={testId ? `${testId}-value` : undefined}
        className={cn('truncate text-lg font-semibold tabular-nums', colorClassName)}
      >
        {formatted}
      </p>
    </div>
  );
}

/** Mémoïsé (W-9, ADR-017) — voir le commentaire équivalent sur `DayCell`. */
export const StatTile = memo(StatTileComponent);
