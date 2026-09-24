/**
 * Logique pure de disposition du calendrier (M1-4, correctif largeur) : sous
 * `NARROW_CALENDAR_BREAKPOINT` px de large, la colonne « Total » (8ᵉ colonne)
 * ne tient plus à côté de 7 colonnes de jour carrées — elle se replie en une
 * ligne pleine largeur sous chaque semaine plutôt que de rester une colonne
 * étroite (`WeekTotalCell` bascule alors en `variant="row"`).
 */
export const NARROW_CALENDAR_BREAKPOINT = 360;

export function isNarrowCalendarLayout(width: number): boolean {
  return width < NARROW_CALENDAR_BREAKPOINT;
}
