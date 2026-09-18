import type { Decimal } from '../money';
import type { Session } from '../time';
import type { TradeDirection, TradeStatus } from '../trading';

/**
 * Trade déjà résolu (P&L net, R multiple, jour de trading, session…), forme
 * canonique consommée par `packages/core/stats` et `packages/core/aggregates`
 * — proche de DATA_MODEL `trades` (colonnes dérivées déjà calculées par
 * `packages/core/trading`, ADR-016). Ni `packages/core/stats` ni
 * `packages/core/aggregates` ne recalculent le P&L : ils supposent que
 * l'appelant a déjà produit ces valeurs via `groupExecutionsIntoTrades`,
 * `computeNetPnl`, `computeRMultiple`, `tradingDayOf`, `classifySession`.
 *
 * `symbol` est la valeur normalisée (`instruments.symbol`, ex. `"GBPUSD"`),
 * pas la clé étrangère `instrument_id` : les fonctions d'agrégation par
 * symbole regroupent sur cette valeur, adaptée à l'affichage direct.
 */
export interface TradeRecord {
  /** Identifiant du trade (`trades.id`, ou identifiant synthétique côté golden). */
  readonly id: string;
  readonly accountId: string;
  /** Devise du compte (`accounts.currency`) — utilisée par l'agrégation multi-comptes (ADR-019). */
  readonly currency: string;
  readonly symbol: string;
  readonly direction: TradeDirection;
  readonly status: TradeStatus;
  readonly openedAt: Date;
  /** `null` tant que le trade est `open` (aucun P&L net réalisé à considérer). */
  readonly closedAt: Date | null;
  /** Jour de trading (`trades.trading_day`), déjà résolu par {@link tradingDayOf} sur `closedAt` (repli `openedAt` si encore ouvert). */
  readonly tradingDay: string;
  /** P&L brut réalisé (voir `GroupedTrade.grossPnl`), commissions/frais/swap non déduits. */
  readonly grossPnl: Decimal;
  /** P&L net réalisé à ce jour (voir `packages/core/trading` `computeNetPnl`). */
  readonly netPnl: Decimal;
  /** R multiple (voir `computeRMultiple`), `null` si le risque initial est inconnu. */
  readonly rMultiple: Decimal | null;
  readonly commission: Decimal;
  readonly fees: Decimal;
  readonly quantity: Decimal;
  readonly session: Session;
  /** Setup nommé (DATA_MODEL `trades.setup`), `null`/absent si non renseigné. */
  readonly setup?: string | null;
  /** Noms de tags attachés (DATA_MODEL `tags`/`trade_tags`), un trade peut porter plusieurs tags. */
  readonly tags?: readonly string[];
}

/** Trie une collection de {@link TradeRecord} par `closedAt` (repli `openedAt`), puis `id` à égalité — ordre déterministe utilisé par les séries chronologiques (drawdown, séries, equity). */
export function sortTradesChronologically(trades: readonly TradeRecord[]): TradeRecord[] {
  return [...trades].sort((a, b) => {
    const aTime = (a.closedAt ?? a.openedAt).getTime();
    const bTime = (b.closedAt ?? b.openedAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
}
