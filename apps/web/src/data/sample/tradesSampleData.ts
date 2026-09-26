import { classifySession, parseAmount, tradingDayOf } from '@repo/core';
import type { Session, TradeRecord } from '@repo/core';

import { SAMPLE_ACCOUNTS_META } from './accountsSampleData';
import type { SampleAccountId } from './accountsSampleData';

/**
 * Trades factices du Dashboard/Calendrier (W-6, ADR-016) : chaînes décimales
 * (comme une colonne `numeric` Postgres lue en `::text`) et horodatages ISO —
 * jamais de `number` flottant pour un montant. Copié/adapté (pas importé,
 * ADR-023) de l'esprit de `apps/app/features/{dashboard,calendar}/sampleData.ts`
 * (gelé) : les jours de septembre 2026 reprennent volontairement les mêmes
 * P&L par jour que `apps/app/features/calendar/sampleData.ts#SAMPLE_CALENDAR_DAYS`
 * pour le compte `acc-demo-main`, afin que les agrégats calculés ici par
 * `@repo/core` restent comparables à l'écran Expo gelé — le solde/rendement
 * du Dashboard web, eux, sont désormais **calculés** (compte + période
 * réellement filtrables, ARCHITECTURE §5.5/§6.1) plutôt que des constantes
 * figées : ils ne reproduisent donc pas bit à bit `SAMPLE_DASHBOARD` (qui
 * n'était de toute façon pas dérivé de `SAMPLE_CALENDAR_DAYS` côté Expo,
 * les deux fixtures y étaient déjà indépendantes).
 */
export interface SampleTradeSeed {
  readonly id: string;
  readonly tradingDate: string;
  readonly symbol: string;
  readonly direction: 'long' | 'short';
  readonly netPnl: string;
}

/** Jours (sans trade forcément) où une entrée de journal existe — indépendant des trades, comme `apps/app`. */
export const SAMPLE_JOURNAL_TRADING_DAYS: Readonly<Record<SampleAccountId, readonly string[]>> = {
  'acc-demo-main': [
    '2026-08-05',
    '2026-08-10',
    '2026-08-13',
    '2026-08-17',
    '2026-08-20',
    '2026-08-25',
    '2026-08-28',
    '2026-09-01',
    '2026-09-03',
    '2026-09-04',
    '2026-09-08',
    '2026-09-10',
    '2026-09-11',
    '2026-09-15',
    '2026-09-17',
    '2026-09-18',
    '2026-09-19',
  ],
  'acc-demo-prop': [
    '2026-08-10',
    '2026-08-18',
    '2026-08-26',
    '2026-09-02',
    '2026-09-08',
    '2026-09-11',
    '2026-09-15',
    '2026-09-18',
  ],
};

