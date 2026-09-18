/**
 * Formatage localisé (montants, pourcentages, dates) pour l'affichage.
 *
 * Volontairement vide pendant M0 : le formatage dépend de la locale et des
 * préférences utilisateur (devise d'affichage, séparateurs, `pnl_colors`),
 * livré en M1 avec `packages/i18n` (ROADMAP). Rappel d'invariant
 * (CLAUDE.md) : l'arrondi n'a lieu qu'ici, jamais lors des calculs de
 * `packages/core/money` ou `packages/core/time`, qui manipulent des
 * `Decimal` exacts jusqu'au dernier moment.
 */
export {};
