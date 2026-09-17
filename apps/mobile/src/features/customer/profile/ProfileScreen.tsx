import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { typeScale, colors, customerPalette, layout, leopardPalette, radius, spacing, IconChevron, IconCrown, IconFileText, IconLocationPin, IconLogOut, IconOrders, IconSecurityShield, IconSettings, IconSupport247, IconTag, IconWallet, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import type { CustomerProfileView } from './model';

export type CustomerProfileScreenProps = Readonly<{
  view: CustomerProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

type MenuRowProps = Readonly<{
  icon: ReactNode;
  iconBg: string;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  isLast?: boolean;
}>;

function SectionHeader({ title }: Readonly<{ title: string }>) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({
  badge,
  icon,
  iconBg,
  isLast = false,
  label,
  onPress,
  subtitle,
}: MenuRowProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        isLast ? styles.menuRowLast : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.menuContent}>
        <View style={styles.menuLabelRow}>
          <Text style={styles.menuLabel}>{label}</Text>
          {badge ? (
            <View style={styles.menuBadgePill}>
              <Text style={styles.menuBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="md" />
    </Pressable>
  );
}

export function CustomerProfileScreen({ onLogout, onRetry, view }: CustomerProfileScreenProps) {
  const router = useRouter();

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold title="Hồ sơ">
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử lại' : undefined}
          message={view.message}
          onAction={onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      hasFloatingNavBar
      title="Hồ sơ"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. IMMERSIVE APPLE LUXURY HERO HEADER */}
        <View style={styles.heroCard}>
          {/* Top meta bar */}
          <View style={styles.heroTopBar}>
            <View style={styles.leopardIdBadge}>
              <Text style={styles.leopardIdText}>LEOPARD ID</Text>
            </View>

            <Pressable
              accessibilityLabel="Chỉnh sửa hồ sơ"
              accessibilityRole="button"
              onPress={() => router.push('/customer/profile-edit')}
              style={({ pressed }) => [styles.editHeroBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.editHeroBtnText}>Sửa hồ sơ</Text>
            </Pressable>
          </View>

          {/* User Identity Section */}
          <View style={styles.identityRow}>
            {/* Squircle Avatar with Neon Cyan Glow Border */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarSquircle}>
                {view.avatarUrl ? (
                  <Image source={{ uri: view.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(view.name ?? 'K').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              {/* Verified Shield Badge */}
              <View style={styles.verifiedDot}>
                <IconSecurityShield color={customerPalette.surfaceWhite} size={10} />
              </View>
            </View>

            {/* Profile Info Details */}
            <View style={styles.identityInfo}>
              <Text numberOfLines={1} style={styles.heroName}>
                {view.name || 'Khách hàng LEOPARD'}
              </Text>
              <Text style={styles.heroPhone}>{view.phone}</Text>

              {/* Role Pill */}
              <View style={styles.membershipPill}>
                <IconCrown color={leopardPalette.accentYellow} size={13} />
                <Text style={styles.membershipText}>{view.roleLabel}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats: Tổng đơn · Đang xử lý · Ưu đãi */}
          <View style={styles.quickStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Tổng đơn</Text>
              <Text style={styles.statValueWhite}>{view.totalOrdersLabel ?? '0'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Đang xử lý</Text>
              <Text style={styles.statValueGold}>{view.activeOrdersLabel ?? '0'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Mã ưu đãi</Text>
              <Text style={styles.statValueGreen}>
                {view.vouchersLabel ? `${view.vouchersLabel} mã` : '0 mã'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. FLOATING BENTO BENEFIT CARD (NẰM ĐÈ LÊN CHÂN HERO) */}
        <View style={styles.bentoWalletCard}>
          {/* VietQR Escrow & Payment History Hub */}
          <View style={styles.bentoCol}>
            <View style={styles.bentoHeaderRow}>
              <Pressable
                accessibilityLabel="Mở ví VietQR"
                accessibilityRole="button"
                onPress={() => router.push('/customer/wallet')}
                style={({ pressed }) => [
                  styles.bentoLabelWithIcon,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={[styles.bentoIconBadge, { backgroundColor: colors.neutral.surfaceMuted }]}>
                  <IconWallet color={customerPalette.textSlateDark} size={14} />
                </View>
                <Text style={styles.bentoEyebrow}>KÝ QUỸ & ĐƠN</Text>
              </Pressable>
              <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="sm" />
            </View>

            <Pressable
              accessibilityLabel="Ví VietQR"
              accessibilityRole="button"
              onPress={() => router.push('/customer/wallet')}
              style={({ pressed }) => [
                styles.bentoAmountAction,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.bentoAmountText}>Lịch sử ký quỹ</Text>
              <Text style={styles.bentoSubGreen}>Xem theo đơn hàng</Text>
            </Pressable>
          </View>

          <View style={styles.bentoColDivider} />

          {/* Vouchers & Promos Hub */}
          <Pressable
            accessibilityLabel="Khuyến mãi & Thanh toán"
            accessibilityRole="button"
            onPress={() => router.push('/customer/promotions')}
            style={({ pressed }) => [styles.bentoCol, pressed ? styles.pressed : null]}
          >
            <View style={styles.bentoHeaderRow}>
              <View style={styles.bentoLabelWithIcon}>
                <View style={[styles.bentoIconBadge, { backgroundColor: colors.neutral.surfaceMuted }]}>
                  <IconTag color={customerPalette.textSlateDark} size={14} />
                </View>
                <Text style={styles.bentoEyebrow}>MÃ ƯU ĐÃI</Text>
              </View>
              <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="sm" />
            </View>

            <Text style={styles.bentoPromoText}>
              {view.vouchersLabel ? `${view.vouchersLabel} khả dụng` : '0 khả dụng'}
            </Text>
            <Text style={styles.bentoSubMuted}>Mã giảm cước vận chuyển</Text>
          </Pressable>
        </View>

        {/* 3. NHÓM VẬN CHUYỂN & ĐƠN HÀNG */}
        <View style={styles.sectionGroup}>
          <SectionHeader title="VẬN CHUYỂN & ĐƠN HÀNG" />
          <View style={styles.insetCard}>
            <MenuRow
              badge={
                view.activeOrdersLabel && view.activeOrdersLabel !== '0'
                  ? `${view.activeOrdersLabel} đang giao`
                  : undefined
              }
              icon={<IconOrders color={customerPalette.textSlateDark} size={19} />}
              iconBg={colors.neutral.surfaceMuted}
              label="Đơn hàng của tôi"
              onPress={() => router.push('/customer/orders')}
              subtitle="Xem lộ trình & lịch sử các chuyến xe"
            />
            <MenuRow
              icon={<IconLocationPin color={customerPalette.textSlateDark} size={19} />}
              iconBg={colors.neutral.surfaceMuted}
              isLast
              label="Sổ địa chỉ"
              onPress={() => router.push('/customer/addresses')}
              subtitle="Kho bãi, văn phòng và điểm lưu cố định"
            />
          </View>
        </View>

        {/* 4. NHÓM TÀI CHÍNH & DOANH NGHIỆP (B2B ECOSYSTEM) */}
        <View style={styles.sectionGroup}>
          <SectionHeader title="TÀI CHÍNH & DOANH NGHIỆP" />
          <View style={styles.insetCard}>
            <MenuRow
              icon={<IconFileText color={customerPalette.textSlateDark} size={19} />}
              iconBg={colors.neutral.surfaceMuted}
              isLast
              label="Thông tin xuất hóa đơn VAT"
              onPress={() => router.push('/customer/settings')}
              subtitle="Tự động xuất hóa đơn đỏ điện tử theo chuyến"
            />
          </View>
        </View>

        {/* 5. NHÓM HỖ TRỢ & HỆ THỐNG */}
        <View style={styles.sectionGroup}>
          <SectionHeader title="HỖ TRỢ & HỆ THỐNG" />
          <View style={styles.insetCard}>
            <MenuRow
              icon={<IconSupport247 color={colors.danger.text} size={19} />}
              iconBg={colors.danger.background}
              label="Trợ giúp & SOS"
              onPress={() => router.push('/customer/support')}
              subtitle="Hỗ trợ trực tuyến 24/7 và giải quyết sự cố"
            />
            <MenuRow
              icon={<IconSettings color={customerPalette.textSlateDark} size={19} />}
              iconBg={colors.neutral.surfaceMuted}
              isLast
              label="Cài đặt"
              onPress={() => router.push('/customer/settings')}
              subtitle="Bảo mật sinh trắc học & thông báo"
            />
          </View>
        </View>

        {/* 6. NÚT ĐĂNG XUẤT NHẸ NHÀNG (SUBTLE LOGOUT) */}
        <View style={styles.logoutSection}>
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
        </View>

        {/* ℹ️ 7. CHÂN TRANG PHIÊN BẢN (ENTERPRISE BUILD INFO) */}
        <View style={styles.footerInfoBox}>
          <Text style={styles.footerVersionText}>
            LEOPARD Logistics · Phiên bản{' '}
            <Text style={styles.footerVersionBold}>{view.appVersion}</Text> (Build 2026)
          </Text>
          <Text style={styles.footerCopyrightText}>
            Hệ thống kết nối chuỗi cung ứng vận tải hàng hóa chuyên nghiệp
          </Text>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 130,
  },
  /* HERO CARD STYLES */
  heroCard: {
    backgroundColor: leopardPalette.darkHeroBg,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    paddingBottom: 26,
    position: 'relative',
    shadowColor: leopardPalette.darkHeroBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
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
  membershipPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  membershipText: {
    color: leopardPalette.accentYellow,
    fontSize: 11,
    fontWeight: '600',
  },
  membershipRole: {
    color: leopardPalette.accentYellow,
    fontWeight: '700',
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
  statValueWhite: {
    color: customerPalette.surfaceWhite,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  statValueGold: {
    color: customerPalette.surfaceWhite,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  statValueGreen: {
    color: customerPalette.surfaceWhite,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },

  /* FLOATING BENTO WALLET */
  bentoWalletCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    marginTop: -16,
    padding: 14,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  bentoCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'space-between',
  },
  bentoAmountAction: {
    gap: 3,
    justifyContent: 'flex-end',
  },
  bentoColDivider: {
    backgroundColor: colors.neutral.surfaceMuted,
    marginHorizontal: 12,
    width: 1,
  },
  bentoHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bentoLabelWithIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  bentoIconBadge: {
    alignItems: 'center',
    borderRadius: 6,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  bentoEyebrow: {
    color: customerPalette.textSubtle,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  eyeToggleBtn: {
    padding: 2,
  },
  bentoChevron: {
    color: colors.neutral.subtleBorder,
    fontSize: 16,
    fontWeight: '600',
  },
  bentoAmountText: {
    color: customerPalette.textSlateDark,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 2,
  },
  bentoSubGreen: {
    color: customerPalette.textSubtle,
    fontSize: 11,
  },
  bentoPromoText: {
    color: customerPalette.primaryDark,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 2,
  },
  bentoSubMuted: {
    color: customerPalette.textSubtle,
    fontSize: 11,
  },

  /* GROUPED LISTS */
  sectionGroup: {
    gap: 6,
  },
  sectionHeader: {
    color: customerPalette.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  insetCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.surfaceMuted,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  menuLabel: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  menuBadgePill: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  menuBadgeText: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: customerPalette.textSubtle,
    fontSize: 12,
  },
  menuChevron: {
    color: leopardPalette.inputPlaceholder,
    fontSize: typeScale.body.fontSize,
  },

  /* LOGOUT SECTION */
  logoutSection: {
    paddingTop: 4,
  },
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  logoutBtnText: {
    color: colors.danger.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },

  /* ℹ️ FOOTER INFO */
  footerInfoBox: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  footerVersionText: {
    color: customerPalette.textSubtle,
    fontSize: 12,
  },
  footerVersionBold: {
    color: customerPalette.textSlateDark,
    fontWeight: '600',
  },
  footerCopyrightText: {
    color: leopardPalette.inputPlaceholder,
    fontSize: 11,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
