import { describe, expect, it } from 'vitest';

import { pnlColorSchemes, themes } from '../tokens';
import type { ThemeMode } from '../tokens';
import { AA_NORMAL_TEXT_MIN_RATIO, contrastRatio } from './contrast';

/**
 * Contraste AA de chaque paire texte/fond de chaque thème (M1-1, ARCHITECTURE
 * §6.2, retour utilisateur M0 : texte gris peu lisible sur téléphone).
 * Seuil unique 4,5:1 (texte normal) pour tous les tokens de texte, y compris
 * les couleurs P&L « en texte » : on ne connaît pas ici la taille/graisse
 * d'affichage de chaque usage, donc on vise le seuil le plus strict plutôt que
 * le seuil « texte large » (3:1) — marge de sécurité pour toute taille.
 */

const TEXT_TOKEN_KEYS = [
  'textPrimary',
  'textSecondary',
  'textMuted',
  'danger',
  'warning',
  'accent',
] as const;
const SURFACE_TOKEN_KEYS = ['background', 'surface', 'surfaceAlt'] as const;
const THEME_MODES: ThemeMode[] = ['dark', 'light'];
const PNL_SCHEMES = ['blueGray', 'greenRed'] as const;
const PNL_INTENTS = ['profit', 'loss', 'flat'] as const;

describe('contraste AA — texte sur fond', () => {
  for (const mode of THEME_MODES) {
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

describe('contraste AA — texte/icône sur remplissage accent (ex. bouton principal)', () => {
  for (const mode of THEME_MODES) {
    it(`${mode} : onAccent sur accent ≥ ${AA_NORMAL_TEXT_MIN_RATIO}:1`, () => {
      const ratio = contrastRatio(themes[mode].onAccent, themes[mode].accent);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_MIN_RATIO);
    });
  }
});

describe('contraste AA — couleurs P&L utilisées en texte', () => {
  for (const mode of THEME_MODES) {
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
