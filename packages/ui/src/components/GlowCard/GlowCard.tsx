import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeMode } from '../../theme/ThemeProvider';
import { elevation } from '../../tokens';

/**
 * Carte mise en avant (M1-3, ARCHITECTURE §6.2) : même fond que `Card`, mais
 * lueur teintée `accent` (`elevation.glow`) plutôt qu'une ombre neutre — pour
 * un stat clé (ex. P&L net du dashboard) ou une carte à faire ressortir.
 */
export interface GlowCardProps {
  readonly testID?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function GlowCard({ testID, children, className }: GlowCardProps) {
  const mode = useThemeMode();

  return (
    <View
      testID={testID}
      className={`rounded-lg border border-accentMuted bg-surface p-md ${className ?? ''}`}
      style={elevation.glow[mode]}
    >
      {children}
    </View>
  );
}
