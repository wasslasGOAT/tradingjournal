import { z } from 'zod';

import {
  amountString,
  AMOUNT_STRING_PATTERN,
  isPositiveAmountString,
  QUANTITY_NUMERIC_SCALE,
  toScaledBigInt,
  uuid,
  VALIDATION_KEYS,
} from './common';
import { executionFormSchema } from './execution';

/** Sens d'un trade (DATA_MODEL `trades.direction`). */
export const TRADE_DIRECTIONS = ['long', 'short'] as const;
export const tradeDirection = z.enum(TRADE_DIRECTIONS);

/**
 * Signe (`1`/`-1`) associé à un sens d'exécution, pour la vérification de
 * cohérence de {@link tradeFormSchema} (voir plus bas) — même convention que
 * `packages/core/trading` `groupExecutionsIntoTrades` (`positionSign`).
 */
function executionSign(side: 'buy' | 'sell'): 1 | -1 {
  return side === 'buy' ? 1 : -1;
}

/**
 * Formulaire de saisie manuelle d'un trade (ROADMAP M4) : mode simple
 * (2 `executions`, entrée + sortie) ou mode avancé (`executions` partielles,
 * autant d'entrées/sorties que nécessaire). Ne porte **aucune** colonne
 * calculée de DATA_MODEL `trades` (`avg_entry`, `avg_exit`, `gross_pnl`,
 * `net_pnl`, `r_multiple`, `session`, `trading_day`…) : ces valeurs sont
 * produites par `packages/core/trading` (`groupExecutionsIntoTrades`,
 * `computeNetPnl`, `computeRMultiple`) à partir de ce formulaire, avant
 * écriture (ADR-016 — aucun calcul en SQL).
 */
