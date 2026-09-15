import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconCheck, leopardPalette, spacing } from '@leopard/mobile-core';

export type VerticalRouteStepperProps = Readonly<{
  originLabel: string;
  destinationLabel: string;
  distanceLabel?: string;
  status: string;
}>;

export function VerticalRouteStepper({
  originLabel,
  destinationLabel,
  distanceLabel,
  status,
}: VerticalRouteStepperProps) {
  const isPassedPickup =
    status === 'PICKED_UP' ||
    status === 'IN_TRANSIT' ||
    status === 'DELIVERED';

  return (
    <View style={styles.verticalRouteCard}>
      {/* Node A (Điểm lấy hàng) */}
      {isPassedPickup ? (
        <View style={styles.routeNodeACollapsed}>
          <View style={styles.checkBadge}>
            <IconCheck color="#15803D" size={13} strokeWidth={2.5} />
          </View>
          <View style={styles.routeTextCol}>
            <Text style={styles.routeNodeSubA}>ĐÃ BỐC HÀNG TẠI</Text>
            <Text numberOfLines={2} style={styles.routeNodeTitleA}>
              {originLabel}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.routeNodeAExpanded}>
          <View style={styles.badgeA}>
            <Text style={styles.badgeTextA}>A</Text>
          </View>
          <View style={styles.routeTextCol}>
            <View style={styles.rowBetween}>
              <Text style={styles.routeNodeSubA}>ĐIỂM LẤY HÀNG (A)</Text>
              <View style={styles.activeLegTag}>
                <Text style={styles.activeLegTagText}>CHẶNG HIỆN TẠI</Text>
              </View>
            </View>
            <Text style={styles.routeNodeTitleAExpanded}>{originLabel}</Text>
          </View>
        </View>
      )}

      {/* Trục nối dọc (Vertical Spine) */}
      <View style={styles.routeSpineRow}>
        <View style={styles.spineDashedLine} />
        {distanceLabel ? (
          <View style={styles.spineDistancePill}>
            <Text style={styles.spineDistanceText}>Lộ trình · {distanceLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Node B (Điểm giao hàng) */}
      <View style={styles.routeNodeB}>
        <View style={styles.badgeB}>
          <Text style={styles.badgeTextB}>B</Text>
        </View>
        <View style={styles.routeTextCol}>
          <View style={styles.rowBetween}>
            <Text style={styles.routeNodeSubB}>ĐIỂM GIAO HÀNG (B)</Text>
            {isPassedPickup ? (
              <View style={styles.activeLegTag}>
                <Text style={styles.activeLegTagText}>CHẶNG HIỆN TẠI</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.routeNodeTitleB}>{destinationLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verticalRouteCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeTextCol: {
    flex: 1,
    gap: 3,
  },

  /* Node A */
  routeNodeACollapsed: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  checkBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  routeNodeSubA: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeNodeTitleA: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  routeNodeAExpanded: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  badgeA: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  badgeTextA: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  routeNodeTitleAExpanded: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  activeLegTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeLegTagText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Vertical Spine */
  routeSpineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
    minHeight: 28,
    paddingLeft: 13,
  },
  spineDashedLine: {
    backgroundColor: '#CBD5E1',
    height: 24,
    width: 2,
  },
  spineDistancePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  spineDistanceText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Node B */
  routeNodeB: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  badgeB: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  badgeTextB: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  routeNodeSubB: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeNodeTitleB: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
