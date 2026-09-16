import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  IconChevron,
  IconClock,
  IconPhone,
  IconShield,
  IconTruck,
  colors,
  driverPrimitives,
  driverSemantics,
  httpClient,
  iosContinuousCurve,
  leopardPalette,
  radius,
  sessionStore,
  typeScale,
} from '@leopard/mobile-core';

interface ApplicationStatusResponse {
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
  rejectionReason?: string | null;
  vehicleType?: string | null;
  licensePlate?: string | null;
}

const SUPPORT_HOTLINE = '19006789';

export default function KycPendingRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    vehicleType?: string;
    licensePlate?: string;
  }>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleType: searchParams.vehicleType || 'Xe tải 1.25T',
    licensePlate: searchParams.licensePlate || '59D-123.45',
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(public)/login');
    }
  };

  const handleCallHotline = () => {
    void Linking.openURL(`tel:${SUPPORT_HOTLINE}`);
  };

  const handleRefreshStatus = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setStatusMsg(null);

    try {
      const res = await httpClient.get<ApplicationStatusResponse>('/driver/application');
      if (res.status === 'ACTIVE') {
        router.replace('/orders');
        return;
      }
      if (res.status === 'REJECTED') {
        setStatusMsg(res.rejectionReason || 'Hồ sơ bị từ chối. Vui lòng kiểm tra lại giấy tờ.');
      } else {
        setStatusMsg('Hồ sơ vẫn đang trong quá trình xét duyệt.');
      }
      if (res.vehicleType || res.licensePlate) {
        setVehicleInfo({
          vehicleType: res.vehicleType || vehicleInfo.vehicleType,
          licensePlate: res.licensePlate || vehicleInfo.licensePlate,
        });
      }
    } catch {
      setStatusMsg('Không thể kiểm tra trạng thái lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await sessionStore.clearSession();
    router.replace('/(public)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleBack}
          style={styles.backBtn}
          testID="btn-back"
        >
          <IconChevron color={driverSemantics.text.primary} direction="left" size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Trạng thái hồ sơ
        </Text>
        <Pressable
          accessibilityLabel="Đăng xuất"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleLogout}
          style={styles.logoutBtn}
          testID="btn-logout"
        >
          <Text style={styles.logoutBtnText}>Thoát</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        {/* Main Status Hero Card */}
        <View style={styles.heroCard} testID="kyc-status-card">
          <View style={styles.heroBadge}>
            <IconClock color={driverPrimitives.colors.blue600} size={32} />
          </View>
          <Text style={styles.heroTitle}>Hồ sơ đang chờ phê duyệt</Text>
          <Text style={styles.heroSubtitle}>
            Hồ sơ đối tác tài xế của bạn đang được Ban Quản trị LEOPARD thẩm định.
          </Text>

          <View style={styles.etaBadge}>
            <IconClock color="#0369A1" size="sm" />
            <Text style={styles.etaText}>Thời gian xét duyệt dự kiến: 2–4 giờ làm việc</Text>
          </View>
        </View>

        {/* Vehicle Summary Card */}
        <View style={styles.summaryCard} testID="vehicle-summary-card">
          <View style={styles.cardHeaderRow}>
            <IconTruck color={driverPrimitives.colors.blue600} size="md" />
            <Text style={styles.cardHeaderTitle}>Thông tin phương tiện đăng ký</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Loại xe</Text>
            <Text style={styles.fieldValue}>{vehicleInfo.vehicleType}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Biển số xe</Text>
            <Text style={[styles.fieldValue, styles.monoText]}>{vehicleInfo.licensePlate}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Giấy tờ thẩm định</Text>
            <View style={styles.docStatusBadge}>
              <IconShield color="#15803D" size="sm" />
              <Text style={styles.docStatusText}>Đã nộp 3/3 ảnh</Text>
            </View>
          </View>
        </View>

        {/* Feedback message from refresh */}
        {statusMsg ? (
          <View style={styles.statusBanner} testID="kyc-refresh-message">
            <Text style={styles.statusBannerText}>{statusMsg}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <Pressable
            accessibilityLabel="Kiểm tra lại trạng thái"
            accessibilityRole="button"
            disabled={isRefreshing}
            onPress={handleRefreshStatus}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              isRefreshing && styles.actionBtnDisabled,
              pressed && styles.btnPressed,
            ]}
            testID="btn-refresh-status"
          >
            {isRefreshing ? (
              <ActivityIndicator color={colors.neutral.surface} size="small" />
            ) : (
              <Text style={styles.primaryActionBtnText}>Kiểm tra lại trạng thái</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="Hotline đội xe hỗ trợ"
            accessibilityRole="button"
            onPress={handleCallHotline}
            style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.btnPressed]}
            testID="btn-hotline"
          >
            <IconPhone color={driverPrimitives.colors.blue600} size={18} />
            <Text style={styles.secondaryActionBtnText}>Tổng đài hỗ trợ đối tác 1900 6789</Text>
          </Pressable>
        </View>

        <Text style={styles.policyNote}>
          Trong quá trình duyệt, đội ngũ hỗ trợ có thể liên hệ số điện thoại của bạn để xác thực thông tin đối tác.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.surfaceMuted,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: driverSemantics.text.primary,
  },
  logoutBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    color: leopardPalette.textMutedSlate,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.bezelOuter,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(15, 23, 42, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: typeScale.title3.fontSize,
    fontWeight: '800',
    color: driverSemantics.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: 20,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    fontVariant: ['tabular-nums'],
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    padding: 18,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: driverSemantics.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: typeScale.footnote.fontSize,
    color: leopardPalette.textMutedSlate,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: typeScale.subheadline.fontSize,
    color: driverSemantics.text.primary,
    fontWeight: '700',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  docStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  statusBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  statusBannerText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionGroup: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primaryActionBtn: {
    backgroundColor: driverPrimitives.colors.blue600,
    borderRadius: 14,
    ...iosContinuousCurve,
    minHeight: 48,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: driverPrimitives.colors.blue600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: colors.neutral.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.surface,
    borderColor: driverPrimitives.colors.gray200,
    borderWidth: 1,
    borderRadius: 12,
    ...iosContinuousCurve,
    minHeight: 48,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionBtnText: {
    color: driverPrimitives.colors.blue600,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.88,
  },
  policyNote: {
    fontSize: 12,
    lineHeight: 18,
    color: leopardPalette.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
