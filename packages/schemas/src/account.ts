import { z } from 'zod';

import { amountString, currencyCode, isPositiveAmountString, VALIDATION_KEYS } from './common';

/** Type de compte (DATA_MODEL `accounts.kind`, ROADMAP M2). */
export const ACCOUNT_KINDS = [
  'personal',
  'demo',
  'backtest',
  'prop_challenge',
  'prop_funded',
  'paper',
] as const;
export const accountKind = z.enum(ACCOUNT_KINDS);

/** Méthode de regroupement des exécutions en trades (DATA_MODEL `accounts.grouping_method`, ADR-004). */
export const GROUPING_METHODS = ['fifo', 'average'] as const;
export const groupingMethod = z.enum(GROUPING_METHODS);

/**
 * Heure de bascule du jour de trading `HH:mm` ou `HH:mm:ss` (DATA_MODEL
 * `accounts.day_rollover_time`), même motif que `packages/core/time`
 * `tradingDayOf` (`ROLLOVER_TIME_PATTERN`, non exporté par `@repo/core` — ce
 * motif est la source de vérité côté formulaire, la validation stricte des
 * bornes horaires reste dans `@repo/core`).
 */
export const dayRolloverTime = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/,
    VALIDATION_KEYS.ACCOUNT_DAY_ROLLOVER_TIME_INVALID,
  );

/**
 * Fuseau IANA (DATA_MODEL `accounts.timezone`), ex. `"Europe/Paris"`. Validé
 * au format (au moins un `/`, ou `"UTC"`) — la validation stricte (identifiant
 * IANA reconnu) reste faite par `packages/core/time` `tradingDayOf`
 * (`Intl.DateTimeFormat`, non disponible dans un schéma zod pur).
 */
export const timezoneName = z
  .string()
  .regex(/^([A-Za-z_]+\/[A-Za-z_/-]+|UTC)$/, VALIDATION_KEYS.ACCOUNT_TIMEZONE_INVALID);

/**
 * Formulaire de création/édition d'un compte (DATA_MODEL `accounts`, ROADMAP
 * M2). Ne couvre pas les colonnes post-MVP (`connection_id`, `rule_set_id`,
 * `rule_set_params`) ni les colonnes générées côté base (`id`, `user_id`,
 * `created_at`, `updated_at`).
 */
export const accountFormSchema = z.object({
  name: z.string().trim().min(1, VALIDATION_KEYS.ACCOUNT_NAME_REQUIRED).max(100),
  kind: accountKind,
  broker: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(100).optional(),
  externalAccountId: z.string().trim().max(100).optional(),
  currency: currencyCode,
  /**
   * Solde initial, doit être strictement positif (revue M3 #12) : un compte
   * de trading sans capital n'a pas de sens métier, et `0` casse
   * `packages/core/trading` `computeReturnRate` (rendement indéfini, division
   * par zéro) ainsi que le pourcentage de drawdown (référence de pic nulle).
   */
  startingBalance: amountString.refine(
    isPositiveAmountString,
    VALIDATION_KEYS.ACCOUNT_STARTING_BALANCE_POSITIVE,
  ),
  /** Date de début (jour civil, pas d'heure) — DATA_MODEL `accounts.starting_date`. */
  startingDate: z.iso.date(),
  timezone: timezoneName,
  dayRolloverTime,
  groupingMethod,
  isArchived: z.boolean().default(false),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;
