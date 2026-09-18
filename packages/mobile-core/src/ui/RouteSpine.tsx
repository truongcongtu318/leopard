import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  customerPalette,
  radius,
  spacing,
  typeScale,
  typography,
} from '../theme/tokens';

export type RoutePoint = Readonly<{
  id: string;
  label: string;
}>;

type RouteProps = Readonly<{
  destination: RoutePoint;
  origin: RoutePoint;
  stops: readonly RoutePoint[];
}>;

type RouteSummaryProps = RouteProps & Readonly<{ tone?: 'default' | 'inverse' }>;

type RouteNodeProps = Readonly<{
  accessibilityLabel: string;
  hasConnector: boolean;
  kind: 'origin' | 'stop' | 'destination';
  point: RoutePoint;
  title: string;
  isLast?: boolean;
}>;

function RouteNode({
  accessibilityLabel,
  hasConnector,
  isLast,
  kind,
  point,
  title,
}: RouteNodeProps) {
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
      <View style={[styles.nodeContent, isLast ? styles.nodeContentLast : null]}>
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
        isLast
        kind="destination"
        point={destination}
        title="Điểm giao hàng"
      />
    </View>
  );
}

export function RouteSummary({ destination, origin, stops, tone = 'default' }: RouteSummaryProps) {
  const stopCountLabel = `${stops.length} điểm dừng`;
  const inverse = tone === 'inverse';

  return (
    <View style={styles.summary}>
      <View style={styles.summaryLocation}>
        <Text style={[styles.summaryLabel, inverse ? styles.summaryLabelInverse : null]}>
          Điểm lấy hàng
        </Text>
        <Text style={[styles.summaryAddress, inverse ? styles.summaryAddressInverse : null]}>
          {origin.label}
        </Text>
      </View>
      <Text style={[styles.stopCount, inverse ? styles.stopCountInverse : null]}>
        {stopCountLabel}
      </Text>
      <View style={styles.summaryLocation}>
        <Text style={[styles.summaryLabel, inverse ? styles.summaryLabelInverse : null]}>
          Điểm giao hàng
        </Text>
        <Text style={[styles.summaryAddress, inverse ? styles.summaryAddressInverse : null]}>
          {destination.label}
        </Text>
      </View>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  origin: {
    backgroundColor: customerPalette.primary,
    borderColor: 'rgba(11, 37, 69, 0.25)',
  },
  stop: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
  },
  destination: {
    backgroundColor: customerPalette.accent,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
});

const styles = StyleSheet.create({
  spine: {
    alignSelf: 'stretch',
    paddingVertical: spacing.xxs,
  },
  node: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rail: {
    alignItems: 'center',
    width: 14,
    paddingTop: 3,
  },
  marker: {
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 10,
    width: 10,
  },
  connector: {
    backgroundColor: colors.neutral.border,
    flex: 1,
    minHeight: spacing.md,
    width: 1.5,
    marginVertical: 2,
  },
  nodeContent: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.sm,
  },
  nodeContentLast: {
    paddingBottom: 0,
  },
  nodeTitle: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    flexShrink: 1,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  address: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    flexShrink: 1,
    fontWeight: '500',
    lineHeight: 18,
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
  summaryAddressInverse: { color: colors.brand.text },
  summaryLabelInverse: { color: colors.operational.inkMuted },
  stopCount: {
    ...typography.caption,
    color: colors.info.text,
    flexShrink: 1,
    fontWeight: '600',
  },
  stopCountInverse: { color: colors.brand.softBackground },
});
