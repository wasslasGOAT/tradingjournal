/**
 * Formatage localisé (montants, pourcentages, nombres, dates, R multiples)
 * pour l'affichage — FR/EN, consommé par l'UI (ROADMAP M1/M3).
 *
 * Rappel d'invariant (CLAUDE.md) : l'arrondi n'a lieu **qu'ici**, jamais
 * lors des calculs de `packages/core/money`, `.../time` ou `.../trading`,
 * qui manipulent des `Decimal` exacts jusqu'au dernier moment.
 *
 * ## Méthode sans perte de précision (pourquoi pas `Intl.NumberFormat` sur le montant)
 * `Intl.NumberFormat(...).format(n)` exige un `number` JS, donc perd en
 * pratique toute précision au-delà de `2^53` / des ~15-17 chiffres
 * significatifs représentables en flottant IEEE 754 — inacceptable pour un
 * `numeric(20,8)` (ADR-005). Ce module ne convertit donc **jamais** un
 * `Decimal` en `number` pour le formater : l'arrondi d'affichage se fait
 * via `Decimal#toDecimalPlaces`/`toFixed` (précision arbitraire, exacts),
 * puis les parties entière/décimale — déjà des chaînes de chiffres — sont
 * regroupées par tranches de 3 et jointes aux séparateurs de la locale
 * **calculés par ce module** (table `LOCALE_NUMBER_FORMAT` ci-dessous),
 * sans jamais rappeler `Intl` sur la valeur elle-même.
 *
 * Cela a une seconde conséquence, volontaire : les séparateurs (groupement,
 * décimale, espace avant devise) ne dépendent **pas** du moteur JS ni de sa
 * base ICU. Or Hermes (moteur RN sur téléphone) et Node (tests, CI) peuvent
 * répondre différemment à `Intl.NumberFormat('fr-FR').formatToParts(...)`
 * selon la variante d'ICU embarquée — un test qui appellerait `Intl` pour
 * vérifier la sortie serait donc fragile d'une plateforme à l'autre. Les
 * tests de ce module n'appellent jamais `Intl` pour la partie numérique :
 * ils vérifient les caractères produits par notre propre table de locale,
 * strictement identiques sur toute plateforme exécutant ce module.
 *
 * Les libellés de date (`formatMonthLabel`, `formatWeekdayShort`) utilisent
 * en revanche `date-fns` (`date-fns/locale`), dont les données de locale
 * sont embarquées dans le paquet lui-même (pas l'ICU du moteur JS) : mêmes
 * chaînes sur Hermes et Node pour une version de `date-fns` donnée.
 */
import type { Locale } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, fr } from 'date-fns/locale';

import { Decimal } from '../money';
import type { TradingDay } from '../time';

/** Locales prises en charge (ARCHITECTURE : « i18n dès le départ (FR + EN) »). */
export type SupportedLocale = 'fr' | 'en';

/** Motif de remplacement neutre quand `hideAmounts` est actif (préférence `hide_amounts`, DATA_MODEL). */
export const HIDDEN_VALUE_PLACEHOLDER = '•••••';

/**
 * Signe moins typographique U+2212 (revue M3 #17), utilisé pour **tout**
 * montant ou pourcentage négatif affiché (`formatAmount`, `formatSignedAmount`,
 * `formatPercent`, `formatRMultiple`) — jamais le trait d'union ASCII U+002D
 * (`-`), qui n'est pas un signe mathématique et rend un tableau de chiffres
 * moins lisible (largeur/alignement différents des chiffres dans la plupart
 * des polices). `formatNumber` (nombre simple, ex. un nombre de trades) n'est
 * volontairement pas concerné : ce n'est ni un montant ni un pourcentage.
 */
const MINUS_SIGN = '−';

/** Options communes à tous les formateurs de valeur (montant, pourcentage, nombre, R multiple). */
export interface FormatValueOptions {
  readonly locale: SupportedLocale;
  /** Si `true`, la valeur est masquée et remplacée par {@link HIDDEN_VALUE_PLACEHOLDER}. */
  readonly hideAmounts?: boolean;
}

interface LocaleNumberFormat {
  readonly decimalSeparator: string;
  /** Séparateur de milliers. FR : espace fine insécable U+202F (typographie française courante). */
  readonly groupSeparator: string;
}

const LOCALE_NUMBER_FORMAT: Record<SupportedLocale, LocaleNumberFormat> = {
  en: { decimalSeparator: '.', groupSeparator: ',' },
  fr: { decimalSeparator: ',', groupSeparator: ' ' },
};

