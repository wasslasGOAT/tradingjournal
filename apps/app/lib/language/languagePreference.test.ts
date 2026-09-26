import { describe, expect, it } from 'vitest';

import { parseLanguagePreference, resolveLanguagePreference } from './languagePreference';

describe('parseLanguagePreference', () => {
  it('lit une locale supportée', () => {
    expect(parseLanguagePreference('fr')).toBe('fr');
    expect(parseLanguagePreference('en')).toBe('en');
  });

  it('retombe sur "system" par défaut (absent)', () => {
    expect(parseLanguagePreference(null)).toBe('system');
  });

  it('retombe sur "system" si la valeur est invalide', () => {
    expect(parseLanguagePreference('de')).toBe('system');
    expect(parseLanguagePreference('')).toBe('system');
    expect(parseLanguagePreference('SYSTEM')).toBe('system');
  });
});

describe('resolveLanguagePreference', () => {
  it('renvoie la langue forcée telle quelle, quelle que soit la locale de l’appareil', () => {
    expect(resolveLanguagePreference('fr', 'en-US')).toBe('fr');
    expect(resolveLanguagePreference('en', 'fr-FR')).toBe('en');
  });

  it('résout la locale système vers une locale supportée quand la préférence est "system"', () => {
    expect(resolveLanguagePreference('system', 'fr-FR')).toBe('fr');
    expect(resolveLanguagePreference('system', 'en-US')).toBe('en');
  });

  it('retombe sur la locale par défaut si la locale système est absente ou non supportée', () => {
    expect(resolveLanguagePreference('system', null)).toBe('en');
    expect(resolveLanguagePreference('system', 'de-DE')).toBe('en');
  });
});
