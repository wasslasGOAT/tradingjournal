import DecimalJs from 'decimal.js';

/**
 * Constructeur `Decimal` configuré pour Edgebook (ADR-005 ; DATA_MODEL
 * conventions : montants `numeric(20,8)`, quantités `numeric(24,8)`).
 *
 * Deux écarts volontaires par rapport aux réglages par défaut de
 * `decimal.js` :
 *
 * - **`precision: 40`** chiffres significatifs (défaut : 20). Avec 20, une
 *   opération peut arrondir silencieusement un résultat qui tient pourtant
 *   dans les colonnes en base : ex. `new Decimal('99999999999999.99999999')
 *   .plus(même)` donne `200000000000000` avec le défaut (perte de tous les
 *   chiffres après la virgule) contre `199999999999999.99999998` — la
 *   valeur exacte — avec `precision: 40`. 40 chiffres couvre largement les
 *   agrégations (sommes sur des milliers de trades, moyennes, ratios) sans
 *   jamais tronquer un montant ou une quantité qui tiendrait en base.
 * - **`rounding: Decimal.ROUND_HALF_EVEN`** (« arrondi bancaire »), au lieu
 *   du défaut `ROUND_HALF_UP`, pour les opérations intrinsèquement non
 *   exactes de `packages/core` (division : profit factor, win rate,
 *   moyennes du score). `ROUND_HALF_UP` biaise statistiquement vers le haut
 *   quand on arrondit un grand nombre de valeurs (agrégats sur des
 *   centaines/milliers de trades) ; `ROUND_HALF_EVEN` ne biaise pas la
 *   moyenne des arrondis, c'est la convention courante en
 *   comptabilité/finance et le défaut du binaire flottant IEEE 754. Ce mode
 *   ne s'applique qu'aux calculs internes non exacts : l'arrondi
 *   *d'affichage* reste entièrement dans `packages/core/format`
 *   (CLAUDE.md — « arrondi uniquement à l'affichage »).
 *
 * Toute utilisation de `Decimal` dans `packages/core` doit passer par ce
 * module : une règle ESLint (`no-restricted-imports`,
 * `packages/core/eslint.config.js`) interdit d'importer `decimal.js`
 * directement en dehors de `packages/core/src/money`.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_EVEN,
});

/** Type d'une instance du {@link Decimal} configuré ci-dessus. */
export type Decimal = DecimalJs;