interface LocaleCurrencyFormat {
  readonly position: 'prefix' | 'suffix';
  /** Espace entre le symbole (`$`, `€`…) et le nombre. */
  readonly symbolSpacer: string;
  /** Espace entre le code ISO (repli, ex. `USDT`) et le nombre. */
  readonly codeSpacer: string;
}

const LOCALE_CURRENCY_FORMAT: Record<SupportedLocale, LocaleCurrencyFormat> = {
  // Convention US usuelle : "$1,234.56" (symbole collé), "USDT 1,234.56" (code espacé).
  en: { position: 'prefix', symbolSpacer: '', codeSpacer: ' ' },
  // Convention typographique française : "1 234,56 €" (espace insécable avant le symbole/code).
  fr: { position: 'suffix', symbolSpacer: ' ', codeSpacer: ' ' },
};

const DATE_FNS_LOCALE: Record<SupportedLocale, Locale> = { en: enUS, fr };

/** Symboles usuels ; devise absente de cette table -> repli sur le code ISO (ex. `USDT`). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

/** Décimales d'affichage par devise (repli 2). JPY : 0 (pas de sous-unité usuelle). */
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
};

/** Décimales d'affichage par défaut pour `currency` (2, sauf exception listée dans `CURRENCY_DECIMALS`). */
export function resolveCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

/** Regroupe une chaîne de chiffres par tranches de 3 en partant de la droite. */
function groupDigits(digits: string, groupSeparator: string): string {
  const groups: string[] = [];
  let end = digits.length;
  while (end > 3) {
    groups.unshift(digits.slice(end - 3, end));
    end -= 3;
  }
  groups.unshift(digits.slice(0, end));
  return groups.join(groupSeparator);
}

interface GroupedNumber {
  /** `true` si la valeur arrondie est strictement négative (jamais `true` pour un zéro arrondi, pas de "-0"). */
  readonly isNegative: boolean;
  /** Partie numérique déjà groupée/séparée selon la locale, sans signe. */
  readonly text: string;
}

/**
 * Arrondit `value` à `decimals` décimales (`ROUND_HALF_EVEN`, arrondi
 * bancaire — même convention que `packages/core/money/decimal`) puis
 * construit sa représentation textuelle localisée, sans jamais passer par
 * un `number` JS.
 */
function toGroupedNumber(value: Decimal, decimals: number, locale: SupportedLocale): GroupedNumber {
  const rounded = value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_EVEN);
  const isNegative = !rounded.isZero() && rounded.isNegative();
  const fixed = rounded.abs().toFixed(decimals);
  const [integerPart = '0', fractionPart = ''] = fixed.split('.');
  const { decimalSeparator, groupSeparator } = LOCALE_NUMBER_FORMAT[locale];
  const groupedInteger = groupDigits(integerPart, groupSeparator);
  const text =
    decimals > 0 ? `${groupedInteger}${decimalSeparator}${fractionPart}` : groupedInteger;
  return { isNegative, text };
}

function maskIfHidden(formatted: string, hideAmounts: boolean | undefined): string {
  return hideAmounts ? HIDDEN_VALUE_PLACEHOLDER : formatted;
}

/**
 * Formate un nombre simple (sans devise), ex. une quantité ou un nombre de trades.
 * @param value valeur à formater
 * @param options.decimals décimales affichées, défaut `0`
 */
export function formatNumber(
  value: Decimal,
  options: FormatValueOptions & { decimals?: number },
): string {
  const { locale, hideAmounts, decimals = 0 } = options;
  const { isNegative, text } = toGroupedNumber(value, decimals, locale);
  return maskIfHidden(`${isNegative ? '-' : ''}${text}`, hideAmounts);
}

/**
 * Formate un montant avec sa devise.
 *
 * Formule d'arrondi : `ROUND_HALF_EVEN` à `options.decimals` décimales
 * (défaut : {@link resolveCurrencyDecimals} — 2, sauf JPY : 0).
 */
export function formatAmount(
  amount: Decimal,
  currency: string,
  options: FormatValueOptions & { decimals?: number },
): string {
  const { locale, hideAmounts, decimals = resolveCurrencyDecimals(currency) } = options;
  const { isNegative, text } = toGroupedNumber(amount, decimals, locale);
  const body = formatAmountBody(text, currency, locale);
  // Signe moins U+2212 (revue M3 #17), pas le trait d'union ASCII U+002D :
  // typographiquement correct pour un montant, et cohérent avec
  // `formatSignedAmount`/`formatPercent`/`formatRMultiple` ci-dessous.
  return maskIfHidden(`${isNegative ? MINUS_SIGN : ''}${body}`, hideAmounts);
}

