import { Platform, Vibration } from 'react-native';

/**
 * Apple HIG Haptic Feedback Simulator
 * Uses native Vibration with calibrated timings matching Taptic Engine profiles:
 * - selection: subtle tick for tabs, switches, bottom sheet snaps (~10ms)
 * - light: soft tap for button interactions (~15ms)
 * - medium: crisp click for slider completion, modal reveals (~25ms)
 * - heavy: firm punch for destructive warnings (~35ms)
 * - success: double pulse pattern for completed delivery/verification
 * - warning: triple alert pulses for critical 15s push countdown
 */
export const haptic = {
  selection(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate(10);
      }
    } catch {
      // no-op in headless/test environments
    }
  },

  light(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate(15);
      }
    } catch {
      // no-op
    }
  },

  medium(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate(25);
      }
    } catch {
      // no-op
    }
  },

  heavy(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate(35);
      }
    } catch {
      // no-op
    }
  },

  success(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate([0, 15, 60, 25]);
      }
    } catch {
      // no-op
    }
  },

  warning(): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate([0, 25, 40, 25, 40, 25]);
      }
    } catch {
      // no-op
    }
  },
};
