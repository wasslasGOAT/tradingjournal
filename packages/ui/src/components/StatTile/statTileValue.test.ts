import { Decimal } from '@repo/core';
import { describe, expect, it } from 'vitest';

import { formatStatTileValue, resolvePnlIntent, resolveStatTileClassName } from './statTileValue';

describe('resolvePnlIntent', () => {
  it('profit pour une valeur positive', () => {
    expect(resolvePnlIntent(new Decimal('292.5'))).toBe('profit');
  });

  it('loss pour une valeur négative', () => {
    expect(resolvePnlIntent(new Decimal('-19743.43'))).toBe('loss');
  });

  it('flat pour zéro (jamais loss sur -0)', () => {
    expect(resolvePnlIntent(new Decimal('0'))).toBe('flat');
    expect(resolvePnlIntent(new Decimal('-0'))).toBe('flat');
  });
});

describe('resolveStatTileClassName', () => {
  it('suit le signe pour amount/signedAmount/percent', () => {
    expect(resolveStatTileClassName('amount', new Decimal('10'))).toBe('text-pnlProfit');
    expect(resolveStatTileClassName('signedAmount', new Decimal('-10'))).toBe('text-pnlLoss');
    expect(resolveStatTileClassName('percent', new Decimal('0'))).toBe('text-pnlFlat');
  });

  it('reste neutre pour un simple nombre', () => {
    expect(resolveStatTileClassName('number', new Decimal('42'))).toBe('text-textPrimary');
    expect(resolveStatTileClassName('number', new Decimal('-1'))).toBe('text-textPrimary');
  });
});

describe('formatStatTileValue', () => {
  it('formate un montant signé avec devise', () => {
    expect(
      formatStatTileValue({ kind: 'signedAmount', value: new Decimal('292'), locale: 'en', currency: 'USD' }),
    ).toBe('+$292.00');
  });

  it('formate un pourcentage', () => {
    expect(formatStatTileValue({ kind: 'percent', value: new Decimal('0.655'), locale: 'en' })).toBe('65.50%');
  });

  it('masque la valeur quand hideAmounts est actif', () => {
    expect(
      formatStatTileValue({
        kind: 'amount',
        value: new Decimal('1000'),
        locale: 'en',
        currency: 'USD',
        hideAmounts: true,
      }),
    ).toBe('•••••');
  });
});