const MAIN_SEEDS: readonly SampleTradeSeed[] = [
  {
    id: 'm-0803',
    tradingDate: '2026-08-03',
    symbol: 'EURUSD',
    direction: 'long',
    netPnl: '145.00',
  },
  {
    id: 'm-0804',
    tradingDate: '2026-08-04',
    symbol: 'GBPUSD',
    direction: 'short',
    netPnl: '-60.00',
  },
  {
    id: 'm-0805',
    tradingDate: '2026-08-05',
    symbol: 'XAUUSD',
    direction: 'long',
    netPnl: '220.50',
  },
  {
    id: 'm-0806',
    tradingDate: '2026-08-06',
    symbol: 'NAS100',
    direction: 'short',
    netPnl: '-110.25',
  },
  { id: 'm-0807', tradingDate: '2026-08-07', symbol: 'EURUSD', direction: 'long', netPnl: '80.00' },
  {
    id: 'm-0810',
    tradingDate: '2026-08-10',
    symbol: 'GBPUSD',
    direction: 'long',
    netPnl: '305.10',
  },
  {
    id: 'm-0811',
    tradingDate: '2026-08-11',
    symbol: 'XAUUSD',
    direction: 'short',
    netPnl: '-75.60',
  },
  {
    id: 'm-0812',
    tradingDate: '2026-08-12',
    symbol: 'NAS100',
    direction: 'long',
    netPnl: '130.40',
  },
  {
    id: 'm-0813',
    tradingDate: '2026-08-13',
    symbol: 'EURUSD',
    direction: 'short',
    netPnl: '-200.00',
  },
  { id: 'm-0814', tradingDate: '2026-08-14', symbol: 'GBPUSD', direction: 'long', netPnl: '90.75' },
  {
    id: 'm-0817',
    tradingDate: '2026-08-17',
    symbol: 'XAUUSD',
    direction: 'long',
    netPnl: '260.00',
  },
  {
    id: 'm-0818',
    tradingDate: '2026-08-18',
    symbol: 'NAS100',
    direction: 'short',
    netPnl: '-45.30',
  },
  {
    id: 'm-0819',
    tradingDate: '2026-08-19',
    symbol: 'EURUSD',
    direction: 'long',
    netPnl: '175.20',
  },
  {
    id: 'm-0820',
    tradingDate: '2026-08-20',
    symbol: 'GBPUSD',
    direction: 'short',
    netPnl: '-95.00',
  },
  {
    id: 'm-0821',
    tradingDate: '2026-08-21',
    symbol: 'XAUUSD',
    direction: 'long',
    netPnl: '310.00',
  },
  {
    id: 'm-0824',
    tradingDate: '2026-08-24',
    symbol: 'NAS100',
    direction: 'short',
    netPnl: '-140.00',
  },
  {
    id: 'm-0825',
    tradingDate: '2026-08-25',
    symbol: 'EURUSD',
    direction: 'long',
    netPnl: '220.00',
  },
  { id: 'm-0826', tradingDate: '2026-08-26', symbol: 'GBPUSD', direction: 'long', netPnl: '60.50' },
  {
    id: 'm-0827',
    tradingDate: '2026-08-27',
    symbol: 'XAUUSD',
    direction: 'short',
    netPnl: '-30.00',
  },
  {
    id: 'm-0828',
    tradingDate: '2026-08-28',
    symbol: 'NAS100',
    direction: 'long',
    netPnl: '150.00',
  },
  // Septembre : mêmes P&L par jour que `apps/app/features/calendar/sampleData.ts` (voir commentaire d'en-tête).
  {
    id: 'm-0901',
    tradingDate: '2026-09-01',
    symbol: 'EURUSD',
    direction: 'long',
    netPnl: '312.40',
  },
  {
    id: 'm-0902',
    tradingDate: '2026-09-02',
    symbol: 'GBPUSD',
    direction: 'short',
    netPnl: '-145.10',
  },
  {
    id: 'm-0904',
    tradingDate: '2026-09-04',
    symbol: 'XAUUSD',
    direction: 'long',
    netPnl: '208.90',
  },
  {
    id: 'm-0907',
    tradingDate: '2026-09-07',
    symbol: 'NAS100',
    direction: 'long',
    netPnl: '412.00',
  },
  {
    id: 'm-0908',
    tradingDate: '2026-09-08',
    symbol: 'EURUSD',
    direction: 'short',
    netPnl: '-88.25',
  },
  { id: 'm-0909', tradingDate: '2026-09-09', symbol: 'GBPUSD', direction: 'long', netPnl: '0' },
  {
    id: 'm-0910',
    tradingDate: '2026-09-10',
    symbol: 'XAUUSD',
    direction: 'short',
    netPnl: '156.60',
  },
  {
    id: 'm-0911',
    tradingDate: '2026-09-11',
    symbol: 'NAS100',
    direction: 'short',
    netPnl: '-322.75',
  },
  { id: 'm-0914', tradingDate: '2026-09-14', symbol: 'EURUSD', direction: 'long', netPnl: '94.10' },
  {
    id: 'm-0915',
    tradingDate: '2026-09-15',
    symbol: 'GBPUSD',
    direction: 'long',
    netPnl: '267.30',
  },
  {
    id: 'm-0917',
    tradingDate: '2026-09-17',
    symbol: 'XAUUSD',
    direction: 'short',
    netPnl: '-59.40',
  },
  {
    id: 'm-0918',
    tradingDate: '2026-09-18',
    symbol: 'NAS100',
    direction: 'long',
    netPnl: '331.20',
  },
  { id: 'm-0919', tradingDate: '2026-09-19', symbol: 'EURUSD', direction: 'long', netPnl: '0' },
];

const PROP_SEEDS: readonly SampleTradeSeed[] = [
  { id: 'p-0804', tradingDate: '2026-08-04', symbol: 'US30', direction: 'long', netPnl: '300.00' },
  {
    id: 'p-0806',
    tradingDate: '2026-08-06',
    symbol: 'US30',
    direction: 'short',
    netPnl: '-150.00',
  },
  { id: 'p-0810', tradingDate: '2026-08-10', symbol: 'GER40', direction: 'long', netPnl: '500.00' },
  {
    id: 'p-0812',
    tradingDate: '2026-08-12',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-90.00',
  },
  { id: 'p-0814', tradingDate: '2026-08-14', symbol: 'US30', direction: 'long', netPnl: '220.00' },
  {
    id: 'p-0818',
    tradingDate: '2026-08-18',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-400.00',
  },
  { id: 'p-0820', tradingDate: '2026-08-20', symbol: 'US30', direction: 'long', netPnl: '610.00' },
  {
    id: 'p-0824',
    tradingDate: '2026-08-24',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-75.00',
  },
  { id: 'p-0826', tradingDate: '2026-08-26', symbol: 'US30', direction: 'long', netPnl: '340.00' },
  {
    id: 'p-0828',
    tradingDate: '2026-08-28',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-60.00',
  },
  { id: 'p-0901', tradingDate: '2026-09-01', symbol: 'US30', direction: 'long', netPnl: '620.00' },
  { id: 'p-0902', tradingDate: '2026-09-02', symbol: 'GER40', direction: 'long', netPnl: '410.00' },
  {
    id: 'p-0904',
    tradingDate: '2026-09-04',
    symbol: 'US30',
    direction: 'short',
    netPnl: '-180.00',
  },
  { id: 'p-0907', tradingDate: '2026-09-07', symbol: 'GER40', direction: 'long', netPnl: '90.00' },
  { id: 'p-0908', tradingDate: '2026-09-08', symbol: 'US30', direction: 'long', netPnl: '340.00' },
  {
    id: 'p-0909',
    tradingDate: '2026-09-09',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-220.00',
  },
  { id: 'p-0911', tradingDate: '2026-09-11', symbol: 'US30', direction: 'long', netPnl: '150.00' },
  {
    id: 'p-0914',
    tradingDate: '2026-09-14',
    symbol: 'GER40',
    direction: 'short',
    netPnl: '-60.00',
  },
  { id: 'p-0915', tradingDate: '2026-09-15', symbol: 'US30', direction: 'long', netPnl: '480.00' },
  { id: 'p-0917', tradingDate: '2026-09-17', symbol: 'GER40', direction: 'long', netPnl: '200.00' },
  {
    id: 'p-0918',
    tradingDate: '2026-09-18',
    symbol: 'US30',
    direction: 'short',
    netPnl: '-310.00',
  },
  { id: 'p-0919', tradingDate: '2026-09-19', symbol: 'GER40', direction: 'long', netPnl: '125.00' },
];

