import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Role } from '@leopard/shared';

import { httpClient } from '../api/http-client';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { sessionStore } from './session-store';
import { ApiError } from '../api/api-error';

export interface LoginScreenProps {
  onLoginSuccess?: (role: Role) => void;
  allowDemo?: boolean;
  sessionExpired?: boolean;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    role: Role;
    status: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
}

export function LoginScreen({
  onLoginSuccess,
  allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true',
  sessionExpired = false,
}: LoginScreenProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (idToken: string) => {
    if (!idToken.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);
      const role = res.user?.role ?? 'CUSTOMER';
      onLoginSuccess?.(role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMsg(err.message || 'Thông tin đăng nhập không hợp lệ');
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMsg(err.message || 'Hệ thống xác thực tạm thời không khả dụng');
        } else {
          setErrorMsg(err.message || 'Đã xảy ra lỗi khi đăng nhập');
        }
      } else {
        setErrorMsg('Đã xảy ra lỗi kết nối mạng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (accountId: string, defaultRole: Role) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await httpClient.post<AuthResponse>('/auth/login/demo', { accountId });
      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);
      const role = res.user?.role ?? defaultRole;
      onLoginSuccess?.(role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMsg(err.message || 'Tài khoản demo không hợp lệ');
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMsg(err.message || 'Hệ thống xác thực tạm thời không khả dụng');
        } else {
          setErrorMsg(err.message || 'Đã xảy ra lỗi khi đăng nhập demo');
        }
      } else {
        setErrorMsg('Đã xảy ra lỗi kết nối mạng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Đăng nhập
      </Text>

      {sessionExpired ? (
        <View style={styles.alertBox} testID="session-expired-banner">
          <Text accessibilityRole="alert" style={styles.alertText}>
            Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorBox} testID="login-error-banner">
          <Text accessibilityRole="alert" style={styles.errorText}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      <FormField
        editable={!isSubmitting}
        label="Số điện thoại hoặc Token"
        onChangeText={setTokenInput}
        placeholder="Nhập số điện thoại hoặc idToken..."
        value={tokenInput}
      />

      <Button
        disabled={isSubmitting || !tokenInput.trim()}
        disabledLabel="Đăng nhập"
        isLoading={isSubmitting}
        label="Đăng nhập"
        loadingLabel="Đang xử lý..."
        onPress={() => handleLogin(tokenInput)}
      />

      {allowDemo ? (
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Tài khoản demo</Text>
          <View style={styles.demoButtons}>
            <Button
              disabled={isSubmitting}
              label="Demo Customer"
              onPress={() => handleDemoLogin('customer', 'CUSTOMER')}
              variant="secondary"
            />
            <Button
              disabled={isSubmitting}
              label="Demo Driver"
              onPress={() => handleDemoLogin('driver', 'DRIVER')}
              variant="secondary"
            />
            <Button
              disabled={isSubmitting}
              label="Demo Fleet Owner"
              onPress={() => handleDemoLogin('fleet-owner', 'FLEET_OWNER')}
              variant="secondary"
            />
            <Button
              disabled={isSubmitting}
              label="Demo Admin"
              onPress={() => handleDemoLogin('admin', 'ADMIN')}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.neutral.text,
    textAlign: 'center',
  },
  alertBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  alertText: {
    ...typography.caption,
    color: colors.warning.text,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger.text,
    textAlign: 'center',
  },
  demoSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  demoTitle: {
    ...typography.label,
    color: colors.neutral.mutedText,
    textAlign: 'center',
  },
  demoButtons: {
    gap: spacing.xs,
  },
});
