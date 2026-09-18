export interface DeviceLocale {
  languageTag: string;
}

/** Première locale système (ex. `expo-localization`), ou `null` si absente. Fonction pure, testable sans natif. */
export function pickLanguageTag(locales: readonly DeviceLocale[]): string | null {
  return locales[0]?.languageTag ?? null;
}
