import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

import type { DateRangeShortcut, TradingDayRange } from '@/components/ui/date-range-shortcuts';
import { resolveDateRangeShortcut } from '@/components/ui/date-range-shortcuts';

/**
 * Filtres globaux du header (W-5, ARCHITECTURE §6.1) : compte sélectionné
 * (`'all'` = « Tous les comptes ») et période — reflétés dans l'URL en
 * paramètres de recherche typés (`src/routes/_shell.tsx`, ADR-024), source de
 * vérité unique lue par le header et (plus tard) par les clés de requête
 * TanStack Query (compte + période, ADR-017 : « aucune donnée périmée
 * visible »). Pas de store Zustand séparé : dupliquer l'état entre l'URL et
 * un store créerait deux sources de vérité à resynchroniser.
 */
export interface ShellSearch {
  readonly account: string;
  readonly from: TradingDay;
  readonly to: TradingDay;
  readonly shortcut: DateRangeShortcut;
}

const DATE_RANGE_SHORTCUTS: readonly DateRangeShortcut[] = [
  'today',
  'last7Days',
  'currentMonth',
  'previousMonth',
  'custom',
];

function isTradingDayLike(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDateRangeShortcut(value: unknown): value is DateRangeShortcut {
  return typeof value === 'string' && (DATE_RANGE_SHORTCUTS as readonly string[]).includes(value);
}

/**
 * Date locale de l'appareil au format `TradingDay` (`YYYY-MM-DD`) —
 * approximation du « jour de trading » en attendant le vrai calcul par
 * compte (fuseau + heure de bascule, `@repo/core/time#tradingDayOf`, M2+).
 * Copie de `apps/app/features/shell/filterStore.ts#resolveApproximateToday`
 * (gelé, ADR-023).
 */
export function resolveApproximateToday(): TradingDay {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return toTradingDay(`${year}-${month}-${day}`);
}

/**
 * Valide/normalise les paramètres de recherche de la disposition `_shell`
 * (TanStack Router `validateSearch`, ADR-024) : toute valeur absente ou
 * invalide retombe sur le mois en cours — jamais de plage indéfinie affichée.
 */
export function validateShellSearch(search: Record<string, unknown>): ShellSearch {
  const today = resolveApproximateToday();
  const defaultRange = resolveDateRangeShortcut('currentMonth', today);
  const shortcut = isDateRangeShortcut(search.shortcut) ? search.shortcut : 'currentMonth';
  const from = isTradingDayLike(search.from) ? toTradingDay(search.from) : defaultRange.start;
  const to = isTradingDayLike(search.to) ? toTradingDay(search.to) : defaultRange.end;
  const account =
    typeof search.account === 'string' && search.account.length > 0 ? search.account : 'all';

  return { account, from, to, shortcut };
}

/** Convertit les filtres de recherche en `TradingDayRange` (`DateRangePicker`). */
export function shellSearchToRange(search: ShellSearch): TradingDayRange {
  return { start: search.from, end: search.to };
}
