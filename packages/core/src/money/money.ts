import { CURRENCY_CODE_PATTERN } from '@repo/schemas';

import { Decimal } from './decimal';

/**
 * Montant dans une devise donnée (ARCHITECTURE §1.2 : « chaque compte a sa
 * devise »). Toujours construit via {@link money} pour valider le code
 * devise — ne pas construire de littéral `{ amount, currency }` ailleurs.
 */
export interface Money {
  /** Montant exact (jamais de `number`, ADR-005). */
  readonly amount: Decimal;
  /** Code devise ISO 4217 (3 lettres majuscules) ou `USDT` (DATA_MODEL, conventions). */
  readonly currency: string;
}

/** Erreur typée levée quand un code devise n'est pas au format ISO 4217 (ou `USDT`). */
export class InvalidCurrencyError extends Error {
  constructor(readonly receivedValue: string) {
    super(
      `Code devise invalide : attendu un code ISO 4217 (3 lettres majuscules) ou "USDT", reçu ${JSON.stringify(receivedValue)}.`,
    );
    this.name = 'InvalidCurrencyError';
  }
}

/** Erreur typée levée quand une opération combine deux {@link Money} de devises différentes. */
export class CurrencyMismatchError extends Error {
  constructor(
    readonly left: string,
    readonly right: string,
  ) {
    super(
      `Impossible de combiner des montants de devises différentes (${left} et ${right}) sans conversion (ADR-019 : pas de conversion pendant le MVP).`,
    );
    this.name = 'CurrencyMismatchError';
  }
}

/**
 * Construit un {@link Money}, en validant le code devise (même motif que
 * `@repo/schemas` `currencyCode`, source unique de vérité).
 * @throws {InvalidCurrencyError} si `currency` n'est pas un code ISO 4217 (ou `USDT`)
 */
export function money(amount: Decimal, currency: string): Money {
  if (!CURRENCY_CODE_PATTERN.test(currency)) {
    throw new InvalidCurrencyError(currency);
  }
  return { amount, currency };
}

/**
 * Additionne deux {@link Money} de même devise.
 * Formule : `a.amount + b.amount`, devise inchangée.
 * @throws {CurrencyMismatchError} si `a` et `b` n'ont pas la même devise
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  return { amount: a.amount.plus(b.amount), currency: a.currency };
}

/** Inverse le signe d'un {@link Money} (formule : `-amount`, devise inchangée). */
export function negateMoney(a: Money): Money {
  return { amount: a.amount.negated(), currency: a.currency };
}

/**
 * Additionne une collection de {@link Money} potentiellement multi-devises
 * en un total **par devise**, sans conversion (ADR-019, option A : « Tous
 * les comptes » affiche un total par devise ; API prête pour une conversion
 * ultérieure ajoutable sans casser les appelants).
 *
 * Formule : regroupe `items` par `currency`, somme les montants de chaque
 * groupe. Devises absentes de `items` : absentes du résultat (pas de zéro
 * implicite). Résultat trié par code devise (ordre alphabétique) pour un
 * rendu déterministe.
 *
 * @param items montants à regrouper, devises quelconques
 * @returns un {@link Money} par devise présente dans `items`, triés par `currency`
 */
export function sumMoneyByCurrency(items: readonly Money[]): Money[] {
  const totals = new Map<string, Decimal>();
  for (const item of items) {
    const running = totals.get(item.currency) ?? new Decimal(0);
    totals.set(item.currency, running.plus(item.amount));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({ amount, currency }));
}
