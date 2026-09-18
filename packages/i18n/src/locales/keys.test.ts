import { describe, expect, it } from 'vitest';

import { en } from './en';
import { fr } from './fr';

/** Chemins de clés (`a.b.c`) d'un objet de ressources i18next, triés. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe('i18n resources', () => {
  it('fr et en exposent exactement les mêmes clés', () => {
    expect(keyPaths(fr)).toEqual(keyPaths(en));
  });
});
