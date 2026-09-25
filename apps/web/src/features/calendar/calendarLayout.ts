/**
 * Logique pure de disposition du calendrier (W-6, W-6b : reprise de
 * `apps/app/features/calendar/calendarLayout.ts`, gelé — copiée, pas
 * importée, ADR-023). Sous `NARROW_CALENDAR_BREAKPOINT` px de large, la
 * colonne « Total » ne tient plus à côté de 7 colonnes de jour carrées —
 * elle se replie en une ligne pleine largeur sous chaque semaine.
 *
 * **Seuil relevé à 400 px (W-6, vérifié visuellement à 390 px) :** la valeur
 * native (`360`) suppose un rendu React Native où `DayCell` n'impose qu'un
 * plancher de hauteur tactile. La version web (`components/ui/day-cell.tsx`)
 * impose aussi `min-w-11` (44 px, ADR-017) par cellule — avec les 7 colonnes
 * de jour + la 8ᵉ colonne « Total » (48 px) + les espacements, la largeur
 * minimale réelle avoisine 390 px ; en dessous, la colonne « Total » déborde
 * du viewport plutôt que de se replier. `360` aurait laissé un iPhone
 * standard (390 px) déborder horizontalement.
 */
export const NARROW_CALENDAR_BREAKPOINT = 400

export function isNarrowCalendarLayout(width: number): boolean {
  return width < NARROW_CALENDAR_BREAKPOINT
}
