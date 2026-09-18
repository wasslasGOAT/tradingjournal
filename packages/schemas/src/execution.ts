import { z } from 'zod';

import { amountString, isNonNegativeAmountString, isPositiveAmountString, uuid } from './common';

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
  /** Quantité, doit être strictement positive (`packages/core/trading` `InvalidExecutionError`). */
  quantity: amountString.refine(isPositiveAmountString, 'La quantité doit être strictement positive.'),
  /** Prix d'exécution, doit être strictement positif. */
  price: amountString.refine(isPositiveAmountString, 'Le prix doit être strictement positif.'),
  commission: amountString.refine(isNonNegativeAmountString, 'La commission ne peut pas être négative.').default('0'),
  fees: amountString.refine(isNonNegativeAmountString, 'Les frais ne peuvent pas être négatifs.').default('0'),
  executedAt: z.iso.datetime(),
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
