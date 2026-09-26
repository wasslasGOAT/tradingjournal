import { z } from 'zod';

import {
  amountString,
  isNonNegativeAmountString,
  isPositiveAmountString,
  quantityString,
  uuid,
  VALIDATION_KEYS,
} from './common';

/** Sens d'une exécution (DATA_MODEL `executions.side`). */
export const EXECUTION_SIDES = ['buy', 'sell'] as const;
export const executionSide = z.enum(EXECUTION_SIDES);

/**
 * Champs d'une exécution saisis dans le formulaire de trade (mode avancé,
 * exécutions partielles — ROADMAP M4). Sous-ensemble de DATA_MODEL
 * `executions` : n'inclut pas les colonnes générées ou liées à l'import
 * (`id`, `account_id`, `instrument_id`, `trade_id`, `external_id`,
 * `import_id`, `dedupe_hash`) — celles-ci sont ajoutées par l'appelant
 * (formulaire parent) avant écriture.
 */
export const executionFormSchema = z.object({
  side: executionSide,
  /** Quantité, doit être strictement positive (`packages/core/trading` `InvalidExecutionError`) ; échelle `numeric(24,8)`. */
  quantity: quantityString.refine(
    isPositiveAmountString,
    VALIDATION_KEYS.EXECUTION_QUANTITY_POSITIVE,
  ),
  /** Prix d'exécution, doit être strictement positif ; échelle `numeric(20,8)`. */
  price: amountString.refine(isPositiveAmountString, VALIDATION_KEYS.EXECUTION_PRICE_POSITIVE),
  commission: amountString
    .refine(isNonNegativeAmountString, VALIDATION_KEYS.EXECUTION_COMMISSION_NON_NEGATIVE)
    .default('0'),
  fees: amountString
    .refine(isNonNegativeAmountString, VALIDATION_KEYS.EXECUTION_FEES_NON_NEGATIVE)
    .default('0'),
  executedAt: z.iso.datetime(),
  /**
   * Ordre de saisie optionnel, pour départager deux exécutions au même
   * `executedAt` — même convention que `packages/core/trading`
   * `ExecutionInput.sequence` : doit être fourni par toute source qui produit
   * des horodatages identiques (formulaire, import CSV, synchro) ; utilisé
   * dès maintenant par {@link tradeFormSchema} (`superRefine`) pour trier les
   * exécutions dans le même ordre que `groupExecutionsIntoTrades` avant de
   * vérifier leur cohérence. Persistance en base prévue en M4 (ADR à venir).
   */
  sequence: z.number().int().optional(),
});

export type ExecutionFormInput = z.infer<typeof executionFormSchema>;

/**
 * Exécution complète (DATA_MODEL `executions`), pour les cas où le compte et
 * l'instrument ne sont pas déjà portés par un formulaire parent (ex. import,
 * appel direct hors formulaire de trade).
 */
export const executionSchema = executionFormSchema.extend({
  accountId: uuid,
  instrumentId: uuid,
});

export type ExecutionInput = z.infer<typeof executionSchema>;
