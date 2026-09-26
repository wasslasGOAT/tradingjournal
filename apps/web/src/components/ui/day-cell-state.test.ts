import { Decimal } from '@repo/core';
import { describe, expect, it } from 'vitest';

import { resolveDayCellContentState, resolveDayCellPnlIntent } from './day-cell-state';

describe('resolveDayCellContentState', () => {
  it('trades quand un P&L existe (positif, négatif ou nul)', () => {
    expect(resolveDayCellContentState(new Decimal('10'), false)).toBe('trades');
    expect(resolveDayCellContentState(new Decimal('-10'), false)).toBe('trades');
    expect(resolveDayCellContentState(new Decimal('0'), true)).toBe('trades');
  });

  it('journalOnly quand aucun trade mais une entrée de journal', () => {
    expect(resolveDayCellContentState(null, true)).toBe('journalOnly');
  });

  it('empty quand ni trade ni journal', () => {
    expect(resolveDayCellContentState(null, false)).toBe('empty');
  });
});

describe('resolveDayCellPnlIntent', () => {
  it('profit/loss/flat selon le signe', () => {
    expect(resolveDayCellPnlIntent(new Decimal('10'))).toBe('profit');
    expect(resolveDayCellPnlIntent(new Decimal('-10'))).toBe('loss');
    expect(resolveDayCellPnlIntent(new Decimal('0'))).toBe('flat');
  });

  it('null quand aucun trade', () => {
    expect(resolveDayCellPnlIntent(null)).toBeNull();
  });
});
