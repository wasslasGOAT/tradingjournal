import i18next from 'i18next';
import type { i18n as I18nInstance } from 'i18next';

import { en } from './locales/en';
import { fr } from './locales/fr';

/** Ressources par locale — un seul namespace `common` pendant le MVP (ADR-013). */
export const resources = { fr, en } as const;

export const defaultNS = 'common';

export const supportedLocales = ['fr', 'en'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = 'en';

/** Ramène une locale système (ex. `fr-FR`, `en-US`) vers une des locales supportées. */
export function resolveLocale(locale: string | null | undefined): SupportedLocale {
  const short = locale?.slice(0, 2).toLowerCase();
  return supportedLocales.find((supported) => supported === short) ?? defaultLocale;
}

export interface InitI18nOptions {
  /** Locale système à résoudre (ex. `expo-localization`). */
  locale?: string | null;
  /** Instance i18next à initialiser ; par défaut une nouvelle instance dédiée. */
  instance?: I18nInstance;
}

/**
 * Initialise (ou réutilise) une instance i18next avec les ressources fr/en.
 * Appelée une fois par app (native/web) avec la locale détectée, et par les tests.
 */
export function initI18n({ locale, instance }: InitI18nOptions = {}): I18nInstance {
  const target = instance ?? i18next.createInstance();
  const lng = resolveLocale(locale);

  if (target.isInitialized) {
    void target.changeLanguage(lng);
    return target;
  }

  void target.init({
    resources,
    lng,
    fallbackLng: defaultLocale,
    defaultNS,
    ns: [defaultNS],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return target;
}
