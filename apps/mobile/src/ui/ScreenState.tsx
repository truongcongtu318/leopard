import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

type ScreenStateName =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success'
  | 'permission-denied'
  | 'offline';

const defaultCopy: Record<ScreenStateName, { title: string; message: string }> = {
  loading: {
    title: 'Đang tải dữ liệu',
    message: 'Vui lòng chờ trong giây lát.',
  },
  empty: {
    title: 'Chưa có dữ liệu',
    message: 'Chưa có nội dung phù hợp để hiển thị.',
  },
  error: {
    title: 'Không thể tải dữ liệu',
    message: 'Vui lòng thử lại khi kết nối ổn định.',
  },
  success: {
    title: 'Đã cập nhật dữ liệu',
    message: 'Thông tin mới nhất đã được ghi nhận.',
  },
  'permission-denied': {
    title: 'Bạn không có quyền truy cập',
    message: 'Hãy quay về khu vực được cấp quyền.',
  },
  offline: {
    title: 'Đang ngoại tuyến',
    message: 'Nội dung hiện có có thể chưa phải dữ liệu mới nhất.',
  },
};

type ScreenStateProps = PropsWithChildren<{
  state: ScreenStateName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}>;

export function ScreenState({
  state,
  title,
  message,
  actionLabel,
  onAction,
  children,
}: ScreenStateProps) {
  const copy = defaultCopy[state];
  const isPermissionDenied = state === 'permission-denied';
  const isAlert = state === 'error' || isPermissionDenied;

  return (
    <View style={styles.container}>
      <View
        accessibilityLiveRegion={state === 'loading' ? 'polite' : 'none'}
        style={[styles.messagePanel, isAlert ? styles.alertPanel : null]}
      >
        <Text accessibilityRole={isAlert ? 'alert' : 'header'} style={styles.title}>
          {title ?? copy.title}
        </Text>
        <Text style={styles.message}>{message ?? copy.message}</Text>
      </View>
      {!isPermissionDenied ? children : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  messagePanel: {
    alignSelf: 'stretch',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  alertPanel: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  title: {
    ...typography.title,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  message: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
});
