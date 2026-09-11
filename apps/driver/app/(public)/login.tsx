import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Role } from '@leopard/shared';
import { sessionStore, IconAlertTriangle } from '@leopard/mobile-core';
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

  return (
    <DriverLoginScreen
      allowDemo={process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true'}
      onLoginSuccess={handleLoginSuccess}
      onNavigateOtp={(phone) =>
        router.push({ pathname: '/(public)/verify-otp', params: { phone } })
      }
      onNavigateRegister={() => router.push('/(public)/driver-register')}
      sessionExpired={isExpired}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CAD9EB',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(15, 23, 42, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1F3A',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5B6B80',
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: '#1E5BB8',
    borderRadius: 999,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderColor: '#CAD9EB',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryBtnText: {
    color: '#5B6B80',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
