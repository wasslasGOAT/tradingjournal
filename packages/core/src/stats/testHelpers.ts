import { Decimal } from '../money';
import type { TradeRecord } from './types';

/**
 * Compteur déterministe pour l'id par défaut de {@link buildTrade} (revue M3
 * #19) — `Math.random()` rendait la suite de tests non déterministe/non
 * reproductible d'une exécution à l'autre (CLAUDE.md : fonctions pures et
 * testées ; un helper de test doit l'être tout autant, pour un diff stable
 * en CI). Réinitialisé implicitement à chaque rechargement du module (un par
 * fichier de test Vitest, isolé).
 */
let nextTradeId = 0;

/**
 * Construit un {@link TradeRecord} minimal pour les tests de `packages/core/stats`
 * et `.../aggregates` — valeurs par défaut neutres, à surcharger au cas par cas.
 * Non exporté par `@repo/core` (fichier de test uniquement).
 */
export function buildTrade(overrides: Partial<TradeRecord> & { netPnl: Decimal }): TradeRecord {
  nextTradeId += 1;
  return {
    id: overrides.id ?? `trade-${nextTradeId}`,
    accountId: overrides.accountId ?? 'acct-1',
    currency: overrides.currency ?? 'USD',
    symbol: overrides.symbol ?? 'EURUSD',
    direction: overrides.direction ?? 'long',
    status: overrides.status ?? 'closed',
    openedAt: overrides.openedAt ?? new Date('2026-03-02T08:00:00Z'),
    closedAt:
      overrides.closedAt === undefined ? new Date('2026-03-02T10:00:00Z') : overrides.closedAt,
    tradingDay: overrides.tradingDay ?? '2026-03-02',
    grossPnl: overrides.grossPnl ?? overrides.netPnl,
    netPnl: overrides.netPnl,
    rMultiple: overrides.rMultiple ?? null,
    commission: overrides.commission ?? new Decimal(0),
    fees: overrides.fees ?? new Decimal(0),
    quantity: overrides.quantity ?? new Decimal(1),
    session: overrides.session ?? 'london',
    setup: overrides.setup,
    tags: overrides.tags,
  };
}

export function d(value: string): Decimal {
  return new Decimal(value);
}
