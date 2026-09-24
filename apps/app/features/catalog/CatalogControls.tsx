import { Button, themes, useThemeMode, useThemeStore } from '@repo/ui';
import type { ThemePreference } from '@repo/ui';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

/** Cycle de démonstration (ordre stable) : système -> sombre -> clair -> système. */
const THEME_PREFERENCE_CYCLE: readonly ThemePreference[] = ['system', 'dark', 'light'];

function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCE_CYCLE.indexOf(current);
  return THEME_PREFERENCE_CYCLE[(index + 1) % THEME_PREFERENCE_CYCLE.length] ?? 'system';
}

/**
 * Contrôles de démonstration du catalogue (M1-3) : thème, couleurs P&L,
 * masquage des montants, langue. Aucun de ces réglages n'est persisté ici —
 * seulement les stores déjà en place (`useThemeStore`) ou des bascules
 * locales, pour vérifier visuellement chaque primitive dans tous ses états.
 */
export interface CatalogControlsProps {
  readonly hideAmounts: boolean;
  readonly onToggleHideAmounts: () => void;
}

export function CatalogControls({ hideAmounts, onToggleHideAmounts }: CatalogControlsProps) {
  const { t, i18n } = useTranslation('common');
  const mode = useThemeMode();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);
  const setPnlColorScheme = useThemeStore((state) => state.setPnlColorScheme);

  const themeLabel =
    preference === 'system'
      ? t('catalog.controls.theme.system')
      : preference === 'dark'
        ? t('catalog.controls.theme.dark')
        : t('catalog.controls.theme.light');
  const pnlLabel =
    pnlColorScheme === 'blueGray'
      ? t('catalog.controls.pnlColors.blueGray')
      : t('catalog.controls.pnlColors.greenRed');
  const hideAmountsLabel = t('catalog.controls.hideAmounts.label');
  const languageLabel = i18n.language.toUpperCase();
  const hideAmountsIconColor = hideAmounts ? themes[mode].onAccent : themes[mode].textPrimary;

  return (
    <View testID="catalog-controls" className="flex-row flex-wrap gap-sm">
      <Button
        testID="catalog-control-theme"
        label={themeLabel}
        variant="secondary"
        size="sm"
        accessibilityLabel={t('catalog.controls.theme.label')}
        onPress={() => setPreference(nextThemePreference(preference))}
      />
      <Button
        testID="catalog-control-pnl-colors"
        label={pnlLabel}
        variant="secondary"
        size="sm"
        accessibilityLabel={t('catalog.controls.pnlColors.label')}
        onPress={() => setPnlColorScheme(pnlColorScheme === 'blueGray' ? 'greenRed' : 'blueGray')}
      />
      <Button
        testID="catalog-control-hide-amounts"
        label={hideAmountsLabel}
        variant={hideAmounts ? 'primary' : 'secondary'}
        size="sm"
        icon={
          hideAmounts ? (
            <EyeOff size={16} color={hideAmountsIconColor} />
          ) : (
            <Eye size={16} color={hideAmountsIconColor} />
          )
        }
        accessibilityLabel={hideAmountsLabel}
        onPress={onToggleHideAmounts}
      />
      <Button
        testID="catalog-control-language"
        label={languageLabel}
        variant="secondary"
        size="sm"
        accessibilityLabel={t('catalog.controls.language.label')}
        onPress={() => void i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
      />
    </View>
  );
}
