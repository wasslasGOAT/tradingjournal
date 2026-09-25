import { toTradingDay } from '@repo/core';
import { describe, expect, it } from 'vitest';

import {
  buildDateRangeGrid,
  isWithinRange,
  resolveDateRangeGridCellIntent,
  resolveDateRangeShortcut,
  resolveRangeSelection,
} from './date-range-shortcuts';

const TODAY = toTradingDay('2026-09-19');

describe('resolveDateRangeShortcut', () => {
  it('today : plage réduite au jour même', () => {
    expect(resolveDateRangeShortcut('today', TODAY)).toEqual({
      start: TODAY,
      end: TODAY,
    });
  });

  it('last7Days : 7 jours inclus, borne haute = aujourd’hui', () => {
    expect(resolveDateRangeShortcut('last7Days', TODAY)).toEqual({
      start: toTradingDay('2026-09-13'),
      end: TODAY,
    });
  });

  it('currentMonth : du 1er du mois à aujourd’hui', () => {
    expect(resolveDateRangeShortcut('currentMonth', TODAY)).toEqual({
      start: toTradingDay('2026-09-01'),
      end: TODAY,
    });
  });

  it('previousMonth : mois calendaire précédent en entier', () => {
    expect(resolveDateRangeShortcut('previousMonth', TODAY)).toEqual({
      start: toTradingDay('2026-08-01'),
      end: toTradingDay('2026-08-31'),
    });
  });

  it('previousMonth : reporte correctement janvier -> décembre de l’année précédente', () => {
    expect(resolveDateRangeShortcut('previousMonth', toTradingDay('2026-01-15'))).toEqual({
      start: toTradingDay('2025-12-01'),
      end: toTradingDay('2025-12-31'),
    });
  });
});

describe('buildDateRangeGrid', () => {
  it('couvre tout le mois, en semaines de 7 jours, avec bourrage avant/après', () => {
    const weeks = buildDateRangeGrid(2026, 9, 1);
    const allDays = weeks.flat();
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(allDays.filter((cell) => cell.inCurrentMonth)).toHaveLength(30);
    expect(allDays[0]?.tradingDay).toBe(toTradingDay('2026-08-31'));
  });
});

describe('isWithinRange', () => {
  const range = { start: toTradingDay('2026-09-10'), end: toTradingDay('2026-09-15') };

  it('inclut les deux bornes', () => {
    expect(isWithinRange(range.start, range)).toBe(true);
    expect(isWithinRange(range.end, range)).toBe(true);
  });

  it('exclut en dehors de la plage', () => {
    expect(isWithinRange(toTradingDay('2026-09-09'), range)).toBe(false);
    expect(isWithinRange(toTradingDay('2026-09-16'), range)).toBe(false);
  });
});

describe('resolveRangeSelection', () => {
  it('1er appui : pose le départ, fin encore nulle', () => {
    expect(resolveRangeSelection(null, TODAY)).toEqual({ start: TODAY, end: null });
  });

  it('2e appui après le départ : pose la fin', () => {
    const afterFirst = { start: TODAY, end: null };
    expect(resolveRangeSelection(afterFirst, toTradingDay('2026-09-25'))).toEqual({
      start: TODAY,
      end: toTradingDay('2026-09-25'),
    });
  });

  it('2e appui avant le départ : échange les bornes plutôt qu’une plage inversée', () => {
    const afterFirst = { start: TODAY, end: null };
    expect(resolveRangeSelection(afterFirst, toTradingDay('2026-09-10'))).toEqual({
      start: toTradingDay('2026-09-10'),
      end: TODAY,
    });
  });

  it('3e appui (plage déjà complète) : redémarre une nouvelle sélection', () => {
    const complete = { start: toTradingDay('2026-09-10'), end: toTradingDay('2026-09-15') };
    expect(resolveRangeSelection(complete, toTradingDay('2026-09-20'))).toEqual({
      start: toTradingDay('2026-09-20'),
      end: null,
    });
  });
});

describe('resolveDateRangeGridCellIntent', () => {
  const draft = { start: toTradingDay('2026-09-10'), end: toTradingDay('2026-09-15') };

  it('borne de départ et de fin -> edge', () => {
    expect(resolveDateRangeGridCellIntent(draft.start, draft)).toBe('edge');
    expect(resolveDateRangeGridCellIntent(draft.end, draft)).toBe('edge');
  });

  it('entre les deux bornes -> inRange', () => {
    expect(resolveDateRangeGridCellIntent(toTradingDay('2026-09-12'), draft)).toBe('inRange');
  });

  it('hors sélection -> none', () => {
    expect(resolveDateRangeGridCellIntent(toTradingDay('2026-09-20'), draft)).toBe('none');
  });

  it('fin pas encore posée -> seule la borne de départ est edge', () => {
    const partial = { start: toTradingDay('2026-09-10'), end: null };
    expect(resolveDateRangeGridCellIntent(toTradingDay('2026-09-10'), partial)).toBe('edge');
    expect(resolveDateRangeGridCellIntent(toTradingDay('2026-09-12'), partial)).toBe('none');
  });
});
