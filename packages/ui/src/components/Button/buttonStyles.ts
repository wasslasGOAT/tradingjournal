import type { ThemeMode } from '../../tokens';
import { themes } from '../../tokens';

/**
 * Logique pure de style de `Button` (M1-3) : variante/taille/désactivé →
 * classes NativeWind, jamais de couleur ni de taille en dur (tokens
 * uniquement, via `tailwind-preset.cjs`).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StateClassNames {
  readonly container: string;
  readonly label: string;
}

const VARIANT_CLASS_NAMES: Record<ButtonVariant, { enabled: StateClassNames; disabled: StateClassNames }> = {
  primary: {
    enabled: { container: 'bg-accent', label: 'text-onAccent' },
    disabled: { container: 'bg-surfaceAlt', label: 'text-textMuted' },
  },
  secondary: {
    enabled: { container: 'border border-border bg-surfaceAlt', label: 'text-textPrimary' },
    disabled: { container: 'border border-border bg-surfaceAlt', label: 'text-textMuted' },
  },
  ghost: {
    enabled: { container: 'bg-transparent', label: 'text-accent' },
    disabled: { container: 'bg-transparent', label: 'text-textMuted' },
  },
  danger: {
    enabled: { container: 'bg-danger', label: 'text-onAccent' },
    disabled: { container: 'bg-surfaceAlt', label: 'text-textMuted' },
  },
};

// Hauteur minimale toujours ≥ 44 pt (ARCHITECTURE §6.2, cible tactile) quelle que soit la taille.
const SIZE_CLASS_NAMES: Record<ButtonSize, StateClassNames> = {
  sm: { container: 'min-h-11 px-md py-xs', label: 'text-sm' },
  md: { container: 'min-h-12 px-lg py-sm', label: 'text-base' },
  lg: { container: 'min-h-14 px-xl py-md', label: 'text-md' },
};

/** Classes du conteneur et du libellé pour `variant`/`size`/`disabled` donnés. */
export function resolveButtonClassNames(
  variant: ButtonVariant,
  size: ButtonSize,
  options: { disabled?: boolean } = {},
): StateClassNames {
  const variantClassNames = options.disabled
    ? VARIANT_CLASS_NAMES[variant].disabled
    : VARIANT_CLASS_NAMES[variant].enabled;
  const sizeClassNames = SIZE_CLASS_NAMES[size];

  return {
    container: `flex-row items-center justify-center gap-xs rounded-md ${sizeClassNames.container} ${variantClassNames.container}`,
    label: `font-sans-semibold ${sizeClassNames.label} ${variantClassNames.label}`,
  };
}

/** Couleur (valeur, pas classe) de l'indicateur de chargement — `ActivityIndicator` ne lit pas NativeWind. */
export function resolveButtonSpinnerColor(variant: ButtonVariant, mode: ThemeMode): string {
  const colors = themes[mode];
  return variant === 'primary' || variant === 'danger' ? colors.onAccent : colors.accent;
}
