import { z } from 'zod';

import { amountString, isPositiveAmountString, uuid } from './common';
import { executionFormSchema } from './execution';

/** Sens d'un trade (DATA_MODEL `trades.direction`). */
export const TRADE_DIRECTIONS = ['long', 'short'] as const;
export const tradeDirection = z.enum(TRADE_DIRECTIONS);

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
export const tradeFormSchema = z.object({
  accountId: uuid,
  instrumentId: uuid,
  direction: tradeDirection,
  /** Au moins une exécution (position encore ouverte acceptée dès la création). */
  executions: z.array(executionFormSchema).min(1, 'Au moins une exécution est requise.'),
  /** Distance du stop, en prix — DATA_MODEL `trades.stop_loss`. */
  stopLoss: amountString.optional(),
  /** Distance de l'objectif, en prix — DATA_MODEL `trades.take_profit`. */
  takeProfit: amountString.optional(),
  /** Risque initial en valeur monétaire (voir `packages/core/trading` `computeRMultiple`), doit être strictement positif si fourni. */
  initialRisk: amountString.refine(isPositiveAmountString, 'Le risque initial doit être strictement positif.').optional(),
  /** Setup nommé — DATA_MODEL `trades.setup`. */
  setup: z.string().trim().max(100).optional(),
  /** Note libre à la création, écrite dans `trade_notes` (ROADMAP M4/M6). */
  note: z.string().trim().max(5000).optional(),
  /** Confluences cochées à la saisie (checklist pré-trade, ROADMAP M8), ids de `tags`. */
  tagIds: z.array(uuid).default([]),
  /** Auto-évaluation d'exécution, 1 à 5 — DATA_MODEL `trades.rating`. */
  rating: z.int().min(1).max(5).optional(),
});

export type TradeFormInput = z.infer<typeof tradeFormSchema>;
