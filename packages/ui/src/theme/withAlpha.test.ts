import { describe, expect, it } from 'vitest';

import { hexToRgba } from './withAlpha';

describe('hexToRgba', () => {
  it('convertit un hex opaque en rgba avec l’alpha demandé', () => {
    expect(hexToRgba('#0E0E11', 0.78)).toBe('rgba(14, 14, 17, 0.78)');
  });

  it('fonctionne aussi sans le # initial', () => {
    expect(hexToRgba('FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('alpha à 0 -> entièrement transparent', () => {
    expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
  });
});
