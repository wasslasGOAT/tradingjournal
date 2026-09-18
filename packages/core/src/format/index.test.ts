import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import { toTradingDay } from '../time';
import {
  formatAmount,
  formatDayNumber,
  formatMonthLabel,
  formatNumber,
  formatPercent,
  formatRMultiple,
  formatSignedAmount,
  formatWeekdayShort,
  HIDDEN_VALUE_PLACEHOLDER,
  resolveCurrencyDecimals,
} from './index';

function d(value: string): Decimal {
  return new Decimal(value);
}

describe('formatAmount', () => {
  it('formate un montant positif en anglais ($, virgule de milliers, point décimal)', () => {
    expect(formatAmount(d('180256.57'), 'USD', { locale: 'en' })).toBe('$180,256.57');
  });

  it('formate un montant négatif en anglais', () => {
    expect(formatAmount(d('-19743.43'), 'USD', { locale: 'en' })).toBe('-$19,743.43');
  });

  it('formate un montant en français (espace fine insécable U+202F entre milliers, virgule décimale, espace insécable U+00A0 avant €)', () => {
    const result = formatAmount(d('180256.57'), 'EUR', { locale: 'fr' });
    expect(result).toBe('180 256,57 €');
  });

  it('regroupe correctement au-delà du million (plusieurs tranches de milliers)', () => {
    expect(formatAmount(d('1234567.89'), 'USD', { locale: 'en' })).toBe('$1,234,567.89');
    expect(formatAmount(d('1234567.89'), 'EUR', { locale: 'fr' })).toBe('1 234 567,89 €');
  });

  it('applique 0 décimale pour JPY', () => {
    expect(formatAmount(d('180257'), 'JPY', { locale: 'en' })).toBe('¥180,257');
  });

  it('replie sur le code ISO pour une devise sans symbole connu (ex. USDT)', () => {
    expect(formatAmount(d('100'), 'USDT', { locale: 'en' })).toBe('USDT 100.00');
    expect(formatAmount(d('100'), 'USDT', { locale: 'fr' })).toBe('100,00 USDT');
  });

  it('arrondit ROUND_HALF_EVEN à 2 décimales par défaut', () => {
    expect(formatAmount(d('2.005'), 'USD', { locale: 'en' })).toBe('$2.00');
    expect(formatAmount(d('2.015'), 'USD', { locale: 'en' })).toBe('$2.02');
  });

  it("n'affiche jamais de signe négatif pour un montant qui arrondit à zéro", () => {
    expect(formatAmount(d('-0.001'), 'USD', { locale: 'en' })).toBe('$0.00');
  });

  it('masque le montant quand hideAmounts est actif', () => {
    expect(formatAmount(d('180256.57'), 'USD', { locale: 'en', hideAmounts: true })).toBe(
      HIDDEN_VALUE_PLACEHOLDER,
    );
  });

  it('accepte un nombre de décimales personnalisé', () => {
    expect(formatAmount(d('1.23456'), 'USD', { locale: 'en', decimals: 4 })).toBe('$1.2346');
  });
});

describe('formatSignedAmount', () => {
  it('préfixe "+" pour un montant positif', () => {
    expect(formatSignedAmount(d('292'), 'USD', { locale: 'en' })).toBe('+$292.00');
  });

  it('préfixe "+" pour zéro (convention documentée)', () => {
    expect(formatSignedAmount(d('0'), 'USD', { locale: 'en' })).toBe('+$0.00');
  });

  it('préfixe "−" pour un montant négatif', () => {
    expect(formatSignedAmount(d('-19743.43'), 'USD', { locale: 'en' })).toBe('−$19,743.43');
  });
});

describe('formatPercent', () => {
  it('cas golden : -0,09871715 -> "-9.87%" (en)', () => {
    expect(formatPercent(d('-0.09871715'), { locale: 'en' })).toBe('-9.87%');
  });

  it('cas golden en français : "-9,87 %" (espace insécable avant %)', () => {
    expect(formatPercent(d('-0.09871715'), { locale: 'fr' })).toBe('-9,87 %');
  });

  it('accepte un nombre de décimales personnalisé', () => {
    expect(formatPercent(d('0.1'), { locale: 'en', decimals: 0 })).toBe('10%');
  });

  it('masque le pourcentage quand hideAmounts est actif', () => {
    expect(formatPercent(d('0.5'), { locale: 'en', hideAmounts: true })).toBe(HIDDEN_VALUE_PLACEHOLDER);
  });
});

describe('formatNumber', () => {
  it('formate un entier groupé sans décimale par défaut', () => {
    expect(formatNumber(d('12345'), { locale: 'en' })).toBe('12,345');
    expect(formatNumber(d('12345'), { locale: 'fr' })).toBe('12 345');
  });

  it('formate un nombre négatif', () => {
    expect(formatNumber(d('-42'), { locale: 'en' })).toBe('-42');
  });

  it('accepte des décimales', () => {
    expect(formatNumber(d('2.92'), { locale: 'en', decimals: 2 })).toBe('2.92');
  });
});

describe('formatRMultiple', () => {
  it('cas golden : ratio moyen 2,92 -> "+2.92R"', () => {
    expect(formatRMultiple(d('2.92'), { locale: 'en' })).toBe('+2.92R');
  });

  it('R multiple négatif (2 décimales par défaut)', () => {
    expect(formatRMultiple(d('-1.5'), { locale: 'en' })).toBe('−1.50R');
  });

  it('retourne un tiret cadratin quand la valeur est null (risque initial inconnu)', () => {
    expect(formatRMultiple(null, { locale: 'en' })).toBe('—');
  });

  it('masque même le "—" quand hideAmounts est actif', () => {
    expect(formatRMultiple(null, { locale: 'en', hideAmounts: true })).toBe(HIDDEN_VALUE_PLACEHOLDER);
    expect(formatRMultiple(d('2.92'), { locale: 'en', hideAmounts: true })).toBe(HIDDEN_VALUE_PLACEHOLDER);
  });
});

describe('dates de trading (formatage localisé)', () => {
  const day = toTradingDay('2026-03-31');

  it('formatDayNumber : quantième du mois', () => {
    expect(formatDayNumber(day, { locale: 'en' })).toBe('31');
    expect(formatDayNumber(day, { locale: 'fr' })).toBe('31');
  });

  it('formatMonthLabel : mois + année localisés', () => {
    expect(formatMonthLabel(day, { locale: 'fr' })).toBe('mars 2026');
    expect(formatMonthLabel(day, { locale: 'en' })).toBe('March 2026');
  });

  it('formatWeekdayShort : jour de semaine abrégé localisé (31 mars 2026 est un mardi)', () => {
    expect(formatWeekdayShort(day, { locale: 'fr' })).toBe('mar.');
    expect(formatWeekdayShort(day, { locale: 'en' })).toBe('Tue');
  });

  it("reste stable au changement de mois (pas d'écart de fuseau, calendrier civil pur)", () => {
    const firstOfApril = toTradingDay('2026-04-01');
    expect(formatDayNumber(firstOfApril, { locale: 'en' })).toBe('1');
    expect(formatMonthLabel(firstOfApril, { locale: 'en' })).toBe('April 2026');
  });
});

describe('resolveCurrencyDecimals', () => {
  it('retourne 2 par défaut', () => {
    expect(resolveCurrencyDecimals('USD')).toBe(2);
    expect(resolveCurrencyDecimals('EUR')).toBe(2);
    expect(resolveCurrencyDecimals('USDT')).toBe(2);
  });

  it('retourne 0 pour JPY', () => {
    expect(resolveCurrencyDecimals('JPY')).toBe(0);
  });
});
