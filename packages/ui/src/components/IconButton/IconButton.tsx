import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { haptics } from '../../haptics';
import { usePressScale } from '../../motion';
import { useThemeMode } from '../../theme/ThemeProvider';
import { resolveIconButtonColor } from './iconButtonColor';
import type { IconButtonVariant } from './iconButtonColor';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IconButtonProps {
  readonly testID?: string;
  readonly icon: LucideIcon;
  /** Toujours requis : un bouton icône seul n'a pas de texte visible pour les lecteurs d'écran. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly variant?: IconButtonVariant;
  readonly disabled?: boolean;
  /** Taille de l'icône en px (le conteneur reste ≥ 44 pt quelle que soit cette valeur). Défaut `20`. */
  readonly iconSize?: number;
}

/**
 * Bouton icône (M1-3, ADR-017) : cible tactile 44×44 pt garantie indépendamment
 * de `iconSize`, même animation d'appui + haptique que `Button` (`usePressScale`).
 */
export function IconButton({
  testID,
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'default',
  disabled = false,
  iconSize = 20,
}: IconButtonProps) {
  const mode = useThemeMode();
  const { style, onPressIn, onPressOut } = usePressScale();
  const color = resolveIconButtonColor(variant, mode, { disabled });

  const handlePressIn = () => {
    if (disabled) return;
    haptics.selection();
    onPressIn();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className="min-h-11 min-w-11 items-center justify-center rounded-full"
      style={style}
    >
      <Icon size={iconSize} color={color} />
    </AnimatedPressable>
  );
}
