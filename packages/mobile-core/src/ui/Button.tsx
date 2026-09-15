import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, control, iosContinuousCurve, radius, spacing, typography } from '../theme/tokens';
import { haptic } from './haptics';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';
type ButtonSize = 'default' | 'driver-primary';

type ButtonProps = {
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
};

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  secondary: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
  },
  destructive: {
    backgroundColor: colors.danger.text,
    borderColor: colors.danger.text,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: colors.brand.text,
  },
  secondary: {
    color: colors.neutral.text,
  },
  destructive: {
    color: colors.brand.text,
  },
});

const sizeStyles = StyleSheet.create({
  default: {
    minHeight: control.minimumTouchHeight,
  },
  'driver-primary': {
    minHeight: control.stickyPrimaryMinimumHeight,
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
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const shouldHaptic = enableHaptics ?? (variant === 'primary' || variant === 'destructive');
  const visibleLabel = isLoading
    ? loadingLabel
    : disabled
      ? (disabledLabel ?? `${label} — Không khả dụng`)
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
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={[styles.label, variantTextStyles[variant]]}>{visibleLabel}</Text>
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
    ...typography.label,
    flexShrink: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
