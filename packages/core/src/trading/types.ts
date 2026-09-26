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
  /**
   * Ordre d'origine optionnel (ex. index dans le fichier d'import ou numéro
   * de séquence du broker), utilisé pour départager deux exécutions au même
   * `executedAt` **avant** l'id (voir {@link groupExecutionsIntoTrades}).
   * `undefined` si l'appelant ne connaît pas d'ordre de source fiable.
   *
   * Doit être fourni par toute source qui produit des horodatages identiques
   * (formulaire, import CSV, synchro) ; persistance en base prévue en M4
   * (ADR à venir — non traité pendant cette passe).
   */
  readonly sequence?: number;
}

/**
 * Informations d'un instrument nécessaires au regroupement, DATA_MODEL
 * `instruments.contract_multiplier` / `instruments.quote_ccy` (ADR-004,
 * ADR-019 — voir {@link groupExecutionsIntoTrades} pour la limite MVP sur la
 * devise de cotation).
 */
export interface InstrumentContractInfo {
  /** Multiplicateur de contrat, doit être strictement positif. */
  readonly contractMultiplier: Decimal;
  /**
   * Devise de cotation de l'instrument (ex. `USD` pour `EURUSD`, `XAUUSD`,
   * `NAS100`). `GroupedTrade.grossPnl` est exprimé dans cette devise (voir
   * limite MVP documentée sur {@link GroupedTrade.grossPnl}).
   */
  readonly quoteCurrency: string;
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
   * P&L brut (unité : **devise de cotation de l'instrument**, voir
   * {@link InstrumentContractInfo.quoteCurrency} — pour le MVP,
   * {@link groupExecutionsIntoTrades} exige qu'elle soit identique à la
   * devise du compte, aucune conversion n'étant effectuée ; ADR-019 en sera
   * informé pour une éventuelle conversion post-MVP), multiplicateur de
   * contrat de l'instrument appliqué, commissions/frais **exclus** (ADR-004,
   * ARCHITECTURE §5.2 : « P&L net = brut − commissions − frais − swap »).
   * `0` pour un trade `open` sans sortie partielle.
   *
   * Pour un trade `closed`, calculé **exactement** sur les notionnels
   * (jamais par re-multiplication d'un prix moyen arrondi, qui peut
   * introduire un résidu d'arrondi non nul là où le résultat économique est
   * exactement `0`) : `(Σ notionnel de sortie − Σ notionnel d'entrée) ×
   * (direction === 'long' ? 1 : -1) × contractMultiplier`, où chaque
   * notionnel est `Σ (quantité × prix)` des exécutions correspondantes —
   * identité vraie quelle que soit `method` (FIFO ou moyenne pondérée)
   * puisque, une fois le trade clôturé, toute la quantité entrée a été
   * appariée à de la quantité sortie.
   *
   * Pour un trade encore `open` ayant déjà connu une ou plusieurs sorties
   * partielles, `grossPnl` est le P&L **réalisé à ce jour** sur la quantité
   * déjà sortie, calculé au fil des appariements (méthode-dépendant : en
   * `average`, contre le coût total du lot mélangé au moment de chaque
   * sortie, voir `groupExecutions.ts`).
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
 * exécution dont l'instrument est absent de la table d'instruments fournie.
 */
export class UnknownInstrumentError extends Error {
  constructor(readonly instrumentId: string) {
    super(
      `Instrument inconnu (${instrumentId}) : aucune information fournie (DATA_MODEL "instruments.contract_multiplier"/"instruments.quote_ccy").`,
    );
    this.name = 'UnknownInstrumentError';
  }
}

/**
 * Erreur typée levée quand le multiplicateur de contrat fourni pour un
 * instrument n'est pas strictement positif.
 */
export class InvalidContractMultiplierError extends Error {
  constructor(
    readonly instrumentId: string,
    readonly receivedValue: string,
  ) {
    super(
      `Multiplicateur de contrat invalide pour l'instrument ${instrumentId} : attendu une valeur strictement positive, reçu ${receivedValue}.`,
    );
    this.name = 'InvalidContractMultiplierError';
  }
}

/**
 * Erreur typée levée quand la devise de cotation d'un instrument diffère de
 * la devise du compte — limite du MVP (voir {@link GroupedTrade.grossPnl}) :
 * `packages/core` ne convertit aucune devise (ADR-019 couvre aujourd'hui
 * uniquement l'agrégation multi-comptes ; l'architecte doit y ajouter cette
 * limite du regroupement d'exécutions).
 */
export class InstrumentCurrencyMismatchError extends Error {
  constructor(
    readonly instrumentId: string,
    readonly quoteCurrency: string,
    readonly accountCurrency: string,
  ) {
    super(
      `Instrument ${instrumentId} coté en ${quoteCurrency}, incompatible avec la devise du compte (${accountCurrency}) : aucune conversion pendant le MVP (ADR-019).`,
    );
    this.name = 'InstrumentCurrencyMismatchError';
  }
}
