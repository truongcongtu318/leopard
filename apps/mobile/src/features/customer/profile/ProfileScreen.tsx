import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import type { CustomerProfileView } from './model';

export type CustomerProfileScreenProps = Readonly<{
  view: CustomerProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function CustomerProfileScreen({ view, onLogout, onRetry }: CustomerProfileScreenProps) {
  if (view.kind !== 'content') {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Hồ sơ">
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử lại' : undefined}
          message={view.message}
          onAction={onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · JOURNEY SHEET"
      stickyFooter={
        <Button
          disabledLabel="Đăng xuất"
          isLoading={view.isLoggingOut}
          label="Đăng xuất"
          loadingLabel="Đang đăng xuất…"
          onPress={onLogout}
          variant="destructive"
        />
      }
      title="Hồ sơ"
    >
      <View style={styles.card}>
        <InfoRow label="Số điện thoại" value={view.phone} />
        <InfoRow label="Vai trò" value={view.roleLabel} />
        <InfoRow label="Trạng thái tài khoản" value={view.statusLabel} />
        <InfoRow label="Phiên bản ứng dụng" value={view.appVersion} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  row: {
    borderBottomColor: colors.neutral.subtleBorder,
    borderBottomWidth: 1,
    gap: spacing.xxs,
    paddingBottom: spacing.sm,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
  },
  rowValue: {
    ...typography.body,
    color: colors.neutral.text,
  },
});
