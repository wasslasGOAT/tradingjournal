import { describe, expect, it } from 'vitest';

import { buildCalendarGrid } from './buildCalendarGrid';

describe('buildCalendarGrid', () => {
  it('couvre septembre 2026 en semaines de 7 jours commençant le lundi', () => {
    const weeks = buildCalendarGrid(2026, 9, 1);

    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    // Concaténation de toutes les cellules "dans le mois" : exactement les 30 jours de septembre.
    const inMonth = weeks.flat().filter((cell) => cell.inCurrentMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0]?.tradingDay).toBe('2026-09-01');
    expect(inMonth[inMonth.length - 1]?.tradingDay).toBe('2026-09-30');
  });

  it('aligne le premier jour du mois sur la bonne colonne (lundi = colonne 0)', () => {
    // 2026-09-01 est un mardi -> colonne 1 (0 = lundi) de la première semaine.
    const weeks = buildCalendarGrid(2026, 9, 1);
    expect(weeks[0]?.[1]?.tradingDay).toBe('2026-09-01');
    expect(weeks[0]?.[1]?.inCurrentMonth).toBe(true);
    expect(weeks[0]?.[0]?.inCurrentMonth).toBe(false);
  });

  it('dimanche comme premier jour de semaine (weekStartsOn = 0)', () => {
    // 2026-09-01 (mardi) -> colonne 2 (0 = dimanche).
    const weeks = buildCalendarGrid(2026, 9, 0);
    expect(weeks[0]?.[2]?.tradingDay).toBe('2026-09-01');
  });
});
