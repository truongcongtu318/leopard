import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';

export type RoutePoint = Readonly<{
  id: string;
  label: string;
}>;

type RouteProps = Readonly<{
  destination: RoutePoint;
  origin: RoutePoint;
  stops: readonly RoutePoint[];
}>;

type RouteNodeProps = Readonly<{
  accessibilityLabel: string;
  hasConnector: boolean;
  kind: 'origin' | 'stop' | 'destination';
  point: RoutePoint;
  title: string;
}>;

function RouteNode({ accessibilityLabel, hasConnector, kind, point, title }: RouteNodeProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      accessible
      style={styles.node}
    >
      <View accessibilityElementsHidden style={styles.rail}>
        <View style={[styles.marker, markerStyles[kind]]} />
        {hasConnector ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.nodeContent}>
        <Text style={styles.nodeTitle}>{title}</Text>
        <Text style={styles.address} testID={`route-address-${point.id}`}>
          {point.label}
        </Text>
      </View>
    </View>
  );
}

export function RouteSpine({ destination, origin, stops }: RouteProps) {
  return (
    <View style={styles.spine}>
      <RouteNode
        accessibilityLabel={`Điểm lấy hàng: ${origin.label}`}
        hasConnector
        kind="origin"
        point={origin}
        title="Điểm lấy hàng"
      />
      {stops.map((stop, index) => (
        <RouteNode
          accessibilityLabel={`Điểm dừng ${index + 1} trong ${stops.length}: ${stop.label}`}
          hasConnector
          key={`stop:${stop.id}`}
          kind="stop"
          point={stop}
          title={`Điểm dừng ${index + 1}`}
        />
      ))}
      <RouteNode
        accessibilityLabel={`Điểm giao hàng: ${destination.label}`}
        hasConnector={false}
        kind="destination"
        point={destination}
        title="Điểm giao hàng"
      />
    </View>
  );
}

export function RouteSummary({ destination, origin, stops }: RouteProps) {
  const stopCountLabel = `${stops.length} điểm dừng`;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryLocation}>
        <Text style={styles.summaryLabel}>Điểm lấy hàng</Text>
        <Text style={styles.summaryAddress}>{origin.label}</Text>
      </View>
      <Text style={styles.stopCount}>{stopCountLabel}</Text>
      <View style={styles.summaryLocation}>
        <Text style={styles.summaryLabel}>Điểm giao hàng</Text>
        <Text style={styles.summaryAddress}>{destination.label}</Text>
      </View>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  origin: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  stop: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.info.border,
  },
  destination: {
    backgroundColor: colors.active.border,
    borderColor: colors.active.border,
  },
});

const styles = StyleSheet.create({
  spine: {
    alignSelf: 'stretch',
  },
  node: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rail: {
    alignItems: 'center',
    width: spacing.lg,
  },
  marker: {
    borderRadius: spacing.xs,
    borderWidth: 2,
    height: spacing.md,
    width: spacing.md,
  },
  connector: {
    backgroundColor: colors.neutral.border,
    flex: 1,
    minHeight: spacing.lg,
    width: 1,
  },
  nodeContent: {
    flex: 1,
    gap: spacing.xxs,
    paddingBottom: spacing.md,
  },
  nodeTitle: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  address: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  summary: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  summaryLocation: {
    gap: spacing.xxs,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  summaryAddress: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  stopCount: {
    ...typography.caption,
    color: colors.info.text,
    flexShrink: 1,
    fontWeight: '600',
  },
});
