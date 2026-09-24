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
 * le round-trip via l'API (pas pour l'écriture en base — voir
 * {@link toDbAmount}).
 *
 * Formule : notation fixe équivalente à `Decimal#toFixed()` sans argument
 * (mêmes chiffres significatifs que la valeur, jamais de notation `e+/-`) —
 * **aucun arrondi** : un `Decimal` calculé à 40 chiffres significatifs
 * (ADR-005, `packages/core/money/decimal`) peut sérialiser plus de décimales
 * que n'importe quelle colonne `numeric` ne peut en stocker, auquel cas
 * Postgres arrondirait lui-même (potentiellement `ROUND_HALF_UP`, pas
 * `ROUND_HALF_EVEN`) — d'où {@link toDbAmount}, à utiliser systématiquement
 * avant une écriture en base.
 *
 * @param amount montant à sérialiser
 * @returns chaîne décimale, ex. `"-17527.71"`
 */
export function toAmountString(amount: Decimal): string {
  return amount.toFixed();
}

/**
 * Sérialise un `Decimal` pour l'écriture en base (colonne `numeric`),
 * arrondi explicitement à `scale` décimales (`ROUND_HALF_EVEN`, même
 * convention que `packages/core/money/decimal` — « arrondi bancaire », pas
 * de biais statistique sur de grandes agrégations).
 *
 * **Toujours** passer par cette fonction avant d'écrire un `Decimal` en
 * base — jamais {@link toAmountString}/`Decimal#toFixed()` brut, qui peut
 * porter plus de décimales que la colonne cible et laisser Postgres arrondir
 * différemment (ADR-005 ; revue M3 #10).
 *
 * @param amount montant à sérialiser
 * @param scale décimales de la colonne cible, défaut `8` (`numeric(20,8)`
 *   montants/prix ; passer aussi `8` pour `numeric(24,8)` quantités, même
 *   échelle de décimales — seule la précision totale diffère, DATA_MODEL
 *   conventions)
 * @returns chaîne décimale à exactement `scale` décimales, ex. `toDbAmount(x, 2)` -> `"-17527.71"`
 */
export function toDbAmount(amount: Decimal, scale = 8): string {
  return amount.toDecimalPlaces(scale, Decimal.ROUND_HALF_EVEN).toFixed(scale);
}

/**
 * Somme une liste de montants sérialisés (ex. `pnl` par jour d'une semaine
 * de calendrier, ARCHITECTURE §5.5), en `Decimal`.
 *
 * Formule : `Σ parseAmount(value)` pour chaque `value` non nul/`undefined` —
 * une valeur absente (`null`/`undefined`, ex. jour sans trade ni mouvement)
 * est ignorée, pas traitée comme zéro implicite ni comme une erreur.
 *
 * Volontairement générique (chaînes en entrée, pas un type de domaine
 * `DayAggregate`) : c'est le point d'agrégation le plus réutilisable pour
 * de la logique d'UI qui doit sommer des montants déjà résolus par jour —
 * total hebdomadaire du calendrier (`CalendarScreen`, revue M1 bloquant #1),
 * futurs totaux mensuels/multi-comptes (M5) — sans dupliquer de `reduce`
 * dans un composant. Un appelant qui possède déjà des `DayAggregate`/objets
 * typés passe simplement `days.map((d) => d.netPnl)`.
 *
 * @param values montants sérialisés, `null`/`undefined` autorisés (ignorés)
 * @throws {AmountParseError} si une valeur présente n'est pas une chaîne
 *   numérique décimale valide (voir {@link parseAmount})
 * @returns somme en `Decimal`, `0` si `values` est vide ou ne contient que
 *   des valeurs absentes
 */
export function sumAmountStrings(values: readonly (string | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((total, value) => {
    if (value == null) return total;
    return total.plus(parseAmount(value));
  }, new Decimal(0));
}
