import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  leopardElevation,
  leopardPalette,
  leopardRadius,
  spacing,
  typography,
} from '../../theme/tokens';
import { FloatingNavBar, type TabKey } from '../../ui/FloatingNavBar';
import {
  IconBell,
  IconPaymentConvenient,
  IconQrPayment,
  IconSearch,
  IconUser,
} from '../../ui/icons/CoreIcons';
import { ProcessingModal } from '../../ui/ProcessingModal';
import {
  type VehicleCategory,
  type VehicleOption,
  VehicleSelectCard,
} from '../../ui/VehicleSelectCard';

const truckSource = require('../../../assets/brand/truck.png');

export type HomeDashboardScreenProps = Readonly<{
  userName?: string;
  smeName?: string;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onSwitchRole?: (role: 'CUSTOMER' | 'DRIVER') => void;
  onNavigateTab?: (tab: TabKey) => void;
  onSelectVehicleAndBook?: (vehicleId: VehicleCategory) => void;
  onOpenActiveOrder?: (orderId: string) => void;
  onTopUpWallet?: () => void;
  onOpenQrScan?: () => void;
  onViewReports?: () => void;
  showFloatingNavBar?: boolean;
}>;

const vehicleCatalog: readonly VehicleOption[] = [
  {
    id: '3_WHEEL_BIKE',
    name: '3-Wheel Cargo Bike',
    vietnameseName: 'Xe Ba Gác',
    capacity: '< 500 kg',
    dimensions: '1.8m x 1.2m',
    idealFor: 'Hẻm nhỏ, đồ đạc nhẹ, vật liệu',
    badge: 'Tiết kiệm 30%',
    estimatedPrice: 'Từ 120.000 ₫',
  },
  {
    id: 'LIGHT_TRUCK',
    name: 'Light Truck / Van',
    vietnameseName: 'Xe Tải Nhẹ (1.5 Tấn)',
    capacity: '500kg - 1.5 Tấn',
    dimensions: '3.2m x 1.6m x 1.7m',
    idealFor: 'Chuyển nhà, hàng đóng thùng, xưởng',
    badge: 'Phổ biến nhất',
    estimatedPrice: 'Từ 250.000 ₫',
  },
  {
    id: 'HEAVY_TRUCK',
    name: 'Heavy Duty Truck',
    vietnameseName: 'Xe Tải Nặng (5-10 Tấn)',
    capacity: '5 Tấn - 10 Tấn',
    dimensions: '6.2m x 2.1m x 2.2m',
    idealFor: 'Sắt thép, xi măng, nông sản lớn',
    badge: 'Tải trọng lớn',
    estimatedPrice: 'Từ 650.000 ₫',
  },
];

