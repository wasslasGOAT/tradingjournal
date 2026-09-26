import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { haptics } from '../../haptics';
import { usePressScale } from '../../motion';
import { useThemeMode } from '../../theme/ThemeProvider';
import { resolveButtonClassNames, resolveButtonSpinnerColor } from './buttonStyles';
import type { ButtonSize, ButtonVariant } from './buttonStyles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  readonly testID?: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Affiche un indicateur de chargement à la place du libellé, désactive le bouton (ADR-017 : jamais de spinner plein écran, mais un bouton peut en porter un). */
  readonly loading?: boolean;
  readonly disabled?: boolean;
  /** Icône optionnelle (ex. `lucide-react-native`) affichée avant le libellé. */
  readonly icon?: ReactNode;
  /** Libellé accessible, par défaut `label` (ex. si `label` est purement visuel/tronqué). */
  readonly accessibilityLabel?: string;
}

/**
 * Bouton de base (M1-3, ADR-017) : 4 variantes, 3 tailles (toujours ≥ 44 pt),
 * état chargement/désactivé, retour d'appui animé (`usePressScale`, respecte
 * « réduire les animations ») + haptique (`haptics.selection`, no-op web).
 */
export function Button({
  testID,
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const mode = useThemeMode();
  const { style, onPressIn, onPressOut } = usePressScale();
  const { container, label: labelClassName } = resolveButtonClassNames(variant, size, {
    disabled: isDisabled,
  });

  const handlePressIn = () => {
    if (isDisabled) return;
    haptics.selection();
    onPressIn();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={container}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          testID={testID ? `${testID}-spinner` : undefined}
          color={resolveButtonSpinnerColor(variant, mode)}
        />
      ) : (
        <>
          {icon}
          <Text className={labelClassName} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
