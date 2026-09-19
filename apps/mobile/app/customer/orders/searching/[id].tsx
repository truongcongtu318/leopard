import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  colors,
  customerPalette,
  haptic,
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconRadarPulse,
  IconSecurityShield,
  IconSpeedTruck,
  iosContinuousCurve,
  leopardPalette,
  LeopardMapView,
  radius,
  resolveLocationCoords,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { CancelOrderConfirmModal } from '../../../../src/features/customer/orders/components/CancelOrderConfirmModal';
import { createCustomerHttpAdapter } from '../../../../src/features/customer/orders/adapter';

export interface OrderSearchingProps {
  orderId?: string;
  initialSeconds?: number;
  initialMatchedDriver?: string;
  initialCancelledReason?: string;
  onBack?: () => void;
  onCancelSuccess?: () => void;
  onMatched?: (orderId: string) => void;
  onCancelled?: (orderId: string, reason?: string) => void;
}

function formatOrderRef(id: string): string {
  if (!id) return 'LP-2026-0001';
  if (id.startsWith('LP-')) return id;
  const clean = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LP-${clean}`;
}

function formatVehicleLabel(type?: string): string {
  if (!type) return 'Xe tải 1.25T';
  switch (type.toUpperCase()) {
    case 'MOTORBIKE':
      return 'Xe máy siêu tốc';
    case 'VAN':
      return 'Xe Van 500kg (Vào phố 24/7)';
    case 'TRUCK':
    case 'TRUCK_1_25T':
      return 'Xe tải 1.25T tiêu chuẩn';
    case 'TRUCK_2_5T':
      return 'Xe tải 2.5T tải trọng lớn';
    default:
      return type;
  }
}

export default function OrderSearchingScreen({
  initialSeconds = 30,
  initialMatchedDriver,
  initialCancelledReason,
  onBack,
  onCancelSuccess,
  onMatched,
  onCancelled,
  orderId: propOrderId,
}: OrderSearchingProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    origin?: string;
    destination?: string;
    pickup?: string;
    dropoff?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    originLat?: string;
    originLng?: string;
    destinationLat?: string;
    destinationLng?: string;
    vehicleType?: string;
    vehicleName?: string;
  }>();

  const id = propOrderId || params.id || '';
  const [fetchedVehicleLabel, setFetchedVehicleLabel] = useState<string | null>(null);
  const [fetchedReference, setFetchedReference] = useState<string | null>(null);
  const [fetchedRoute, setFetchedRoute] = useState<{
    originLabel?: string;
    originCoords?: { lat: number; lng: number };
    destinationLabel?: string;
    destinationCoords?: { lat: number; lng: number };
    routeCoords?: readonly { lat: number; lng: number }[];
  } | null>(null);

  const rawOrigin = params.origin || params.pickup;
  const rawDestination = params.destination || params.dropoff;

  const origin = fetchedRoute?.originLabel || rawOrigin || 'Kho Tân Bình, TP.HCM';
  const destination = fetchedRoute?.destinationLabel || rawDestination || 'KCN Vĩnh Lộc, Bình Chánh';
  const vehicleLabel = params.vehicleName || fetchedVehicleLabel || formatVehicleLabel(params.vehicleType);

  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedOrderRef, setCopiedOrderRef] = useState(false);
  const [cancelledInfo, setCancelledInfo] = useState<{ reason?: string } | null>(
    initialCancelledReason ? { reason: initialCancelledReason } : null,
  );

  const paramPickupCoords = useMemo(() => {
    const latStr = params.pickupLat || params.originLat;
    const lngStr = params.pickupLng || params.originLng;
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return undefined;
  }, [params.pickupLat, params.pickupLng, params.originLat, params.originLng]);

  const paramDropoffCoords = useMemo(() => {
    const latStr = params.dropoffLat || params.destinationLat;
    const lngStr = params.dropoffLng || params.destinationLng;
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return undefined;
  }, [params.dropoffLat, params.dropoffLng, params.destinationLat, params.destinationLng]);

  // Geographic coordinates resolution for Lalamove-style interactive map
  const pickupCoords = useMemo(() => {
    if (fetchedRoute?.originCoords) return fetchedRoute.originCoords;
    if (paramPickupCoords) return paramPickupCoords;
    return origin ? resolveLocationCoords(origin) : undefined;
  }, [fetchedRoute?.originCoords, paramPickupCoords, origin]);

  const dropoffCoords = useMemo(() => {
    if (fetchedRoute?.destinationCoords) return fetchedRoute.destinationCoords;
    if (paramDropoffCoords) return paramDropoffCoords;
    return destination ? resolveLocationCoords(destination, pickupCoords) : undefined;
  }, [fetchedRoute?.destinationCoords, paramDropoffCoords, destination, pickupCoords]);

  const routePolyline = fetchedRoute?.routeCoords;

  // Reanimated 60fps native UI thread pulse wave for radar visual (Emil Kowalski 3-wave staggered sonar)
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return undefined;

    pulse1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );

    const timer2 = setTimeout(() => {
      pulse2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    }, 800);

    const timer3 = setTimeout(() => {
      pulse3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    }, 1600);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pulse1, pulse2, pulse3]);

  const animatedPulseStyle1 = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.75 + pulse1.value * 1.05 }],
      opacity: (1 - pulse1.value) * 0.7,
    };
  });

  const animatedPulseStyle2 = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.75 + pulse2.value * 1.05 }],
      opacity: (1 - pulse2.value) * 0.7,
    };
  });

  const animatedPulseStyle3 = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.75 + pulse3.value * 1.05 }],
      opacity: (1 - pulse3.value) * 0.6,
    };
  });

  // 30-second countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When driver accepts, immediately auto-navigate to tracking screen without blocking modal
  useEffect(() => {
    if (initialMatchedDriver) {
      try {
        haptic.success();
      } catch {
        // safe fallback
      }
      if (onMatched) {
        onMatched(id);
      } else {
        router.replace(`/customer/tracking?orderId=${id}`);
      }
    }
  }, [initialMatchedDriver, id, onMatched, router]);

  // Listen to real order status if driver accepts or order gets cancelled
  useEffect(() => {
    if (!id) return undefined;
    if (process.env.NODE_ENV === 'test') return undefined;
    let mounted = true;
    const port = createCustomerHttpAdapter();

    const fetchOrder = async () => {
      try {
        const detail = await port.getOrderDetailView(id);
        if (!mounted || detail.kind !== 'content') return;
        if (detail.order.requestedVehicleLabel) {
          setFetchedVehicleLabel(detail.order.requestedVehicleLabel);
        }
        if (detail.order.reference) {
          setFetchedReference(detail.order.reference);
        }
        if (detail.order.route) {
          setFetchedRoute({
            originLabel: detail.order.route.origin.label,
            originCoords: detail.order.route.origin.coords,
            destinationLabel: detail.order.route.destination.label,
            destinationCoords: detail.order.route.destination.coords,
            routeCoords: detail.order.route.routeCoords,
          });
        }

        // If order was cancelled (e.g. timeout / sweep: "Không tìm được tài xế phù hợp")
        if (detail.order.status === 'CANCELLED' || detail.order.status === 'INCIDENT_CANCELLED') {
          clearInterval(interval);
          const reason =
            detail.order.cancelReason || 'Không tìm được tài xế phù hợp trong khu vực của bạn.';
          setCancelledInfo({ reason });
          return;
        }

        // Directly navigate to tracking screen when driver has accepted
        const isDriverAccepted =
          detail.order.status === 'ACCEPTED' ||
          detail.order.status === 'PICKING_UP' ||
          detail.order.status === 'IN_TRANSIT' ||
          (detail.order.status !== 'REQUESTED' && Boolean(detail.order.assignedDriver));

        if (isDriverAccepted) {
          clearInterval(interval);
          try {
            haptic.success();
          } catch {
            // safe fallback
          }
          if (onMatched) {
            onMatched(id);
          } else {
            router.replace(`/customer/tracking?orderId=${id}`);
          }
        }
      } catch {
        // Safe ignore
      }
    };

    void fetchOrder();
    const interval = setInterval(fetchOrder, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id, onMatched, router]);

  const handleCancelledConfirm = () => {
    haptic.selection();
    const reason = cancelledInfo?.reason;
    setCancelledInfo(null);
    if (onCancelled) {
      onCancelled(id, reason);
      return;
    }
    router.replace(`/customer/orders/${id}`);
  };

  const handleRetryBooking = () => {
    haptic.medium();
    setCancelledInfo(null);
    router.replace('/customer/booking');
  };

  const handleCancelConfirm = async () => {
    haptic.medium();
    setIsCancelling(true);
    try {
      const port = createCustomerHttpAdapter();
      await port.executeIntent({
        orderId: id,
        actionId: 'cancel-order',
        value: 'Khách hàng hủy tìm xe',
      });
    } catch {
      // Safe fallback
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
    if (onCancelSuccess) {
      onCancelSuccess();
    } else {
      router.replace('/customer/orders');
    }
  };

  const handleCopyOrderRef = () => {
    haptic.selection();
    setCopiedOrderRef(true);
    setTimeout(() => setCopiedOrderRef(false), 2000);
  };

  const handleBack = () => {
    haptic.light();
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/customer/orders');
    }
  };

  if (!id) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.topSafeArea}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.floatingBackBtn}
          >
            <IconChevronLeft color={customerPalette.textSlateDark} size={22} />
          </Pressable>
        </SafeAreaView>
        <View style={styles.notFoundWrap}>
          <AppText tone="primary" variant="headline" style={styles.notFoundText}>
            Không tìm thấy mã đơn hàng cần điều phối.
          </AppText>
          <Button
            label="Về danh sách đơn"
            onPress={() => router.replace('/customer/orders')}
            size="large"
            style={styles.notFoundBtn}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  const timerFormatted = `00:${secondsLeft.toString().padStart(2, '0')}`;
  const progressPercent = Math.min(
    100,
    Math.max(0, (secondsLeft / Math.max(initialSeconds, 1)) * 100),
  );

  return (
    <View style={styles.container}>
      {/* Layer 0: Grab-Style Route Map Canvas */}
      <View style={styles.mapWrap}>
        <LeopardMapView
          destination={{ label: destination, coords: dropoffCoords }}
          height="100%"
          interactive={false}
          mode="route"
          origin={{ label: origin, coords: pickupCoords }}
          routeCoords={routePolyline}
          testID="searching-route-map"
        />

        {/* Layer 0.5: Proportional Sonar Pulse radiating over pickup route */}
        <View pointerEvents="none" style={styles.radarOverlayContainer} testID="radar-visual-container">
          <View style={styles.radarPulseCenter}>
            <Animated.View style={[styles.radarPulseWave, styles.radarPulse1, animatedPulseStyle1]} />
            <Animated.View style={[styles.radarPulseWave, styles.radarPulse2, animatedPulseStyle2]} />
            <Animated.View style={[styles.radarPulseWave, styles.radarPulse3, animatedPulseStyle3]} />
            <View style={styles.radarBeaconCircle}>
              <IconRadarPulse color={leopardPalette.accentYellow} size={28} />
            </View>
          </View>
        </View>
      </View>

      {/* Layer 1: Floating Top Bar (Floating Glass Back Button & Status Pill) */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topSafeAreaOverlay}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.floatingBackBtn,
              pressed && styles.floatingBackBtnPressed,
            ]}
            testID="btn-searching-back"
          >
            <IconChevronLeft color={customerPalette.textSlateDark} size={22} />
          </Pressable>

          <View style={styles.floatingTopPill}>
            <View style={styles.livePulseDot} />
            <AppText tone="primary" variant="subheadline" style={styles.floatingTopTitle}>
              Tìm tài xế nhận chuyến
            </AppText>
          </View>

          <View style={styles.topBarSpacer} />
        </View>
      </SafeAreaView>

      {/* Layer 2: Grab-Style Unified Floating Bottom Sheet */}
      <View style={styles.bottomSheetCard}>
        {/* Apple HIG Sheet Pull Handle */}
        <View style={styles.sheetHandleBar} />

        {/* Section 1: Finding Driver Status & Tabular Countdown Timer */}
        <View style={styles.statusSection} testID="searching-countdown-timer">
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusTextWrap}>
              <AppText tone="primary" variant="headline" style={styles.statusTitle}>
                {secondsLeft > 0
                  ? 'Đang quét tìm xe trong bán kính 5km...'
                  : 'Đang mở rộng bán kính tìm xe...'}
              </AppText>
              <AppText tone="secondary" variant="caption1" style={styles.statusSubtitle}>
                {secondsLeft > 0
                  ? 'Tài xế gần nhất sẽ phản hồi và nhận lệnh trong giây lát.'
                  : 'Hệ thống đang mở rộng phạm vi điều phối tới các tài xế lân cận.'}
              </AppText>
            </View>

            <View style={styles.timerBadge}>
              <AppText numeric tone="accent" variant="title3" style={styles.timerBadgeText}>
                {timerFormatted}
              </AppText>
            </View>
          </View>

          {/* Smooth Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Section 2: Compact Unified Order & Route Bento */}
        <View style={styles.tripCard}>
          {/* Vehicle & Order Ref Line */}
          <View style={styles.tripHeaderRow}>
            <View style={styles.vehicleTypeTag}>
              <IconSpeedTruck color={customerPalette.primary} size={16} />
              <AppText tone="primary" variant="subheadline" style={styles.vehicleTypeText}>
                {vehicleLabel}
              </AppText>
            </View>

            <Pressable
              accessibilityLabel="Sao chép mã đơn hàng"
              accessibilityRole="button"
              onPress={handleCopyOrderRef}
              style={({ pressed }) => [
                styles.orderCodeTag,
                pressed && styles.orderCodeTagPressed,
              ]}
            >
              <AppText numeric tone="secondary" variant="caption1" style={styles.orderCodeLabel}>
                {fetchedReference || formatOrderRef(id)}
              </AppText>
              {copiedOrderRef ? (
                <IconCheck color={colors.success.text} size={13} />
              ) : (
                <IconCopy color={customerPalette.textSubtle} size={13} />
              )}
            </Pressable>
          </View>

          <View style={styles.tripDivider} />

          {/* Route Timeline */}
          <View style={styles.routeTimelineWrap}>
            {/* Origin */}
            <View style={styles.routeRow}>
              <View style={styles.pickupPinDot} />
              <View style={styles.routeAddressCol}>
                <AppText tone="subtle" variant="caption2" style={styles.routeRoleText}>
                  ĐIỂM LẤY HÀNG
                </AppText>
                <AppText numberOfLines={1} tone="primary" variant="subheadline" style={styles.addressText}>
                  {origin}
                </AppText>
              </View>
            </View>

            {/* Dotted Connector */}
            <View style={styles.timelineDottedBar} />

            {/* Destination */}
            <View style={styles.routeRow}>
              <View style={styles.dropoffPinDot} />
              <View style={styles.routeAddressCol}>
                <AppText tone="subtle" variant="caption2" style={styles.routeRoleText}>
                  ĐIỂM GIAO HÀNG
                </AppText>
                <AppText numberOfLines={1} tone="primary" variant="subheadline" style={styles.addressText}>
                  {destination}
                </AppText>
              </View>
            </View>
          </View>

          {/* Escrow Guarantee Note */}
          <View style={styles.escrowRow}>
            <IconSecurityShield color={colors.success.text} size={15} />
            <AppText tone="secondary" variant="caption2" style={styles.escrowNote}>
              Bảo chứng LEOPARD: Hoàn tiền cọc tức thì nếu không ghép được xe phù hợp.
            </AppText>
          </View>
        </View>

        {/* Section 3: Cancel Action Button */}
        <View style={styles.actionFooter}>
          <Button
            label="Hủy tìm xe"
            onPress={() => {
              haptic.light();
              setShowCancelModal(true);
            }}
            size="large"
            style={styles.cancelBtn}
            testID="btn-cancel-searching"
            variant="secondary"
          />
        </View>
      </View>

      {/* Cancel Confirmation Modal with Apple HIG & Emil Kowalski Design Engineering */}
      <CancelOrderConfirmModal
        isCancelling={isCancelling}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleCancelConfirm}
        visible={showCancelModal}
      />


      {/* Driver Cancelled / Not Found Modal */}
      <Modal
        animationType="fade"
        onRequestClose={handleCancelledConfirm}
        transparent={true}
        visible={Boolean(cancelledInfo)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelledModalCard}>
            <View style={styles.cancelledIconWrap}>
              <IconAlertTriangle color={colors.danger.text} size={32} />
            </View>
            <AppText tone="primary" variant="title3" style={styles.cancelledTitle}>
              Chưa tìm được tài xế phù hợp
            </AppText>
            <AppText tone="secondary" variant="footnote" style={styles.cancelledSubtitle}>
              {cancelledInfo?.reason ||
                'Hệ thống đã quét các tài xế trong khu vực nhưng hiện tại chưa có xe phù hợp nhận chuyến.'}
            </AppText>

            <View style={styles.cancelledOrderBox}>
              <AppText numeric tone="primary" variant="subheadline" style={styles.matchedOrderRef}>
                {fetchedReference || formatOrderRef(id)}
              </AppText>
              <AppText numberOfLines={1} tone="secondary" variant="footnote" style={styles.matchedOrderRoute}>
                {origin} → {destination}
              </AppText>
            </View>

            <View style={styles.cancelledRefundBox}>
              <IconSecurityShield color={colors.success.text} size={18} />
              <AppText tone="success" variant="caption1" style={styles.cancelledRefundText}>
                Hoàn cọc 100% tự động về ví hoặc tài khoản ngân hàng theo chính sách bảo đảm của LEOPARD.
              </AppText>
            </View>

            <View style={styles.cancelledActionButtons}>
              <Button
                label="Thử tìm xe lại"
                onPress={handleRetryBooking}
                size="large"
                style={styles.cancelledRetryBtn}
                variant="prominent"
              />
              <Button
                label="Xem chi tiết đơn"
                onPress={handleCancelledConfirm}
                size="large"
                style={styles.cancelledDetailBtn}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customerPalette.surfaceWhite,
  },
  topSafeArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  notFoundWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  notFoundText: {
    textAlign: 'center',
  },
  notFoundBtn: {
    minWidth: 200,
  },

  // Map & Full-screen Backdrop
  mapWrap: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  radarOverlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarPulseCenter: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radarPulseWave: {
    position: 'absolute',
    borderRadius: 9999,
  },
  radarPulse1: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(11, 37, 69, 0.25)',
  },
  radarPulse2: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  radarPulse3: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  radarBeaconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: customerPalette.surfaceWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: leopardPalette.accentYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },

  // Floating Top Bar Overlay
  topSafeAreaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.select({ ios: spacing.xs, default: spacing.sm }),
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingBackBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  floatingTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    gap: spacing.xs,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success.text,
  },
  floatingTopTitle: {
    fontWeight: '600',
  },
  topBarSpacer: {
    width: 44,
  },

  // Grab-Style Unified Floating Bottom Sheet
  bottomSheetCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...iosContinuousCurve,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.select({ ios: spacing.lg, default: spacing.md }),
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: 'rgba(11, 37, 69, 0.15)',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },

  // Status & Timer Section
  statusSection: {
    paddingVertical: spacing.xs,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  statusTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  statusSubtitle: {
    lineHeight: 16,
  },
  timerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadgeText: {
    fontWeight: '800',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.surfaceMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: leopardPalette.accentYellow,
    borderRadius: 2,
  },

  // Compact Trip Card
  tripCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vehicleTypeText: {
    fontWeight: '700',
  },
  orderCodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    gap: 4,
  },
  orderCodeTagPressed: {
    opacity: 0.6,
  },
  orderCodeLabel: {
    fontWeight: '600',
  },
  tripDivider: {
    height: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.06)',
    marginVertical: spacing.xs,
  },

  // Route Timeline
  routeTimelineWrap: {
    paddingVertical: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickupPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: leopardPalette.accentYellow,
    borderWidth: 2,
    borderColor: customerPalette.surfaceWhite,
    shadowColor: leopardPalette.accentYellow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  dropoffPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success.text,
    borderWidth: 2,
    borderColor: customerPalette.surfaceWhite,
    shadowColor: colors.success.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  timelineDottedBar: {
    width: 2,
    height: 12,
    backgroundColor: 'rgba(11, 37, 69, 0.15)',
    marginLeft: 4,
    marginVertical: 2,
    borderRadius: 1,
  },
  routeAddressCol: {
    flex: 1,
  },
  routeRoleText: {
    letterSpacing: 0.4,
  },
  addressText: {
    fontWeight: '600',
  },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 37, 69, 0.05)',
  },
  escrowNote: {
    flex: 1,
    color: customerPalette.textMutedSlate,
    lineHeight: 15,
  },

  // Action Footer
  actionFooter: {
    marginTop: spacing.xs,
  },
  cancelBtn: {
    minHeight: 50,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cancelledModalCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.modal,
    ...iosContinuousCurve,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    gap: spacing.sm,
  },
  cancelledIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  cancelledTitle: {
    textAlign: 'center',
  },
  cancelledSubtitle: {
    textAlign: 'center',
    lineHeight: 19,
  },
  cancelledOrderBox: {
    width: '100%',
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.sm,
    gap: spacing.xxs,
    marginVertical: spacing.xxs,
  },
  matchedOrderRef: {
    fontWeight: '600',
  },
  matchedOrderRoute: {},
  cancelledRefundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    width: '100%',
  },
  cancelledRefundText: {
    flex: 1,
    lineHeight: 16,
  },
  cancelledActionButtons: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  cancelledRetryBtn: {
    width: '100%',
    minHeight: 52,
  },
  cancelledDetailBtn: {
    width: '100%',
    minHeight: 46,
  },
});
