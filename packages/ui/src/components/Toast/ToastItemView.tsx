import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useMotionPreference } from '../../motion';
import { useThemeMode } from '../../theme/ThemeProvider';
import { themes } from '../../tokens';
import type { ToastItem } from './toastStore';

/** Durée avant auto-masquage — même valeur que l'ancienne notice « bientôt disponible » (`ComingSoonBanner`). */
const AUTO_HIDE_MS = 2600;

const VARIANT_ICON = { success: CheckCircle2, error: XCircle, info: Info } as const;
const VARIANT_COLOR_KEY = { success: 'success', error: 'danger', info: 'accent' } as const;

export interface ToastItemViewProps {
  readonly toast: ToastItem;
  readonly onDismiss: (id: string) => void;
}

/** Une entrée de la pile de toasts (M1-4) — animée, accessible, auto-masquée. */
export function ToastItemView({ toast, onDismiss }: ToastItemViewProps) {
  const mode = useThemeMode();
  const { reduceMotion } = useMotionPreference();
  const Icon = VARIANT_ICON[toast.variant];
  const color = themes[mode][VARIANT_COLOR_KEY[toast.variant]];

  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  return (
    <Animated.View
      testID={`toast-${toast.id}`}
      role="status"
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? undefined : FadeIn}
      exiting={reduceMotion ? undefined : FadeOut}
      className="w-full max-w-sm"
    >
      <Pressable
        testID={`toast-${toast.id}-dismiss`}
        onPress={() => onDismiss(toast.id)}
        className="min-h-11 flex-row items-center gap-sm rounded-lg border border-border bg-surface p-sm"
      >
        <Icon size={18} color={color} />
        <Text className="flex-1 font-sans-medium text-sm text-textPrimary">{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}
