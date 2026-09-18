import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import { computeNetPnl, computeRMultiple, InvalidInitialRiskError } from './pnl';

function d(value: string): Decimal {
  return new Decimal(value);
}

describe('computeNetPnl', () => {
  it('soustrait commissions et frais du brut (swap par défaut à 0)', () => {
    const net = computeNetPnl(d('100'), d('2'), d('1'));
    expect(net.toString()).toBe('97');
  });

  it('soustrait aussi le swap quand fourni', () => {
    const net = computeNetPnl(d('100'), d('2'), d('1'), d('3'));
    expect(net.toString()).toBe('94');
  });

  it('un swap crédité (négatif) augmente le net', () => {
    const net = computeNetPnl(d('100'), d('0'), d('0'), d('-5'));
    expect(net.toString()).toBe('105');
  });

  it('cas golden : brut négatif, sans commission ni frais', () => {
    const net = computeNetPnl(d('-19743.43'), d('0'), d('0'));
    expect(net.toString()).toBe('-19743.43');
  });
});

describe('computeRMultiple', () => {
  it('retourne null quand le risque initial est inconnu', () => {
    expect(computeRMultiple(d('100'), null)).toBeNull();
    expect(computeRMultiple(d('100'), undefined)).toBeNull();
  });

  it('calcule netPnl / risque initial', () => {
    const r = computeRMultiple(d('292'), d('100'));
    expect(r?.toString()).toBe('2.92');
  });

  it('gère un R multiple négatif (perte)', () => {
    const r = computeRMultiple(d('-150'), d('100'));
    expect(r?.toString()).toBe('-1.5');
  });

  it('rejette un risque initial nul ou négatif', () => {
    expect(() => computeRMultiple(d('100'), d('0'))).toThrow(InvalidInitialRiskError);
    expect(() => computeRMultiple(d('100'), d('-50'))).toThrow(InvalidInitialRiskError);
  });
});
