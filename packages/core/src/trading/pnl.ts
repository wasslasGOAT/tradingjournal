import { Decimal } from '../money';

/** Erreur typée levée quand un risque initial fourni n'est pas strictement positif. */
export class InvalidInitialRiskError extends Error {
  constructor(readonly receivedValue: string) {
    super(
      `Risque initial invalide : attendu une valeur strictement positive, reçu ${receivedValue}.`,
    );
    this.name = 'InvalidInitialRiskError';
  }
}

/**
 * P&L net d'un trade (unité : devise du compte).
 *
 * Formule (ARCHITECTURE §5.2) : `net = brut − commissions − frais − swap`.
 * `swap` par défaut `0` (saisie manuelle MVP ; alimenté par la synchro broker post-MVP).
 *
 * @param grossPnl P&L brut réalisé ({@link GroupedTrade.grossPnl})
 * @param commission commissions du trade, `>= 0`
 * @param fees frais du trade, `>= 0`
 * @param swap swap/financement overnight du trade (signé : coût positif réduit le net, crédit négatif l'augmente), défaut `0`
 */
export function computeNetPnl(
  grossPnl: Decimal,
  commission: Decimal,
  fees: Decimal,
  swap: Decimal = new Decimal(0),
): Decimal {
  return grossPnl.minus(commission).minus(fees).minus(swap);
}

/**
 * R multiple d'un trade : P&L net exprimé en multiples du risque initialement pris.
 *
 * Formule (ARCHITECTURE §5.2) : `r = netPnl / initialRisk`. `initialRisk`
 * est une valeur monétaire toujours positive (distance au stop × quantité ×
 * multiplicateur de contrat, ou risque saisi manuellement) ; son signe n'a
 * pas de sens métier, mais plutôt que de corriger silencieusement une valeur
 * fournie par erreur (via une valeur absolue), `0` ou une valeur négative
 * sont **rejetés** comme invalides — un risque initial négatif ou nul est
 * plus probablement un bug amont (mauvaise donnée saisie/importée) qu'un
 * signe à ignorer.
 *
 * @param netPnl P&L net du trade ({@link computeNetPnl})
 * @param initialRisk risque initial en valeur monétaire, ou `null`/`undefined` si inconnu
 * @returns le R multiple, ou `null` si `initialRisk` n'est pas connu
 * @throws {InvalidInitialRiskError} si `initialRisk` est fourni mais `<= 0`
 */
export function computeRMultiple(
  netPnl: Decimal,
  initialRisk: Decimal | null | undefined,
): Decimal | null {
  if (initialRisk == null) {
    return null;
  }
  if (!initialRisk.greaterThan(0)) {
    throw new InvalidInitialRiskError(initialRisk.toString());
  }
  return netPnl.dividedBy(initialRisk);
}
