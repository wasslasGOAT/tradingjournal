import { z } from 'zod';

import { amountString, isNonNegativeAmountString, uuid } from './common';

/** Type de mouvement de trésorerie (DATA_MODEL `cash_movements.type`, `packages/core/trading` `CashMovementType`). */
export const CASH_MOVEMENT_TYPES = ['deposit', 'withdrawal', 'payout', 'fee', 'adjustment'] as const;
export const cashMovementType = z.enum(CASH_MOVEMENT_TYPES);

/**
 * Formulaire de mouvement de trésorerie (DATA_MODEL `cash_movements`,
 * ROADMAP M2). `amount` est une **magnitude non signée** pour
 * `deposit`/`withdrawal`/`payout`/`fee` — même convention que
 * `packages/core/trading` `signedCashMovementAmount`, qui applique le signe
 * selon `type` — et une valeur **signée libre** pour `adjustment` (correction
 * manuelle pouvant aller dans les deux sens).
 */
export const cashMovementFormSchema = z
  .object({
    accountId: uuid,
    type: cashMovementType,
    amount: amountString,
    occurredAt: z.iso.datetime(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.type === 'adjustment' || isNonNegativeAmountString(v.amount), {
    message: 'Le montant doit être une magnitude positive ou nulle pour ce type de mouvement.',
    path: ['amount'],
  });

export type CashMovementFormInput = z.infer<typeof cashMovementFormSchema>;
