import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/**
 * Données factices du dashboard (M1-8, complétées en M1-6 pour la courbe
 * d'equity) : chaînes décimales (ADR-016 : montants lus en chaîne puis
 * convertis par `@repo/core`), jamais de `number` flottant. Le vrai dashboard
 * (agrégats `@repo/core` sur les trades filtrés par compte/période) arrive en
 * M3-app (branchement TanStack Query, M5).
 */
export const SAMPLE_DASHBOARD_CURRENCY = 'USD';

export const SAMPLE_DASHBOARD = {
  balance: '24850.30',
  pnlToday: '312.40',
  pnlMonth: '1284.50',
  /** Fraction (ex. `0.0518` pour +5,18 %) — voir `formatPercent`. */
  returnRate: '0.0518',
} as const;

/**
 * Courbe d'equity de trading factice (25 points, ~1 mois) : solde initial
 * cohérent avec `SAMPLE_DASHBOARD.balance`/`pnlMonth` (point de départ =
 * `balance - pnlMonth`, somme des variations journalières = `pnlMonth`,
 * dernier point = `balance`). `Chart` (M1-6) ne consomme que des `number` —
 * la conversion `Decimal` -> `number` se fait ici, à l'écran, jamais dans
 * `packages/ui`.
 */
export const SAMPLE_EQUITY_CURVE: readonly {
  readonly day: TradingDay;
  readonly balance: string;
}[] = [
  { day: toTradingDay('2026-08-26'), balance: '23565.80' },
  { day: toTradingDay('2026-08-27'), balance: '23746.00' },
  { day: toTradingDay('2026-08-28'), balance: '23650.60' },
  { day: toTradingDay('2026-08-29'), balance: '23870.70' },
  { day: toTradingDay('2026-08-30'), balance: '24211.30' },
  { day: toTradingDay('2026-08-31'), balance: '24031.00' },
  { day: toTradingDay('2026-09-01'), balance: '24121.00' },
  { day: toTradingDay('2026-09-02'), balance: '24060.80' },
  { day: toTradingDay('2026-09-03'), balance: '24471.60' },
  { day: toTradingDay('2026-09-04'), balance: '24251.10' },
  { day: toTradingDay('2026-09-05'), balance: '24401.10' },
  { day: toTradingDay('2026-09-06'), balance: '24461.50' },
  { day: toTradingDay('2026-09-07'), balance: '24151.30' },
  { day: toTradingDay('2026-09-08'), balance: '24432.20' },
  { day: toTradingDay('2026-09-09'), balance: '24622.50' },
  { day: toTradingDay('2026-09-10'), balance: '24481.90' },
  { day: toTradingDay('2026-09-11'), balance: '24701.90' },
  { day: toTradingDay('2026-09-12'), balance: '24626.60' },
  { day: toTradingDay('2026-09-13'), balance: '24756.80' },
  { day: toTradingDay('2026-09-14'), balance: '24536.00' },
  { day: toTradingDay('2026-09-15'), balance: '24846.50' },
  { day: toTradingDay('2026-09-16'), balance: '24750.90' },
  { day: toTradingDay('2026-09-17'), balance: '24891.20' },
  { day: toTradingDay('2026-09-18'), balance: '24951.40' },
  { day: toTradingDay('2026-09-19'), balance: '24850.30' },
] as const;
