export interface SegmentedOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Logique pure de `Segmented` (M1-4) : index de l'option sélectionnée dans
 * `options`, utilisé pour positionner l'indicateur animé. `0` si `value` ne
 * figure pas dans `options` (garde-fou d'affichage : l'indicateur reste posé
 * sur un segment valide plutôt que de disparaître/planter).
 */
export function resolveSegmentedIndex<T extends string>(
  options: readonly SegmentedOption<T>[],
  value: T,
): number {
  const index = options.findIndex((option) => option.value === value);
  return index === -1 ? 0 : index;
}
