// Script déterministe de génération du jeu golden synthétique (ROADMAP M3-8).
//
// Pourquoi un script séparé plutôt qu'un JSON écrit à la main : chaque trade
// est défini par son P&L NET cible (au centime), et le script calcule le prix
// de sortie exact (`entryPrice ± grossPnl / (quantity * contractMultiplier)`)
// pour que `groupExecutionsIntoTrades` + `computeNetPnl` retombent exactement
// sur les chiffres de référence du ROADMAP, sans arrondi. `contractMultiplier`
// est toujours une puissance de 10 (1, 100, 100000) : diviser une valeur
// décimale finie par une puissance de 10 ne fait que décaler la virgule, donc
// le prix de sortie est TOUJOURS une décimale finie exacte (pas de division
// qui boucle à l'infini) — condition nécessaire pour retomber pile au centime.
//
// Exécuté une seule fois pour produire `fixture.json` (commité) ; pas exécuté
// par les tests (qui relisent `fixture.json`). Aucune dépendance ajoutée :
// `decimal.js` est déjà une dépendance de `@repo/core`, résolue depuis ici
// via la résolution Node standard (pnpm).
//
// Usage : node packages/core/test/golden/build.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import DecimalJs from 'decimal.js';

const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_EVEN });

/** Multiplicateurs de contrat par symbole — toujours une puissance de 10 (voir en-tête). */
const INSTRUMENTS = {
  GBPUSD: { assetClass: 'forex', contractMultiplier: '100000', priceDecimals: 5 },
  EURUSD: { assetClass: 'forex', contractMultiplier: '100000', priceDecimals: 5 },
  XAUUSD: { assetClass: 'metal', contractMultiplier: '100', priceDecimals: 2 },
  NAS100: { assetClass: 'index', contractMultiplier: '100', priceDecimals: 2 },
};

/**
 * Table de conception des 25 trades du fixture golden (ROADMAP M3-8).
 * `netTarget` = P&L net exact voulu ; pour la plupart des trades
 * `commission`/`fees`/`swap` valent `0` donc `grossBeforeFees === netTarget`.
 * Le trade `mar30-c` porte la commission/frais/swap non nuls exigés par le
 * ROADMAP (`grossBeforeFees = netTarget + commission + fees + swap`).
 */
