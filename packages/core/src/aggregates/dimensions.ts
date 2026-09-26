import { Decimal } from '../money';
import { compareOrdinal, computeWinLossCounts, computeWinRate, filterClosedTrades } from '../stats';
import type { TradeRecord } from '../stats';
import { getLocalTimeParts } from '../time/localTimeCache';
import { localWeekdayOf } from './week';

/** Clé utilisée pour regrouper les trades sans `setup` renseigné (voir {@link aggregateBySetup}). */
export const UNSET_SETUP_KEY = null;

/** Agrégat d'une dimension (symbole, setup, tag, session, heure, jour de semaine). */
export interface DimensionAggregate<Key> {
  readonly key: Key;
  readonly tradesCount: number;
  readonly wins: number;
  readonly losses: number;
  readonly breakeven: number;
  readonly grossPnl: Decimal;
  readonly netPnl: Decimal;
  /** Voir `computeWinRate` (trades `breakeven` exclus du dénominateur) — `null` si aucun trade décisif dans le groupe. */
  readonly winRate: Decimal | null;
}

function summarize<Key>(key: Key, trades: readonly TradeRecord[]): DimensionAggregate<Key> {
  const { wins, losses, breakeven } = computeWinLossCounts(trades);
  const grossPnl = trades.reduce((acc, t) => acc.plus(t.grossPnl), new Decimal(0));
  const netPnl = trades.reduce((acc, t) => acc.plus(t.netPnl), new Decimal(0));
  return {
    key,
    tradesCount: trades.length,
    wins,
    losses,
    breakeven,
    grossPnl,
    netPnl,
    winRate: computeWinRate(trades),
  };
}

/**
 * Regroupe `trades` par clé (un trade peut alimenter plusieurs groupes si
 * `keyOf` renvoie plusieurs clés, ex. les tags) puis résume chaque groupe.
 * **Trades `open` exclus** (revue M3 #5, voir {@link filterClosedTrades}).
 * Non exporté : détail d'implémentation commun aux fonctions `aggregateBy*`
 * ci-dessous.
 */
function groupBy<Key>(
  trades: readonly TradeRecord[],
  keyOf: (trade: TradeRecord) => readonly Key[],
): Map<Key, TradeRecord[]> {
  const groups = new Map<Key, TradeRecord[]>();
  for (const trade of filterClosedTrades(trades)) {
    for (const key of keyOf(trade)) {
      const list = groups.get(key);
      if (list) list.push(trade);
      else groups.set(key, [trade]);
    }
  }
  return groups;
}

/** Agrège par symbole (DATA_MODEL `instruments.symbol`), trié par symbole (ordre alphabétique). */
export function aggregateBySymbol(trades: readonly TradeRecord[]): DimensionAggregate<string>[] {
  const groups = groupBy(trades, (t) => [t.symbol]);
  return [...groups.entries()]
    .sort(([a], [b]) => compareOrdinal(a, b))
    .map(([key, group]) => summarize(key, group));
}

/**
 * Agrège par setup (DATA_MODEL `trades.setup`). Les trades sans setup
 * renseigné sont regroupés sous la clé {@link UNSET_SETUP_KEY} (`null`),
 * placée en dernier (après les setups nommés, triés alphabétiquement).
 */
export function aggregateBySetup(
  trades: readonly TradeRecord[],
): DimensionAggregate<string | null>[] {
  const groups = groupBy(trades, (t) => [t.setup ?? UNSET_SETUP_KEY]);
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return compareOrdinal(a, b);
    })
    .map(([key, group]) => summarize(key, group));
}

/**
 * Agrège par tag (DATA_MODEL `tags`/`trade_tags`) : un trade portant
 * plusieurs tags alimente **chaque** groupe correspondant (pas de double
 * comptage dans un même groupe, mais un trade peut apparaître dans
 * plusieurs lignes du résultat — somme des `tradesCount` de ce tableau
 * potentiellement supérieure au nombre total de trades). Les trades sans
 * tag n'apparaissent dans aucun groupe.
 */
export function aggregateByTag(trades: readonly TradeRecord[]): DimensionAggregate<string>[] {
  const groups = groupBy(trades, (t) => t.tags ?? []);
  return [...groups.entries()]
    .sort(([a], [b]) => compareOrdinal(a, b))
    .map(([key, group]) => summarize(key, group));
}

/** Agrège par session de marché ({@link Session}, voir `packages/core/time` `classifySession`), ordre fixe. */
export function aggregateBySession(
  trades: readonly TradeRecord[],
): DimensionAggregate<TradeRecord['session']>[] {
  const order: TradeRecord['session'][] = ['asia', 'london', 'new_york', 'overlap', 'other'];
  const groups = groupBy(trades, (t) => [t.session]);
  return order.filter((key) => groups.has(key)).map((key) => summarize(key, groups.get(key) ?? []));
}

/**
 * Agrège par jour de semaine local (`0` dimanche .. `6` samedi), calculé sur
 * `openedAt` **dans `timezone`** (voir {@link localWeekdayOf}) — **revue M3
 * #9** : dérivé du même instant/fuseau que {@link aggregateByHourOfDay}
 * plutôt que du `tradingDay` déjà résolu (qui dépend de `day_rollover_time`
 * et peut retomber sur un jour civil différent, ex. bascule 17:00 New York),
 * pour que jour de semaine et heure restent cohérents entre eux et avec la
 * heatmap (`computeHeatmap`).
 *
 * @param timezone fuseau IANA utilisé pour résoudre le jour civil local (typiquement `accounts.timezone`)
 */
export function aggregateByWeekday(
  trades: readonly TradeRecord[],
  timezone: string,
): DimensionAggregate<number>[] {
  const groups = groupBy(trades, (t) => [localWeekdayOf(t.openedAt, timezone)]);
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, group]) => summarize(key, group));
}

/**
 * Agrège par heure locale d'ouverture (`0`..`23`), résolue dans `timezone`
 * (typiquement le fuseau du compte, `accounts.timezone`) à partir de
 * `openedAt` (UTC) — même technique que `packages/core/time` `tradingDayOf`
 * (décomposition directe de l'instant UTC via {@link getLocalTimeParts},
 * mémoïsée par fuseau — correct pendant les changements d'heure).
 */
export function aggregateByHourOfDay(
  trades: readonly TradeRecord[],
  timezone: string,
): DimensionAggregate<number>[] {
  const groups = groupBy(trades, (t) => [getLocalTimeParts(t.openedAt, timezone).hour]);
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, group]) => summarize(key, group));
}