export const SAMPLE_TRADE_SEEDS: Readonly<Record<SampleAccountId, readonly SampleTradeSeed[]>> = {
  'acc-demo-main': MAIN_SEEDS,
  'acc-demo-prop': PROP_SEEDS,
};

/** Heure arbitraire (14:00 UTC, session New York/Londres) attribuée à chaque trade factice — sans incidence sur le jour de trading (comptes factices en UTC, sans bascule). */
const SAMPLE_TRADE_HOUR = '14:00:00';

/**
 * Convertit un {@link SampleTradeSeed} en {@link TradeRecord} exploitable par
 * `@repo/core/aggregates`/`stats` : montant lu en chaîne puis converti par
 * `parseAmount` (ADR-016), jour de trading résolu par `tradingDayOf` (jamais
 * recalculé « à la main » dans la couche données).
 */
export function toSampleTradeRecord(
  accountId: SampleAccountId,
  seed: SampleTradeSeed,
): TradeRecord {
  const meta = SAMPLE_ACCOUNTS_META[accountId];
  const closedAt = new Date(`${seed.tradingDate}T${SAMPLE_TRADE_HOUR}Z`);
  const netPnl = parseAmount(seed.netPnl);
  const session: Session = classifySession(closedAt);

  return {
    id: seed.id,
    accountId,
    currency: meta.currency,
    symbol: seed.symbol,
    direction: seed.direction,
    status: 'closed',
    openedAt: closedAt,
    closedAt,
    tradingDay: tradingDayOf(closedAt, meta.timezone, meta.dayRolloverTime),
    grossPnl: netPnl,
    netPnl,
    rMultiple: null,
    commission: parseAmount('0'),
    fees: parseAmount('0'),
    quantity: parseAmount('1'),
    session,
  };
}

/**
 * Cache mémoire par compte (W-9 boucle 2, ADR-017) : `toSampleTradeRecord`
 * appelle `tradingDayOf` (`@repo/core/time`), qui formate l'horodatage via un
 * `Intl.DateTimeFormat` par fuseau ; ce formateur est lui-même mémoïsé
 * (`getCachedFormatter`/`getLocalTimeParts`, `packages/core/src/time/localTimeCache.ts`,
 * corrigé depuis — il ne reconstruit plus un formateur ni ne repasse par
 * `date-fns-tz` à chaque trade). Reste néanmoins un travail non nul par
 * trade (appel `Intl.DateTimeFormat#format`) : `SAMPLE_TRADE_SEEDS` est une
 * constante figée au chargement du module, donc recalculer les mêmes
 * `TradeRecord` à chaque appel (Dashboard *et* Calendrier, `staleTime` par
 * défaut à `0` → un refetch par navigation) reste un travail pur perdu,
 * jamais observable par l'appelant (résultat identique, comparé par valeur
 * dans les tests). Calculé une fois par compte, au premier appel.
 */
const sampleTradeRecordsCache = new Map<SampleAccountId, readonly TradeRecord[]>();

/** Tous les trades factices d'un compte, déjà convertis en {@link TradeRecord} (triés par jour d'origine, voir `sortTradesChronologically` côté `@repo/core` pour un ordre garanti). */
export function sampleTradeRecordsForAccount(accountId: SampleAccountId): readonly TradeRecord[] {
  const cached = sampleTradeRecordsCache.get(accountId);
  if (cached) return cached;
  const records = SAMPLE_TRADE_SEEDS[accountId].map((seed) => toSampleTradeRecord(accountId, seed));
  sampleTradeRecordsCache.set(accountId, records);
  return records;
}

/** Tous les identifiants de comptes factices connus (ordre stable, utilisé par le mode « Tous les comptes »). */
export const SAMPLE_ACCOUNT_IDS = Object.keys(SAMPLE_ACCOUNTS_META) as SampleAccountId[];

export function isSampleAccountId(value: string): value is SampleAccountId {
  return (SAMPLE_ACCOUNT_IDS as readonly string[]).includes(value);
}