const TRADES = [
  // --- Mar 2 (lundi) — jour gagnant : +14500.00 ---
  { id: 'mar2-a', day: '2026-03-02', symbol: 'GBPUSD', direction: 'long', netTarget: '8200.00', entry: '1.26500', openedAt: '2026-03-02T08:15:00Z', closedAt: '2026-03-02T14:45:00Z' },
  { id: 'mar2-b', day: '2026-03-02', symbol: 'EURUSD', direction: 'long', netTarget: '6300.00', entry: '1.08300', openedAt: '2026-03-02T09:00:00Z', closedAt: '2026-03-02T15:30:00Z' },

  // --- Mar 5 (jeudi) — jour perdant : -5000.00 ---
  { id: 'mar5-a', day: '2026-03-05', symbol: 'EURUSD', direction: 'short', netTarget: '-2000.00', entry: '1.08800', openedAt: '2026-03-05T07:00:00Z', closedAt: '2026-03-05T10:00:00Z' },
  { id: 'mar5-b', day: '2026-03-05', symbol: 'GBPUSD', direction: 'short', netTarget: '-1500.00', entry: '1.27200', openedAt: '2026-03-05T11:00:00Z', closedAt: '2026-03-05T13:00:00Z' },
  { id: 'mar5-c', day: '2026-03-05', symbol: 'XAUUSD', direction: 'short', netTarget: '-1500.00', entry: '2155.00', openedAt: '2026-03-05T14:00:00Z', closedAt: '2026-03-05T16:00:00Z' },

  // --- Mar 9 (lundi) — jour perdant : -5000.00 ---
  { id: 'mar9-a', day: '2026-03-09', symbol: 'NAS100', direction: 'short', netTarget: '-1800.00', entry: '18700.00', openedAt: '2026-03-09T06:30:00Z', closedAt: '2026-03-09T08:00:00Z' },
  { id: 'mar9-b', day: '2026-03-09', symbol: 'GBPUSD', direction: 'long', netTarget: '-1700.00', entry: '1.26900', openedAt: '2026-03-09T09:30:00Z', closedAt: '2026-03-09T12:00:00Z' },
  { id: 'mar9-c', day: '2026-03-09', symbol: 'EURUSD', direction: 'short', netTarget: '-1500.00', entry: '1.08600', openedAt: '2026-03-09T13:00:00Z', closedAt: '2026-03-09T15:00:00Z' },

  // --- Mar 12 (jeudi) — jour gagnant : +5100.00 ---
  { id: 'mar12-a', day: '2026-03-12', symbol: 'XAUUSD', direction: 'long', netTarget: '5100.00', entry: '2148.00', openedAt: '2026-03-12T08:00:00Z', closedAt: '2026-03-12T15:00:00Z' },

  // --- Mar 16 (lundi) — jour perdant : -5000.00 ---
  { id: 'mar16-a', day: '2026-03-16', symbol: 'XAUUSD', direction: 'short', netTarget: '-2200.00', entry: '2160.00', openedAt: '2026-03-16T07:30:00Z', closedAt: '2026-03-16T09:45:00Z' },
  { id: 'mar16-b', day: '2026-03-16', symbol: 'EURUSD', direction: 'long', netTarget: '-1600.00', entry: '1.09000', openedAt: '2026-03-16T10:15:00Z', closedAt: '2026-03-16T12:30:00Z' },
  { id: 'mar16-c', day: '2026-03-16', symbol: 'GBPUSD', direction: 'short', netTarget: '-1200.00', entry: '1.27500', openedAt: '2026-03-16T13:15:00Z', closedAt: '2026-03-16T15:00:00Z' },

  // --- Mar 19 (jeudi) — jour perdant : -5000.00 ---
  { id: 'mar19-a', day: '2026-03-19', symbol: 'NAS100', direction: 'long', netTarget: '-2500.00', entry: '18900.00', openedAt: '2026-03-19T06:45:00Z', closedAt: '2026-03-19T09:00:00Z' },
  { id: 'mar19-b', day: '2026-03-19', symbol: 'GBPUSD', direction: 'short', netTarget: '-1500.00', entry: '1.26800', openedAt: '2026-03-19T10:30:00Z', closedAt: '2026-03-19T12:45:00Z' },
  { id: 'mar19-c', day: '2026-03-19', symbol: 'XAUUSD', direction: 'short', netTarget: '-1000.00', entry: '2165.00', openedAt: '2026-03-19T13:30:00Z', closedAt: '2026-03-19T16:15:00Z' },

  // --- Mar 23 (lundi) — jour gagnant : +5150.00 ---
  { id: 'mar23-a', day: '2026-03-23', symbol: 'NAS100', direction: 'long', netTarget: '5150.00', entry: '18600.00', openedAt: '2026-03-23T07:00:00Z', closedAt: '2026-03-23T14:00:00Z' },

  // --- Mar 26 (jeudi) — jour perdant : -5000.00 ---
  { id: 'mar26-a', day: '2026-03-26', symbol: 'EURUSD', direction: 'short', netTarget: '-1900.00', entry: '1.08900', openedAt: '2026-03-26T07:15:00Z', closedAt: '2026-03-26T09:30:00Z' },
  { id: 'mar26-b', day: '2026-03-26', symbol: 'NAS100', direction: 'short', netTarget: '-1600.00', entry: '18800.00', openedAt: '2026-03-26T10:00:00Z', closedAt: '2026-03-26T12:15:00Z' },
  { id: 'mar26-c', day: '2026-03-26', symbol: 'GBPUSD', direction: 'long', netTarget: '-1500.00', entry: '1.27300', openedAt: '2026-03-26T13:00:00Z', closedAt: '2026-03-26T15:15:00Z' },

  // --- Mar 29 (dimanche, changement d'heure Europe) — jour perdant : -5000.00 ---
  // mar29-a traverse le passage CET -> CEST (2026-03-29 01:00 UTC) : ouverte
  // 00:30 UTC (01:30 CET), clôturée 02:30 UTC (04:30 CEST, l'heure locale a
  // sauté de 02:00 à 03:00 CET entre les deux exécutions).
  { id: 'mar29-a', day: '2026-03-29', symbol: 'GBPUSD', direction: 'short', netTarget: '-3000.00', entry: '1.26500', openedAt: '2026-03-29T00:30:00Z', closedAt: '2026-03-29T02:30:00Z' },
  { id: 'mar29-b', day: '2026-03-29', symbol: 'XAUUSD', direction: 'short', netTarget: '-2000.00', entry: '2158.00', openedAt: '2026-03-29T10:00:00Z', closedAt: '2026-03-29T12:00:00Z' },

  // --- Mar 30 (lundi) — PIRE jour : -12277.71 ---
  { id: 'mar30-a', day: '2026-03-30', symbol: 'NAS100', direction: 'short', netTarget: '-6000.00', entry: '18750.00', openedAt: '2026-03-30T07:00:00Z', closedAt: '2026-03-30T09:30:00Z' },
  { id: 'mar30-b', day: '2026-03-30', symbol: 'EURUSD', direction: 'short', netTarget: '-4000.00', entry: '1.08700', openedAt: '2026-03-30T10:00:00Z', closedAt: '2026-03-30T12:00:00Z' },
  // Seul trade avec commission/frais/swap non nuls (ROADMAP M3-8).
  { id: 'mar30-c', day: '2026-03-30', symbol: 'GBPUSD', direction: 'short', netTarget: '-2277.71', commission: '50.00', fees: '20.00', swap: '7.71', entry: '1.26500', openedAt: '2026-03-30T13:00:00Z', closedAt: '2026-03-30T15:30:00Z' },

  // --- 1er avril (mercredi) — seul trade hors mars ---
  { id: 'apr1-a', day: '2026-04-01', symbol: 'XAUUSD', direction: 'short', netTarget: '-2215.72', entry: '2162.00', openedAt: '2026-04-01T08:00:00Z', closedAt: '2026-04-01T10:30:00Z' },
];

