import { initI18n } from '@repo/i18n';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Locale initiale = `navigator.languages` → `resolveLocale` (ADR-024), pas de
 * lib de détection dédiée. `navigator.languages[0]` est préféré à
 * `navigator.language` : ordre de préférence complet de l'utilisateur.
 */
const systemLocale = navigator.languages?.[0] ?? navigator.language;

// `initReactI18next` doit être enregistré via `.use()` **avant** `.init()` :
// i18next n'appelle les modules `3rdParty` (dont react-i18next, qui expose
// l'instance à `useTranslation`) que pendant son propre `init()`, jamais après
// coup (`i18next.js`, méthode `use`). D'où l'instance créée ici, branchée,
// puis passée à `initI18n` plutôt que de laisser `initI18n` en créer une.
const instance = i18next.createInstance().use(initReactI18next);

export const i18n = initI18n({ locale: systemLocale, instance });

export { resolveLocale, supportedLocales, defaultLocale } from '@repo/i18n';
export type { SupportedLocale } from '@repo/i18n';
