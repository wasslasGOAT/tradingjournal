// Script déterministe de génération du second fixture golden « cas limites »
// (revue M3 #13) — complète `fixture.json`/ROADMAP M3-8 (qui ne couvre que
// des round-trips simples sur un seul jour et un seul compte) sans y
// toucher : sorties partielles, inversion, trade ouvert, trade à 0, R
// multiple, dépôt/retrait, trade traversant une bascule non-minuit, deux
// exécutions à la même seconde.
//
// Contrairement à `build.mjs`, les prix/quantités sont ici des littéraux
// choisis à la main (pas dérivés d'un P&L net cible) : chaque scénario est
// assez simple pour que `edgeCases.golden.test.ts` documente le calcul du
// P&L attendu en commentaire, sans avoir besoin de travailler à l'envers
// depuis le résultat. Même technique que `build.mjs` pour les identifiants
// (UUID v5 déterministe via `node:crypto`) — voir son en-tête pour le détail.
//
// Usage : node packages/core/test/golden/edgeCases.build.mjs
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function uuidV5(name, namespace) {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, nameBytes]))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Même namespace que `build.mjs` (constante du projet) mais préfixe "edge-cases:"
// dans chaque nom source, pour ne jamais collisionner avec les ids du fixture ROADMAP.
const EDGEBOOK_NAMESPACE = '2f6b1a9e-2f0e-4c7b-8f3f-6d6a8c9d1a2b';
const accountUuid = uuidV5('edge-cases:account:acct-edge-cases', EDGEBOOK_NAMESPACE);
function instrumentUuid(symbol) {
  return uuidV5(`edge-cases:instrument:${symbol}`, EDGEBOOK_NAMESPACE);
}
function executionUuid(slug) {
  return uuidV5(`edge-cases:execution:${slug}`, EDGEBOOK_NAMESPACE);
}

// Tous cotés en USD (même devise que le compte, ADR-019 — voir `InstrumentCurrencyMismatchError`).
const INSTRUMENTS = {
  EURUSD: { assetClass: 'forex', contractMultiplier: '100000', quoteCcy: 'USD' },
  GBPUSD: { assetClass: 'forex', contractMultiplier: '100000', quoteCcy: 'USD' },
  XAUUSD: { assetClass: 'metal', contractMultiplier: '100', quoteCcy: 'USD' },
  AUDUSD: { assetClass: 'forex', contractMultiplier: '100000', quoteCcy: 'USD' },
  NZDUSD: { assetClass: 'forex', contractMultiplier: '100000', quoteCcy: 'USD' },
};

const executions = [];
let execCounter = 0;
function addExecution(
  symbol,
  side,
  quantity,
  price,
  { executedAt, commission = '0', fees = '0', slug, noSequence = false },
) {
  execCounter += 1;
  const execution = {
    id: executionUuid(slug),
    account_id: accountUuid,
    instrument_id: instrumentUuid(symbol),
    side,
    quantity,
    price,
    commission,
    fees,
    executed_at: executedAt,
  };
  // `noSequence` : omet volontairement le champ pour les deux exécutions du
  // groupe simultané (F) ci-dessous, afin d'exercer la règle par défaut
  // « augmente avant réduit » (voir `groupExecutionsIntoTrades`) plutôt que
  // le départage explicite par `sequence`.
  if (!noSequence) execution.sequence = execCounter;
  executions.push(execution);
}

// --- A) Sorties partielles (EURUSD) : achat 10, vente partielle 4, vente finale 6 ---
addExecution('EURUSD', 'buy', '10', '1.10000', {
  executedAt: '2026-02-02T14:00:00Z',
  slug: 'partial-exits-open',
});
addExecution('EURUSD', 'sell', '4', '1.10500', {
  executedAt: '2026-02-02T15:00:00Z',
  slug: 'partial-exits-partial',
});
addExecution('EURUSD', 'sell', '6', '1.11000', {
  executedAt: '2026-02-02T16:00:00Z',
  slug: 'partial-exits-close',
});

// --- B) Inversion (GBPUSD) : achat 10, vente 15 (clôture 10 + ouvre short 5), achat 5 (clôture le short) ---
addExecution('GBPUSD', 'buy', '10', '1.20000', {
  executedAt: '2026-02-03T14:00:00Z',
  slug: 'inversion-open-long',
});
addExecution('GBPUSD', 'sell', '15', '1.21000', {
  executedAt: '2026-02-03T15:00:00Z',
  slug: 'inversion-close-and-flip',
});
addExecution('GBPUSD', 'buy', '5', '1.19000', {
  executedAt: '2026-02-03T16:00:00Z',
  slug: 'inversion-close-short',
});

