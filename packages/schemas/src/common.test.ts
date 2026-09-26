import { describe, expect, it } from 'vitest';

import {
  AMOUNT_STRING_PATTERN,
  amountString,
  compareAmountStrings,
  CURRENCY_CODE_PATTERN,
  currencyCode,
  fitsAmountScale,
  fitsQuantityScale,
  isNonNegativeAmountString,
  isPositiveAmountString,
  quantityString,
  tradingDay,
  uuid,
  VALIDATION_KEYS,
} from './common';

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

describe('CURRENCY_CODE_PATTERN', () => {
  it('est la source réutilisée par currencyCode (@repo/core Money)', () => {
    expect(CURRENCY_CODE_PATTERN.test('USD')).toBe(true);
    expect(CURRENCY_CODE_PATTERN.test('USDT')).toBe(true);
    expect(CURRENCY_CODE_PATTERN.test('usd')).toBe(false);
    expect(currencyCode.safeParse('EUR').success).toBe(true);
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

describe('isPositiveAmountString', () => {
  it('vrai pour un montant strictement positif', () => {
    expect(isPositiveAmountString('1')).toBe(true);
    expect(isPositiveAmountString('0.01')).toBe(true);
  });

  it('faux pour 0 (sous toutes ses formes) et pour un montant négatif', () => {
    expect(isPositiveAmountString('0')).toBe(false);
    expect(isPositiveAmountString('0.00')).toBe(false);
    expect(isPositiveAmountString('-0')).toBe(false);
    expect(isPositiveAmountString('-1')).toBe(false);
  });
});

describe('isNonNegativeAmountString', () => {
  it('vrai pour un montant positif ou nul', () => {
    expect(isNonNegativeAmountString('1')).toBe(true);
    expect(isNonNegativeAmountString('0')).toBe(true);
    expect(isNonNegativeAmountString('-0.00')).toBe(true);
  });

  it('faux pour un montant strictement négatif', () => {
    expect(isNonNegativeAmountString('-1')).toBe(false);
    expect(isNonNegativeAmountString('-0.01')).toBe(false);
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

describe('VALIDATION_KEYS (revue M3 #2 — clés i18n, jamais de texte en dur)', () => {
  it('amountString/quantityString/currencyCode/tradingDay renvoient une clé i18n, jamais une phrase française', () => {
    const messages = [
      amountString.safeParse('1e21').error?.issues[0]?.message,
      quantityString.safeParse('1e21').error?.issues[0]?.message,
      currencyCode.safeParse('usd').error?.issues[0]?.message,
      tradingDay.safeParse('31/03/2026').error?.issues[0]?.message,
    ];
    for (const message of messages) {
      expect(message).toMatch(/^validation\./);
      expect(Object.values(VALIDATION_KEYS)).toContain(message);
    }
  });

  it('exporte une liste de clés toutes uniques', () => {
    const values = Object.values(VALIDATION_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('fitsAmountScale / fitsQuantityScale (numeric(20,8) / numeric(24,8), revue M3 #12)', () => {
  it('accepte un montant tenant dans numeric(20,8) (12 chiffres avant la virgule, 8 après)', () => {
    expect(fitsAmountScale('999999999999.99999999')).toBe(true);
    expect(fitsAmountScale('-999999999999.99999999')).toBe(true);
  });

  it('rejette un montant dépassant numeric(20,8) (13 chiffres avant la virgule, ou 9 décimales)', () => {
    expect(fitsAmountScale('1000000000000')).toBe(false);
    expect(fitsAmountScale('1.123456789')).toBe(false);
  });

  it('quantityString tolère 16 chiffres avant la virgule (numeric(24,8)), amountString non', () => {
    const bigQuantity = '9999999999999999.12345678'; // 16 chiffres avant la virgule
    expect(fitsQuantityScale(bigQuantity)).toBe(true);
    expect(fitsAmountScale(bigQuantity)).toBe(false);
    expect(quantityString.safeParse(bigQuantity).success).toBe(true);
    expect(amountString.safeParse(bigQuantity).success).toBe(false);
  });

  it('ignore les zéros de tête pour compter les chiffres significatifs', () => {
    expect(fitsAmountScale('000000000001.5')).toBe(true);
  });
});

describe('compareAmountStrings', () => {
  it('compare deux montants sans passer par number (échelles différentes)', () => {
    expect(compareAmountStrings('1.5', '1.50')).toBe(0);
    expect(compareAmountStrings('1.5', '1.51')).toBe(-1);
    expect(compareAmountStrings('1.51', '1.5')).toBe(1);
    expect(compareAmountStrings('-1', '0')).toBe(-1);
    expect(compareAmountStrings('0', '-0.00')).toBe(0);
  });
});