function decimalFromMaybe(value, fallback = '0') {
  return new Decimal(value ?? fallback);
}

const quantity = new Decimal(1);

const executions = [];
const swapAdjustments = [];
let execCounter = 0;

for (const trade of TRADES) {
  const instrument = INSTRUMENTS[trade.symbol];
  if (!instrument) throw new Error(`Instrument inconnu : ${trade.symbol}`);

  const netTarget = new Decimal(trade.netTarget);
  const commission = decimalFromMaybe(trade.commission);
  const fees = decimalFromMaybe(trade.fees);
  const swap = decimalFromMaybe(trade.swap);
  const grossBeforeFees = netTarget.plus(commission).plus(fees).plus(swap);

  const multiplier = new Decimal(instrument.contractMultiplier);
  const diff = grossBeforeFees.dividedBy(quantity.times(multiplier));
  const entryPrice = new Decimal(trade.entry);
  const positionSign = trade.direction === 'long' ? 1 : -1;
  // signedPriceDiff = (exit - entry) * positionSign = diff / quantity => exit = entry + positionSign*diff
  const exitPrice = entryPrice.plus(diff.times(positionSign));

  // Vérification immédiate (échoue tôt si une hypothèse de conception est fausse).
  const recomputedGross = exitPrice.minus(entryPrice).times(positionSign).times(quantity).times(multiplier);
  if (!recomputedGross.equals(grossBeforeFees)) {
    throw new Error(`Incohérence P&L brut pour ${trade.id} : attendu ${grossBeforeFees}, obtenu ${recomputedGross}`);
  }
  const recomputedNet = recomputedGross.minus(commission).minus(fees).minus(swap);
  if (!recomputedNet.equals(netTarget)) {
    throw new Error(`Incohérence P&L net pour ${trade.id} : attendu ${netTarget}, obtenu ${recomputedNet}`);
  }

  const entrySide = trade.direction === 'long' ? 'buy' : 'sell';
  const exitSide = trade.direction === 'long' ? 'sell' : 'buy';

  execCounter += 1;
  const entryId = `exec-${String(execCounter).padStart(4, '0')}-${trade.id}-open`;
  executions.push({
    id: entryId,
    account_id: 'acct-prop-challenge-200k',
    instrument_id: trade.symbol,
    side: entrySide,
    quantity: quantity.toFixed(),
    price: entryPrice.toFixed(),
    commission: commission.toFixed(2),
    fees: '0',
    executed_at: trade.openedAt,
  });

  execCounter += 1;
  const exitId = `exec-${String(execCounter).padStart(4, '0')}-${trade.id}-close`;
  executions.push({
    id: exitId,
    account_id: 'acct-prop-challenge-200k',
    instrument_id: trade.symbol,
    side: exitSide,
    quantity: quantity.toFixed(),
    price: exitPrice.toFixed(),
    commission: '0',
    fees: fees.toFixed(2),
    executed_at: trade.closedAt,
  });

  if (!swap.isZero()) {
    swapAdjustments.push({
      instrument_id: trade.symbol,
      opened_at: trade.openedAt,
      swap: swap.toFixed(2),
    });
  }
}