export function HomeDashboardScreen({
  onNavigateTab,
  onOpenActiveOrder,
  onOpenNotifications,
  onOpenProfile,
  onOpenQrScan,
  onSelectVehicleAndBook,
  onSwitchRole,
  onTopUpWallet,
  onViewReports,
  showFloatingNavBar = false,
  smeName = 'Cửa hàng VLXD Đại Phát',
  unreadNotifications = 3,
  userName = 'Anh Hoàng',
}: HomeDashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>('LIGHT_TRUCK');
  const [isSearchingTruck, setIsSearchingTruck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    onNavigateTab?.(key);
  };

  const handleBookSelected = () => {
    setIsSearchingTruck(true);
  };

  const handleModalSuccess = () => {
    setIsSearchingTruck(false);
    onSelectVehicleAndBook?.(selectedVehicle);
  };

  const currentSelectedVehicle = vehicleCatalog.find((v) => v.id === selectedVehicle);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <Pressable
            accessibilityLabel="Xem hồ sơ SME"
            accessibilityRole="button"
            onPress={onOpenProfile}
            style={styles.avatarRow}
          >
            <View style={styles.avatarBox}>
              <IconUser color={leopardPalette.primary} size={22} strokeWidth={2} />
            </View>
            <View style={styles.userTextWrap}>
              <Text style={styles.greetingText}>Xin chào, {userName}</Text>
              <Text numberOfLines={1} style={styles.smeText}>
                {smeName}
              </Text>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            {onSwitchRole && (
              <Pressable
                accessibilityLabel="Chuyển vai trò"
                accessibilityRole="button"
                onPress={() => onSwitchRole('DRIVER')}
                style={styles.roleSwitchBtn}
              >
                <Text style={styles.roleSwitchText}>Tài xế ⇄</Text>
              </Pressable>
            )}

            {onOpenNotifications && (
              <Pressable
                accessibilityLabel={`Thông báo (${unreadNotifications} chưa đọc)`}
                accessibilityRole="button"
                onPress={onOpenNotifications}
                style={styles.bellBtn}
              >
                <IconBell color={leopardPalette.textSlateDark} size={20} />
                {unreadNotifications > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Search Bar */}
          <View style={styles.searchBar}>
            <IconSearch color={leopardPalette.textMutedSlate} size={18} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Tìm dịch vụ xe tải, bốc xếp, ghép chuyến..."
              placeholderTextColor={leopardPalette.textMutedSlate}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 🚚 Dynamic Promo Hero Banner (Onboarding Visuals & 3D Truck) */}
          <View style={styles.heroBanner}>
            <View style={styles.heroContent}>
              <View style={styles.promoTag}>
                <Text style={styles.promoTagText}>Ưu đãi SME · Tiết kiệm 20%</Text>
              </View>
              <Text style={styles.heroTitle}>Vận chuyển nhanh, chuẩn tải</Text>
              <Text style={styles.heroSubtitle}>
                Điều phối tức thì · Tối ưu tuyến đường với Vietmap & AI
              </Text>
              <Pressable
                accessibilityLabel="Tạo đơn vận chuyển ngay"
                accessibilityRole="button"
                onPress={handleBookSelected}
                style={({ pressed }) => [styles.heroCtaBtn, pressed && styles.pressed]}
              >
                <Text style={styles.heroCtaText}>Đặt xe ngay →</Text>
              </Pressable>
            </View>
            <Image
              resizeMode="contain"
              source={truckSource}
              style={styles.heroTruckImage}
            />
          </View>

          {/* 💳 Financial & Operations Hub (Ví VietQR & Chỉ số vận hành) */}
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View>
                <Text style={styles.walletLabel}>SỐ DƯ VÍ VIETQR</Text>
                <Text style={styles.walletBalance}>1.850.000 ₫</Text>
              </View>
              <View style={styles.growthBadge}>
                <Text style={styles.growthText}>🟢 2 chuyến chạy</Text>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <Pressable
                accessibilityLabel="Thanh toán đơn cước"
                accessibilityRole="button"
                onPress={onOpenQrScan}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                <IconQrPayment color={leopardPalette.primary} size={18} />
                <Text style={styles.actionBtnText}>Quét QR</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Nạp tiền nhanh VietQR"
                accessibilityRole="button"
                onPress={onTopUpWallet}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                <IconPaymentConvenient color={leopardPalette.primary} size={18} />
                <Text style={styles.actionBtnText}>Nạp tiền</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Xem báo cáo thống kê"
                accessibilityRole="button"
                onPress={onViewReports}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                <Text style={styles.moreIcon}>•••</Text>
                <Text style={styles.actionBtnText}>Thống kê</Text>
              </Pressable>
            </View>

            <View style={styles.walletDivider} />

            {/* Financial Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <View style={[styles.metricDot, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.metricLabel}>Nạp tháng: </Text>
                <Text style={styles.metricValue}>3.420.000 ₫</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.metricDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.metricLabel}>Đã chi: </Text>
                <Text style={styles.metricValue}>2.139.000 ₫</Text>
              </View>
            </View>
          </View>

          {/* 📍 Active Trip Snippet */}
          <Pressable
            accessibilityLabel="Xem chi tiết chuyến đang vận chuyển"
            accessibilityRole="button"
            onPress={() => onOpenActiveOrder?.('active-demo-1')}
            style={({ pressed }) => [styles.activeTripCard, pressed && styles.pressed]}
          >
            <View style={styles.activeTripHeader}>
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>ĐANG GIAO HÀNG · GPS REALTIME</Text>
              </View>
              <Text style={styles.activeEta}>ETA dự kiến: 18 phút</Text>
            </View>
            <Text style={styles.activeRouteText}>
              Kho Tân Bình ➔ KCN Tân Tạo (1.2 tấn Xi măng)
            </Text>
            <View style={styles.activeDriverRow}>
              <Text style={styles.driverInfoText}>Tài xế: Nguyễn Văn Hùng • 59C-882.14</Text>
              <Text style={styles.trackArrow}>Theo dõi lộ trình →</Text>
            </View>
          </Pressable>

          {/* 🚛 Vehicle Selection Header */}
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionHeadingTitle}>Chọn loại phương tiện</Text>
              <Text style={styles.sectionHeadingSubtitle}>
                Tối ưu tuyến đường theo chuẩn Vietmap & AI
              </Text>
            </View>
            <View style={styles.vrpBadge}>
              <Text style={styles.vrpBadgeText}>OR-Tools VRP</Text>
            </View>
          </View>

          {/* Vehicle Selection Grid */}
          <View style={styles.vehicleGrid}>
            {vehicleCatalog.map((vehicle) => (
              <VehicleSelectCard
                key={vehicle.id}
                onSelect={setSelectedVehicle}
                selected={selectedVehicle === vehicle.id}
                vehicle={vehicle}
              />
            ))}
          </View>

          {/* Quick Booking Action CTA */}
          <Pressable
            accessibilityLabel={`Đặt ${currentSelectedVehicle?.vietnameseName ?? 'xe'} ngay`}
            accessibilityRole="button"
            onPress={handleBookSelected}
            style={({ pressed }) => [styles.bookNowBtn, pressed && styles.pressed]}
          >
            <Text style={styles.bookNowText}>
              Đặt ngay — {currentSelectedVehicle?.vietnameseName ?? ''}
            </Text>
          </Pressable>

          {/* Bottom spacer */}
          <View style={showFloatingNavBar ? styles.bottomSpacerFloating : styles.bottomSpacer} />
        </ScrollView>

        {/* Floating Bottom Nav Bar */}
        {showFloatingNavBar && (
          <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {/* Processing / Loading State Modal */}
        <ProcessingModal
          onCancel={() => setIsSearchingTruck(false)}
          onSuccessDemo={handleModalSuccess}
          visible={isSearchingTruck}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: leopardPalette.surfaceWhite,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: leopardPalette.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: leopardPalette.cardBorder,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: leopardRadius.lg,
    backgroundColor: leopardPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.primaryBorder,
  },
  userTextWrap: {
    flex: 1,
    gap: 1,
  },
  greetingText: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
  },
  smeText: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleSwitchBtn: {
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: leopardPalette.primaryBorder,
  },
  roleSwitchText: {
    color: leopardPalette.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: leopardRadius.pill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger.border,
    borderRadius: leopardRadius.pill,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    gap: spacing.xs,
    ...leopardElevation.subtle,
  },
  searchInput: {
    flex: 1,
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '400',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchIcon: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
  },
  heroBanner: {
    backgroundColor: '#F0F9FF',
    borderRadius: leopardRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    gap: 4,
    zIndex: 1,
  },
  promoTag: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: leopardRadius.pill,
  },
  promoTagText: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  heroSubtitle: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    lineHeight: 16,
  },
  heroCtaBtn: {
    backgroundColor: leopardPalette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: leopardRadius.pill,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroTruckImage: {
    width: 105,
    height: 78,
    marginLeft: 6,
  },
  walletCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    gap: spacing.sm,
    ...leopardElevation.subtle,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  walletBalance: {
    color: leopardPalette.textSlateDark,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  growthBadge: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  growthText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: leopardRadius.lg,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  actionBtnText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12,
    fontWeight: '600',
  },
  moreIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: leopardPalette.primary,
  },
  walletDivider: {
    height: 1,
    backgroundColor: leopardPalette.subtleDivider,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  metricValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 11.5,
    fontWeight: '600',
  },
  activeTripCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: colors.active.border,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...leopardElevation.subtle,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success.text,
  },
  liveTagText: {
    color: colors.success.text,
    fontSize: 9.5,
    fontWeight: '700',
  },
  activeEta: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '600',
  },
  activeRouteText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 2,
  },
  activeDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  driverInfoText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
  },
  trackArrow: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionHeadingTitle: {
    ...typography.sectionTitle,
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeadingSubtitle: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    marginTop: 1,
  },
  vrpBadge: {
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primaryBorder,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vrpBadgeText: {
    color: leopardPalette.primaryDark,
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleGrid: {
    gap: spacing.sm,
  },
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: leopardPalette.primary,
    borderRadius: leopardRadius.lg,
    minHeight: 48,
    ...leopardElevation.subtle,
  },
  bookNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 88,
  },
  bottomSpacerFloating: {
    height: 88,
  },
  pressed: {
    opacity: 0.85,
  },
});
