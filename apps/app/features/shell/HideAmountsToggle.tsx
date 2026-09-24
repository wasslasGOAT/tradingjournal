import { IconButton, useVisibilityStore } from '@repo/ui';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Bascule de masquage global des montants (icône œil — M1-8, ARCHITECTURE
 * §6.2 : « Masquage des montants (icône œil) global, persistant »). Branchée
 * sur `useVisibilityStore` (`packages/ui`) : tout écran affichant des
 * montants (StatTile, DayCell…) lit le même état.
 */
export function HideAmountsToggle() {
  const { t } = useTranslation('common');
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const toggleHideAmounts = useVisibilityStore((state) => state.toggleHideAmounts);

  return (
    <IconButton
      testID="header-hide-amounts"
      icon={hideAmounts ? EyeOff : Eye}
      variant={hideAmounts ? 'accent' : 'default'}
      accessibilityLabel={hideAmounts ? t('header.hideAmounts.show') : t('header.hideAmounts.hide')}
      onPress={toggleHideAmounts}
    />
  );
}
