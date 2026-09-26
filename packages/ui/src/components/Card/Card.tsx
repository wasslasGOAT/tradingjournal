import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeMode } from '../../theme/ThemeProvider';
import { elevation } from '../../tokens';

/**
 * Carte de base (M1-3, ARCHITECTURE §6.2) : fond `surface`, bordure `border`,
 * ombre portée par jeton d'élévation (`elevation.card`, différente en sombre/
 * clair — posée en `style` : les propriétés d'ombre RN ne sont pas exprimables
 * de façon fiable en classes NativeWind cross-plateforme, notamment
 * `elevation` Android).
 */
export interface CardProps {
  readonly testID?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Card({ testID, children, className }: CardProps) {
  const mode = useThemeMode();

  return (
    <View
      testID={testID}
      className={`rounded-lg border border-border bg-surface p-md ${className ?? ''}`}
      style={elevation.card[mode]}
    >
      {children}
    </View>
  );
}
