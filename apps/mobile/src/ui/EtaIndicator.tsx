import type { ProviderSource } from '@leopard/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

type EtaIndicatorProps = {
  durationSeconds: number | null;
  source: ProviderSource;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function EtaIndicator({
  durationSeconds,
  source,
  isLoading = false,
  error,
  onRetry,
}: EtaIndicatorProps) {
  const isUnavailable = !isLoading && (Boolean(error) || durationSeconds === null);
  const durationMinutes =
    durationSeconds === null ? null : Math.ceil(Math.max(0, durationSeconds) / 60);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ETA dự kiến</Text>
      {isLoading ? <Text style={styles.value}>Đang tính ETA dự kiến.</Text> : null}
      {isUnavailable ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error ?? 'Chưa thể tính ETA dự kiến.'}
        </Text>
      ) : null}
      {!isLoading && !isUnavailable && durationMinutes !== null ? (
        <Text style={styles.value}>{durationMinutes} phút</Text>
      ) : null}
      {source === 'DEMO' ? <Text style={styles.demoLabel}>Dữ liệu mô phỏng</Text> : null}
      {isUnavailable && onRetry ? (
        <Button label="Thử lại" onPress={onRetry} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.info.text,
    flexShrink: 1,
  },
  value: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  error: {
    ...typography.body,
    color: colors.danger.text,
    flexShrink: 1,
  },
  demoLabel: {
    ...typography.caption,
    color: colors.info.text,
    flexShrink: 1,
    fontWeight: '600',
  },
});
