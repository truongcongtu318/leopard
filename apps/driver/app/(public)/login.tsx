import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Role } from '@leopard/shared';
import {
  IconAlertTriangle,
  colors,
  iosContinuousCurve,
  leopardElevation,
  leopardPalette,
  radius,
  sessionStore,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { resolveDriverLogin } from '../../src/navigation/driver-session';
import { DriverLoginScreen } from '../../src/auth/DriverLoginScreen';

export default function DriverLoginRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ expired?: string }>();
  const isExpired = searchParams.expired === 'true';
  const [notDriver, setNotDriver] = useState(false);

  const handleLoginSuccess = (role: Role) => {
    const outcome = resolveDriverLogin({ isAuthenticated: true, role });
    if (outcome.kind === 'enter') {
      router.replace('/orders');
    } else {
      setNotDriver(true);
    }
  };

  const handleLogout = async () => {
    await sessionStore.clearSession();
    setNotDriver(false);
  };

  if (notDriver) {
    return (
      <View style={styles.container}>
        <View style={styles.card} testID="not-a-driver-card">
          <IconAlertTriangle color="#D97706" size={44} />
          <Text accessibilityRole="header" style={styles.title}>
            Tài khoản này chưa phải tài xế
          </Text>
          <Text style={styles.description}>
            Số điện thoại đã đăng ký vai trò khác trong hệ thống LEOPARD. Bạn cần hoàn tất đăng ký thông tin đối tác tài xế để truy cập ứng dụng này.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(public)/driver-register')}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Đăng ký tài xế</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Demo mode and real OTP are mutually exclusive, and this prop is the switch.
  // DriverLoginScreen uses the Firebase flow (reCAPTCHA + SMS, verified by the
  // API at /auth/firebase) whenever `onNavigateOtp` is absent, so passing it
  // unconditionally, as this route used to, would have kept production on the
  // demo OTP screen even with Firebase configured.
  const allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true';

  return (
    <DriverLoginScreen
      allowDemo={allowDemo}
      onLoginSuccess={handleLoginSuccess}
      {...(allowDemo
        ? {
            onNavigateOtp: (phone: string) =>
              router.push({ pathname: '/(public)/verify-otp', params: { phone } }),
          }
        : {})}
      onNavigateRegister={() => router.push('/(public)/driver-register')}
      sessionExpired={isExpired}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: spacing.sm,
    ...leopardElevation.subtle,
  },
  title: {
    ...typeScale.headline,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  description: {
    ...typeScale.subheadline,
    lineHeight: 22,
    color: colors.neutral.subtleText,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.neutral.surface,
    ...typeScale.callout,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxs,
  },
  secondaryBtnText: {
    color: colors.neutral.subtleText,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
