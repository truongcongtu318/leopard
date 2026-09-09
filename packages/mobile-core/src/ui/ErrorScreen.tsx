import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, leopardPalette, leopardRadius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';
import { IconSearch, IconSecurityShield } from './icons/CoreIcons';
import { ScreenScaffold } from './ScreenScaffold';

export type ErrorType = '403' | '404' | '500' | 'offline';

export type ErrorScreenProps = Readonly<{
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
}>;

const errorConfigs = {
  '403': {
    code: '403 · TỪ CHỐI TRUY CẬP',
    title: 'Từ chối truy cập',
    message: 'Tài khoản của bạn không có quyền thực hiện thao tác này hoặc xem trang này.',
    actionLabel: 'Quay về trang chủ',
    retryLabel: 'Thử lại',
    accent: colors.danger.text,
    iconBg: colors.danger.background,
  },
  '404': {
    code: '404 · KHÔNG TÌM THẤY TRANG',
    title: 'Không tìm thấy trang',
    message: 'Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.',
    actionLabel: 'Quay về trang chủ',
    retryLabel: 'Thử lại',
    accent: colors.warning.text,
    iconBg: colors.warning.background,
  },
  '500': {
    code: '500 · LỖI MÁY CHỦ',
    title: 'Lỗi máy chủ',
    message: 'Đã có sự cố xảy ra trong quá trình xử lý. Vui lòng thử lại sau ít phút.',
    actionLabel: 'Quay về trang chủ',
    retryLabel: 'Thử lại',
    accent: colors.danger.text,
    iconBg: colors.danger.background,
  },
  offline: {
    code: 'OFFLINE · MẤT KẾT NỐI',
    title: 'Mất kết nối mạng',
    message: 'Vui lòng kiểm tra lại kết nối Wifi hoặc 4G/5G của thiết bị.',
    actionLabel: 'Quay về trang chủ',
    retryLabel: 'Thử lại',
    accent: leopardPalette.textMutedSlate,
    iconBg: leopardPalette.bgMuted,
  },
};

function renderErrorIcon(type: ErrorType) {
  if (type === '403') {
    return <IconSecurityShield color={colors.danger.text} size={28} />;
  }
  if (type === '404') {
    return <IconSearch color={colors.warning.text} size={28} />;
  }
  if (type === '500') {
    return <IconSecurityShield color={colors.danger.text} size={28} />;
  }
  return <IconSearch color={leopardPalette.textMutedSlate} size={28} />;
}

export function ErrorScreen({
  type = '404',
  title,
  message,
  onRetry,
}: ErrorScreenProps) {
  const router = useRouter();
  const config = errorConfigs[type] ?? errorConfigs['404'];

  const handleHome = () => {
    router.replace('/');
  };

  return (
    <ScreenScaffold
      eyebrow={config.code}
      subtitle="Thông báo trạng thái hệ thống."
      title="Sự cố"
    >
      <View style={[styles.container, { backgroundColor: leopardPalette.canvas }]}>
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: config.iconBg }]}>
            {renderErrorIcon(type)}
          </View>
          <Text style={[styles.codeText, { color: config.accent }]}>{config.code}</Text>
          <Text style={styles.errorTitle}>{title ?? config.title}</Text>
          <Text style={styles.errorMessage}>{message ?? config.message}</Text>
          <View style={styles.buttonGroup}>
            <Button label={config.actionLabel} onPress={handleHome} />
            {onRetry && (
              <Button label={config.retryLabel} onPress={onRetry} variant="secondary" />
            )}
          </View>
        </View>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: leopardRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 420,
    padding: spacing.xl,
    textAlign: 'center',
    width: '100%',
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: leopardRadius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
    marginBottom: spacing.xs,
  },
  codeText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: leopardPalette.textSlateDark,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    fontSize: 14,
    color: leopardPalette.textMutedSlate,
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.sm,
  },
});