// --- C) Trade ouvert (XAUUSD), avec commission — doit être exclu de toutes les stats (revue M3 #5) ---
addExecution('XAUUSD', 'buy', '3', '1900.00', {
  executedAt: '2026-02-04T14:00:00Z',
  commission: '15.00',
  slug: 'open-trade',
});

// --- D) Trade à 0 net (AUDUSD, FIFO — le seul grouping_method de ce compte) ---
addExecution('AUDUSD', 'buy', '2', '0.65000', {
  executedAt: '2026-02-05T14:00:00Z',
  slug: 'zero-fifo-open',
});
addExecution('AUDUSD', 'sell', '2', '0.65000', {
  executedAt: '2026-02-05T15:00:00Z',
  slug: 'zero-fifo-close',
});

// --- E) Trade traversant une frontière de jour à cause d'une bascule non-minuit ---
// Compte America/New_York, day_rollover_time 17:00 (convention futures/CME).
// 2026-02-09 est un lundi d'hiver (EST, UTC-5, hors changement d'heure : DST 2026 démarre le 8 mars).
// Ouverture 21:30 UTC = 16:30 EST (avant la bascule 17:00) ; clôture 22:30 UTC = 17:30 EST (après la bascule).
addExecution('EURUSD', 'buy', '1', '1.10000', {
  executedAt: '2026-02-09T21:30:00Z',
  slug: 'rollover-open',
});
addExecution('EURUSD', 'sell', '1', '1.11000', {
  executedAt: '2026-02-09T22:30:00Z',
  slug: 'rollover-close',
});

// --- F) Deux exécutions à la même seconde (NZDUSD), sans `sequence` : l'entrée qui
// augmente la position doit être traitée avant la sortie qui la réduit, quel
// que soit l'ordre alphabétique des id (revue M3 #3). Trade finalement clôturé
// (le grossPnl final ne dépend alors PAS de l'ordre interne du groupe simultané,
// voir `groupExecutions.ts` `finalizeTrade` — notionnels exacts).
addExecution('NZDUSD', 'buy', '8', '1.05000', {
  executedAt: '2026-02-11T14:00:00Z',
  slug: 'same-second-open',
});
// Les deux exécutions suivantes partagent EXACTEMENT le même executed_at, sans sequence :
addExecution('NZDUSD', 'buy', '2', '1.06000', {
  executedAt: '2026-02-11T15:00:00Z',
  slug: 'zzz-same-second-increase',
  noSequence: true,
});
addExecution('NZDUSD', 'sell', '5', '1.07000', {
  executedAt: '2026-02-11T15:00:00Z',
  slug: 'aaa-same-second-reduce',
  noSequence: true,
});
addExecution('NZDUSD', 'sell', '5', '1.08000', {
  executedAt: '2026-02-11T16:00:00Z',
  slug: 'same-second-final-close',
});

const cashMovements = [
  {
    id: executionUuid('cash-deposit'),
    account_id: accountUuid,
    type: 'deposit',
    amount: '5000',
    occurred_at: '2026-02-01T00:00:00Z',
  },
  {
    id: executionUuid('cash-withdrawal'),
    account_id: accountUuid,
    type: 'withdrawal',
    amount: '2000',
    occurred_at: '2026-02-15T00:00:00Z',
  },
];

const fixture = {
  description:
    'Second fixture golden « cas limites » (revue M3 #13) — sorties partielles, inversion, trade ouvert, trade à 0 (FIFO), dépôt/retrait, trade traversant une bascule non-minuit (17:00 America/New_York), deux exécutions à la même seconde. Le cas « trade à 0 en moyenne pondérée » est testé séparément dans edgeCases.golden.test.ts via un appel direct à groupExecutionsIntoTrades (grouping_method de ce compte : fifo). Généré par edgeCases.build.mjs, ne pas éditer à la main.',
  account: {
    id: accountUuid,
    name: 'Cas limites',
    kind: 'personal',
    currency: 'USD',
    starting_balance: '50000',
    timezone: 'America/New_York',
    day_rollover_time: '17:00',
    grouping_method: 'fifo',
  },
  instruments: Object.entries(INSTRUMENTS).map(([symbol, i]) => ({
    id: instrumentUuid(symbol),
    symbol,
    asset_class: i.assetClass,
    contract_multiplier: i.contractMultiplier,
    quote_ccy: i.quoteCcy,
  })),
  executions,
  cash_movements: cashMovements,
  trade_swaps: [],
};

const outPath = fileURLToPath(new URL('./edgeCases.fixture.json', import.meta.url));
writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n', 'utf-8');
console.log('Écrit :', outPath);
