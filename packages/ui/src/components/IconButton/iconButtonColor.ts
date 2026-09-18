import type { ColorTokens, ThemeMode } from '../../tokens';
import { themes } from '../../tokens';

/** Logique pure de couleur de `IconButton` (M1-3) : variante/désactivé → couleur du thème actif. */
export type IconButtonVariant = 'default' | 'accent' | 'danger';

const VARIANT_COLOR_KEY: Record<IconButtonVariant, keyof ColorTokens> = {
  default: 'textPrimary',
  accent: 'accent',
  danger: 'danger',
};

/** Couleur (valeur hex du thème actif) de l'icône — les icônes SVG ne lisent pas les classes NativeWind. */
export function resolveIconButtonColor(
  variant: IconButtonVariant,
  mode: ThemeMode,
  options: { disabled?: boolean } = {},
): string {
  const colors = themes[mode];
  if (options.disabled) return colors.textMuted;
  return colors[VARIANT_COLOR_KEY[variant]];
}
