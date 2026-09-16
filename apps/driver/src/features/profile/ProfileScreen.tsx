import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  IconCheck,
  IconChevronRight,
  IconEarnings,
  IconMessage,
  IconRoute,
  IconSettings,
  IconStar,
  IconSupport247,
  IconTrophy,
  IconUser,
  IconWallet,
  ScreenScaffold,
  ScreenState,
  colors,
  driverPrimitives,
  iosContinuousCurve,
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

  // Fallback if starts with +84 but other formatting
  if (trimmed.startsWith('+84')) {
    const rest = trimmed.slice(3).replace(/\D/g, '');
    if (rest.length >= 9) {
      return `+84 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
    }
  }

  return trimmed;
}

export function DriverProfileScreen({
  acceptancePct = 0,
  cancellationPct = 0,
  onLogout,
  onNavigate,
  onRetry,
  ratingAvg = 0,
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
  const driverName = view.name?.trim() ? view.name : (formattedPhone || 'Tài xế');

  return (
    <ScreenScaffold
      headerRight={
        <View style={styles.headerRightCluster}>
          <Pressable
            accessibilityLabel="Trợ giúp & Hỗ trợ"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/chat')}
            style={styles.headerBtn}
          >
            <IconSupport247 color={driverPrimitives.colors.gray700} size={20} />
          </Pressable>

          <Pressable
            accessibilityLabel="Cài đặt"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/settings')}
            style={styles.headerBtn}
          >
            <IconSettings color={driverPrimitives.colors.gray700} size={20} />
          </Pressable>
        </View>
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
        {/* ── 1. Hero Driver Bento Card (Apple Monochrome Minimal) ── */}
        <Pressable
          accessibilityLabel={`Chỉnh sửa hồ sơ ${driverName}`}
          accessibilityRole="button"
          onPress={() => router.push('/profile-edit')}
          style={({ pressed }) => [styles.heroCard, pressed ? styles.pressed : null]}
        >
          <View style={styles.heroMainRow}>
            <View style={styles.avatarContainer}>
              {view.avatarUrl ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: view.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  {driverName && driverName !== 'Tài xế' ? (
                    <Text style={styles.avatarInitial}>
                      {driverName.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <IconUser color={colors.neutral.surface} size={26} />
                  )}
                </View>
              )}
            </View>

            <View style={styles.driverInfoBlock}>
              <View style={styles.driverNameRow}>
                <Text numberOfLines={1} style={styles.driverNameText}>
                  {driverName}
                </Text>
                <View style={styles.verifiedCheckBadge}>
                  <IconCheck color={driverPrimitives.colors.white} size={10} strokeWidth={3} />
                </View>
              </View>

              {view.name ? <Text style={styles.driverPhoneText}>{formattedPhone}</Text> : null}

              <View style={styles.badgeRow}>
                <View style={styles.statusPill}>
                  <View style={styles.statusDotInner} />
                  <Text style={styles.statusPillText}>{view.statusLabel || 'Đang hoạt động'}</Text>
                </View>

                {view.vehicleLabel ? (
                  <View style={styles.vehiclePill}>
                    <Text numberOfLines={1} style={styles.vehiclePillText}>
                      {view.vehicleLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.editChevronButton}>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={18} />
            </View>
          </View>
        </Pressable>

        {/* ── 2. Daily Performance Bento Card (Neutral Typography) ── */}
        <Pressable
          accessibilityLabel="Xem báo cáo hiệu suất chi tiết"
          accessibilityRole="button"
          onPress={() => router.push('/performance')}
          style={({ pressed }) => [styles.kpiCard, pressed ? styles.pressed : null]}
        >
          <View style={styles.kpiCardHeader}>
            <Text style={styles.kpiSectionTitle}>Hiệu suất hàng ngày</Text>
            <View style={styles.kpiDetailLink}>
              <Text style={styles.kpiDetailLinkText}>Chi tiết</Text>
              <IconChevronRight color={driverPrimitives.colors.blue600} size={13} />
            </View>
          </View>

          <View style={styles.kpiColumns}>
            {/* Rating */}
            <View style={styles.kpiCol}>
              <View style={styles.kpiValueRow}>
                <IconStar color={driverPrimitives.colors.amber500} filled size={16} />
                <Text style={styles.kpiValueMain}>{ratingAvg.toFixed(1)}</Text>
              </View>
              <Text style={styles.kpiLabelSub}>Đánh giá sao</Text>
            </View>

            <View style={styles.kpiDividerVertical} />

            {/* Acceptance - Clean neutral dark text */}
            <View style={styles.kpiCol}>
              <Text style={styles.kpiValueMain}>
                {acceptancePct.toFixed(1)}%
              </Text>
              <Text style={styles.kpiLabelSub}>Chấp nhận</Text>
            </View>

            <View style={styles.kpiDividerVertical} />

            {/* Cancellation - Clean neutral dark text */}
            <View style={styles.kpiCol}>
              <Text style={styles.kpiValueMain}>
                {cancellationPct.toFixed(1)}%
              </Text>
              <Text style={styles.kpiLabelSub}>Huỷ chuyến</Text>
            </View>
          </View>
        </Pressable>

        {/* ── 3. Quick Bento Grid: Hoạt động & Tài chính (Monochrome Icons) ── */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionHeaderTitle}>Hoạt động & Tài chính</Text>

          <View style={styles.bentoGridRow}>
            {/* Tile 1: Ví tài xế */}
            <Pressable
              accessibilityLabel="Ví tài xế và rút tiền"
              accessibilityRole="button"
              onPress={() => router.push('/wallet')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <View style={styles.bentoTopRow}>
                <View style={styles.bentoIconBox}>
                  <IconWallet color={driverPrimitives.colors.gray700} size={20} />
                </View>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </View>
              <Text style={styles.bentoTileTitle}>Ví tài xế</Text>
              <Text style={styles.bentoTileSub}>Số dư & rút tiền</Text>
            </Pressable>

            {/* Tile 2: Thu nhập */}
            <Pressable
              accessibilityLabel="Báo cáo thu nhập và thưởng"
              accessibilityRole="button"
              onPress={() => router.push('/earnings')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <View style={styles.bentoTopRow}>
                <View style={styles.bentoIconBox}>
                  <IconEarnings color={driverPrimitives.colors.gray700} size={20} />
                </View>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </View>
              <Text style={styles.bentoTileTitle}>Thu nhập & Thưởng</Text>
              <Text style={styles.bentoTileSub}>Doanh thu & tiền cước</Text>
            </Pressable>
          </View>

          <View style={styles.bentoGridRow}>
            {/* Tile 3: Lịch nhận cuốc */}
            <Pressable
              accessibilityLabel="Bảng tin và lịch nhận cuốc"
              accessibilityRole="button"
              onPress={() => router.push('/board')}
              style={({ pressed }) => [styles.bentoTile, pressed ? styles.pressed : null]}
            >
              <View style={styles.bentoTopRow}>
                <View style={styles.bentoIconBox}>
                  <IconRoute color={driverPrimitives.colors.gray700} size={20} />
                </View>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </View>
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
              <View style={styles.bentoTopRow}>
                <View style={styles.bentoIconBox}>
                  <IconTrophy color={driverPrimitives.colors.gray700} size={20} />
                </View>
                <IconChevronRight color={driverPrimitives.colors.gray300} size={15} />
              </View>
              <Text style={styles.bentoTileTitle}>Hiệu suất tài xế</Text>
              <Text style={styles.bentoTileSub}>Tỷ lệ nhận & huỷ chuyến</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 4. Grouped Settings & Support (Apple Inset Grouped) ── */}
        <View style={styles.menuGroupSection}>
          <Text style={styles.sectionHeaderTitle}>Cài đặt & Hỗ trợ</Text>

          <View style={styles.groupedMenuCard}>
            {/* Hộp thư đến */}
            <Pressable
              accessibilityLabel="Hộp thư đến và tin nhắn"
              accessibilityRole="button"
              onPress={() => router.push('/chat')}
              style={({ pressed }) => [styles.menuItemRow, pressed ? styles.menuItemPressed : null]}
            >
              <View style={styles.iconBox}>
                <IconMessage color={driverPrimitives.colors.gray700} size={20} />
                <View style={styles.notificationDot} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Hộp thư đến & Thông báo</Text>
                <Text style={styles.menuItemSub}>Tin nhắn điều phối và thông báo hệ thống</Text>
              </View>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>

            <View style={styles.menuItemSeparator} />

            {/* Cài đặt ứng dụng */}
            <Pressable
              accessibilityLabel="Cài đặt ứng dụng"
              accessibilityRole="button"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.menuItemRow, pressed ? styles.menuItemPressed : null]}
            >
              <View style={styles.iconBox}>
                <IconSettings color={driverPrimitives.colors.gray700} size={20} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Cài đặt & Pháp lý</Text>
                <Text style={styles.menuItemSub}>Định vị GPS, thông tin ứng dụng & bảo mật</Text>
              </View>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>
          </View>
        </View>

        {/* ── 5. App Version & Logout ── */}
        <View style={styles.footerSection}>
          <Text style={styles.versionLabel}>LEOPARD Driver · Phiên bản: {view.appVersion}</Text>

          <View style={styles.logoutBtnWrap}>
            <Button
              disabledLabel="Đăng xuất"
              isLoading={view.isLoggingOut}
              label="Đăng xuất tài khoản"
              loadingLabel="Đang đăng xuất…"
              onPress={onLogout}
              variant="destructive"
            />
          </View>
        </View>
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

  /* Hero Driver Card */
  heroCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  heroMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 9999,
    borderWidth: 1.5,
    height: 56,
    width: 56,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 9999,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarInitial: {
    color: colors.neutral.surface,
    fontSize: 22,
    fontWeight: '700',
  },
  driverInfoBlock: {
    flex: 1,
    gap: 4,
  },
  driverNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  driverNameText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  verifiedCheckBadge: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.blue600,
    borderRadius: 9999,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  driverPhoneText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 9999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDotInner: {
    backgroundColor: driverPrimitives.colors.green500,
    borderRadius: 9999,
    height: 6,
    width: 6,
  },
  statusPillText: {
    color: colors.neutral.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },
  vehiclePill: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehiclePillText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontWeight: '500',
  },
  editChevronButton: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray50,
    borderRadius: 9999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },

  /* KPI Card */
  kpiCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  kpiCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiSectionTitle: {
    color: driverPrimitives.colors.gray700,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  kpiDetailLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  kpiDetailLinkText: {
    color: driverPrimitives.colors.blue600,
    fontSize: 12,
    fontWeight: '600',
  },
  kpiColumns: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  kpiCol: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  kpiValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  kpiValueMain: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  kpiLabelSub: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '500',
  },
  kpiDividerVertical: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 30,
    width: 1,
  },

  /* Bento 2x2 Hub - Clean Monochrome */
  bentoSection: {
    gap: 8,
  },
  bentoGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoTile: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    gap: 4,
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
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bentoTileTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bentoTileSub: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '400',
  },

  /* Grouped Menu */
  menuGroupSection: {
    gap: 8,
  },
  sectionHeaderTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  groupedMenuCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
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
    paddingVertical: 13,
  },
  menuItemPressed: {
    backgroundColor: driverPrimitives.colors.gray50,
  },
  iconBox: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  notificationDot: {
    backgroundColor: driverPrimitives.colors.red500,
    borderColor: driverPrimitives.colors.white,
    borderRadius: 9999,
    borderWidth: 1.5,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
  },
  menuItemTextCol: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  menuItemSub: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11.5,
    fontWeight: '400',
  },
  menuItemSeparator: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 56,
  },

  /* Footer */
  footerSection: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  versionLabel: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
    fontWeight: '500',
  },
  logoutBtnWrap: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
});
