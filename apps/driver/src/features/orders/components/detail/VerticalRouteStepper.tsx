import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  IconCheck,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { OrderStatus } from '@leopard/shared';
import type { DriverRouteStopView, DriverStopProgressStatus } from '../../model';

export type VerticalRouteStepperProps = Readonly<{
  origin?: { label: string; address?: string };
  destination?: { label: string; address?: string };
  stops?: readonly DriverRouteStopView[];
  status: OrderStatus | string;
  distanceLabel?: string;
  onRecordProgress?: (
    stopId: string,
    step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED',
  ) => Promise<void> | void;
  inFlightCommand?: { stopId: string; step: string } | null;
  // Legacy string labels for backward compatibility
  originLabel?: string;
  destinationLabel?: string;
  testID?: string;
}>;

function resolveNextStep(
  progress: DriverStopProgressStatus,
): { step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED'; label: string } | null {
  if (progress === 'PENDING') {
    return { step: 'ARRIVED', label: 'Đã đến điểm dừng' };
  }
  if (progress === 'ARRIVED') {
    return { step: 'SERVICE_STARTED', label: 'Bắt đầu bốc/dỡ' };
  }
  if (progress === 'IN_SERVICE') {
    return { step: 'SERVICE_COMPLETED', label: 'Hoàn tất xử lý' };
  }
  return null;
}

