import type { OrderStatus } from '@leopard/shared';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';
import { SectionHeading } from './ScreenScaffold';
import { StatusBadge } from './StatusBadge';

export type StatusTimelineEntry = Readonly<{
  description?: string;
  id: string;
  status: OrderStatus;
  timestampLabel?: string;
}>;

export type StatusTimelineProps = Readonly<{
  entries: readonly StatusTimelineEntry[];
  title?: string;
}>;

export function statusTimelineKeyExtractor(item: StatusTimelineEntry) {
  return item.id;
}

function TimelineEmpty() {
  return <Text style={styles.empty}>Chưa có lịch sử trạng thái.</Text>;
}

function TimelineSeparator() {
  return <View accessibilityElementsHidden style={styles.separator} />;
}

function renderTimelineEntry({ item }: ListRenderItemInfo<StatusTimelineEntry>) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <StatusBadge domain="order" status={item.status} />
        {item.timestampLabel ? <Text style={styles.timestamp}>{item.timestampLabel}</Text> : null}
      </View>
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
    </View>
  );
}

export function StatusTimeline({ entries, title = 'Lịch sử trạng thái' }: StatusTimelineProps) {
  return (
    <View style={styles.container}>
      <SectionHeading title={title} />
      <FlatList
        data={entries}
        ItemSeparatorComponent={TimelineSeparator}
        keyExtractor={statusTimelineKeyExtractor}
        ListEmptyComponent={TimelineEmpty}
        renderItem={renderTimelineEntry}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  entry: {
    borderLeftColor: colors.neutral.border,
    borderLeftWidth: 1,
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  entryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  timestamp: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  description: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  separator: {
    height: spacing.xxs,
  },
  empty: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
    paddingVertical: spacing.sm,
  },
});
