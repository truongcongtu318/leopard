import { Platform, Vibration } from 'react-native';

let expoHaptics: any = null;
try {
  // Safe dynamic require for expo-haptics when available in runtime
  expoHaptics = require('expo-haptics');
} catch {
  expoHaptics = null;
}

/**
 * Apple HIG Haptic Feedback Engine
 * Prefers expo-haptics (native Taptic Engine on iOS) with calibrated fallback:
 * - selection: subtle tick for tabs, switches, bottom sheet snaps
 * - light: soft tap for primary confirmations
 * - medium: crisp click for slider completion, modal reveals
 * - heavy: firm punch for destructive warnings
 * - success: double pulse pattern for completed delivery/verification
 * - warning: triple alert pulses for critical countdown / errors
 */
export const haptic = {
  selection(): void {
    try {
      if (expoHaptics?.selectionAsync) {
        expoHaptics.selectionAsync().catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate(8);
      }
    } catch {
      // no-op in headless/test environments
    }
  },

  light(): void {
    try {
      if (expoHaptics?.impactAsync && expoHaptics?.ImpactFeedbackStyle) {
        expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate(12);
      }
    } catch {
      // no-op
    }
  },

  medium(): void {
    try {
      if (expoHaptics?.impactAsync && expoHaptics?.ImpactFeedbackStyle) {
        expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Medium).catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate(20);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate();
      }
    } catch {
      // no-op
    }
  },

  heavy(): void {
    try {
      if (expoHaptics?.impactAsync && expoHaptics?.ImpactFeedbackStyle) {
        expoHaptics.impactAsync(expoHaptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate(35);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate();
      }
    } catch {
      // no-op
    }
  },

  success(): void {
    try {
      if (expoHaptics?.notificationAsync && expoHaptics?.NotificationFeedbackType) {
        expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Success).catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 15, 60, 25]);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate();
      }
    } catch {
      // no-op
    }
  },

  warning(): void {
    try {
      if (expoHaptics?.notificationAsync && expoHaptics?.NotificationFeedbackType) {
        expoHaptics.notificationAsync(expoHaptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 25, 40, 25, 40, 25]);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate();
      }
    } catch {
      // no-op
    }
  },
};

