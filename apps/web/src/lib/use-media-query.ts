import { useCallback, useSyncExternalStore } from 'react';

/**
 * Résultat réactif d'une media query CSS (W-4) — utilisé pour choisir entre
 * `Drawer` (bas, mobile) et `Dialog` (centré, bureau) dans `ResponsiveSheet`.
 * `useSyncExternalStore` : pas de flash de mauvaise valeur au premier rendu,
 * SSR-safe (`getServerSnapshot` -> `false`).
 */
function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  // `useCallback` (W-9, ADR-017) : `subscribe`/`getSnapshot` gardent la même référence
  // tant que `query` ne change pas — sans ça, `useSyncExternalStore` recevait une
  // nouvelle fonction à chaque rendu et ré-abonnait `matchMedia` (mount/unmount de
  // l'écouteur) à chaque ouverture/fermeture de `ResponsiveSheet` (`Sheet`, Calendrier).
  const stableSubscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query],
  );
  const stableGetSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);
  return useSyncExternalStore(stableSubscribe, stableGetSnapshot, getServerSnapshot);
}

/** Largeur de la fenêtre, réactive (W-6, repli mobile du calendrier < 360 px) — mêmes garanties SSR/nettoyage que {@link useMediaQuery}. */
function subscribeToResize(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getWindowWidthSnapshot() {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}

function getWindowWidthServerSnapshot() {
  return 0;
}

export function useWindowWidth(): number {
  return useSyncExternalStore(
    subscribeToResize,
    getWindowWidthSnapshot,
    getWindowWidthServerSnapshot,
  );
}
