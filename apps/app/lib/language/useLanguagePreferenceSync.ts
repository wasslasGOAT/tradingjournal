import * as Localization from 'expo-localization';
import { useEffect } from 'react';

import { i18n } from '@/lib/i18n';
import { pickLanguageTag } from '@/lib/locale';

import { LANGUAGE_PREFERENCE_STORAGE_KEY, resolveLanguagePreference } from './languagePreference';
import { useLanguagePreferenceStore } from './languagePreferenceStore';
// Import relatif (pas l'alias `@/`) : module scindé `.native`/`.web`, voir
// `apps/app/app/_layout.tsx`.
import { preferencesStorage } from '../storage/preferencesStorage';

/**
 * Applique et persiste la préférence de langue à chaque changement (M1-9) :
 * `i18n.changeLanguage` (instantané, pas de rechargement) + écriture dans
 * `preferencesStorage`. La valeur initiale est déjà restaurée avant le
 * premier rendu (`apps/app/app/_layout.tsx`, `hydrate`) — ce hook ne fait que
 * réagir aux changements faits depuis l'écran Réglages, monté une seule fois
 * (`AppShell`).
 */
export function useLanguagePreferenceSync(): void {
  const preference = useLanguagePreferenceStore((state) => state.preference);

  useEffect(() => {
    const deviceLocale = pickLanguageTag(Localization.getLocales());
    const resolved = resolveLanguagePreference(preference, deviceLocale);
    if (i18n.language !== resolved) void i18n.changeLanguage(resolved);
    void preferencesStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, preference);
  }, [preference]);
}
