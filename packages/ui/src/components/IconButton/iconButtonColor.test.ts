import { describe, expect, it } from 'vitest';

import { themes } from '../../tokens';
import { resolveIconButtonColor } from './iconButtonColor';

describe('resolveIconButtonColor', () => {
  it('résout chaque variante vers son token de couleur (thème sombre)', () => {
    expect(resolveIconButtonColor('default', 'dark')).toBe(themes.dark.textPrimary);
    expect(resolveIconButtonColor('accent', 'dark')).toBe(themes.dark.accent);
    expect(resolveIconButtonColor('danger', 'dark')).toBe(themes.dark.danger);
  });

  it('résout chaque variante vers son token de couleur (thème clair)', () => {
    expect(resolveIconButtonColor('default', 'light')).toBe(themes.light.textPrimary);
    expect(resolveIconButtonColor('accent', 'light')).toBe(themes.light.accent);
  });

  it('bascule sur textMuted quand désactivé, quelle que soit la variante', () => {
    expect(resolveIconButtonColor('accent', 'dark', { disabled: true })).toBe(themes.dark.textMuted);
    expect(resolveIconButtonColor('danger', 'light', { disabled: true })).toBe(themes.light.textMuted);
  });
});
