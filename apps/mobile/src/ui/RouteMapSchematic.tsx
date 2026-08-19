import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

export type RouteMapSchematicProps = Readonly<{
  destinationLabel: string;
  markerLabel?: string;
  originLabel: string;
}>;

export function RouteMapSchematic({
  destinationLabel,
  markerLabel,
  originLabel,
}: RouteMapSchematicProps) {
  return (
    <View style={styles.container} testID="route-map-schematic">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.map}
      >
        <View style={[styles.roadVertical, styles.roadOne]} />
        <View style={[styles.roadVertical, styles.roadTwo]} />
        <View style={[styles.roadHorizontal, styles.roadThree]} />
        <View style={[styles.roadHorizontal, styles.roadFour]} />
        <View style={styles.routeVertical} />
        <View style={styles.routeHorizontal} />
        <View style={[styles.routeNode, styles.originNode]} />
        <View style={[styles.routeNode, styles.destinationNode]} />
        {markerLabel ? (
          <View style={styles.driverMarker}>
            <View style={styles.driverMarkerCore} />
          </View>
        ) : null}
        <View style={styles.mapStamp}>
          <Text style={styles.mapStampText}>ROUTE / PREVIEW</Text>
        </View>
      </View>
      <View style={styles.routeLedger}>
        <View style={styles.location}>
          <Text style={styles.locationLabel}>ĐIỂM LẤY</Text>
          <Text style={styles.locationValue}>{originLabel}</Text>
        </View>
        <Text accessibilityElementsHidden style={styles.arrow}>
          →
        </Text>
        <View style={[styles.location, styles.destinationLocation]}>
          <Text style={styles.locationLabel}>ĐIỂM GIAO</Text>
          <Text style={styles.locationValue}>{destinationLabel}</Text>
        </View>
      </View>
      {markerLabel ? (
        <View style={styles.markerLedger}>
          <View accessibilityElementsHidden style={styles.liveDot} />
          <Text style={styles.markerLabel}>{markerLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.background,
    flex: 1,
    minHeight: 280,
  },
  map: {
    backgroundColor: colors.operational.mapLand,
    flex: 1,
    minHeight: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  roadVertical: {
    backgroundColor: colors.neutral.background,
    bottom: -16,
    position: 'absolute',
    top: -16,
    width: 18,
  },
  roadOne: { left: '18%', transform: [{ rotate: '12deg' }] },
  roadTwo: { right: '17%', transform: [{ rotate: '-18deg' }] },
  roadHorizontal: {
    backgroundColor: colors.neutral.background,
    height: 16,
    left: -20,
    position: 'absolute',
    right: -20,
  },
  roadThree: { top: '27%', transform: [{ rotate: '-5deg' }] },
  roadFour: { bottom: '22%', transform: [{ rotate: '7deg' }] },
  routeVertical: {
    backgroundColor: colors.brand.background,
    bottom: 48,
    left: '28%',
    position: 'absolute',
    top: 28,
    width: 4,
  },
  routeHorizontal: {
    backgroundColor: colors.brand.background,
    bottom: 48,
    height: 4,
    left: '28%',
    position: 'absolute',
    right: '17%',
  },
  routeNode: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.brand.background,
    borderRadius: radius.pill,
    borderWidth: 4,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  originNode: { left: '25.8%', top: 19 },
  destinationNode: { bottom: 41, right: '14.8%' },
  driverMarker: {
    alignItems: 'center',
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    left: '51%',
    position: 'absolute',
    top: '46%',
    width: 26,
  },
  driverMarkerCore: {
    backgroundColor: colors.warning.border,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  mapStamp: {
    backgroundColor: colors.operational.ink,
    left: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    position: 'absolute',
    top: spacing.sm,
  },
  mapStampText: {
    ...typography.caption,
    color: colors.brand.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  routeLedger: {
    alignItems: 'flex-start',
    borderTopColor: colors.neutral.subtleBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  location: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  destinationLocation: { alignItems: 'flex-end' },
  locationLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  locationValue: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  arrow: {
    ...typography.sectionTitle,
    color: colors.brand.background,
  },
  markerLedger: {
    alignItems: 'center',
    backgroundColor: colors.warning.background,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  liveDot: {
    backgroundColor: colors.warning.border,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  markerLabel: {
    ...typography.caption,
    color: colors.warning.text,
    flex: 1,
    fontWeight: '600',
  },
});
