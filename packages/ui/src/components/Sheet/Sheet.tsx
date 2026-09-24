import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../haptics';
import { resolveSpringConfig, resolveTimingConfig, useMotionPreference } from '../../motion';
import { useThemeMode } from '../../theme/ThemeProvider';
import { elevation } from '../../tokens';
import { IconButton } from '../IconButton';

/** Fraction de la hauteur du panneau à partir de laquelle un relâchement ferme la sheet. */
const DRAG_CLOSE_THRESHOLD = 0.33;
/** Vitesse (px/s) à partir de laquelle un relâchement ferme la sheet même sous le seuil de distance. */
const DRAG_CLOSE_VELOCITY = 800;
/** Hauteur de repli du panneau tant qu'`onLayout` n'a pas encore mesuré la vraie hauteur. */
const FALLBACK_PANEL_HEIGHT = 320;
const BACKDROP_MAX_OPACITY = 0.6;

export interface SheetProps {
  readonly testID?: string;
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Titre affiché dans l'en-tête, à côté du bouton de fermeture. Optionnel : une sheet peut se contenter de `accessibilityLabel`. */
  readonly title?: string;
  /** Libellé accessible du panneau (`accessibilityRole="dialog"`) — requis même sans `title` visible. */
  readonly accessibilityLabel: string;
  /** Libellé accessible du bouton de fermeture (ex. `t('common.close')`). */
  readonly closeAccessibilityLabel: string;
  readonly children: ReactNode;
  readonly contentClassName?: string;
}

/**
 * Panneau coulissant par le bas (M1-4, ARCHITECTURE §6.2) — animation,
 * geste de fermeture, fond assombri, focus/`Escape` : entièrement fait maison
 * (Reanimated + Gesture Handler), **pas** un composant de sheet tout fait.
 * Utilise `Modal` de React Native uniquement comme mécanisme de portail (le
 * seul moyen fiable, sur les 3 plateformes, de couvrir tout l'écran quel que
 * soit l'endroit où `Sheet` est monté dans l'arbre — en React Native,
 * `position: 'absolute'` se positionne toujours par rapport au **parent
 * direct**, jamais en remontant jusqu'à un ancêtre positionné comme en CSS
 * web ; un `Sheet` ouvert depuis `Select`/`DateRangePicker`, profondément
 * imbriqué, ne couvrirait donc que son petit conteneur immédiat sans `Modal`).
 * `animationType="none"` : l'animation d'ouverture/fermeture reste
 * entièrement pilotée par Reanimated ci-dessous, pas par `Modal` lui-même.
 *
 * Reste monté brièvement après que `visible` passe à `false` (animation de
 * sortie), démonté ensuite (`mounted`) — le composant pilote lui-même ce délai
 * plutôt que de dépendre du parent pour ne pas couper l'animation.
 */
export function Sheet({
  testID,
  visible,
  onClose,
  title,
  accessibilityLabel,
  closeAccessibilityLabel,
  children,
  contentClassName,
}: SheetProps) {
  const mode = useThemeMode();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotionPreference();
  const [mounted, setMounted] = useState(visible);
  const panelHeight = useSharedValue(FALLBACK_PANEL_HEIGHT);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const panelRef = useRef<View>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const config = resolveSpringConfig('default', reduceMotion);
      progress.value = config ? withSpring(1, config) : 1;
      return;
    }
    if (!mounted) return;
    const config = resolveTimingConfig('base', 'accelerate', reduceMotion);
    progress.value = withTiming(0, config, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
    // `progress`/`mounted` volontairement hors dépendances : valeurs lues/partagées (`useSharedValue`,
    // état déjà gardé par le `if` ci-dessus), pas des déclencheurs de ce calcul.
  }, [visible, reduceMotion]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mounted) return;
    previouslyFocusedElement.current = document.activeElement;
    // Laisse le panneau se monter avant de lui donner le focus (nœud DOM pas encore prêt à la même frame).
    const raf = requestAnimationFrame(() => {
      const node = panelRef.current as unknown as HTMLElement | null;
      node?.focus?.();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      const previous = previouslyFocusedElement.current as HTMLElement | null;
      previous?.focus?.();
    };
  }, [mounted, onClose]);

  const handlePanelLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    panelHeight.value = event.nativeEvent.layout.height;
  };

  const requestClose = () => {
    haptics.selection();
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldClose =
        dragY.value > panelHeight.value * DRAG_CLOSE_THRESHOLD ||
        event.velocityY > DRAG_CLOSE_VELOCITY;
      const springConfig = resolveSpringConfig('default', reduceMotion);
      dragY.value = springConfig ? withSpring(0, springConfig) : 0;
      if (shouldClose) runOnJS(requestClose)();
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * BACKDROP_MAX_OPACITY,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [panelHeight.value, 0]) + dragY.value },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal
      testID={testID ? `${testID}-modal` : undefined}
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View
        testID={testID}
        pointerEvents={visible ? 'auto' : 'none'}
        className="absolute inset-0 z-50"
      >
        <Animated.View
          testID={testID ? `${testID}-backdrop` : undefined}
          style={backdropStyle}
          className="absolute inset-0 bg-scrim"
        >
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={requestClose}
            className="flex-1"
          />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            testID={testID ? `${testID}-panel` : undefined}
            ref={panelRef}
            onLayout={handlePanelLayout}
            accessibilityRole={Platform.OS === 'web' ? undefined : 'none'}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
            role={Platform.OS === 'web' ? 'dialog' : undefined}
            aria-modal={Platform.OS === 'web' ? true : undefined}
            tabIndex={Platform.OS === 'web' ? -1 : undefined}
            style={[{ paddingBottom: insets.bottom }, elevation.card[mode], panelStyle]}
            className="absolute inset-x-0 bottom-0 rounded-t-xl bg-surface"
          >
            <View className="items-center pt-xs">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>
            {title ? (
              <View className="flex-row items-center justify-between px-lg pb-sm pt-sm">
                <Text
                  className="flex-1 font-sans-semibold text-md text-textPrimary"
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <IconButton
                  testID={testID ? `${testID}-close` : undefined}
                  icon={CloseIcon}
                  accessibilityLabel={closeAccessibilityLabel}
                  onPress={requestClose}
                />
              </View>
            ) : null}
            <View className={`px-lg pb-lg ${contentClassName ?? ''}`}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

// Import tardif (après le composant) pour garder le bloc d'imports groupé par origine (convention du dépôt) —
// `lucide-react-native` seulement pour cette icône, évite d'alourdir le diff des imports ci-dessus.
import { X as CloseIcon } from 'lucide-react-native';
