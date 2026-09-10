import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

type MapPanelProps =
  | Readonly<{ state: 'loading'; summary: string }>
  | Readonly<{
      fallbackMessage?: string;
      onRetry?: () => void;
      state: 'fallback';
      summary: string;
    }>
  | Readonly<{ children: ReactNode; state: 'ready'; summary: string }>
  | Readonly<{
      children: ReactNode;
      lastUpdatedLabel: string;
      onRetry?: () => void;
      state: 'stale';
      summary: string;
    }>;

function MapContent({ children, summary }: Readonly<{ children: ReactNode; summary: string }>) {
  return (
    <View
      accessibilityLabel={summary}
      accessibilityRole="image"
      accessible
      style={styles.mapContent}
    >
      {children}
    </View>
  );
}

export function MapPanel(props: MapPanelProps) {
  const isLoading = props.state === 'loading';
  const liveRegion = props.state === 'ready' ? 'none' : 'polite';

  return (
    <View
      accessibilityLabel={isLoading ? props.summary : undefined}
      accessibilityLiveRegion={liveRegion}
      accessibilityRole={isLoading ? 'progressbar' : undefined}
      accessibilityState={isLoading ? { busy: true } : undefined}
      accessible={isLoading || undefined}
      style={styles.panel}
      testID="map-panel"
    >
      {props.state === 'loading' ? (
        <View style={styles.messageContent}>
          <Text accessibilityRole="header" style={styles.title}>
            Đang tải bản đồ
          </Text>
          <Text style={styles.message}>Lộ trình sẽ được giữ đúng kích thước khi sẵn sàng.</Text>
        </View>
      ) : null}
      {props.state === 'fallback' ? (
        <View style={styles.messageContent}>
          <Text accessibilityRole="header" style={styles.title}>
            Bản đồ chưa khả dụng
          </Text>
          <Text style={styles.message}>
            {props.fallbackMessage ?? 'Hãy dùng lộ trình dạng danh sách để tiếp tục.'}
          </Text>
          {props.onRetry ? (
            <Button label="Thử tải lại bản đồ" onPress={props.onRetry} variant="secondary" />
          ) : null}
        </View>
      ) : null}
      {props.state === 'ready' ? (
        <MapContent summary={props.summary}>{props.children}</MapContent>
      ) : null}
      {props.state === 'stale' ? (
        <>
          <MapContent summary={props.summary}>{props.children}</MapContent>
          <View style={styles.staleNotice}>
            <Text style={styles.staleTitle}>Dữ liệu vị trí có thể đã cũ</Text>
            <Text style={styles.staleMessage}>Cập nhật lần cuối: {props.lastUpdatedLabel}</Text>
            {props.onRetry ? (
              <Button label="Làm mới vị trí" onPress={props.onRetry} variant="secondary" />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: layout.mapMinimumHeight,
    overflow: 'hidden',
  },
  mapContent: {
    flex: 1,
    minHeight: layout.mapMinimumHeight,
  },
  messageContent: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.md,
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
  staleNotice: {
    backgroundColor: colors.warning.background,
    borderTopColor: colors.warning.border,
    borderTopWidth: 1,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  staleTitle: {
    ...typography.label,
    color: colors.warning.text,
    flexShrink: 1,
  },
  staleMessage: {
    ...typography.body,
    color: colors.warning.text,
    flexShrink: 1,
  },
});
