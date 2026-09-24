import { haptics, themes, useThemeMode } from '@repo/ui';
import { Check } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

export interface DropdownOptionProps {
  readonly testID?: string;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}

/**
 * Ligne d'option pour les listes simples du header (compte, période — M1-8).
 * Les vrais `Sheet`/`Select` de `packages/ui` arrivent en M1-4 : d'ici là, une
 * liste minimale (cible tactile ≥ 44 pt, haptique, coche sur la sélection).
 */
export function DropdownOption({ testID, label, selected, onPress }: DropdownOptionProps) {
  const mode = useThemeMode();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className="min-h-11 flex-row items-center justify-between gap-sm rounded-sm px-sm py-xs"
    >
      <Text className={`font-sans text-sm ${selected ? 'text-accent' : 'text-textPrimary'}`}>
        {label}
      </Text>
      {selected ? <Check size={16} color={themes[mode].accent} /> : null}
    </Pressable>
  );
}
