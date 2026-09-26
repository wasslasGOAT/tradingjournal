import { toTradingDay } from '@repo/core';
import { describe, expect, it } from 'vitest';

import { formatDateRangeLabel } from './formatDateRangeLabel';

describe('formatDateRangeLabel', () => {
  it('jour unique', () => {
    const range = { start: toTradingDay('2026-09-19'), end: toTradingDay('2026-09-19') };
    expect(formatDateRangeLabel(range, 'en')).toBe('19 September 2026');
  });

  it('même mois : bornes jointes par un tiret, mois une seule fois', () => {
    const range = { start: toTradingDay('2026-09-01'), end: toTradingDay('2026-09-15') };
    expect(formatDateRangeLabel(range, 'en')).toBe('1–15 September 2026');
  });

  it('mois différents : chaque borne porte son propre mois complet', () => {
    const range = { start: toTradingDay('2026-08-28'), end: toTradingDay('2026-09-03') };
    expect(formatDateRangeLabel(range, 'en')).toBe('28 August 2026 – 3 September 2026');
  });
});
