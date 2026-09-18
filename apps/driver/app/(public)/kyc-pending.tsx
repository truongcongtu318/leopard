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
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  IconClock,
  IconPhone,
  IconShield,
  IconTruck,
  ScreenScaffold,
  colors,
  driverPrimitives,
  driverSemantics,
  httpClient,
  iosContinuousCurve,
  leopardPalette,
  radius,
  sessionStore,
  spacing,
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
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Đăng xuất"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleLogout}
          testID="btn-logout"
        >
          <Text style={styles.logoutBtnText}>Thoát</Text>
        </Pressable>
      }
      onBack={handleBack}
      title="Trạng thái hồ sơ"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  logoutBtnText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: leopardPalette.textMutedSlate,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.bezelOuter,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: 'rgba(15, 23, 42, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  heroTitle: {
    ...typeScale.title3,
    fontWeight: '800',
    color: driverSemantics.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typeScale.footnote,
    lineHeight: 20,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginTop: 6,
  },
  etaText: {
    ...typeScale.caption1,
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
    padding: spacing.md + 2,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderTitle: {
    ...typeScale.subheadline,
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
    ...typeScale.footnote,
    color: leopardPalette.textMutedSlate,
    fontWeight: '500',
  },
  fieldValue: {
    ...typeScale.subheadline,
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
    borderRadius: radius.cardSm - 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
  },
  docStatusText: {
    ...typeScale.caption1,
    fontWeight: '700',
    color: '#15803D',
  },
  statusBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingVertical: spacing.xs + spacing.hairline,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  statusBannerText: {
    ...typeScale.footnote,
    color: '#1E40AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionGroup: {
    width: '100%',
    gap: 10,
    marginTop: spacing.xs,
  },
  primaryActionBtn: {
    backgroundColor: driverPrimitives.colors.blue600,
    borderRadius: radius.card,
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
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.surface,
    borderColor: driverPrimitives.colors.gray200,
    borderWidth: 1,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    minHeight: 48,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryActionBtnText: {
    color: driverPrimitives.colors.blue600,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.88,
  },
  policyNote: {
    ...typeScale.caption1,
    lineHeight: 18,
    color: leopardPalette.textSubtle,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
