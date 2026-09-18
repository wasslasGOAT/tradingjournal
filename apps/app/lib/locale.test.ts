import { describe, expect, it } from 'vitest';

import { pickLanguageTag } from './locale';

describe('pickLanguageTag', () => {
  it('retourne la première locale', () => {
    expect(pickLanguageTag([{ languageTag: 'fr-FR' }, { languageTag: 'en-US' }])).toBe('fr-FR');
  });

  it('retourne null sans locale', () => {
    expect(pickLanguageTag([])).toBeNull();
  });
});