export function VerticalRouteStepper({
  origin,
  destination,
  stops = [],
  status,
  distanceLabel,
  onRecordProgress,
  inFlightCommand,
  originLabel,
  destinationLabel,
  testID = 'vertical-route-stepper',
}: VerticalRouteStepperProps) {
  const resolvedOrigin = origin ?? { label: originLabel ?? 'Điểm lấy hàng' };
  const resolvedDestination = destination ?? {
    label: destinationLabel ?? 'Điểm giao hàng',
  };

  // Status mapping: PICKING_UP vs IN_TRANSIT vs DELIVERED (no outdated PICKED_UP)
  const isPassedPickup =
    status === 'IN_TRANSIT' ||
    status === 'DELIVERED';
  const isAtPickup = status === 'PICKING_UP';

  // Find the active actionable stop (first stop not yet COMPLETED)
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const activeStopIndex = sortedStops.findIndex((s) => s.progress !== 'COMPLETED');

  return (
    <View style={styles.verticalRouteCard} testID={testID}>
      {/* Node A (Điểm lấy hàng) */}
      {isPassedPickup ? (
        <View style={styles.routeNodeACollapsed} testID="node-origin-completed">
          <View style={styles.checkBadge}>
            <IconCheck color="#15803D" size={13} strokeWidth={2.5} />
          </View>
          <View style={styles.routeTextCol}>
            <Text style={styles.routeNodeSubA}>Đã lấy hàng tại</Text>
            <Text numberOfLines={2} style={styles.routeNodeTitleA}>
              {resolvedOrigin.label}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.routeNodeAExpanded} testID="node-origin-active">
          <View style={styles.badgeA}>
            <Text style={styles.badgeTextA}>A</Text>
          </View>
          <View style={styles.routeTextCol}>
            <View style={styles.rowBetween}>
              <Text style={styles.routeNodeSubA}>Điểm lấy hàng (A)</Text>
              {isAtPickup ? (
                <View style={styles.activeLegTag}>
                  <Text style={styles.activeLegTagText}>Chặng hiện tại</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.routeNodeTitleAExpanded}>
              {resolvedOrigin.label}
            </Text>
          </View>
        </View>
      )}

      {/* Vertical Spine from Origin to First Stop or Destination */}
      <View style={styles.routeSpineRow}>
        <View style={styles.spineDashedLine} />
        {distanceLabel && stops.length === 0 ? (
          <View style={styles.spineDistancePill}>
            <Text style={styles.spineDistanceText}>
              Lộ trình · {distanceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Intermediate Stops */}
      {sortedStops.map((stop, index) => {
        const isActionable =
          index === activeStopIndex &&
          (status === 'IN_TRANSIT' || status === 'PICKING_UP');
        const nextAction = resolveNextStep(stop.progress);
        const isBusy =
          inFlightCommand?.stopId === (stop.stopId || stop.id);

        return (
          <React.Fragment key={stop.id || stop.stopId || `stop-${index}`}>
            <View
              style={styles.stopNodeContainer}
              testID={`stop-node-${stop.sequence}`}
            >
              {/* Stop Indicator Badge */}
              {stop.progress === 'COMPLETED' ? (
                <View
                  style={styles.stopCheckBadge}
                  testID={`stop-badge-completed-${stop.sequence}`}
                >
                  <IconCheck color="#15803D" size={12} strokeWidth={2.5} />
                </View>
              ) : stop.progress === 'IN_SERVICE' ? (
                <View
                  style={styles.stopInServiceBadge}
                  testID={`stop-badge-inservice-${stop.sequence}`}
                >
                  <Text style={styles.stopBadgeText}>{stop.sequence}</Text>
                </View>
              ) : stop.progress === 'ARRIVED' ? (
                <View
                  style={styles.stopArrivedBadge}
                  testID={`stop-badge-arrived-${stop.sequence}`}
                >
                  <Text style={styles.stopBadgeText}>{stop.sequence}</Text>
                </View>
              ) : (
                <View
                  style={styles.stopPendingBadge}
                  testID={`stop-badge-pending-${stop.sequence}`}
                >
                  <Text style={styles.stopPendingBadgeText}>
                    {stop.sequence}
                  </Text>
                </View>
              )}

              {/* Stop Details */}
              <View style={styles.routeTextCol}>
                <View style={styles.rowBetween}>
                  <Text style={styles.stopSubTitle}>
                    Điểm dừng {stop.sequence}
                  </Text>
                  {stop.progress === 'COMPLETED' ? (
                    <View style={styles.completedTag}>
                      <Text style={styles.completedTagText}>Đã xong</Text>
                    </View>
                  ) : stop.progress === 'IN_SERVICE' ? (
                    <View style={styles.inServiceTag}>
                      <Text style={styles.inServiceTagText}>Đang xử lý</Text>
                    </View>
                  ) : stop.progress === 'ARRIVED' ? (
                    <View style={styles.arrivedTag}>
                      <Text style={styles.arrivedTagText}>Đã đến</Text>
                    </View>
                  ) : isActionable ? (
                    <View style={styles.activeLegTag}>
                      <Text style={styles.activeLegTagText}>Điểm tiếp theo</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.stopTitle}>
                  {stop.label || stop.address}
                </Text>

                {/* Progress Action Button (only on actionable stop with next step) */}
                {isActionable && nextAction && onRecordProgress ? (
                  <View style={styles.stopActionWrap}>
                    <Pressable
                      accessibilityHint={`Ghi nhận tiến trình ${nextAction.label} tại điểm dừng ${stop.sequence}`}
                      accessibilityLabel={`${nextAction.label} tại ${stop.label || stop.address}`}
                      accessibilityRole="button"
                      accessibilityState={{ busy: isBusy, disabled: isBusy }}
                      disabled={isBusy}
                      onPress={() => {
                        void onRecordProgress(
                          stop.stopId || stop.id,
                          nextAction.step,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.stopActionBtn,
                        pressed && !isBusy ? styles.pressed : null,
                        isBusy ? styles.btnBusy : null,
                      ]}
                      testID={`btn-stop-progress-${stop.sequence}`}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={colors.neutral.surface} size="small" />
                      ) : (
                        <Text style={styles.stopActionBtnText}>
                          {nextAction.label}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Connecting spine line to next stop or destination */}
            <View style={styles.routeSpineRow}>
              <View style={styles.spineDashedLine} />
            </View>
          </React.Fragment>
        );
      })}

      {/* Node B (Điểm giao hàng) */}
      <View style={styles.routeNodeB} testID="node-destination">
        {status === 'DELIVERED' ? (
          <View style={styles.checkBadge}>
            <IconCheck color="#15803D" size={13} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={styles.badgeB}>
            <Text style={styles.badgeTextB}>B</Text>
          </View>
        )}
        <View style={styles.routeTextCol}>
          <View style={styles.rowBetween}>
            <Text style={styles.routeNodeSubB}>
              {status === 'DELIVERED'
                ? 'Đã giao hàng tại'
                : 'Điểm giao hàng (B)'}
            </Text>
            {activeStopIndex === -1 && status === 'IN_TRANSIT' ? (
              <View style={styles.activeLegTag}>
                <Text style={styles.activeLegTagText}>Chặng hiện tại</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.routeNodeTitleB}>
            {resolvedDestination.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verticalRouteCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    ...driverPrimitives.shadows.sm,
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
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  routeNodeSubA: {
    ...typeScale.caption2,
    color: colors.neutral.mutedText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  routeNodeTitleA: {
    ...typeScale.footnote,
    color: driverPrimitives.colors.gray700,
    fontWeight: '600',
  },
  routeNodeAExpanded: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  badgeA: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  badgeTextA: {
    ...typeScale.caption1,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  routeNodeTitleAExpanded: {
    ...typeScale.subheadline,
    color: leopardPalette.primary,
    fontWeight: '600',
  },

  /* Stop Nodes */
  stopNodeContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  stopCheckBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  stopInServiceBadge: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  stopArrivedBadge: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  stopPendingBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: leopardPalette.inputBorder,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  stopBadgeText: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  stopPendingBadgeText: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
  },
  stopSubTitle: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  stopTitle: {
    ...typeScale.footnote,
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  stopActionWrap: {
    marginTop: 6,
  },
  stopActionBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 8,
    flexDirection: 'row',
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  stopActionBtnText: {
    ...typeScale.caption1,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  btnBusy: {
    opacity: 0.7,
  },

  /* Tags */
  activeLegTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeLegTagText: {
    ...typeScale.caption2,
    color: '#D97706',
    fontWeight: '600',
  },
  completedTag: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  completedTagText: {
    ...typeScale.caption2,
    color: '#15803D',
    fontWeight: '600',
  },
  inServiceTag: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inServiceTagText: {
    ...typeScale.caption2,
    color: '#059669',
    fontWeight: '600',
  },
  arrivedTag: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  arrivedTagText: {
    ...typeScale.caption2,
    color: '#2563EB',
    fontWeight: '600',
  },

  /* Vertical Spine */
  routeSpineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
    minHeight: 24,
    paddingLeft: 12,
  },
  spineDashedLine: {
    backgroundColor: leopardPalette.inputBorder,
    height: 20,
    width: 2,
  },
  spineDistancePill: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  spineDistanceText: {
    ...typeScale.caption2,
    color: driverPrimitives.colors.gray500,
    fontWeight: '600',
  },

  /* Node B */
  routeNodeB: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  badgeB: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  badgeTextB: {
    ...typeScale.caption1,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  routeNodeSubB: {
    ...typeScale.caption2,
    color: colors.neutral.mutedText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  routeNodeTitleB: {
    ...typeScale.subheadline,
    color: driverPrimitives.colors.gray900,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
