import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSelector } from './AccountSelector';
import { HideAmountsToggle } from './HideAmountsToggle';
import { PeriodSelector } from './PeriodSelector';
import { QuickAddButton } from './QuickAddButton';

/**
 * En-tête global (M1-8, ARCHITECTURE §6.1) : sélecteur de compte + période à
 * gauche, masquage des montants + ajout rapide à droite. Commun aux deux
 * dispositions (tab bar mobile, sidebar web ≥ 1024 px) — monté une fois dans
 * `(app)/_layout.tsx`, au-dessus de la navigation. Gère lui-même l'encoche
 * (`insets.top`) : les écrans qu'il surplombe passent `edges={{ top: false }}`
 * à `Screen` pour ne pas la compter deux fois.
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="app-header"
      className="z-10 border-b border-border bg-background"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between gap-sm px-lg py-sm">
        <View className="flex-1 flex-row items-center gap-xs">
          <AccountSelector />
          <PeriodSelector />
        </View>
        <View className="flex-row items-center gap-xs">
          <HideAmountsToggle />
          <QuickAddButton />
        </View>
      </View>
    </View>
  );
}
