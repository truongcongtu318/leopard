import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, control, iosContinuousCurve, radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { haptic } from './haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'prominent' | 'glass';
export type ButtonSize = 'default' | 'driver-primary' | 'large' | 'pill';

export type ButtonProps = {
  testID?: string;
  label: string;
  onPress?: PressableProps['onPress'];
  variant?: ButtonVariant;
  disabled?: boolean;
  isLoading?: boolean;
  disabledLabel?: string;
  loadingLabel?: string;
  size?: ButtonSize;
  enableHaptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  prominent: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  destructive: {
    backgroundColor: colors.danger.text,
    borderColor: colors.danger.text,
    shadowColor: colors.danger.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: colors.brand.text,
  },
  prominent: {
    color: colors.neutral.surface,
  },
  secondary: {
    color: colors.neutral.text,
  },
  destructive: {
    color: colors.brand.text,
  },
  glass: {
    color: colors.neutral.text,
  },
});

const sizeStyles = StyleSheet.create({
  default: {
    minHeight: control.minimumTouchHeight,
    borderRadius: radius.control,
  },
  'driver-primary': {
    minHeight: control.stickyPrimaryMinimumHeight,
    borderRadius: 16,
  },
  large: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
  },
  pill: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
  },
});

export function Button({
  testID,
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  disabledLabel,
  loadingLabel = 'Đang xử lý',
  size = 'default',
  enableHaptics,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const shouldHaptic = enableHaptics ?? (variant === 'primary' || variant === 'prominent' || variant === 'destructive');
  const visibleLabel = isLoading
    ? loadingLabel
    : disabled && disabledLabel
      ? disabledLabel
      : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={(e) => {
        if (shouldHaptic) {
          haptic.light();
        }
        onPress?.(e);
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.control,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      <AppText
        variant={size === 'large' || size === 'pill' || size === 'driver-primary' ? 'headline' : 'subheadline'}
        style={[
          styles.label,
          variantTextStyles[variant],
          (size === 'large' || size === 'pill' || size === 'driver-primary') && styles.largeLabel,
        ]}
      >
        {visibleLabel}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    // HIG Subheadline size/leading with the semibold emphasis a control needs.
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  largeLabel: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
});
