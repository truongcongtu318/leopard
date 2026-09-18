import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconChevronRight,
  IconCrown,
  IconEarnings,
  IconIdCard,
  IconInsuranceDoc,
  IconLogOut,
  IconRoute,
  IconSecurityShield,
  IconSettings,
  IconStar,
  IconTrophy,
  IconUser,
  IconWallet,
  ScreenScaffold,
  ScreenState,
  VStack,
  colors,
  customerPalette,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverProfileView } from './model';

export type DriverProfileScreenProps = Readonly<{
  view: DriverProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
  onNavigate?: (route: string) => void;
  ratingAvg?: number;
  acceptancePct?: number;
  cancellationPct?: number;
}>;

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();

  // Match +84 with 9 or 10 digits
  const vnE164Match = trimmed.match(/^\+84(\d{9,10})$/);
  if (vnE164Match) {
    const digits = vnE164Match[1];
    return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Match 10-digit local starting with 0: e.g. 0901234567 -> 0901 234 567
  if (/^0\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)} ${trimmed.slice(4, 7)} ${trimmed.slice(7)}`;
  }

  return trimmed;
}

export function DriverProfileScreen({
  acceptancePct = 98.5,
  cancellationPct = 1.2,
  onLogout,
  onNavigate,
  onRetry,
  ratingAvg = 4.95,
  view,
}: DriverProfileScreenProps) {
  const router = useRouter();

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold
        headerTone="plain"
        onBack={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
        title="Hồ sơ tài xế"
      >
        <View style={styles.errorBody}>
          <ScreenState
            actionLabel={view.kind === 'error' ? 'Thử lại' : undefined}
            message={view.message}
            onAction={onRetry}
            state={view.kind}
            title={view.title}
          />
        </View>
      </ScreenScaffold>
    );
  }

  const formattedPhone = formatPhoneNumber(view.phone);
  const driverName = view.name?.trim() ? view.name : formattedPhone;

  return (
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Cài đặt"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/settings')}
          style={styles.headerBtn}
        >
          <IconSettings color={driverPrimitives.colors.gray700} size={20} />
        </Pressable>
      }
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
      title="Hồ sơ tài xế"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. IMMERSIVE APPLE LUXURY HERO HEADER ── */}
        <Card style={styles.heroCard}>
          {/* Top meta bar */}
          <HStack style={styles.heroTopBar}>
            <Badge action="muted" size="sm" style={styles.leopardIdBadge}>
              <Badge.Text style={styles.leopardIdText}>LEOPARD ID</Badge.Text>
            </Badge>

            <Pressable
              accessibilityLabel={`Chỉnh sửa hồ sơ ${driverName}`}
              accessibilityRole="button"
              onPress={() => router.push('/profile-edit')}
              style={({ pressed }) => [styles.editHeroBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.editHeroBtnText}>Sửa hồ sơ</Text>
            </Pressable>
          </HStack>

          {/* User Identity Section */}
          <HStack style={styles.identityRow}>
            {/* Squircle Avatar with subtle badge */}
            <Box style={styles.avatarWrap}>
              <Box style={styles.avatarSquircle}>
                {view.avatarUrl ? (
                  <Image source={{ uri: view.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(driverName ?? 'T').charAt(0).toUpperCase()}
                  </Text>
                )}
              </Box>
              {/* Verified Shield Badge */}
              <Box style={styles.verifiedDot}>
                <IconSecurityShield color={customerPalette.surfaceWhite} size={10} />
              </Box>
            </Box>

            {/* Profile Info Details */}
            <VStack style={styles.identityInfo}>
              <Text numberOfLines={1} style={styles.heroName}>
                {driverName}
              </Text>
              {view.name && formattedPhone ? (
                <Text style={styles.heroPhone}>{formattedPhone}</Text>
              ) : null}

              {/* Role & Vehicle Badges */}
              <HStack style={styles.badgeRow}>
                <Badge action="warning" size="sm" style={styles.membershipPill}>
                  <IconCrown color={leopardPalette.accentYellow} size={13} />
                  <Badge.Text style={styles.membershipText}>
                    {view.roleLabel || 'Tài xế đối tác'}
                  </Badge.Text>
                </Badge>
                {view.vehicleLabel ? (
                  <Badge action="muted" size="sm" style={styles.vehiclePill}>
                    <Badge.Text numberOfLines={1} style={styles.vehiclePillText}>
                      {view.vehicleLabel}
                    </Badge.Text>
                  </Badge>
                ) : null}
              </HStack>
            </VStack>
          </HStack>

          {/* Quick Stats: Đánh giá sao · Chấp nhận · Huỷ chuyến */}
          <Pressable
            accessibilityLabel="Xem báo cáo hiệu suất chi tiết"
            accessibilityRole="button"
            onPress={() => router.push('/performance')}
            style={({ pressed }) => [styles.quickStatsRow, pressed ? styles.pressed : null]}
          >
            <VStack style={styles.statCol}>
              <Text style={styles.statLabel}>Đánh giá sao</Text>
              <HStack style={styles.kpiValueRow}>
                <IconStar color={leopardPalette.accentYellow} filled size={14} />
                <Text style={styles.statValueWhite}>{ratingAvg.toFixed(1)}</Text>
              </HStack>
            </VStack>

            <Divider orientation="vertical" style={styles.statDivider} />

            <VStack style={styles.statCol}>
              <Text style={styles.statLabel}>Chấp nhận</Text>
              <Text style={styles.statValueWhite}>{acceptancePct.toFixed(1)}%</Text>
            </VStack>

            <Divider orientation="vertical" style={styles.statDivider} />

            <VStack style={styles.statCol}>
              <Text style={styles.statLabel}>Huỷ chuyến</Text>
              <Text style={styles.statValueWhite}>{cancellationPct.toFixed(1)}%</Text>
            </VStack>
          </Pressable>
        </Card>

        {/* ── 2. Quick Bento Grid: Hoạt động & Tài chính (Monochrome Icons) ── */}
        <VStack style={styles.bentoSection}>
          <Text style={styles.sectionHeaderTitle}>Hoạt động & Tài chính</Text>

          <HStack style={styles.bentoGridRow}>
            {/* Tile 1: Ví tài xế */}
            <Pressable
              accessibilityLabel="Ví tài xế và rút tiền"
              accessibilityRole="button"
              onPress={() => router.push('/wallet')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <HStack style={styles.bentoTopRow}>
                <Box style={styles.bentoIconBox}>
                  <IconWallet color={driverPrimitives.colors.gray700} size={20} />
                </Box>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </HStack>
              <Text style={styles.bentoTileTitle}>Ví tài xế</Text>
              <Text style={styles.bentoTileSub}>Số dư & rút tiền</Text>
            </Pressable>

            {/* Tile 2: Thu nhập */}
            <Pressable
              accessibilityLabel="Báo cáo thu nhập"
              accessibilityRole="button"
              onPress={() => router.push('/earnings')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <HStack style={styles.bentoTopRow}>
                <Box style={styles.bentoIconBox}>
                  <IconEarnings color={driverPrimitives.colors.gray700} size={20} />
                </Box>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </HStack>
              <Text style={styles.bentoTileTitle}>Thu nhập</Text>
              <Text style={styles.bentoTileSub}>Doanh thu & tiền cước</Text>
            </Pressable>
          </HStack>

          <HStack style={styles.bentoGridRow}>
            {/* Tile 3: Lịch nhận cuốc */}
            <Pressable
              accessibilityLabel="Bảng tin và lịch nhận cuốc"
              accessibilityRole="button"
              onPress={() => router.push('/board')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <HStack style={styles.bentoTopRow}>
                <Box style={styles.bentoIconBox}>
                  <IconRoute color={driverPrimitives.colors.gray700} size={20} />
                </Box>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </HStack>
              <Text style={styles.bentoTileTitle}>Lịch nhận cuốc</Text>
              <Text style={styles.bentoTileSub}>Lịch trình & đơn mới</Text>
            </Pressable>

            {/* Tile 4: Hiệu suất */}
            <Pressable
              accessibilityLabel="Báo cáo hiệu suất tài xế"
              accessibilityRole="button"
              onPress={() => router.push('/performance')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <HStack style={styles.bentoTopRow}>
                <Box style={styles.bentoIconBox}>
                  <IconTrophy color={driverPrimitives.colors.gray700} size={20} />
                </Box>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </HStack>
              <Text style={styles.bentoTileTitle}>Hiệu suất tài xế</Text>
              <Text style={styles.bentoTileSub}>Tỷ lệ nhận & huỷ chuyến</Text>
            </Pressable>
          </HStack>
        </VStack>

        {/* ── 3. Grouped Settings & Legal (Apple Inset Grouped) ── */}
        <VStack style={styles.menuGroupSection}>
          <Text style={styles.sectionHeaderTitle}>Cài đặt & Pháp lý</Text>

          <Card style={styles.groupedMenuCard}>
            {/* 1. Giấy tờ & Hồ sơ KYC */}
            <Pressable
              accessibilityLabel="Xem giấy tờ và hồ sơ KYC"
              accessibilityRole="button"
              onPress={() => router.push('/kyc')}
              style={({ pressed }) => [styles.menuItemRow, pressed ? styles.menuItemPressed : null]}
            >
              <Box style={styles.iconBox}>
                <IconIdCard color={driverPrimitives.colors.gray700} size={20} />
              </Box>
              <VStack style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Giấy tờ & Hồ sơ KYC</Text>
                <Text style={styles.menuItemSub}>CCCD, Bằng lái, Cà vẹt xe & Bảo hiểm</Text>
              </VStack>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>

            <Divider style={styles.menuItemSeparator} />

            {/* 2. Hợp đồng đối tác điện tử */}
            <Pressable
              accessibilityLabel="Xem hợp đồng đối tác điện tử"
              accessibilityRole="button"
              onPress={() => router.push('/contract')}
              style={({ pressed }) => [styles.menuItemRow, pressed ? styles.menuItemPressed : null]}
            >
              <Box style={styles.iconBox}>
                <IconInsuranceDoc color={driverPrimitives.colors.gray700} size={20} />
              </Box>
              <VStack style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Hợp đồng đối tác</Text>
                <Text style={styles.menuItemSub}>Hợp đồng điện tử & điều khoản dịch vụ</Text>
              </VStack>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>

            <Divider style={styles.menuItemSeparator} />

            {/* 3. Cài đặt ứng dụng */}
            <Pressable
              accessibilityLabel="Cài đặt ứng dụng"
              accessibilityRole="button"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.menuItemRow, pressed ? styles.menuItemPressed : null]}
            >
              <Box style={styles.iconBox}>
                <IconSettings color={driverPrimitives.colors.gray700} size={20} />
              </Box>
              <VStack style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Cài đặt ứng dụng</Text>
                <Text style={styles.menuItemSub}>Định vị GPS, thông tin ứng dụng & bảo mật</Text>
              </VStack>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>
          </Card>
        </VStack>

        {/* ── 4. Nút Đăng xuất nhẹ nhàng (Subtle Logout) ── */}
        <Box style={styles.logoutSection}>
          <Pressable
            accessibilityLabel="Đăng xuất"
            accessibilityRole="button"
            disabled={view.isLoggingOut}
            onPress={onLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <IconLogOut color={colors.danger.text} size={17} />
            <Text style={styles.logoutBtnText}>
              {view.isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </Text>
          </Pressable>
        </Box>

        {/* ── 5. Chân trang thông tin phiên bản ── */}
        <VStack style={styles.footerInfoBox}>
          <Text style={styles.footerVersionText}>
            LEOPARD Driver · Phiên bản{' '}
            <Text style={styles.footerVersionBold}>{view.appVersion}</Text> (Build 2026)
          </Text>
          <Text style={styles.footerCopyrightText}>
            Hệ thống kết nối chuỗi cung ứng vận tải hàng hóa chuyên nghiệp
          </Text>
        </VStack>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 44,
  },
  headerRightCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  errorBody: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },

  /* HERO CARD STYLES */
  heroCard: {
    backgroundColor: leopardPalette.darkHeroBg,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
    shadowColor: leopardPalette.darkHeroBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  heroTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    zIndex: 2,
  },
  leopardIdBadge: {
    backgroundColor: customerPalette.textSlateDark,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  leopardIdText: {
    color: leopardPalette.inputPlaceholder,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  editHeroBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  editHeroBtnText: {
    color: colors.neutral.subtleBorder,
    fontSize: 12,
    fontWeight: '600',
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    position: 'relative',
    zIndex: 2,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarSquircle: {
    alignItems: 'center',
    backgroundColor: customerPalette.textSlateDark,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 18,
    borderWidth: 2,
    height: 62,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 62,
  },
  avatarText: {
    color: colors.neutral.surfaceMuted,
    fontSize: typeScale.title1.fontSize,
    fontWeight: '700',
  },
  avatarImage: {
    borderRadius: 16,
    height: 58,
    width: 58,
  },
  verifiedDot: {
    alignItems: 'center',
    backgroundColor: leopardPalette.accentYellow,
    borderColor: leopardPalette.darkHeroBg,
    borderRadius: 10,
    borderWidth: 2,
    bottom: -2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 20,
  },
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    color: customerPalette.surfaceWhite,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroPhone: {
    color: leopardPalette.inputPlaceholder,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  membershipPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  membershipText: {
    color: leopardPalette.accentYellow,
    fontSize: 11,
    fontWeight: '600',
  },
  vehiclePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehiclePillText: {
    color: colors.neutral.subtleBorder,
    fontSize: 11,
    fontWeight: '500',
  },
  quickStatsRow: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    position: 'relative',
    zIndex: 2,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: '80%',
    width: 1,
  },
  statLabel: {
    color: leopardPalette.inputPlaceholder,
    fontSize: 11,
  },
  kpiValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statValueWhite: {
    color: customerPalette.surfaceWhite,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },

  /* Bento Sections */
  bentoSection: {
    gap: 10,
  },
  sectionHeaderTitle: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  bentoGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoTile: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 92,
    padding: 14,
    ...driverPrimitives.shadows.sm,
  },
  bentoTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bentoIconBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray50,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bentoTileTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bentoTileSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },

  /* Grouped Settings & Support */
  menuGroupSection: {
    gap: 10,
  },
  groupedMenuCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  menuItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemPressed: {
    backgroundColor: driverPrimitives.colors.gray50,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray50,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
  },
  notificationDot: {
    backgroundColor: driverPrimitives.colors.red500,
    borderRadius: 9999,
    height: 7,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
  },
  menuItemTextCol: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuItemSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  menuItemSeparator: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 56,
  },

  /* Footer & Logout */
  logoutSection: {
    paddingTop: 4,
    width: '100%',
  },
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
    width: '100%',
  },
  logoutBtnText: {
    color: colors.danger.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  footerInfoBox: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingBottom: spacing.md,
  },
  footerVersionText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    textAlign: 'center',
  },
  footerVersionBold: {
    color: colors.neutral.titleText,
    fontWeight: '600',
  },
  footerCopyrightText: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
