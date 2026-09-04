import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { RealInteractiveMap } from './RealInteractiveMap';

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
        <RealInteractiveMap
          destination={{ label: destinationLabel }}
          height="100%"
          mode={markerLabel ? 'tracking' : 'route'}
          origin={{ label: originLabel }}
          truckEtaLabel={markerLabel}
        />
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
