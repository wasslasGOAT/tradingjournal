/**
 * Ratio de contraste WCAG 2.1 (relative luminance) — réimplémentation locale
 * (algorithme générique, pas une donnée de design) : `packages/ui/src/theme/contrast.ts`
 * fait la même chose pour Expo, mais `packages/ui` est gelé (ADR-023) et non
 * importable ici hors `@repo/ui/tokens-data`. Utilisé uniquement par
 * `contrast.test.ts` (W-3) — aucun calcul métier ici (CLAUDE.md).
 */

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Ratio de contraste WCAG entre deux couleurs hex (1:1 à 21:1). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Seuil AA texte normal (< 18pt, ou < 14pt gras). */
export const AA_NORMAL_TEXT_MIN_RATIO = 4.5;
/** Seuil AA texte large (≥ 18pt, ou ≥ 14pt gras). */
export const AA_LARGE_TEXT_MIN_RATIO = 3;
