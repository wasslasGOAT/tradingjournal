import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useThemeMode } from '../../theme/ThemeProvider';
import { themes } from '../../tokens';
import { Button } from '../Button/Button';

export interface EmptyStateAction {
  readonly label: string;
  readonly onPress: () => void;
}

export interface EmptyStateProps {
  readonly testID?: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly action?: EmptyStateAction;
}

/**
 * État « vide » générique (M1-3, ADR-017 : « EmptyState + action » sur chaque
 * écran de données). Généralise `features/hello/HelloEmptyState` (M0, à
 * migrer vers ce composant quand l'écran Hello sera retiré/refondu).
 */
export function EmptyState({ testID, icon: Icon, title, description, action }: EmptyStateProps) {
  const mode = useThemeMode();

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      className="w-full max-w-sm items-center gap-sm px-lg py-xl"
    >
      <Icon size={32} color={themes[mode].textMuted} />
      <Text className="text-center font-sans-semibold text-lg text-textPrimary">{title}</Text>
      <Text className="text-center font-sans text-base text-textSecondary">{description}</Text>
      {action ? (
        <Button
          testID={testID ? `${testID}-action` : undefined}
          label={action.label}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}
