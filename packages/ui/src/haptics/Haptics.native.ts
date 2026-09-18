import * as ExpoHaptics from 'expo-haptics';

import type { HapticsAdapter } from './types';

/**
 * Implémentation native (iOS/Android) — `expo-haptics` (M1-2, ADR-017/ADR-021 :
 * inclus dans Expo Go). Chaque appel est fire-and-forget (les promesses
 * d'`expo-haptics` ne portent pas d'information utile pour l'appelant).
 */
export const haptics: HapticsAdapter = {
  selection() {
    void ExpoHaptics.selectionAsync();
  },
  impactLight() {
    void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
  },
  impactMedium() {
    void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
  },
  success() {
    void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
  },
  error() {
    void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
  },
};
