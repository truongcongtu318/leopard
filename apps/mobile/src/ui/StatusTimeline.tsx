import type { OrderStatus } from '@leopard/shared';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, leopardRadius, spacing, typography } from '../theme/tokens';
import { SectionHeading } from './ScreenScaffold';
import { StatusBadge } from './StatusBadge';

export type StatusTimelineEntry = Readonly<{
  description?: string;
  id: string;
  status: OrderStatus;
  timestampLabel?: string;
  isCompleted?: boolean;
  isActive?: boolean;
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
  const isCompleted = item.isCompleted ?? false;
  const isActive = item.isActive ?? false;

  let dotColor: string = leopardPalette.textSubtle;
  let lineColor: string = leopardPalette.cardBorder;
  let textColor: string = leopardPalette.textMutedSlate;

  if (isCompleted) {
    dotColor = colors.success.border;
    lineColor = colors.success.border;
    textColor = leopardPalette.textSlateDark;
  } else if (isActive) {
    dotColor = colors.brand.background;
    lineColor = leopardPalette.cardBorder;
    textColor = leopardPalette.textSlateDark;
  }

  return (
    <View style={styles.entryContainer}>
      <View style={styles.timelineGraphic}>
        <View style={[styles.dot, { backgroundColor: dotColor }, isActive && styles.dotActive]} />
        <View style={[styles.line, { backgroundColor: lineColor }]} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <StatusBadge domain="order" status={item.status} />
          {item.timestampLabel ? <Text style={styles.timestamp}>{item.timestampLabel}</Text> : null}
        </View>
        {item.description ? <Text style={[styles.description, { color: textColor }]}>{item.description}</Text> : null}
      </View>
    </View>
  );
}

export function StatusTimeline({ entries, title = 'Lịch sử trạng thái' }: StatusTimelineProps) {
  return (
    <View style={styles.container}>
      <SectionHeading title={title} />
      <View style={styles.card}>
        <FlatList
          data={entries}
          ItemSeparatorComponent={TimelineSeparator}
          keyExtractor={statusTimelineKeyExtractor}
          ListEmptyComponent={TimelineEmpty}
          renderItem={renderTimelineEntry}
          scrollEnabled={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    borderRadius: leopardRadius.md,
    padding: spacing.md,
  },
  entryContainer: {
    flexDirection: 'row',
  },
  timelineGraphic: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    zIndex: 1,
  },
  dotActive: {
    borderWidth: 2,
    borderColor: colors.brand.softBackground,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
  },
  line: {
    width: 2,
    flex: 1,
    position: 'absolute',
    top: 14,
    bottom: -14,
    zIndex: 0,
  },
  entryContent: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  timestamp: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    flexShrink: 1,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    flexShrink: 1,
  },
  separator: {
    height: 0,
  },
  empty: {
    ...typography.body,
    color: leopardPalette.textMutedSlate,
    fontSize: 14,
    flexShrink: 1,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
