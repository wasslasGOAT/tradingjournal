import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import { groupExecutionsIntoTrades } from './groupExecutions';
import type { ExecutionInput, GroupingMethod, InstrumentContractInfo } from './types';
import {
  InstrumentCurrencyMismatchError,
  InvalidContractMultiplierError,
  InvalidExecutionError,
  UnknownInstrumentError,
} from './types';

function d(value: string): Decimal {
  return new Decimal(value);
}

const ACCOUNT = 'account-1';
const INSTRUMENT = 'EURUSD';
const ACCOUNT_CURRENCY = 'USD';

function instrumentsMap(
  entries: Record<string, Partial<InstrumentContractInfo>>,
): Map<string, InstrumentContractInfo> {
  return new Map(
    Object.entries(entries).map(([id, info]) => [
      id,
      {
        contractMultiplier: info.contractMultiplier ?? d('1'),
        quoteCurrency: info.quoteCurrency ?? ACCOUNT_CURRENCY,
      },
    ]),
  );
}

const NO_MULTIPLIER = instrumentsMap({ [INSTRUMENT]: {} });

function exec(
  overrides: Partial<ExecutionInput> & Pick<ExecutionInput, 'id' | 'side' | 'quantity' | 'price'>,
): ExecutionInput {
  return {
    accountId: ACCOUNT,
    instrumentId: INSTRUMENT,
    commission: d('0'),
    fees: d('0'),
    executedAt: new Date('2026-03-02T10:00:00Z'),
    ...overrides,
  };
}

function group(
  executions: ExecutionInput[],
  instruments: Map<string, InstrumentContractInfo>,
  method: GroupingMethod,
) {
  return groupExecutionsIntoTrades(executions, instruments, method, ACCOUNT_CURRENCY);
}

