import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../tokens';
import { ToastItemView } from './ToastItemView';
import { useToastStore } from './toastStore';

/** Espace entre la zone sûre et le premier toast (token `spacing.sm`). */
const TOAST_TOP_GAP = parseInt(spacing.sm ?? '8px', 10);

/**
 * Pile de toasts (M1-4, ARCHITECTURE §6.2) : monté une fois à la racine de
 * l'app (`apps/app/app/_layout.tsx`), au-dessus de la navigation — lit
 * `toastStore`, peuplé depuis n'importe où via `useToast`. Remplace
 * `ComingSoonBanner` (M1-8) pour la notice « bientôt disponible » du bouton
 * d'ajout rapide.
 */
export function ToastProvider() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      testID="toast-provider"
      pointerEvents="box-none"
      className="absolute inset-x-0 top-0 z-50 items-center gap-xs px-lg"
      style={{ paddingTop: insets.top + TOAST_TOP_GAP }}
    >
      {toasts.map((toast) => (
        <ToastItemView key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </View>
  );
}
