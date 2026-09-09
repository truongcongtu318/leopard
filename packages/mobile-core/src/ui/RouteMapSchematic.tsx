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
        <View style={styles.routeLedgerRow}>
          <View style={styles.pointDotA}>
            <Text style={styles.pointDotText}>A</Text>
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>ĐIỂM LẤY HÀNG (A)</Text>
            <Text numberOfLines={2} style={styles.locationValue}>{originLabel}</Text>
          </View>
        </View>
        <View style={styles.routeLedgerRow}>
          <View style={styles.pointDotB}>
            <Text style={styles.pointDotText}>B</Text>
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>ĐIỂM GIAO HÀNG (B)</Text>
            <Text numberOfLines={2} style={styles.locationValue}>{destinationLabel}</Text>
          </View>
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
    borderTopColor: colors.neutral.subtleBorder,
    borderTopWidth: 1,
    flexDirection: 'column',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  routeLedgerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  pointDotA: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  pointDotB: {
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  pointDotText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  locationTextWrap: {
    flex: 1,
    gap: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  locationValue: {
    ...typography.label,
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '600',
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
