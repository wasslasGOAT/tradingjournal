import { createContext, useContext } from 'react';

/**
 * Espace (px) à réserver en bas du contenu défilant d'un `Screen`, en plus de
 * la zone sûre — ex. hauteur d'une barre d'onglets flottante/translucide qui
 * recouvre le bas de l'écran (M1-4, ARCHITECTURE §6.1 : « contenu défile sous
 * la tab bar ») : sans cette réserve, le dernier élément resterait caché
 * dessous. Posé par la coquille de navigation mobile
 * (`apps/app/app/(app)/_layout.tsx`), lu par `Screen`. Défaut `0` — écrans
 * sans tab bar flottante (catalogue, Hello, sidebar web) inchangés.
 */
const ScreenBottomInsetContext = createContext(0);

export const ScreenBottomInsetProvider = ScreenBottomInsetContext.Provider;

export function useScreenBottomInset(): number {
  return useContext(ScreenBottomInsetContext);
}
