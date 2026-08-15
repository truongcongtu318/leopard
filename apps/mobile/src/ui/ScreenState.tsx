import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

export type ScreenStateName =
  | 'loading'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'success'
  | 'permission-denied'
  | 'offline'
  | 'stale'
  | 'reconnecting'
  | 'session-expired'
  | 'conflict';

const defaultCopy: Record<ScreenStateName, { title: string; message: string }> = {
  loading: {
    title: 'Đang tải dữ liệu',
    message: 'Vui lòng chờ trong giây lát.',
  },
  empty: {
    title: 'Chưa có dữ liệu',
    message: 'Chưa có nội dung phù hợp để hiển thị.',
  },
  'no-results': {
    title: 'Không có kết quả phù hợp',
    message: 'Không có dữ liệu khớp bộ lọc hiện tại.',
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
  stale: {
    title: 'Dữ liệu cần được làm mới',
    message: 'Nội dung đang hiển thị là lần cập nhật gần nhất.',
  },
  reconnecting: {
    title: 'Đang kết nối lại',
    message: 'Nội dung hiện có được giữ trong khi khôi phục kết nối.',
  },
  'session-expired': {
    title: 'Phiên đăng nhập đã hết hạn',
    message: 'Hãy đăng nhập lại để tiếp tục.',
  },
  conflict: {
    title: 'Dữ liệu vừa thay đổi',
    message: 'Hãy tải lại thông tin mới nhất trước khi tiếp tục.',
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
  const isPrivateBoundary = state === 'permission-denied' || state === 'session-expired';
  const isAlert =
    state === 'error' ||
    state === 'permission-denied' ||
    state === 'session-expired' ||
    state === 'conflict';
  const isBusy = state === 'loading' || state === 'reconnecting';
  const liveRegion = isAlert ? 'assertive' : state === 'empty' ? 'none' : 'polite';
  const panelStyle =
    state === 'success'
      ? styles.successPanel
      : state === 'offline' || state === 'stale'
        ? styles.warningPanel
        : state === 'reconnecting'
          ? styles.infoPanel
          : isAlert
            ? styles.alertPanel
            : null;

  return (
    <View style={styles.container}>
      <View
        accessibilityLiveRegion={liveRegion}
        accessibilityState={isBusy ? { busy: true } : undefined}
        style={[styles.messagePanel, panelStyle]}
        testID="screen-state-panel"
      >
        <Text accessibilityRole={isAlert ? 'alert' : 'header'} style={styles.title}>
          {title ?? copy.title}
        </Text>
        <Text style={styles.message}>{message ?? copy.message}</Text>
      </View>
      {!isPrivateBoundary ? children : null}
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
  infoPanel: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
  },
  successPanel: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
  },
  warningPanel: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  message: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
});
