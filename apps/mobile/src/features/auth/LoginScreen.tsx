import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, TextInput, ActivityIndicator } from 'react-native';
import type { Role } from '@leopard/shared';

import { httpClient } from '../../api/http-client';
import { colors, leopardPalette, pastelTheme, leopardRadius, spacing, typography, leopardElevation } from '../../theme/tokens';
import { sessionStore } from '../../auth/session-store';
import { ApiError } from '../../api/api-error';

export interface LoginScreenProps {
  onLoginSuccess?: (role: Role, profileComplete: boolean) => void;
  onNavigateRegister?: () => void;
  allowDemo?: boolean;
  sessionExpired?: boolean;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: Role;
    status: string;
    profileComplete: boolean;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
}

export function LoginScreen({
  allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true',
  onLoginSuccess,
  onNavigateRegister,
  sessionExpired = false,
}: LoginScreenProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState<'normal' | 'authenticating' | 'redirecting' | 'error'>('normal');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleLogin = async (idToken: string) => {
    if (!idToken.trim() || status === 'authenticating' || status === 'redirecting') return;

    setStatus('authenticating');
    setErrorMsg(null);

    try {
      const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);
      const role = res.user?.role ?? 'CUSTOMER';

      setStatus('redirecting');
      onLoginSuccess?.(role, res.user?.profileComplete ?? false);
    } catch (err) {
      const trimmed = idToken.trim().toLowerCase();
      const isNetworkError = !(err instanceof ApiError) || err.statusCode === 0;

      if (isNetworkError && (allowDemo || process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW === 'enabled')) {
        if (trimmed === '+840000000001' || trimmed === '0900000001' || trimmed === 'customer') {
          await sessionStore.setSession('preview-acc-token', 'preview-ref-token', 'CUSTOMER');
          setStatus('redirecting');
          onLoginSuccess?.('CUSTOMER', true);
          return;
        }
        if (trimmed === '+840000000002' || trimmed === '0900000002' || trimmed === 'driver') {
          await sessionStore.setSession('preview-acc-token', 'preview-ref-token', 'DRIVER');
          setStatus('redirecting');
          onLoginSuccess?.('DRIVER', true);
          return;
        }
      }

      setStatus('error');
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;

      if (statusCode === 401 || statusCode === 403) {
        setErrorMsg(message || 'Thông tin đăng nhập không hợp lệ hoặc sai mã OTP');
      } else if (statusCode === 503 || statusCode === 0) {
        setErrorMsg(message || 'Hệ thống xác thực tạm thời không khả dụng');
      } else {
        setErrorMsg(message || 'Đã xảy ra lỗi khi đăng nhập');
      }
    }
  };

  const handleDemoLogin = async (accountId: string, defaultRole: Role) => {
    if (status === 'authenticating' || status === 'redirecting') return;

    setStatus('authenticating');
    setErrorMsg(null);

    try {
      const res = await httpClient.post<AuthResponse>('/auth/login/demo', { accountId });
      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);
      const role = res.user?.role ?? defaultRole;

      setStatus('redirecting');
      onLoginSuccess?.(role, res.user?.profileComplete ?? false);
    } catch (err) {
      setStatus('error');
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;

      if (statusCode === 401 || statusCode === 403) {
        setErrorMsg(message || 'Tài khoản demo không hợp lệ');
      } else if (statusCode === 503 || statusCode === 0) {
        setErrorMsg(message || 'Hệ thống xác thực tạm thời không khả dụng');
      } else {
        setErrorMsg(message || 'Đã xảy ra lỗi khi đăng nhập demo');
      }
    }
  };

  const isSubmitting = status === 'authenticating' || status === 'redirecting';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🐆</Text>
          </View>
          <Text style={styles.brandTitle}>LEOPARD</Text>
          <Text style={styles.brandSubtitle}>Giải pháp vận tải thông minh</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>
          
          {sessionExpired ? (
            <View style={[styles.alertBox, styles.alertWarning]}>
              <Text style={styles.alertText}>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</Text>
            </View>
          ) : null}

          {status === 'error' && errorMsg ? (
            <View style={[styles.alertBox, styles.alertError]}>
              <Text style={styles.alertText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI</Text>
            <View style={[
              styles.inputContainer,
              isFocused && styles.inputFocused,
              status === 'error' && styles.inputError
            ]}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                editable={!isSubmitting}
                onBlur={() => setIsFocused(false)}
                onChangeText={(text) => {
                  setTokenInput(text);
                  if (status === 'error') setStatus('normal');
                }}
                onFocus={() => setIsFocused(true)}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={leopardPalette.inputPlaceholder}
                style={styles.textInput}
                value={tokenInput}
              />
            </View>
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={() => handleLogin(tokenInput)}
            style={({ pressed }) => [
              styles.primaryBtn,
              isSubmitting && styles.btnDisabled,
              pressed && styles.btnPressed
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={leopardPalette.surfaceWhite} />
            ) : (
              <Text style={styles.primaryBtnText}>Đăng nhập</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={() => {}}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && styles.btnPressed
            ]}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Đăng nhập bằng Google</Text>
          </Pressable>
        </View>

        {allowDemo && (
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Tài khoản trải nghiệm</Text>
            <View style={styles.demoGrid}>
              <Pressable
                onPress={() => handleDemoLogin('customer', 'CUSTOMER')}
                style={[styles.demoCard, { backgroundColor: pastelTheme.blueCard.bg, borderColor: pastelTheme.blueCard.border }]}
              >
                <Text style={styles.demoCardIcon}>📦</Text>
                <Text style={[styles.demoCardText, { color: pastelTheme.blueCard.text }]}>Khách hàng</Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleDemoLogin('driver', 'DRIVER')}
                style={[styles.demoCard, { backgroundColor: pastelTheme.greenCard.bg, borderColor: pastelTheme.greenCard.border }]}
              >
                <Text style={styles.demoCardIcon}>🚚</Text>
                <Text style={[styles.demoCardText, { color: pastelTheme.greenCard.text }]}>Tài xế</Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleDemoLogin('fleet-owner', 'FLEET_OWNER')}
                style={[styles.demoCard, { backgroundColor: pastelTheme.yellowCard.bg, borderColor: pastelTheme.yellowCard.border }]}
              >
                <Text style={styles.demoCardIcon}>🏢</Text>
                <Text style={[styles.demoCardText, { color: pastelTheme.yellowCard.text }]}>Chủ xe</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: leopardRadius.xl,
    height: 72,
    width: 72,
    marginBottom: spacing.xs,
  },
  logoIcon: {
    fontSize: 36,
  },
  brandTitle: {
    color: leopardPalette.primaryDark,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: leopardPalette.textMutedSlate,
    fontSize: 14,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...leopardElevation.subtle,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
    marginBottom: spacing.xs,
  },
  alertBox: {
    padding: spacing.sm,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
  },
  alertWarning: {
    backgroundColor: pastelTheme.yellowCard.bg,
    borderColor: pastelTheme.yellowCard.border,
  },
  alertError: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: leopardPalette.textSlateDark,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.inputBg,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
    borderColor: leopardPalette.inputBorder,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  inputFocused: {
    borderColor: leopardPalette.inputFocusBorder,
    backgroundColor: leopardPalette.inputFocusRing,
  },
  inputError: {
    borderColor: colors.danger.border,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: leopardPalette.textSlateDark,
  },
  primaryBtn: {
    backgroundColor: leopardPalette.primaryDark,
    borderRadius: leopardRadius.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    color: leopardPalette.surfaceWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: leopardPalette.subtleDivider,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: leopardPalette.textSubtle,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.pill,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    height: 48,
    gap: spacing.sm,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA4335',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  demoSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
  },
  demoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  demoCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  demoCardIcon: {
    fontSize: 20,
  },
  demoCardText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