describe('groupExecutionsIntoTrades', () => {
  it('retourne un tableau vide pour aucune exécution', () => {
    expect(group([], NO_MULTIPLIER, 'fifo')).toEqual([]);
  });

  it('regroupe un aller-retour long simple (entrée + sortie exactes)', () => {
    const trades = group(
      [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('10'),
          price: d('100'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'sell',
          quantity: d('10'),
          price: d('110'),
          executedAt: new Date('2026-03-02T11:00:00Z'),
        }),
      ],
      NO_MULTIPLIER,
      'fifo',
    );
    expect(trades).toHaveLength(1);
    const [trade] = trades;
    expect(trade?.direction).toBe('long');
    expect(trade?.status).toBe('closed');
    expect(trade?.quantity.toString()).toBe('10');
    expect(trade?.avgEntry.toString()).toBe('100');
    expect(trade?.avgExit?.toString()).toBe('110');
    expect(trade?.grossPnl.toString()).toBe('100');
    expect(trade?.openedAt).toEqual(new Date('2026-03-02T09:00:00Z'));
    expect(trade?.closedAt).toEqual(new Date('2026-03-02T11:00:00Z'));
    expect(trade?.executionIds).toEqual(['e1', 'e2']);
  });

  it('regroupe un aller-retour court (short) simple', () => {
    const trades = group(
      [
        exec({ id: 'e1', side: 'sell', quantity: d('10'), price: d('100') }),
        exec({ id: 'e2', side: 'buy', quantity: d('10'), price: d('90') }),
      ],
      NO_MULTIPLIER,
      'fifo',
    );
    const [trade] = trades;
    expect(trade?.direction).toBe('short');
    expect(trade?.status).toBe('closed');
    // Profit court : vendu haut (100), racheté bas (90) -> +10 par unité.
    expect(trade?.grossPnl.toString()).toBe('100');
  });

  it('laisse un trade "open" sans sortie', () => {
    const trades = group(
      [exec({ id: 'e1', side: 'buy', quantity: d('5'), price: d('100') })],
      NO_MULTIPLIER,
      'fifo',
    );
    const [trade] = trades;
    expect(trade?.status).toBe('open');
    expect(trade?.closedAt).toBeNull();
    expect(trade?.avgExit).toBeNull();
    expect(trade?.quantity.toString()).toBe('5');
    expect(trade?.avgEntry.toString()).toBe('100');
    expect(trade?.grossPnl.toString()).toBe('0');
  });

  it('applique le multiplicateur de contrat au P&L brut', () => {
    const multiplier = instrumentsMap({ [INSTRUMENT]: { contractMultiplier: d('50') } }); // ex. future indiciel
    const trades = group(
      [
        exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('4000') }),
        exec({ id: 'e2', side: 'sell', quantity: d('1'), price: d('4010') }),
      ],
      multiplier,
      'fifo',
    );
    expect(trades[0]?.grossPnl.toString()).toBe('500'); // (4010-4000) * 1 * 50
  });

  it('rejette un instrument sans information fournie', () => {
    expect(() =>
      group(
        [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('100') })],
        new Map(),
        'fifo',
      ),
    ).toThrow(UnknownInstrumentError);
  });

  it('rejette un multiplicateur de contrat <= 0', () => {
    const badMultiplier = instrumentsMap({ [INSTRUMENT]: { contractMultiplier: d('0') } });
    expect(() =>
      group(
        [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('100') })],
        badMultiplier,
        'fifo',
      ),
    ).toThrow(InvalidContractMultiplierError);

    const negativeMultiplier = instrumentsMap({ [INSTRUMENT]: { contractMultiplier: d('-1') } });
    expect(() =>
      group(
        [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('100') })],
        negativeMultiplier,
        'fifo',
      ),
    ).toThrow(InvalidContractMultiplierError);
  });

  it('rejette un instrument coté dans une devise différente de celle du compte (limite MVP, ADR-019)', () => {
    const eurQuoted = instrumentsMap({ [INSTRUMENT]: { quoteCurrency: 'EUR' } });
    expect(() =>
      group(
        [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('100') })],
        eurQuoted,
        'fifo',
      ),
    ).toThrow(InstrumentCurrencyMismatchError);
  });

  describe('validation des exécutions', () => {
    it('rejette une quantité <= 0', () => {
      expect(() =>
        group(
          [exec({ id: 'e1', side: 'buy', quantity: d('0'), price: d('100') })],
          NO_MULTIPLIER,
          'fifo',
        ),
      ).toThrow(InvalidExecutionError);
    });

    it('rejette un prix <= 0', () => {
      expect(() =>
        group(
          [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('-1') })],
          NO_MULTIPLIER,
          'fifo',
        ),
      ).toThrow(InvalidExecutionError);
    });

    it('rejette une commission ou des frais négatifs', () => {
      expect(() =>
        group(
          [
            exec({
              id: 'e1',
              side: 'buy',
              quantity: d('1'),
              price: d('1'),
              commission: d('-0.01'),
            }),
          ],
          NO_MULTIPLIER,
          'fifo',
        ),
      ).toThrow(InvalidExecutionError);
      expect(() =>
        group(
          [exec({ id: 'e1', side: 'buy', quantity: d('1'), price: d('1'), fees: d('-0.01') })],
          NO_MULTIPLIER,
          'fifo',
        ),
      ).toThrow(InvalidExecutionError);
    });
  });

  it('répartit commission et frais au prorata sur une inversion de position (même exécution)', () => {
    // Long 10@100, puis vente de 15@110 : clôture les 10 restants ET ouvre un short de 5.
    const trades = group(
      [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('10'),
          price: d('100'),
          commission: d('1'),
          fees: d('0.5'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'sell',
          quantity: d('15'),
          price: d('110'),
          commission: d('3'),
          fees: d('1.5'),
          executedAt: new Date('2026-03-02T11:00:00Z'),
        }),
      ],
      NO_MULTIPLIER,
      'fifo',
    );

    expect(trades).toHaveLength(2);
    const [closedTrade, openTrade] = trades;

    // Trade clôturé : reçoit toute la commission/frais de e1 (qty 10 = 100 % de e1) + 10/15 de e2.
    expect(closedTrade?.status).toBe('closed');
    expect(closedTrade?.direction).toBe('long');
    expect(closedTrade?.quantity.toString()).toBe('10');
    expect(closedTrade?.grossPnl.toString()).toBe('100'); // 10 * (110-100)
    expect(closedTrade?.commission.toString()).toBe('3'); // 1 + (10/15)*3
    expect(closedTrade?.fees.toString()).toBe('1.5'); // 0.5 + (10/15)*1.5
    expect(closedTrade?.executionIds).toEqual(['e1', 'e2']);

    // Nouveau trade ouvert (inversion) : reçoit le reliquat 5/15 de e2 uniquement.
    expect(openTrade?.status).toBe('open');
    expect(openTrade?.direction).toBe('short');
    expect(openTrade?.quantity.toString()).toBe('5');
    expect(openTrade?.avgEntry.toString()).toBe('110');
    expect(openTrade?.openedAt).toEqual(new Date('2026-03-02T11:00:00Z'));
    expect(openTrade?.commission.toString()).toBe('1'); // (5/15)*3
    expect(openTrade?.fees.toString()).toBe('0.5'); // (5/15)*1.5
    expect(openTrade?.executionIds).toEqual(['e2']);
  });

  it('deux trades distincts quand la position revient exactement à zéro puis repart', () => {
    const trades = group(
      [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('10'),
          price: d('100'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'sell',
          quantity: d('10'),
          price: d('110'),
          executedAt: new Date('2026-03-02T10:00:00Z'),
        }),
        exec({
          id: 'e3',
          side: 'buy',
          quantity: d('5'),
          price: d('105'),
          executedAt: new Date('2026-03-02T12:00:00Z'),
        }),
      ],
      NO_MULTIPLIER,
      'fifo',
    );
    expect(trades).toHaveLength(2);
    expect(trades[0]?.status).toBe('closed');
    expect(trades[0]?.executionIds).toEqual(['e1', 'e2']);
    expect(trades[1]?.status).toBe('open');
    expect(trades[1]?.executionIds).toEqual(['e3']);
  });

  describe('méthode FIFO vs moyenne pondérée', () => {
    // Position construite en deux tranches à prix différents (10@100 puis 10@110),
    // puis sortie partielle de 10 @105, position encore ouverte (10 restants).
    function buildScenario(method: GroupingMethod) {
      return group(
        [
          exec({
            id: 'e1',
            side: 'buy',
            quantity: d('10'),
            price: d('100'),
            executedAt: new Date('2026-03-02T09:00:00Z'),
          }),
          exec({
            id: 'e2',
            side: 'buy',
            quantity: d('10'),
            price: d('110'),
            executedAt: new Date('2026-03-02T09:30:00Z'),
          }),
          exec({
            id: 'e3',
            side: 'sell',
            quantity: d('10'),
            price: d('105'),
            executedAt: new Date('2026-03-02T10:00:00Z'),
          }),
        ],
        NO_MULTIPLIER,
        method,
      )[0];
    }

    it('FIFO consomme le lot le plus ancien : prix de revient du reliquat = 110', () => {
      const trade = buildScenario('fifo');
      expect(trade?.status).toBe('open');
      expect(trade?.quantity.toString()).toBe('10');
      expect(trade?.avgEntry.toString()).toBe('110');
      expect(trade?.avgExit?.toString()).toBe('105');
      expect(trade?.grossPnl.toString()).toBe('50'); // 10 * (105 - 100), lot à 100 consommé
    });

    it('moyenne pondérée mélange les lots : prix de revient du reliquat reste le prix mélangé (105)', () => {
      const trade = buildScenario('average');
      expect(trade?.status).toBe('open');
      expect(trade?.quantity.toString()).toBe('10');
      expect(trade?.avgEntry.toString()).toBe('105'); // (10*100 + 10*110) / 20
      expect(trade?.avgExit?.toString()).toBe('105');
      expect(trade?.grossPnl.toString()).toBe('0'); // vendu exactement au prix moyen mélangé
    });

    it('les deux méthodes donnent le même résultat agrégé une fois le trade totalement clôturé', () => {
      const executions: ExecutionInput[] = [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('10'),
          price: d('100'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'buy',
          quantity: d('10'),
          price: d('110'),
          executedAt: new Date('2026-03-02T09:30:00Z'),
        }),
        exec({
          id: 'e3',
          side: 'sell',
          quantity: d('10'),
          price: d('105'),
          executedAt: new Date('2026-03-02T10:00:00Z'),
        }),
        exec({
          id: 'e4',
          side: 'buy',
          quantity: d('5'),
          price: d('120'),
          executedAt: new Date('2026-03-02T10:30:00Z'),
        }),
        exec({
          id: 'e5',
          side: 'sell',
          quantity: d('15'),
          price: d('115'),
          executedAt: new Date('2026-03-02T11:00:00Z'),
        }),
      ];
      const fifoTrade = group(executions, NO_MULTIPLIER, 'fifo')[0];
      const averageTrade = group(executions, NO_MULTIPLIER, 'average')[0];
      expect(fifoTrade?.status).toBe('closed');
      expect(averageTrade?.status).toBe('closed');
      expect(fifoTrade?.quantity.toString()).toBe('25');
      expect(fifoTrade?.avgEntry.toString()).toBe('108'); // 2700/25
      expect(fifoTrade?.avgExit?.toString()).toBe('111'); // 2775/25
      expect(fifoTrade?.grossPnl.toString()).toBe('75');
      expect(averageTrade?.quantity.toString()).toBe(fifoTrade?.quantity.toString());
      expect(averageTrade?.avgEntry.toString()).toBe(fifoTrade?.avgEntry.toString());
      expect(averageTrade?.avgExit?.toString()).toBe(fifoTrade?.avgExit?.toString());
      expect(averageTrade?.grossPnl.toString()).toBe(fifoTrade?.grossPnl.toString());
    });

    it('régression revue M3 #1 : achat 1@10, achat 2@11, vente 1@10, vente 2@11 -> grossPnl EXACTEMENT 0 (FIFO et moyenne)', () => {
      const executions: ExecutionInput[] = [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('1'),
          price: d('10'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'buy',
          quantity: d('1'),
          price: d('11'),
          executedAt: new Date('2026-03-02T09:05:00Z'),
        }),
        exec({
          id: 'e3',
          side: 'sell',
          quantity: d('1'),
          price: d('10'),
          executedAt: new Date('2026-03-02T09:10:00Z'),
        }),
        exec({
          id: 'e4',
          side: 'sell',
          quantity: d('1'),
          price: d('11'),
          executedAt: new Date('2026-03-02T09:15:00Z'),
        }),
      ];
      const fifoTrade = group(executions, NO_MULTIPLIER, 'fifo')[0];
      const averageTrade = group(executions, NO_MULTIPLIER, 'average')[0];
      expect(fifoTrade?.status).toBe('closed');
      expect(averageTrade?.status).toBe('closed');
      // toString() (pas toFixed(n)) : vérifie qu'il n'y a AUCUN résidu, même infime (ex. "-1e-38").
      expect(fifoTrade?.grossPnl.toString()).toBe('0');
      expect(averageTrade?.grossPnl.toString()).toBe('0');
    });

    it("régression revue M3 #1 bis : lots à prix non ronds (moyenne pondérée), grossPnl clôturé exact sans résidu d'arrondi", () => {
      // Moyenne d'entrée non terminale ((10 + 2*11)/3 = 32/3, périodique à 40 chiffres) :
      // c'est exactement le cas qui faisait dériver l'ancienne implémentation
      // (prix moyen divisé/arrondi puis remultiplié), corrigé en suivant le coût
      // total du lot plutôt qu'un prix divisé.
      const executions: ExecutionInput[] = [
        exec({
          id: 'e1',
          side: 'buy',
          quantity: d('1'),
          price: d('10'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
        exec({
          id: 'e2',
          side: 'buy',
          quantity: d('2'),
          price: d('11'),
          executedAt: new Date('2026-03-02T09:05:00Z'),
        }),
        exec({
          id: 'e3',
          side: 'sell',
          quantity: d('3'),
          price: d('12'),
          executedAt: new Date('2026-03-02T09:10:00Z'),
        }),
      ];
      const averageTrade = group(executions, NO_MULTIPLIER, 'average')[0];
      expect(averageTrade?.status).toBe('closed');
      // Notionnels exacts : entrée = 10 + 22 = 32, sortie = 36 -> grossPnl = 36 - 32 = 4, exact.
      expect(averageTrade?.grossPnl.toString()).toBe('4');
    });
  });

  it('regroupe indépendamment plusieurs (compte, instrument) et trie le résultat par openedAt', () => {
    const trades = group(
      [
        exec({
          id: 'a2',
          accountId: 'account-2',
          instrumentId: 'GBPUSD',
          side: 'buy',
          quantity: d('1'),
          price: d('1.3'),
          executedAt: new Date('2026-03-02T08:00:00Z'),
        }),
        exec({
          id: 'a1',
          side: 'buy',
          quantity: d('1'),
          price: d('100'),
          executedAt: new Date('2026-03-02T09:00:00Z'),
        }),
      ],
      instrumentsMap({ [INSTRUMENT]: {}, GBPUSD: {} }),
      'fifo',
    );
    expect(trades).toHaveLength(2);
    expect(trades[0]?.instrumentId).toBe('GBPUSD');
    expect(trades[1]?.instrumentId).toBe(INSTRUMENT);
  });

  it('départage un horodatage identique par id (ordre déterministe) quand la position part de zéro', () => {
    const sameInstant = new Date('2026-03-02T09:00:00Z');
    const trades = group(
      [
        exec({ id: 'b', side: 'sell', quantity: d('5'), price: d('110'), executedAt: sameInstant }),
        exec({ id: 'a', side: 'buy', quantity: d('5'), price: d('100'), executedAt: sameInstant }),
      ],
      NO_MULTIPLIER,
      'fifo',
    );
    // Trié par id ('a' avant 'b') malgré un ordre d'entrée inverse -> 'a' (achat) ouvre le trade.
    expect(trades).toHaveLength(1);
    expect(trades[0]?.direction).toBe('long');
    expect(trades[0]?.executionIds).toEqual(['a', 'b']);
  });

  describe('revue M3 #3 — ordre déterministe à horodatage égal', () => {
    it('à défaut de séquence, une entrée qui augmente la position passe avant une sortie qui la réduit, même si son id est alphabétiquement postérieur', () => {
      const sameInstant = new Date('2026-03-02T09:00:00Z');
      const trades = group(
        [
          exec({
            id: 'open-1',
            side: 'buy',
            quantity: d('10'),
            price: d('100'),
            executedAt: new Date('2026-03-02T08:00:00Z'),
          }),
          // Au même instant : 'aaa-exit' (id alphabétiquement premier) réduit la position,
          // 'zzz-entry' (id alphabétiquement dernier) l'augmente. Sans la règle
          // "augmente avant réduit", un tri par id traiterait 'aaa-exit' en premier,
          // ce qui clôturerait le trade avant que l'entrée ne soit prise en compte.
          exec({
            id: 'zzz-entry',
            side: 'buy',
            quantity: d('5'),
            price: d('101'),
            executedAt: sameInstant,
          }),
          exec({
            id: 'aaa-exit',
            side: 'sell',
            quantity: d('15'),
            price: d('105'),
            executedAt: sameInstant,
          }),
        ],
        NO_MULTIPLIER,
        'fifo',
      );
      // Ordre correct : open-1 (10) + zzz-entry (5) = 15 en position, puis aaa-exit (15) clôture tout en un seul trade.
      expect(trades).toHaveLength(1);
      expect(trades[0]?.status).toBe('closed');
      expect(trades[0]?.quantity.toString()).toBe('15');
      expect(trades[0]?.executionIds).toEqual(['open-1', 'zzz-entry', 'aaa-exit']);
    });

    it('la séquence explicite prime sur id/sens quand fournie', () => {
      const sameInstant = new Date('2026-03-02T09:00:00Z');
      const trades = group(
        [
          exec({
            id: 'open-1',
            side: 'buy',
            quantity: d('10'),
            price: d('100'),
            executedAt: new Date('2026-03-02T08:00:00Z'),
          }),
          // sequence force aaa-exit (réduction) avant zzz-entry (augmentation), malgré la règle par défaut.
          exec({
            id: 'aaa-exit',
            side: 'sell',
            quantity: d('10'),
            price: d('105'),
            executedAt: sameInstant,
            sequence: 1,
          }),
          exec({
            id: 'zzz-entry',
            side: 'buy',
            quantity: d('5'),
            price: d('101'),
            executedAt: sameInstant,
            sequence: 2,
          }),
        ],
        NO_MULTIPLIER,
        'fifo',
      );
      // aaa-exit clôture le trade ouvert par open-1 ; zzz-entry (sequence 2) ouvre un nouveau trade.
      expect(trades).toHaveLength(2);
      expect(trades[0]?.status).toBe('closed');
      expect(trades[0]?.executionIds).toEqual(['open-1', 'aaa-exit']);
      expect(trades[1]?.status).toBe('open');
      expect(trades[1]?.executionIds).toEqual(['zzz-entry']);
    });
  });
});
