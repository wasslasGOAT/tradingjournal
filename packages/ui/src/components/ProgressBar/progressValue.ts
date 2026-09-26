/** Ramène `value` dans `[0, 1]` (NaN -> 0). Logique pure de `ProgressBar` (M1-3). */
export function clampProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Pourcentage entier `[0, 100]` pour `accessibilityValue.now`. */
export function toProgressPercent(value: number): number {
  return Math.round(clampProgress(value) * 100);
}