export const tradeFormSchema = z
  .object({
    accountId: uuid,
    instrumentId: uuid,
    direction: tradeDirection,
    /** Au moins une exécution (position encore ouverte acceptée dès la création). */
    executions: z.array(executionFormSchema).min(1, VALIDATION_KEYS.TRADE_EXECUTIONS_REQUIRED),
    /** Niveau de prix du stop (pas une distance), doit être strictement positif — DATA_MODEL `trades.stop_loss`. */
    stopLoss: amountString
      .refine(isPositiveAmountString, VALIDATION_KEYS.TRADE_STOP_LOSS_POSITIVE)
      .optional(),
    /** Niveau de prix de l'objectif (pas une distance), doit être strictement positif — DATA_MODEL `trades.take_profit`. */
    takeProfit: amountString
      .refine(isPositiveAmountString, VALIDATION_KEYS.TRADE_TAKE_PROFIT_POSITIVE)
      .optional(),
    /** Risque initial en valeur monétaire (voir `packages/core/trading` `computeRMultiple`), doit être strictement positif si fourni. */
    initialRisk: amountString
      .refine(isPositiveAmountString, VALIDATION_KEYS.TRADE_INITIAL_RISK_POSITIVE)
      .optional(),
    /** Setup nommé — DATA_MODEL `trades.setup`. */
    setup: z.string().trim().max(100).optional(),
    /** Note libre à la création, écrite dans `trade_notes` (ROADMAP M4/M6). */
    note: z.string().trim().max(5000).optional(),
    /** Confluences cochées à la saisie (checklist pré-trade, ROADMAP M8), ids de `tags`. */
    tagIds: z.array(uuid).default([]),
    /** Auto-évaluation d'exécution, 1 à 5 — DATA_MODEL `trades.rating`. */
    rating: z.int().min(1).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    // Revue M3 (boucle 2) #2 : le contrôle ci-dessous doit suivre l'ordre
    // CHRONOLOGIQUE des exécutions, pas l'ordre de saisie du tableau — sinon
    // une exécution saisie en premier mais horodatée après une autre
    // passerait à tort le contrôle de première exécution / d'inversion, alors
    // que `packages/core/trading` `groupExecutionsIntoTrades` (qui trie par
    // `executedAt`) verrait un ordre différent. Tri par `executedAt`, puis
    // par `sequence` (si les deux exécutions comparées en portent une — voir
    // `executionFormSchema` `sequence`), puis par position de saisie
    // d'origine (tri stable, à défaut d'autre critère : pas d'id de
    // formulaire à comparer ici, contrairement à `compareBySequenceThenId`
    // côté `@repo/core`). Les `path` des erreurs ci-dessous pointent vers la
    // position d'origine dans `data.executions` (celle que l'UI affiche),
    // jamais vers la position triée.
    const indexed = data.executions.map((execution, originalIndex) => ({
      execution,
      originalIndex,
    }));
    const sorted = [...indexed].sort((a, b) => {
      const diff = Date.parse(a.execution.executedAt) - Date.parse(b.execution.executedAt);
      if (diff !== 0) return diff;
      if (
        a.execution.sequence !== undefined &&
        b.execution.sequence !== undefined &&
        a.execution.sequence !== b.execution.sequence
      ) {
        return a.execution.sequence - b.execution.sequence;
      }
      return a.originalIndex - b.originalIndex;
    });

    const [first] = sorted;
    if (!first) return; // `executions` non vide déjà garanti par `.min(1)` ci-dessus.

    // Cohérence direction / première exécution CHRONOLOGIQUE (revue M3 #12) :
    // un trade 'long' doit s'ouvrir par un achat, un trade 'short' par une
    // vente — même convention que `packages/core/trading`
    // `groupExecutionsIntoTrades` (`positionSign` déduit du premier fill).
    const expectedFirstSide = data.direction === 'long' ? 'buy' : 'sell';
    if (first.execution.side !== expectedFirstSide) {
      ctx.addIssue({
        code: 'custom',
        message: VALIDATION_KEYS.TRADE_DIRECTION_MISMATCH,
        path: ['executions', first.originalIndex, 'side'],
      });
      return; // La vérification d'inversion ci-dessous suppose une direction cohérente.
    }

    // Refus d'une inversion de position au sein d'un même formulaire de
    // trade (revue M3 #12) : ce formulaire représente UN SEUL trade
    // (round-trip) ; si la position revient à plat puis repart (ou change de
    // sens) à ou avant la dernière exécution saisie, c'est en réalité deux
    // trades distincts (voir `packages/core/trading`
    // `groupExecutionsIntoTrades`, qui scinderait ce cas en deux
    // `GroupedTrade`). Calcul en `BigInt` (échelle commune `numeric(24,8)`),
    // jamais en `number` (ADR-005).
    //
    // Revue M3 (boucle 2) #1 (BLOQUANT) : une inversion sur la DERNIÈRE
    // exécution doit aussi être refusée — seule une position qui revient
    // EXACTEMENT à plat (`sign === 0`) sur la dernière exécution est
    // acceptée ; un dépassement de signe (`sign !== 0 && sign !== startSign`),
    // même à la dernière exécution, reste une inversion.
    const startSign = executionSign(expectedFirstSide);
    let runningQuantity = 0n;
    for (let position = 0; position < sorted.length; position += 1) {
      const entry = sorted[position];
      if (!entry) continue;
      const { execution, originalIndex } = entry;
      if (!AMOUNT_STRING_PATTERN.test(execution.quantity)) continue; // déjà rejeté par `quantityString` ailleurs.
      const magnitude = toScaledBigInt(execution.quantity, QUANTITY_NUMERIC_SCALE);
      const delta = executionSign(execution.side) === 1 ? magnitude : -magnitude;
      runningQuantity += delta;

      const isLast = position === sorted.length - 1;
      const sign = runningQuantity === 0n ? 0 : runningQuantity > 0n ? 1 : -1;
      if ((!isLast && sign === 0) || (sign !== 0 && sign !== startSign)) {
        ctx.addIssue({
          code: 'custom',
          message: VALIDATION_KEYS.TRADE_INVERSION_NOT_ALLOWED,
          path: ['executions', originalIndex],
        });
        return;
      }
    }
  });

export type TradeFormInput = z.infer<typeof tradeFormSchema>;
