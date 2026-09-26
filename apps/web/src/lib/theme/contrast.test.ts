import { describe, expect, it } from 'vitest';

import { AA_NORMAL_TEXT_MIN_RATIO, contrastRatio } from './contrast';
import { pnlColorSchemes, themeModes, themes } from './tokens';

/**
 * Reprise du test de contraste AA de `packages/ui/src/theme/contrast.test.ts`
 * pour les tokens web (W-3, ARCHITECTURE §6.2) : mêmes paires texte/fond,
 * mêmes seuils, sur `apps/web/src/lib/theme/tokens.ts` (adaptateur de
 * `@repo/ui/tokens-data`). `packages/ui` étant gelé (ADR-023), ce fichier ne
 * peut pas importer son test — il le rejoue ici sur la même source de données.
 */

const TEXT_TOKEN_KEYS = [
  'textPrimary',
  'textSecondary',
  'textMuted',
  'danger',
  'warning',
  'accent',
  'success',
] as const;
const SURFACE_TOKEN_KEYS = ['background', 'surface', 'surfaceAlt'] as const;
const PNL_SCHEMES = ['blueGray', 'greenRed'] as const;
const PNL_INTENTS = ['profit', 'loss', 'flat'] as const;

describe('contraste AA — texte sur fond (web)', () => {
  for (const mode of themeModes) {
    for (const textKey of TEXT_TOKEN_KEYS) {
      for (const surfaceKey of SURFACE_TOKEN_KEYS) {
        it(`${mode} : ${textKey} sur ${surfaceKey} ≥ ${AA_NORMAL_TEXT_MIN_RATIO}:1`, () => {
          const ratio = contrastRatio(themes[mode][textKey], themes[mode][surfaceKey]);
          expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_MIN_RATIO);
        });
      }
    }
  }
});

describe('contraste AA — texte/icône sur remplissage accent (bouton principal)', () => {
  for (const mode of themeModes) {
    it(`${mode} : onAccent sur accent ≥ ${AA_NORMAL_TEXT_MIN_RATIO}:1`, () => {
      const ratio = contrastRatio(themes[mode].onAccent, themes[mode].accent);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_MIN_RATIO);
    });
  }
});

describe('contraste AA — couleurs P&L utilisées en texte', () => {
  for (const mode of themeModes) {
    for (const scheme of PNL_SCHEMES) {
      for (const intent of PNL_INTENTS) {
        for (const surfaceKey of SURFACE_TOKEN_KEYS) {
          it(`${mode} ${scheme} ${intent} sur ${surfaceKey} ≥ ${AA_NORMAL_TEXT_MIN_RATIO}:1`, () => {
            const ratio = contrastRatio(
              pnlColorSchemes[mode][scheme][intent],
              themes[mode][surfaceKey],
            );
            expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_MIN_RATIO);
          });
        }
      }
    }
  }
});
