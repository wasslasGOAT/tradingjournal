import { Card, Screen, Segmented, useThemeStore, useVisibilityStore } from '@repo/ui';
import type { PnlColorScheme, SegmentedOption, ThemePreference } from '@repo/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useLanguagePreferenceStore } from '@/lib/language/languagePreferenceStore';
import type { LanguagePreference } from '@/lib/language/languagePreference';

/**
 * Écran Réglages (M1-9, ARCHITECTURE §6.2) : thème, couleurs P&L, masquage
 * des montants et langue — chaque bascule modifie directement le store
 * global (`@repo/ui`/`languagePreferenceStore`) déjà branché partout
 * ailleurs dans l'app (header, calendrier, dashboard…) et persisté entre
 * deux lancements (`ThemeProvider`/`useLanguagePreferenceSync`, pas de
 * bouton « enregistrer »).
 */
export function SettingsScreen() {
  const { t } = useTranslation('common');

  const themePreference = useThemeStore((state) => state.preference);
  const setThemePreference = useThemeStore((state) => state.setPreference);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);
  const setPnlColorScheme = useThemeStore((state) => state.setPnlColorScheme);
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const setHideAmounts = useVisibilityStore((state) => state.setHideAmounts);
  const languagePreference = useLanguagePreferenceStore((state) => state.preference);
  const setLanguagePreference = useLanguagePreferenceStore((state) => state.setPreference);

  const themeOptions: readonly SegmentedOption<ThemePreference>[] = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'dark', label: t('settings.theme.dark') },
    { value: 'light', label: t('settings.theme.light') },
  ];

  const pnlColorOptions: readonly SegmentedOption<PnlColorScheme>[] = [
    { value: 'blueGray', label: t('settings.pnlColors.blueGray') },
    { value: 'greenRed', label: t('settings.pnlColors.greenRed') },
  ];

  const hideAmountsOptions: readonly SegmentedOption<'visible' | 'hidden'>[] = [
    { value: 'visible', label: t('settings.hideAmounts.visible') },
    { value: 'hidden', label: t('settings.hideAmounts.hidden') },
  ];

  const languageOptions: readonly SegmentedOption<LanguagePreference>[] = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'fr', label: t('settings.language.fr') },
    { value: 'en', label: t('settings.language.en') },
  ];

  return (
    <Screen
      testID="screen-settings"
      scroll
      edges={{ top: false, bottom: false }}
      contentClassName="gap-md pb-xl"
    >
      <Text
        testID="settings-title"
        className="font-sans-semibold text-lg text-textPrimary"
        accessibilityRole="header"
      >
        {t('settings.title')}
      </Text>

      <Card testID="settings-card-appearance">
        <View className="gap-md">
          <Text className="font-sans-semibold text-sm text-textPrimary">
            {t('settings.sections.appearance')}
          </Text>

          <SettingsRow label={t('settings.theme.label')}>
            <Segmented
              testID="settings-theme"
              options={themeOptions}
              value={themePreference}
              onChange={setThemePreference}
              accessibilityLabel={t('settings.theme.label')}
            />
          </SettingsRow>

          <SettingsRow label={t('settings.pnlColors.label')}>
            <Segmented
              testID="settings-pnl-colors"
              options={pnlColorOptions}
              value={pnlColorScheme}
              onChange={setPnlColorScheme}
              accessibilityLabel={t('settings.pnlColors.label')}
            />
          </SettingsRow>

          <SettingsRow label={t('settings.hideAmounts.label')}>
            <Segmented
              testID="settings-hide-amounts"
              options={hideAmountsOptions}
              value={hideAmounts ? 'hidden' : 'visible'}
              onChange={(value) => setHideAmounts(value === 'hidden')}
              accessibilityLabel={t('settings.hideAmounts.label')}
            />
          </SettingsRow>
        </View>
      </Card>

      <Card testID="settings-card-language">
        <View className="gap-md">
          <Text className="font-sans-semibold text-sm text-textPrimary">
            {t('settings.sections.language')}
          </Text>

          <SettingsRow label={t('settings.language.label')}>
            <Segmented
              testID="settings-language"
              options={languageOptions}
              value={languagePreference}
              onChange={setLanguagePreference}
              accessibilityLabel={t('settings.language.label')}
            />
          </SettingsRow>
        </View>
      </Card>
    </Screen>
  );
}

interface SettingsRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Ligne réglage : libellé au-dessus du contrôle — pleine largeur, lisible aux grandes tailles de police. */
function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <View className="gap-xs">
      <Text className="font-sans-medium text-sm text-textSecondary">{label}</Text>
      {children}
    </View>
  );
}
