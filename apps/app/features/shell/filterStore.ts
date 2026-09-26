import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';
import { resolveDateRangeShortcut } from '@repo/ui';
import type { DateRangeShortcut, TradingDayRange } from '@repo/ui';
import { create } from 'zustand';

/**
 * Filtres globaux du header (M1-4/M1-8, ARCHITECTURE §6.1) : compte
 * sélectionné (`'all'` = « Tous les comptes ») et période (`DateRangePicker`,
 * `packages/ui`, M1-4 — remplace l'ancien réglage jour/semaine/mois/année),
 * partagés par tous les écrans de données (dashboard, calendrier, trades…).
 *
 * État en mémoire uniquement pour l'instant (persistance réelle + reflet
 * dans les préférences utilisateur : M2). Pas de reflet dans l'URL sur le web
 * non plus pour l'instant (pas de hook dédié — à ajouter si besoin, M2+) :
 * ce store reste la source de vérité unique, lue aussi bien par le header que
 * par les futures clés de requête TanStack Query (compte + période, ADR-017 :
 * « aucune donnée périmée visible »).
 */

/** `'all'` (Tous les comptes) ou l'identifiant d'un compte (`sampleAccounts`, M2 : `accounts.id`). */
export type FilterAccountId = string;

/**
 * Date locale de l'appareil au format `TradingDay` (`YYYY-MM-DD`) — approximation
 * du « jour de trading » en attendant le vrai calcul par compte (fuseau + heure
 * de bascule, `@repo/core/time#tradingDayOf`, M2+ : dépend du compte sélectionné,
 * pas encore le cas pour un filtre global « tous comptes »). Calendrier local de
 * l'appareil (pas UTC) : plus proche de l'intuition de l'utilisateur pour
 * « aujourd'hui » tant que ce calcul précis n'est pas branché.
 */
export function resolveApproximateToday(): TradingDay {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return toTradingDay(`${year}-${month}-${day}`);
}

interface FilterState {
  accountId: FilterAccountId;
  dateRange: TradingDayRange;
  dateRangeShortcut: DateRangeShortcut;
  setAccountId: (accountId: FilterAccountId) => void;
  setDateRange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void;
}

// Snapshot pris au chargement du module, pour la seule période *par défaut* du store
// (« mois en cours » à l'ouverture). Limite connue (revue M1, Mineur #12) : une session
// laissée ouverte à cheval sur minuit garde ce défaut jusqu'à un changement manuel de
// filtre — sans conséquence tant que le mois ne change pas pendant la session ; au pire
// (31 déc. → 1er janv.) le défaut initial reste « décembre » au lieu de « janvier ».
// `PeriodSelector` ne dépend pas de cette valeur : il rappelle `resolveApproximateToday()`
// à chaque rendu pour la grille du sélecteur personnalisé. À revisiter en même temps que
// le vrai calcul de jour de trading par compte (M2, `@repo/core/time#tradingDayOf`).
const today = resolveApproximateToday();

export const useFilterStore = create<FilterState>((set) => ({
  accountId: 'all',
  dateRange: resolveDateRangeShortcut('currentMonth', today),
  dateRangeShortcut: 'currentMonth',
  setAccountId: (accountId) => set({ accountId }),
  setDateRange: (dateRange, dateRangeShortcut) => set({ dateRange, dateRangeShortcut }),
}));
