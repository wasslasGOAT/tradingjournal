import { describe, expect, it } from 'vitest';

import { themes } from '../../tokens';
import { resolveButtonClassNames, resolveButtonSpinnerColor } from './buttonStyles';
import type { ButtonSize, ButtonVariant } from './buttonStyles';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

describe('resolveButtonClassNames', () => {
  it('produit un conteneur et un libellé pour chaque variante/taille', () => {
    for (const variant of VARIANTS) {
      for (const size of SIZES) {
        const { container, label } = resolveButtonClassNames(variant, size);
        expect(container).toContain('min-h-1');
        expect(container.length).toBeGreaterThan(0);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('change de classes entre activé et désactivé', () => {
    const enabled = resolveButtonClassNames('primary', 'md');
    const disabled = resolveButtonClassNames('primary', 'md', { disabled: true });
    expect(enabled.container).not.toBe(disabled.container);
    expect(enabled.label).not.toBe(disabled.label);
  });

  it('garde une hauteur minimale ≥ 44 pt (min-h-11/12/14) pour toutes les tailles', () => {
    expect(resolveButtonClassNames('primary', 'sm').container).toContain('min-h-11');
    expect(resolveButtonClassNames('primary', 'md').container).toContain('min-h-12');
    expect(resolveButtonClassNames('primary', 'lg').container).toContain('min-h-14');
  });
});

describe('resolveButtonSpinnerColor', () => {
  it('utilise onAccent (contraste vérifié) sur primary/danger', () => {
    expect(resolveButtonSpinnerColor('primary', 'dark')).toBe(themes.dark.onAccent);
    expect(resolveButtonSpinnerColor('danger', 'light')).toBe(themes.light.onAccent);
  });

  it('utilise accent sur secondary/ghost', () => {
    expect(resolveButtonSpinnerColor('secondary', 'dark')).toBe(themes.dark.accent);
    expect(resolveButtonSpinnerColor('ghost', 'light')).toBe(themes.light.accent);
  });
});
