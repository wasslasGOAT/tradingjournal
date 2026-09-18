import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Conteneur d'écran de base (M1-3, ARCHITECTURE §6.2) : fond `background`,
 * zone sûre (`useSafeAreaInsets`, même convention que `features/hello/HelloScreen`)
 * et défilement optionnel. Les écrans composent leurs 4 états (chargement,
 * vide, erreur, rempli — ADR-017) à l'intérieur de `Screen`.
 */
export interface ScreenProps {
  readonly testID?: string;
  readonly children: ReactNode;
  /** Active le défilement (`ScrollView`) ; sinon conteneur plein écran centré. Défaut `false`. */
  readonly scroll?: boolean;
  /** Classes NativeWind additionnelles sur le conteneur racine. */
  readonly className?: string;
  /** Classes NativeWind additionnelles sur le conteneur de contenu (zone défilable ou non). */
  readonly contentClassName?: string;
}

export function Screen({ testID, children, scroll = false, className, contentClassName }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const edgeStyle = { paddingTop: insets.top, paddingBottom: insets.bottom };

  if (scroll) {
    return (
      <ScrollView
        testID={testID}
        className={`flex-1 bg-background ${className ?? ''}`}
        style={edgeStyle}
        contentContainerClassName={`gap-md px-lg py-md ${contentClassName ?? ''}`}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      testID={testID}
      className={`flex-1 items-center justify-center gap-md bg-background px-lg py-md ${className ?? ''} ${contentClassName ?? ''}`}
      style={edgeStyle}
    >
      {children}
    </View>
  );
}
