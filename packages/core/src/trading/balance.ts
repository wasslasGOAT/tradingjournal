import { Decimal } from '../money';

/** Type de mouvement de trésorerie, DATA_MODEL `cash_movements.type`. */
export type CashMovementType = 'deposit' | 'withdrawal' | 'payout' | 'fee' | 'adjustment';

/**
 * Mouvement de trésorerie, DATA_MODEL `cash_movements`. `amount` est une
 * **magnitude non signée** pour `deposit`/`withdrawal`/`payout`/`fee` (le
 * signe appliqué au solde dépend du `type`, voir {@link signedCashMovementAmount}) ;
 * pour `adjustment`, `amount` est utilisé **tel quel** (signé), une
 * correction pouvant aller dans les deux sens.
 */
export interface CashMovementInput {
  readonly type: CashMovementType;
  readonly amount: Decimal;
  readonly occurredAt: Date;
}

/** Erreur typée levée quand un mouvement de trésorerie porte un montant invalide pour son type. */
export class InvalidCashMovementError extends Error {
  constructor(type: CashMovementType, receivedValue: string) {
    super(
      `Montant invalide pour un mouvement "${type}" : attendu une magnitude >= 0, reçu ${receivedValue}.`,
    );
    this.name = 'InvalidCashMovementError';
  }
}

/**
 * Signe appliqué au solde du compte pour chaque type de mouvement
 * (convention Edgebook ; DATA_MODEL ne fixe pas le signe explicitement —
 * reste à faire acter formellement par l'agent `architect`, ex. un ADR
 * dédié, revue M3) :
 * - `deposit` (+) : le trader alimente le compte, le solde augmente.
 * - `withdrawal` (−) : le trader retire des fonds, le solde diminue.
 * - `payout` (−) : versement des gains vers le trader (hors compte de
 *   trading), le solde diminue — même sens que `withdrawal`.
 * - `fee` (−) : frais prélevés sur le compte (abonnement plateforme,
 *   frais de tenue de compte…), le solde diminue.
 * - `adjustment` (signe du montant fourni) : correction manuelle, peut
 *   aller dans les deux sens ; `amount` est déjà signé par l'appelant.
 *
 * @param movement mouvement à signer
 * @returns le montant signé (positif = augmente le solde, négatif = le diminue)
 * @throws {InvalidCashMovementError} si `amount < 0` pour un type autre que `adjustment`
 */
export function signedCashMovementAmount(movement: CashMovementInput): Decimal {
  if (movement.type !== 'adjustment' && movement.amount.lessThan(0)) {
    throw new InvalidCashMovementError(movement.type, movement.amount.toString());
  }
  switch (movement.type) {
    case 'deposit':
      return movement.amount;
    case 'withdrawal':
    case 'payout':
    case 'fee':
      return movement.amount.negated();
    case 'adjustment':
      return movement.amount;
  }
}

/**
 * Solde d'un compte (unité : devise du compte).
 *
 * Formule (ARCHITECTURE §5.1) : `solde = solde initial + Σ P&L net + Σ mouvements de trésorerie signés`.
 *
 * @param startingBalance solde initial du compte (`accounts.starting_balance`)
 * @param netPnls P&L net de chaque trade clos ou partiellement clos (voir {@link computeNetPnl})
 * @param cashMovements mouvements de trésorerie du compte (voir {@link signedCashMovementAmount})
 * @throws {InvalidCashMovementError} si un mouvement porte un montant invalide pour son type
 */
export function computeBalance(
  startingBalance: Decimal,
  netPnls: readonly Decimal[],
  cashMovements: readonly CashMovementInput[],
): Decimal {
  const totalNetPnl = netPnls.reduce((acc, pnl) => acc.plus(pnl), new Decimal(0));
  const totalCash = cashMovements.reduce(
    (acc, movement) => acc.plus(signedCashMovementAmount(movement)),
    new Decimal(0),
  );
  return startingBalance.plus(totalNetPnl).plus(totalCash);
}

/**
 * Rendement d'un compte, en fraction (pas en pourcentage — multiplier par
 * 100 à l'affichage, `packages/core/format`).
 *
 * **Formule (validée le 2026-09-19, revue M3 #7)** : `Σ netPnl des trades
 * clôturés / startingBalance` — **pas** `(balance − startingBalance) /
 * startingBalance` : cette dernière formule comptait un dépôt comme du gain
 * de performance (et un retrait comme une perte), alors qu'un rendement doit
 * mesurer la performance du *trading*, pas les mouvements de trésorerie
 * (même distinction que `packages/core/aggregates/equity` `tradingEquity` vs
 * `balance`, revue M3 #8). C'est cette formule qui donne le `-9.87 %` du
 * golden ROADMAP (aucun mouvement de trésorerie dans le fixture, donc les
 * deux formules coïncidaient jusqu'ici — un dépôt les ferait diverger).
 *
 * @param startingBalance solde initial du compte, doit être strictement positif
 * @param netPnls P&L net de chaque trade clos à inclure (voir {@link computeBalance})
 * @throws {Error} si `startingBalance <= 0` (rendement non défini)
 */
export function computeReturnRate(startingBalance: Decimal, netPnls: readonly Decimal[]): Decimal {
  if (!startingBalance.greaterThan(0)) {
    throw new Error(
      `Rendement non défini : le solde initial doit être strictement positif (reçu ${startingBalance.toString()}).`,
    );
  }
  const totalNetPnl = netPnls.reduce((acc, pnl) => acc.plus(pnl), new Decimal(0));
  return totalNetPnl.dividedBy(startingBalance);
}
