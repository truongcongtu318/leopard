import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  customerPalette,
  iosContinuousCurve,
  layout,
  leopardPalette,
  radius,
  spacing,
  typography,
  typeScale,
} from '../theme/tokens';
import { RealInteractiveMap } from './RealInteractiveMap';

export type RouteMapSchematicProps = Readonly<{
  destinationLabel: string;
  destinationCoords?: { lat: number; lng: number };
  markerLabel?: string;
  originLabel: string;
  originCoords?: { lat: number; lng: number };
  stops?: readonly { id: string; label: string; coords?: { lat: number; lng: number } }[];
  truckLocation?: { lat: number; lng: number };
  truckEtaMinutes?: number;
  interactive?: boolean;
  mapHeight?: number;
  onExpand?: () => void;
  showExpandButton?: boolean;
  hideLedger?: boolean;
}>;

export function RouteMapSchematic({
  destinationLabel,
  destinationCoords,
  markerLabel,
  originLabel,
  originCoords,
  stops,
  truckLocation,
  truckEtaMinutes,
  interactive = true,
  mapHeight = layout.mapMinimumHeight,
  onExpand,
  showExpandButton = false,
  hideLedger = false,
}: RouteMapSchematicProps) {
  const hasStops = stops && stops.length > 0;
  // A live driver coordinate means the truck pin is on the map, so the header
  // must say so even when the caller has no ETA label to hand.
  const isTracking = Boolean(markerLabel) || Boolean(truckLocation);

  return (
    <View
      style={[styles.container, hideLedger ? styles.containerCompact : null]}
      testID="route-map-schematic"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.map, { height: mapHeight }]}
      >
        <RealInteractiveMap
          destination={{ label: destinationLabel, coords: destinationCoords }}
          height="100%"
          interactive={interactive}
          mode={isTracking ? 'tracking' : 'route'}
          origin={{ label: originLabel, coords: originCoords }}
          stops={stops}
          truckEtaLabel={markerLabel}
          truckEtaMinutes={truckEtaMinutes}
          truckLocation={truckLocation}
        />

        {/* Floating Top Header Badges */}
        <View pointerEvents="box-none" style={styles.floatingTopBar}>
          <View style={styles.routePill}>
            <View style={styles.routePulseDot} />
            <Text style={styles.routePillText}>
              {isTracking
                ? 'Theo dõi xe trực tiếp'
                : hasStops
                  ? `Lộ trình (${stops.length + 2} điểm)`
                  : 'Lộ trình trực tiếp'}
            </Text>
          </View>

          {showExpandButton && onExpand ? (
            <Pressable
              accessibilityLabel="Mở rộng bản đồ toàn màn hình"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onExpand}
              style={({ pressed }) => [styles.expandBtn, pressed && styles.expandBtnPressed]}
            >
              <Text style={styles.expandBtnIcon}>⛶</Text>
              <Text style={styles.expandBtnText}>Phóng to</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Floating Bottom Interaction Hint */}
        {interactive ? (
          <View pointerEvents="none" style={styles.floatingBottomHint}>
            <Text style={styles.floatingHintText}>⤢ Chạm / Cuộn để phóng to, thu nhỏ</Text>
          </View>
        ) : null}
      </View>

      {!hideLedger ? (
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

          {hasStops
            ? stops.map((stop, idx) => (
                <View key={stop.id} style={styles.routeLedgerRow}>
                  <View style={styles.pointDotStop}>
                    <Text style={styles.pointDotText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.locationTextWrap}>
                    <Text style={styles.locationLabel}>ĐIỂM DỪNG ({idx + 1})</Text>
                    <Text numberOfLines={2} style={styles.locationValue}>{stop.label}</Text>
                  </View>
                </View>
              ))
            : null}

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
      ) : null}

      {!hideLedger && markerLabel ? (
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
    borderRadius: radius.card,
    overflow: 'hidden',
    ...iosContinuousCurve,
  },
  containerCompact: {
    backgroundColor: 'transparent',
    borderRadius: radius.cardSm,
  },
  map: {
    backgroundColor: colors.operational.mapLand,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  floatingTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.sm,
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    zIndex: 10,
  },
  routePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 37, 69, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...iosContinuousCurve,
  },
  routePulseDot: {
    backgroundColor: leopardPalette.ecoGreen,
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  routePillText: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  expandBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    borderWidth: 1,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    ...iosContinuousCurve,
  },
  expandBtnPressed: {
    backgroundColor: colors.neutral.surfaceMuted,
    transform: [{ scale: 0.96 }],
  },
  expandBtnIcon: {
    color: customerPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  expandBtnText: {
    color: customerPalette.primary,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  floatingBottomHint: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: radius.cardSm,
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    zIndex: 10,
    ...iosContinuousCurve,
  },
  floatingHintText: {
    color: 'rgba(255, 255, 255, 0.85)',
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '500',
  },
  routeLedger: {
    backgroundColor: '#FFFFFF',
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
    borderRadius: radius.cardSm,
    height: 22,
    justifyContent: 'center',
    width: 22,
    ...iosContinuousCurve,
  },
  pointDotB: {
    alignItems: 'center',
    backgroundColor: customerPalette.primary,
    borderRadius: radius.cardSm,
    height: 22,
    justifyContent: 'center',
    width: 22,
    ...iosContinuousCurve,
  },
  pointDotStop: {
    alignItems: 'center',
    backgroundColor: leopardPalette.accentYellow,
    borderRadius: radius.cardSm,
    height: 22,
    justifyContent: 'center',
    width: 22,
    ...iosContinuousCurve,
  },
  pointDotText: {
    color: '#FFFFFF',
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '800',
  },
  locationTextWrap: {
    flex: 1,
    gap: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontSize: typeScale.caption2.fontSize,
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
    borderTopColor: colors.warning.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  liveDot: {
    backgroundColor: colors.warning.text,
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
