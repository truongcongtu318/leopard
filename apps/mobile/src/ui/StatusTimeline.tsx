import type { OrderStatus } from '@leopard/shared';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, leopardRadius, spacing, typography } from '@leopard/mobile-core';
import { SectionHeading } from './ScreenScaffold';
import { getOrderStatusPresentation } from './StatusBadge';

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
  const presentation = getOrderStatusPresentation(item.status);

  return (
    <View style={styles.entryContainer}>
      <View style={styles.timelineGraphic}>
        <View
          style={[
            styles.dot,
            isCompleted && styles.dotCompleted,
            isActive && styles.dotActive,
          ]}
        >
          {isActive ? <View style={styles.dotActiveCore} /> : null}
        </View>
        <View
          style={[
            styles.line,
            isCompleted && styles.lineCompleted,
            isActive && styles.lineActive,
          ]}
        />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text
            style={[
              styles.statusText,
              isActive && styles.statusTextActive,
              isCompleted && styles.statusTextCompleted,
            ]}
          >
            {presentation.label}
          </Text>
          {item.timestampLabel ? (
            <Text style={styles.timestamp}>{item.timestampLabel}</Text>
          ) : null}
        </View>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
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
    borderColor: '#E2E8F0',
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
    backgroundColor: '#CBD5E1',
    marginTop: 4,
    zIndex: 2,
  },
  dotCompleted: {
    backgroundColor: '#94A3B8',
  },
  dotActive: {
    backgroundColor: '#F0F4F9',
    borderWidth: 2,
    borderColor: '#0B1E42',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActiveCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B1E42',
  },
  line: {
    width: 2,
    flex: 1,
    position: 'absolute',
    top: 14,
    bottom: -14,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: '#CBD5E1',
  },
  lineActive: {
    backgroundColor: '#CBD5E1',
  },
  entryContent: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: 4,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  statusTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#475569',
  },
  timestamp: {
    ...typography.caption,
    fontFamily: 'monospace',
    color: '#94A3B8',
    fontSize: 11.5,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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

