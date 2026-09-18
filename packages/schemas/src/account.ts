import { z } from 'zod';

import { amountString, currencyCode } from './common';

/** Type de compte (DATA_MODEL `accounts.kind`, ROADMAP M2). */
export const ACCOUNT_KINDS = ['personal', 'demo', 'backtest', 'prop_challenge', 'prop_funded', 'paper'] as const;
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
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Heure de bascule invalide : attendu "HH:mm" ou "HH:mm:ss".');

/**
 * Fuseau IANA (DATA_MODEL `accounts.timezone`), ex. `"Europe/Paris"`. Validé
 * au format (au moins un `/`, ou `"UTC"`) — la validation stricte (identifiant
 * IANA reconnu) reste faite par `packages/core/time` `tradingDayOf`
 * (`Intl.DateTimeFormat`, non disponible dans un schéma zod pur).
 */
export const timezoneName = z
  .string()
  .regex(/^([A-Za-z_]+\/[A-Za-z_/-]+|UTC)$/, 'Fuseau invalide : attendu un identifiant IANA (ex. "Europe/Paris") ou "UTC".');

/**
 * Formulaire de création/édition d'un compte (DATA_MODEL `accounts`, ROADMAP
 * M2). Ne couvre pas les colonnes post-MVP (`connection_id`, `rule_set_id`,
 * `rule_set_params`) ni les colonnes générées côté base (`id`, `user_id`,
 * `created_at`, `updated_at`).
 */
export const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du compte est requis.').max(100),
  kind: accountKind,
  broker: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(100).optional(),
  externalAccountId: z.string().trim().max(100).optional(),
  currency: currencyCode,
  startingBalance: amountString,
  /** Date de début (jour civil, pas d'heure) — DATA_MODEL `accounts.starting_date`. */
  startingDate: z.iso.date(),
  timezone: timezoneName,
  dayRolloverTime,
  groupingMethod,
  isArchived: z.boolean().default(false),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;