/**
 * Formate un montant avec sa devise et un signe explicite (`+`/`−`),
 * convention P&L : `+` pour `amount >= 0` (zéro inclus), `−` sinon. Le
 * signe est toujours placé en tout début de chaîne (avant le symbole pour
 * une devise préfixe, ex. `+$292.00` / `−$19,743.43`).
 */
export function formatSignedAmount(
  amount: Decimal,
  currency: string,
  options: FormatValueOptions & { decimals?: number },
): string {
  const { locale, hideAmounts, decimals = resolveCurrencyDecimals(currency) } = options;
  const { isNegative, text } = toGroupedNumber(amount, decimals, locale);
  const body = formatAmountBody(text, currency, locale);
  return maskIfHidden(`${isNegative ? MINUS_SIGN : '+'}${body}`, hideAmounts);
}

/** Assemble le symbole/code devise et la partie numérique déjà groupée (sans signe, ajouté par l'appelant). */
function formatAmountBody(numberText: string, currency: string, locale: SupportedLocale): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const currencyFormat = LOCALE_CURRENCY_FORMAT[locale];
  const label = symbol ?? currency;
  const spacer = symbol ? currencyFormat.symbolSpacer : currencyFormat.codeSpacer;
  return currencyFormat.position === 'prefix'
    ? `${label}${spacer}${numberText}`
    : `${numberText}${spacer}${label}`;
}

/**
 * Formate un ratio en pourcentage.
 *
 * Formule : `value` est une **fraction** (ex. `-0.0987...` pour `-9.87 %`,
 * voir `computeReturnRate`) — ce formateur multiplie par 100 puis arrondit
 * (`ROUND_HALF_EVEN`) à `options.decimals` (défaut 2).
 */
export function formatPercent(
  value: Decimal,
  options: FormatValueOptions & { decimals?: number },
): string {
  const { locale, hideAmounts, decimals = 2 } = options;
  const percentValue = value.times(100);
  const { isNegative, text } = toGroupedNumber(percentValue, decimals, locale);
  const spacer = locale === 'fr' ? ' ' : '';
  const formatted = `${isNegative ? MINUS_SIGN : ''}${text}${spacer}%`;
  return maskIfHidden(formatted, hideAmounts);
}

/**
 * Formate un R multiple (P&L net / risque initial), ex. `+2.92R` / `−1.5R`.
 * @param value R multiple, ou `null` si le risque initial est inconnu (voir `computeRMultiple`)
 * @returns le R multiple formaté, ou `'—'` si `value` est `null` (masqué comme les autres si `hideAmounts`)
 */
export function formatRMultiple(
  value: Decimal | null,
  options: FormatValueOptions & { decimals?: number },
): string {
  const { locale, hideAmounts, decimals = 2 } = options;
  if (value === null) {
    return maskIfHidden('—', hideAmounts);
  }
  const { isNegative, text } = toGroupedNumber(value, decimals, locale);
  const formatted = `${isNegative ? MINUS_SIGN : '+'}${text}R`;
  return maskIfHidden(formatted, hideAmounts);
}

/** Construit un instant UTC représentant minuit du {@link TradingDay} (calendrier civil pur, sans fuseau). */
function tradingDayToUtcMidnight(day: TradingDay): Date {
  const [year = 0, month = 1, dayOfMonth = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, dayOfMonth));
}

/**
 * Formate le quantième du mois d'un {@link TradingDay} (ex. cellule de calendrier), ex. `"31"`.
 * Formaté en UTC (le `TradingDay` est déjà un calendrier civil résolu, sans fuseau à réappliquer).
 */
export function formatDayNumber(day: TradingDay, options: { locale: SupportedLocale }): string {
  return formatInTimeZone(tradingDayToUtcMidnight(day), 'UTC', 'd', {
    locale: DATE_FNS_LOCALE[options.locale],
  });
}

/** Formate le mois et l'année d'un {@link TradingDay}, ex. `"mars 2026"` / `"March 2026"`. */
export function formatMonthLabel(day: TradingDay, options: { locale: SupportedLocale }): string {
  return formatInTimeZone(tradingDayToUtcMidnight(day), 'UTC', 'LLLL yyyy', {
    locale: DATE_FNS_LOCALE[options.locale],
  });
}

/** Formate le jour de semaine abrégé d'un {@link TradingDay}, ex. `"lun."` / `"Mon"`. */
export function formatWeekdayShort(day: TradingDay, options: { locale: SupportedLocale }): string {
  return formatInTimeZone(tradingDayToUtcMidnight(day), 'UTC', 'EEE', {
    locale: DATE_FNS_LOCALE[options.locale],
  });
}
