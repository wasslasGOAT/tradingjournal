import { useSyncExternalStore } from 'react';

/**
 * Préférence système « réduire les animations » (W-4, ADR-017) — copie web du
 * rôle de `packages/ui/src/motion/useMotionPreference.ts` (gelé) : lit
 * `prefers-reduced-motion`, réactif aux changements (contrairement à
 * `useReducedMotion` de Reanimated côté natif, qui ne lit qu'une fois).
 * `useSyncExternalStore` : pas de flash de mauvaise valeur au premier rendu
 * SSR-safe (`getServerSnapshot` -> `false`, cohérent avec `systemPrefersLight`
 * dans `features/preferences/theme-store.ts`).
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
