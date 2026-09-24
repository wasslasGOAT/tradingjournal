import type { ToastVariant } from './toastStore';
import { useToastStore } from './toastStore';

export interface UseToastResult {
  /** Empile un nouveau toast (auto-masqué après un délai, `ToastProvider`). Retourne son identifiant. */
  readonly show: (message: string, variant?: ToastVariant) => string;
}

/** Hook pour déclencher un toast depuis n'importe quel écran/composant — `ToastProvider` doit être monté (racine de l'app). */
export function useToast(): UseToastResult {
  const show = useToastStore((state) => state.show);
  return { show };
}
