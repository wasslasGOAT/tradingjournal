import { toast } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'info';

/**
 * File de messages temporaires (W-4, ARCHITECTURE §6.2) — même rôle que
 * `packages/ui/src/components/Toast` (gelé), ici un mince adaptateur autour
 * de `sonner` (`Toaster` monté une fois à la racine, `main.tsx`/`__root.tsx`).
 */
export function useToast() {
  const show = (message: string, variant: ToastVariant = 'info') => {
    if (variant === 'success') return toast.success(message);
    if (variant === 'error') return toast.error(message);
    return toast.info(message);
  };

  return { show };
}
