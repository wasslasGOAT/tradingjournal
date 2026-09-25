import { describe, expect, it } from 'vitest';

import { buildCalendarGrid } from './calendarGrid';

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

  it('bascule d’année : décembre puis janvier en bourrage', () => {
    // 2026-12-01 est un mardi (lundi = colonne 0) -> bourrage colonne 0 = 2026-11-30.
    const weeks = buildCalendarGrid(2026, 12, 1);
    expect(weeks[0]?.[0]?.tradingDay).toBe('2026-11-30');
    expect(weeks[0]?.[0]?.inCurrentMonth).toBe(false);
    const inMonth = weeks.flat().filter((cell) => cell.inCurrentMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[inMonth.length - 1]?.tradingDay).toBe('2026-12-31');

    // Bourrage de fin : 2026-12-31 est un jeudi -> les jours suivants (ven/sam/dim)
    // basculent en janvier 2027.
    const lastWeek = weeks[weeks.length - 1] ?? [];
    const trailing = lastWeek.filter((cell) => !cell.inCurrentMonth);
    expect(trailing.map((cell) => cell.tradingDay)).toEqual([
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });

  it('février d’une année bissextile (2028, 29 jours)', () => {
    const weeks = buildCalendarGrid(2028, 2, 1);
    const inMonth = weeks.flat().filter((cell) => cell.inCurrentMonth);
    expect(inMonth).toHaveLength(29);
    expect(inMonth[inMonth.length - 1]?.tradingDay).toBe('2028-02-29');
  });

  it('février d’une année non bissextile (2026, 28 jours)', () => {
    const weeks = buildCalendarGrid(2026, 2, 1);
    const inMonth = weeks.flat().filter((cell) => cell.inCurrentMonth);
    expect(inMonth).toHaveLength(28);
  });

  it('mois qui remplit exactement des semaines de 7 jours sans bourrage (weekStartsOn = 0)', () => {
    // 2026-03-01 est un dimanche et mars compte 31 jours (31 = 4*7 + 3) : le
    // premier jour tombe exactement en colonne 0 côté dimanche.
    const weeks = buildCalendarGrid(2026, 3, 0);
    expect(weeks[0]?.[0]?.tradingDay).toBe('2026-03-01');
    expect(weeks[0]?.[0]?.inCurrentMonth).toBe(true);
  });

  it('chaque semaine est chronologiquement continue (7 jours consécutifs)', () => {
    const weeks = buildCalendarGrid(2026, 9, 1);
    for (const week of weeks) {
      for (let i = 1; i < week.length; i += 1) {
        const prevDay = week[i - 1]?.tradingDay;
        const day = week[i]?.tradingDay;
        expect(prevDay).toBeDefined();
        expect(day).toBeDefined();
        const prevDate = new Date(`${prevDay}T00:00:00Z`);
        const date = new Date(`${day}T00:00:00Z`);
        expect(date.getTime() - prevDate.getTime()).toBe(24 * 60 * 60 * 1000);
      }
    }
  });
});
