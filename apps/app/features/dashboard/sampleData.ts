/**
 * Données factices du dashboard (M1-8) : chaînes décimales (ADR-016 : montants
 * lus en chaîne puis convertis par `@repo/core`), jamais de `number` flottant.
 * Le vrai dashboard (agrégats `@repo/core` sur les trades filtrés par compte/
 * période) arrive en M3.
 */
export const SAMPLE_DASHBOARD_CURRENCY = 'USD';

export const SAMPLE_DASHBOARD = {
  balance: '24850.30',
  pnlToday: '312.40',
  pnlMonth: '1284.50',
  /** Fraction (ex. `0.0518` pour +5,18 %) — voir `formatPercent`. */
  returnRate: '0.0518',
} as const;
