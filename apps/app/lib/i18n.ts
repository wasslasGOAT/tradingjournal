import { initI18n } from '@repo/i18n';
import * as Localization from 'expo-localization';

import { pickLanguageTag } from './locale';

/**
 * Instance i18next de l'app, initialisée avec la locale système (web + natif).
 * `expo-localization` fonctionne aussi sur web (ADR-001 : une seule base de code).
 */
export const i18n = initI18n({ locale: pickLanguageTag(Localization.getLocales()) });
