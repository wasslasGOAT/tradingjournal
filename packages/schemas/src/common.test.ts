import { describe, expect, it } from 'vitest';

import { AMOUNT_STRING_PATTERN, amountString, currencyCode, tradingDay, uuid } from './common';

describe('AMOUNT_STRING_PATTERN', () => {
  it('est la source réutilisée par amountString (@repo/core parseAmount)', () => {
    expect(AMOUNT_STRING_PATTERN.test('-17527.71000000')).toBe(true);
    expect(AMOUNT_STRING_PATTERN.test('1e21')).toBe(false);
    expect(amountString.safeParse('-17527.71000000').success).toBe(true);
  });
});

describe('amountString', () => {
  it('accepte une chaîne décimale Postgres', () => {
    expect(amountString.safeParse('-17527.71000000').success).toBe(true);
    expect(amountString.safeParse('200000').success).toBe(true);
    expect(amountString.safeParse('0').success).toBe(true);
  });

  it('rejette un number JS', () => {
    expect(amountString.safeParse(200000).success).toBe(false);
  });

  it('rejette une notation scientifique ou un séparateur de milliers', () => {
    expect(amountString.safeParse('1e21').success).toBe(false);
    expect(amountString.safeParse('17,527.71').success).toBe(false);
  });

  it('rejette la chaîne vide et les espaces', () => {
    expect(amountString.safeParse('').success).toBe(false);
    expect(amountString.safeParse(' 100 ').success).toBe(false);
  });
});

describe('currencyCode', () => {
  it('accepte un code ISO 4217 à 3 lettres majuscules', () => {
    expect(currencyCode.safeParse('USD').success).toBe(true);
    expect(currencyCode.safeParse('EUR').success).toBe(true);
  });

  it('tolère USDT', () => {
    expect(currencyCode.safeParse('USDT').success).toBe(true);
  });

  it('rejette la casse minuscule et les longueurs invalides', () => {
    expect(currencyCode.safeParse('usd').success).toBe(false);
    expect(currencyCode.safeParse('US').success).toBe(false);
    expect(currencyCode.safeParse('USDC').success).toBe(false);
  });
});

describe('uuid', () => {
  it('accepte un UUID v4 valide', () => {
    expect(uuid.safeParse('123e4567-e89b-42d3-a456-426614174000').success).toBe(true);
  });

  it('rejette une chaîne non UUID', () => {
    expect(uuid.safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('tradingDay', () => {
  it('accepte YYYY-MM-DD', () => {
    expect(tradingDay.safeParse('2026-03-31').success).toBe(true);
  });

  it('rejette un autre format', () => {
    expect(tradingDay.safeParse('31/03/2026').success).toBe(false);
    expect(tradingDay.safeParse('2026-03-31T00:00:00Z').success).toBe(false);
  });
});
