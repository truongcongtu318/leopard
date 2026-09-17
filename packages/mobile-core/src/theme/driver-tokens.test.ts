import { driverJourneyTokens } from './driver-tokens';
import { driverHapticMatrix, haptic } from '../ui/haptics';

describe('driverJourneyTokens Contract', () => {
  it('enforces touch targets and brand palette for driver cockpit', () => {
    expect(driverJourneyTokens.sizes.primaryCtaHeight).toBe(56);
    expect(driverJourneyTokens.sizes.swipeBarHeight).toBe(64);
    expect(driverJourneyTokens.sizes.secondaryTouchTarget).toBeGreaterThanOrEqual(48);
    expect(driverJourneyTokens.colors.primaryNavy).toBe('#0B2545');
    expect(driverJourneyTokens.colors.successGreen).toBe('#34C759');
    expect(driverJourneyTokens.colors.alertRed).toBe('#FF3B30');
    expect(driverJourneyTokens.colors.codAmber).toBe('#F59E0B');
    expect(driverJourneyTokens.colors.darkOled).toBe('#0B0F17');
    expect(driverJourneyTokens.colors.darkRoutePuck).toBe('#38BDF8');
  });

  it('defines semantic haptic profiles for 12 states without throwing', () => {
    expect(() => driverHapticMatrix.offerIncoming()).not.toThrow();
    expect(() => driverHapticMatrix.countdownCritical()).not.toThrow();
    expect(() => driverHapticMatrix.swipeThreshold()).not.toThrow();
    expect(() => driverHapticMatrix.swipeSuccess()).not.toThrow();
    expect(() => driverHapticMatrix.actionHeavy()).not.toThrow();
    expect(() => driverHapticMatrix.errorAlert()).not.toThrow();
    expect(() => haptic.error()).not.toThrow();
  });
});
