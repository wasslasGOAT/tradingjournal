import { describe, expect, it } from 'vitest';

import { toTradingDay } from './tradingDay';
import { enumerateTradingDays } from './tradingDayRange';

describe('enumerateTradingDays', () => {
  it('un seul jour quand `from === to`', () => {
    const day = toTradingDay('2026-03-15');
    expect(enumerateTradingDays(day, day)).toEqual([day]);
  });

  it('énumère les jours civils de `from` à `to`, bornes incluses', () => {
    const days = enumerateTradingDays(toTradingDay('2026-03-01'), toTradingDay('2026-03-05'));
    expect(days).toEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
  });

  it('reporte le mois et l’année (fin de mois/année)', () => {
    const days = enumerateTradingDays(toTradingDay('2025-12-30'), toTradingDay('2026-01-02'));
    expect(days).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
  });

  it('tableau vide si `from > to`', () => {
    expect(enumerateTradingDays(toTradingDay('2026-03-05'), toTradingDay('2026-03-01'))).toEqual(
      [],
    );
  });

  it('traverse février bissextile (2028)', () => {
    const days = enumerateTradingDays(toTradingDay('2028-02-27'), toTradingDay('2028-03-01'));
    expect(days).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
  });
});