// --- Vérifications globales (au centime) avant écriture ---
const sum = (arr) => arr.reduce((acc, v) => acc.plus(v), new Decimal(0));
const netByTrade = TRADES.map((t) => new Decimal(t.netTarget));
const total = sum(netByTrade);
const marchTotal = sum(TRADES.filter((t) => t.day.startsWith('2026-03')).map((t) => new Decimal(t.netTarget)));
const aprilTotal = sum(TRADES.filter((t) => t.day.startsWith('2026-04')).map((t) => new Decimal(t.netTarget)));
const winners = TRADES.filter((t) => new Decimal(t.netTarget).greaterThan(0));
const losers = TRADES.filter((t) => new Decimal(t.netTarget).lessThan(0));

const checks = [
  ['total trades', TRADES.length, 25],
  ['total net', total.toFixed(2), '-19743.43'],
  ['march trades', TRADES.filter((t) => t.day.startsWith('2026-03')).length, 24],
  ['march net', marchTotal.toFixed(2), '-17527.71'],
  ['april net', aprilTotal.toFixed(2), '-2215.72'],
  ['winners', winners.length, 4],
  ['losers', losers.length, 21],
];
for (const [label, got, expected] of checks) {
  if (String(got) !== String(expected)) throw new Error(`Vérification échouée (${label}) : attendu ${expected}, obtenu ${got}`);
}

const startingBalance = new Decimal('200000');
const endingBalance = startingBalance.plus(total);
console.log('Solde final :', endingBalance.toFixed(2));
console.log('Rendement :', total.dividedBy(startingBalance).times(100).toFixed(4), '%');

const grossWinsTotal = sum(winners.map((t) => new Decimal(t.netTarget)));
const grossLossesTotal = sum(losers.map((t) => new Decimal(t.netTarget).abs()));
const profitFactor = grossWinsTotal.dividedBy(grossLossesTotal);
console.log('Gains bruts :', grossWinsTotal.toFixed(2), 'Pertes brutes :', grossLossesTotal.toFixed(2));
console.log('Profit factor :', profitFactor.toFixed(6), '-> arrondi', profitFactor.toDecimalPlaces(2).toFixed(2));
const avgWin = grossWinsTotal.dividedBy(winners.length);
const avgLoss = grossLossesTotal.dividedBy(losers.length);
const avgRatio = avgWin.dividedBy(avgLoss);
console.log('Ratio moyen :', avgRatio.toFixed(6), '-> arrondi', avgRatio.toDecimalPlaces(2).toFixed(2));

// Pire jour
const byDay = new Map();
for (const t of TRADES) {
  byDay.set(t.day, (byDay.get(t.day) ?? new Decimal(0)).plus(t.netTarget));
}
let worstDay = null;
let worstAmount = null;
for (const [day, amount] of byDay) {
  if (worstAmount === null || amount.lessThan(worstAmount)) {
    worstDay = day;
    worstAmount = amount;
  }
}
console.log('Pire jour :', worstDay, worstAmount.toFixed(2));
if (worstDay !== '2026-03-30') throw new Error(`Pire jour attendu 2026-03-30, obtenu ${worstDay}`);

const fixture = {
  description:
    "Jeu golden synthétique Edgebook (ROADMAP M3-8) — compte Prop Challenge 200k, USD, Europe/Paris, bascule 00:00. Généré par build.mjs, ne pas éditer à la main.",
  account: {
    id: 'acct-prop-challenge-200k',
    name: 'Prop Challenge 200k',
    kind: 'prop_challenge',
    currency: 'USD',
    starting_balance: '200000',
    timezone: 'Europe/Paris',
    day_rollover_time: '00:00',
    grouping_method: 'fifo',
  },
  instruments: Object.entries(INSTRUMENTS).map(([symbol, i]) => ({
    id: symbol,
    symbol,
    asset_class: i.assetClass,
    contract_multiplier: i.contractMultiplier,
  })),
  executions,
  cash_movements: [],
  // Swap non porté par `executions` (DATA_MODEL : `swap` est une colonne de
  // `trades`, pas d'`executions`) : appliqué par trade après regroupement, en
  // retrouvant le trade par (instrument_id, opened_at) — voir golden.test.ts.
  swap_adjustments: swapAdjustments,
};

const outPath = fileURLToPath(new URL('./fixture.json', import.meta.url));
writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n', 'utf-8');
console.log('Écrit :', outPath);
