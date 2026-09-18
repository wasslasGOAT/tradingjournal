import { AMOUNT_STRING_PATTERN } from '@repo/schemas';

import { Decimal } from './decimal';

/** Erreur typée levée par {@link parseAmount} sur une entrée invalide. */
export class AmountParseError extends Error {
  /** Valeur reçue (avant conversion), utile pour les journaux d'erreur. */
  readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    super(
      `Montant invalide : attendu une chaîne numérique décimale (ex. "-17527.71000000"), reçu ${AmountParseError.describe(receivedValue)}.`,
    );
    this.name = 'AmountParseError';
    this.receivedValue = receivedValue;
  }

  private static describe(value: unknown): string {
    if (typeof value === 'number') return `un number JS (${String(value)})`;
    if (typeof value === 'string') return `la chaîne ${JSON.stringify(value)}`;
    return `${typeof value}`;
  }
}

/**
 * Convertit un montant sérialisé en chaîne (colonne `numeric` Postgres lue en
 * `::text`, ADR-005/ARCHITECTURE §7) en `Decimal`.
 *
 * Formule : identité (pas d'arrondi, pas de conversion d'unité) — l'arrondi
 * n'a lieu qu'à l'affichage (`packages/core/format`).
 *
 * Rejette explicitement :
 * - un `number` JS (imprécision flottante, ADR-005) ;
 * - une chaîne vide, avec espaces, notation scientifique ou non numérique.
 *
 * @param value chaîne numérique décimale, ex. `"-17527.71000000"`, `"200000"`
 * @throws {AmountParseError} si `value` n'est pas une chaîne numérique valide
 */
export function parseAmount(value: string): Decimal {
  if (typeof value !== 'string') {
    throw new AmountParseError(value);
  }
  if (!AMOUNT_STRING_PATTERN.test(value)) {
    throw new AmountParseError(value);
  }
  return new Decimal(value);
}

/**
 * Sérialise un `Decimal` en chaîne décimale non exponentielle, prête pour
 * l'écriture d'une colonne `numeric` Postgres ou le round-trip via l'API.
 *
 * Formule : notation fixe équivalente à `Decimal#toFixed()` sans argument
 * (mêmes chiffres significatifs que la valeur, jamais de notation `e+/-`).
 *
 * @param amount montant à sérialiser
 * @returns chaîne décimale, ex. `"-17527.71"`
 */
export function toAmountString(amount: Decimal): string {
  return amount.toFixed();
}
