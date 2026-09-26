// Sous-chemin dédié (`@repo/ui/theme/preferencesStorage`), pas le barrel `@repo/ui` : ce
// module est 100 % sans dépendance d'exécution React Native (seul `TextStyle` de
// `react-native` y est importé, en `import type`, effacé à la compilation) — contrairement
// au barrel, qui réexporte `Chart`/Skia/`victory-native`/Reanimated et ne peut donc pas être
// chargé par `apps/app`'s Vitest (environnement Node pur, pas de transform Flow/RN, voir
// `apps/app/vitest.config.mts`). `packages/ui/package.json` expose ce sous-chemin exprès pour
// permettre ce test (`loadStartupPreferences.test.ts`).
import {
  loadPersistedPreferences,
  parseHideAmounts,
  parsePnlColorScheme,
  parseThemePreference,
} from '@repo/ui/theme/preferencesStorage';
import type { PersistedPreferences } from '@repo/ui/theme/preferencesStorage';

import {
  LANGUAGE_PREFERENCE_STORAGE_KEY,
  parseLanguagePreference,
} from '../language/languagePreference';
import type { LanguagePreference } from '../language/languagePreference';
import type { AsyncKeyValueStorage } from '../storage/keyValueStorage.types';

export interface StartupPreferences {
  readonly preferences: PersistedPreferences;
  readonly languagePreference: LanguagePreference;
}

/** Valeurs par défaut (identiques à un stockage vide) : utilisées si la lecture échoue. */
const DEFAULT_STARTUP_PREFERENCES: StartupPreferences = {
  preferences: {
    preference: parseThemePreference(null),
    pnlColorScheme: parsePnlColorScheme(null),
    hideAmounts: parseHideAmounts(null),
  },
  languagePreference: parseLanguagePreference(null),
};

/**
 * Charge thème/couleurs P&L/masquage des montants + préférence de langue au
 * démarrage (M1-9), sans jamais rejeter : si la lecture du stockage échoue
 * (natif : `preferencesStorage` est déjà tolérant via `createSafeAsyncStorage`,
 * mais on se protège aussi d'un échec ailleurs dans la chaîne), on repart des
 * valeurs par défaut plutôt que de laisser `preferencesReady` bloqué à `false`
 * — écran blanc, splash jamais masqué (revue M1, Bloquant #2,
 * `apps/app/app/_layout.tsx`).
 *
 * Fonction pure (dépendance injectée, aucun accès global) : testable sans
 * environnement React Native.
 */
export async function loadStartupPreferences(
  storage: AsyncKeyValueStorage,
): Promise<StartupPreferences> {
  try {
    const [preferences, languageRaw] = await Promise.all([
      loadPersistedPreferences(storage),
      storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY),
    ]);

    return {
      preferences,
      languagePreference: parseLanguagePreference(languageRaw),
    };
  } catch {
    return DEFAULT_STARTUP_PREFERENCES;
  }
}
