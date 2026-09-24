import { BlurView } from 'expo-blur';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import { useThemeMode } from '../../theme/ThemeProvider';
import { hexToRgba } from '../../theme/withAlpha';
import { themes } from '../../tokens';

export interface BlurSurfaceProps {
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly className?: string;
  /** Opacité du calque `[0, 1]` — défaut un peu plus opaque en thème clair
   * (garde le contraste des libellés au-dessus sans flou réel). */
  readonly opacity?: number;
}

/**
 * Calque de fond translucide (M1-4, ARCHITECTURE §6.1 : « barre d'onglets
 * flottante, translucide, contenu défilant dessous »).
 *
 * Vrai flou gaussien via `expo-blur` (module inclus dans Expo Go) sur les trois
 * plateformes : `BlurView` utilise l'effet système sur iOS, `dimezisBlurView`
 * sur Android (`experimentalBlurMethod`, sinon Android ne floute pas), et
 * `backdrop-filter` sur le web. Le calque `surface` translucide par-dessus
 * garantit le contraste des libellés quel que soit le contenu qui défile
 * dessous (le flou seul ne suffit pas au-dessus d'une zone très claire).
 */
export function BlurSurface({ testID, style, className, opacity }: BlurSurfaceProps) {
  const mode = useThemeMode();
  const colors = themes[mode];
  // Voile volontairement léger : au-delà, l'effet « translucide » disparaît et la barre
  // paraît opaque (retour utilisateur M1). Le flou fait l'essentiel du contraste ; ce
  // calque ne sert qu'à garantir la lisibilité des libellés au-dessus d'une zone claire.
  const resolvedOpacity = opacity ?? (mode === 'dark' ? 0.3 : 0.45);

  return (
    <BlurView
      testID={testID}
      pointerEvents="none"
      intensity={Platform.OS === 'android' ? 60 : 85}
      tint={mode === 'dark' ? 'dark' : 'light'}
      // Sans cette méthode, Android rend un simple calque semi-transparent.
      blurMethod="dimezisBlurView"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: hexToRgba(colors.surface, resolvedOpacity),
          // Bordure complète (et non seulement haute) : la surface sert aussi de fond à des
          // éléments flottants aux coins arrondis, comme la tab bar mobile.
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
      className={className}
    />
  );
}
