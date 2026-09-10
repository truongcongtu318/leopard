import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  IconClose,
  IconLocationPin,
  IconRadarPulse,
  IconRoute,
  IconSecurityShield,
  IconSpeedTruck,
} from '@leopard/mobile-core';

export interface OrderSearchingProps {
  orderId?: string;
  initialSeconds?: number;
  onCancelSuccess?: () => void;
  onMatched?: (orderId: string) => void;
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
  onCancelSuccess,
  onMatched,
  orderId: propOrderId,
}: OrderSearchingProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    origin?: string;
    destination?: string;
    vehicleType?: string;
  }>();

  const id = propOrderId || params.id || '11111111-1111-4111-8111-111111111001';
  const origin = params.origin || 'Kho Tân Bình, TP.HCM';
  const destination = params.destination || 'KCN Vĩnh Lộc, Bình Chánh';
  const vehicleLabel = formatVehicleLabel(params.vehicleType);

  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Pulse animation for radar visual
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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

  // Transition when matched or countdown completed
  useEffect(() => {
    if (secondsLeft === 0) {
      if (onMatched) {
        onMatched(id);
      } else {
        router.replace(`/customer/tracking?orderId=${id}`);
      }
    }
  }, [secondsLeft, id, onMatched, router]);

  const handleCancelConfirm = () => {
    setShowCancelModal(false);
    if (onCancelSuccess) {
      onCancelSuccess();
    } else {
      router.replace('/customer/orders');
    }
  };

  const timerFormatted = `00:${secondsLeft.toString().padStart(2, '0')}`;

  const ringScale1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.4],
  });
  const ringOpacity1 = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.3, 0],
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header bar */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Tìm tài xế nhận chuyến</Text>
          <Text style={styles.headerSubtitle}>
            Hệ thống điều phối thông minh LEOPARD
          </Text>
        </View>

        {/* Radar visual container */}
        <View style={styles.radarSection} testID="radar-visual-container">
          <View style={styles.radarRingOuter}>
            <Animated.View
              style={[
                styles.radarPulseWave,
                {
                  transform: [{ scale: ringScale1 }],
                  opacity: ringOpacity1,
                },
              ]}
            />
            <View style={styles.radarRingMid}>
              <View style={styles.radarCenterCircle}>
                <IconRadarPulse color="#F59E0B" size={40} />
              </View>
            </View>
          </View>

          <Text style={styles.radarStatusText}>
            Đang quét tìm xe trong bán kính 5km...
          </Text>
          <Text style={styles.radarNoticeText}>
            Tài xế gần nhất sẽ phản hồi và nhận lệnh trong giây lát.
          </Text>
        </View>

        {/* 30s Countdown timer */}
        <View style={styles.timerCard} testID="searching-countdown-timer">
          <Text style={styles.timerLabel}>Thời gian chờ ghép xe tự động</Text>
          <Text style={styles.timerValue}>{timerFormatted}</Text>
          <View style={styles.timerProgressBarTrack}>
            <View
              style={[
                styles.timerProgressBarFill,
                { width: `${(secondsLeft / 30) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Double-Bezel Order Info Card */}
        <View style={styles.orderOuterCard}>
          <View style={styles.orderInnerCard}>
            <View style={styles.orderCardHeader}>
              <View>
                <Text style={styles.orderLabelSmall}>Mã đơn hàng</Text>
                <Text style={styles.orderIdValue}>{formatOrderRef(id)}</Text>
              </View>
              <View style={styles.vehicleBadge}>
                <IconSpeedTruck color="#0B1E42" size={16} />
                <Text style={styles.vehicleBadgeText}>{vehicleLabel}</Text>
              </View>
            </View>

            <View style={styles.dividerLine} />

            {/* Route origin & destination */}
            <View style={styles.routeTimeline}>
              <View style={styles.routeItem}>
                <View style={styles.pickupDot} />
                <View style={styles.routeTextWrap}>
                  <Text style={styles.routeTypeLabel}>Điểm lấy hàng</Text>
                  <Text numberOfLines={2} style={styles.routeAddressText}>
                    {origin}
                  </Text>
                </View>
              </View>

              <View style={styles.routeDottedConnector} />

              <View style={styles.routeItem}>
                <View style={styles.dropoffDot} />
                <View style={styles.routeTextWrap}>
                  <Text style={styles.routeTypeLabel}>Điểm giao hàng</Text>
                  <Text numberOfLines={2} style={styles.routeAddressText}>
                    {destination}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cancel button */}
          <Pressable
            accessibilityLabel="Hủy tìm xe"
            accessibilityRole="button"
            onPress={() => setShowCancelModal(true)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Hủy tìm xe</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal with 100% Escrow refund */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
        transparent={true}
        visible={showCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalIconWrap}>
              <IconSecurityShield color="#10B981" size={32} />
            </View>

            <Text style={styles.modalTitle}>Xác nhận hủy tìm xe?</Text>

            <View style={styles.refundHighlightBox}>
              <Text style={styles.refundHighlightText}>
                Hoàn cọc 100% tức thì về ví hoặc tài khoản ngân hàng của bạn theo
                chính sách bảo vệ quyền lợi khách hàng LEOPARD.
              </Text>
            </View>

            <Text style={styles.modalDescription}>
              Bạn có thể tạo lại cuốc xe mới bất kỳ lúc nào mà không phát sinh
              thêm phí.
            </Text>

            <View style={styles.modalActionButtons}>
              <Pressable
                accessibilityLabel="Xác nhận hủy và hoàn tiền"
                accessibilityRole="button"
                onPress={handleCancelConfirm}
                style={styles.modalConfirmCancelBtn}
              >
                <Text style={styles.modalConfirmCancelText}>
                  Xác nhận hủy và hoàn tiền
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Tiếp tục tìm xe"
                accessibilityRole="button"
                onPress={() => setShowCancelModal(false)}
                style={styles.modalKeepWaitingBtn}
              >
                <Text style={styles.modalKeepWaitingText}>Tiếp tục tìm xe</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ponytail: basic pulse animation; add live driver GPS socket stream when real dispatch cluster attached.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  topHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1E42',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  radarSection: {
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  radarRingOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  radarPulseWave: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  radarRingMid: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  radarCenterCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  radarStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E42',
    textAlign: 'center',
    marginBottom: 4,
  },
  radarNoticeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  timerProgressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  timerProgressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  orderOuterCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  orderInnerCard: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.04)',
    padding: 14,
    marginBottom: 14,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabelSmall: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  orderIdValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1E42',
    marginLeft: 6,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  routeTimeline: {
    paddingLeft: 4,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    marginTop: 5,
    marginRight: 10,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 5,
    marginRight: 10,
  },
  routeDottedConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 4,
    marginVertical: 3,
  },
  routeTextWrap: {
    flex: 1,
  },
  routeTypeLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  routeAddressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  cancelBtn: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 30, 66, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1E42',
    textAlign: 'center',
    marginBottom: 12,
  },
  refundHighlightBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 12,
    width: '100%',
  },
  refundHighlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 18,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActionButtons: {
    width: '100%',
    gap: 10,
  },
  modalConfirmCancelBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmCancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalKeepWaitingBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeepWaitingText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
