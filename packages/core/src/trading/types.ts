import type { Decimal } from '../money';

/** Sens d'une exécution (fill), DATA_MODEL `executions.side`. */
export type ExecutionSide = 'buy' | 'sell';

/** Sens d'un trade (position), DATA_MODEL `trades.direction`. */
export type TradeDirection = 'long' | 'short';

/** État d'un trade, DATA_MODEL `trades.status`. */
export type TradeStatus = 'open' | 'closed';

/** Méthode de regroupement des exécutions en trades, DATA_MODEL `accounts.grouping_method`. */
export type GroupingMethod = 'fifo' | 'average';

/**
 * Exécution (fill brut), DATA_MODEL `executions`. Type d'entrée pur pour
 * {@link groupExecutionsIntoTrades} — ne porte pas les colonnes non
 * nécessaires au regroupement (`external_id`, `import_id`, `dedupe_hash`…).
 */
export interface ExecutionInput {
  /** Identifiant de l'exécution (`executions.id`), reporté dans `GroupedTrade.executionIds`. */
  readonly id: string;
  readonly accountId: string;
  readonly instrumentId: string;
  readonly side: ExecutionSide;
  /** Quantité de l'exécution, strictement positive (unité de l'instrument). */
  readonly quantity: Decimal;
  /** Prix d'exécution, strictement positif. */
  readonly price: Decimal;
  /** Commission de l'exécution, `>= 0`. */
  readonly commission: Decimal;
  /** Frais de l'exécution, `>= 0`. */
  readonly fees: Decimal;
  /** Horodatage UTC de l'exécution. */
  readonly executedAt: Date;
}

/**
 * Trade (position aller-retour) issu du regroupement d'une ou plusieurs
 * {@link ExecutionInput}, DATA_MODEL `trades` (sous-ensemble calculé par
 * {@link groupExecutionsIntoTrades} ; P&L net, R multiple et solde sont
 * calculés séparément par `packages/core/trading/pnl` et `.../balance`).
 */
export interface GroupedTrade {
  readonly accountId: string;
  readonly instrumentId: string;
  readonly direction: TradeDirection;
  readonly status: TradeStatus;
  readonly openedAt: Date;
  /** `null` tant que le trade est `open`. */
  readonly closedAt: Date | null;
  /**
   * Quantité du trade : pour un trade `closed`, quantité totale du
   * round-trip (= quantité totale entrée = quantité totale sortie) ; pour
   * un trade `open`, quantité actuellement en position (déjà partiellement
   * sortie exclue).
   */
  readonly quantity: Decimal;
  /**
   * Prix d'entrée moyen. Pour un trade `closed`, moyenne pondérée de
   * *toutes* les entrées du round-trip (indépendant de `method`, identité
   * comptable : la somme totale ne dépend pas de l'ordre d'appariement).
   * Pour un trade `open`, moyenne pondérée du **prix de revient de la
   * quantité actuellement ouverte** — dépend de `method` dès qu'il y a eu
   * une sortie partielle précédée d'entrées à prix différents (FIFO
   * consomme les lots les plus anciens en premier ; la moyenne pondérée
   * mélange tous les lots avant chaque sortie).
   */
  readonly avgEntry: Decimal;
  /**
   * Prix de sortie moyen, pondéré par quantité, sur les sorties déjà
   * exécutées. `null` si aucune sortie n'a encore eu lieu (trade `open`
   * sans sortie partielle). Indépendant de `method`.
   */
  readonly avgExit: Decimal | null;
  /**
   * P&L brut **réalisé à ce jour** (unité : devise du compte), multiplicateur
   * de contrat de l'instrument appliqué, commissions/frais **exclus**
   * (ADR-004, ARCHITECTURE §5.2 : « P&L net = brut − commissions − frais −
   * swap »). `0` pour un trade `open` sans sortie partielle. Pour un trade
   * `closed`, correspond à la formule `(avgExit - avgEntry) * quantity *
   * contractMultiplier * (direction === 'long' ? 1 : -1)`.
   */
  readonly grossPnl: Decimal;
  /** Somme des commissions des exécutions regroupées dans ce trade, `>= 0`. */
  readonly commission: Decimal;
  /** Somme des frais des exécutions regroupées dans ce trade, `>= 0`. */
  readonly fees: Decimal;
  /**
   * Identifiants des exécutions ayant contribué à ce trade. Une exécution
   * d'inversion de position (qui clôture puis rouvre dans l'autre sens)
   * apparaît dans **deux** `GroupedTrade` consécutifs (le trade clôturé et
   * le nouveau trade ouvert) — DATA_MODEL `executions.trade_id` étant une
   * clé étrangère simple (une seule ligne), la matérialisation en base doit
   * scinder cette exécution en deux lignes lors de l'écriture (à la charge
   * de la fonction Postgres transactionnelle décrite dans ADR-016 ;
   * `database`/`backend`).
   */
  readonly executionIds: readonly string[];
}

/** Erreur typée levée quand une {@link ExecutionInput} porte une valeur invalide. */
export class InvalidExecutionError extends Error {
  constructor(
    readonly executionId: string,
    reason: string,
  ) {
    super(`Exécution invalide (${executionId}) : ${reason}.`);
    this.name = 'InvalidExecutionError';
  }
}

/**
 * Erreur typée levée quand {@link groupExecutionsIntoTrades} reçoit une
 * exécution dont l'instrument est absent de la table de multiplicateurs de
 * contrat fournie.
 */
export class UnknownInstrumentError extends Error {
  constructor(readonly instrumentId: string) {
    super(
      `Instrument inconnu (${instrumentId}) : aucun multiplicateur de contrat fourni (DATA_MODEL "instruments.contract_multiplier").`,
    );
    this.name = 'UnknownInstrumentError';
  }
}
