import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import {
  IconLocationPin,
  IconOrders,
  IconSecurityShield,
  IconSettings,
  IconSupport247,
  IconTag,
  IconWallet,
} from '../../../ui/icons/CoreIcons';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
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
  onPress?: () => void;
  isLast?: boolean;
}>;

function SectionHeader({ title }: Readonly<{ title: string }>) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({
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
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export function CustomerProfileScreen({ onLogout, onRetry, view }: CustomerProfileScreenProps) {
  const router = useRouter();

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Hồ sơ">
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
      eyebrow="CUSTOMER · JOURNEY SHEET"
      stickyFooter={
        <Button
          disabledLabel="Đăng xuất"
          isLoading={view.isLoggingOut}
          label="Đăng xuất"
          loadingLabel="Đang đăng xuất…"
          onPress={onLogout}
          variant="destructive"
        />
      }
      title="Hồ sơ"
    >
      {/* 👤 1. Thẻ Thông tin Khách hàng (User Hero Card) */}
      <View style={styles.userHeroCard}>
        {view.avatarUrl ? (
          <Image source={{ uri: view.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(view.name ?? 'K').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.userInfoCol}>
          {view.name ? <Text style={styles.nameText}>{view.name}</Text> : null}
          <View style={styles.phoneRow}>
            <Text style={styles.phoneText}>{view.phone}</Text>
            <IconSecurityShield color="#0284C7" size={16} />
          </View>
          <View style={styles.metaBadgeRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>
                Vai trò: <Text style={styles.roleChipBold}>{view.roleLabel}</Text>
              </Text>
            </View>
            <StatusBadge domain="driver-availability" status="AVAILABLE" />
          </View>
        </View>
        <Pressable
          accessibilityLabel="Chỉnh sửa hồ sơ"
          accessibilityRole="button"
          onPress={() => router.push('/customer/profile-edit')}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Sửa</Text>
        </Pressable>
      </View>

      {/* ⚡ 2. Lối tắt Tài chính Nhanh (Quick Utility Strip) */}
      <View style={styles.quickUtilityRow}>
        <Pressable
          accessibilityLabel="Lối tắt Ví VietQR"
          accessibilityRole="button"
          onPress={() => router.push('/customer/wallet')}
          style={({ pressed }) => [styles.quickCard, pressed ? styles.pressed : null]}
        >
          <View style={[styles.quickIconBox, { backgroundColor: '#E0F2FE' }]}>
            <IconWallet color="#0284C7" size={20} />
          </View>
          <View style={styles.quickCardText}>
            <Text style={styles.quickTitle}>Ví VietQR</Text>
            <Text style={styles.quickSubtitle}>Số dư & Quét mã ›</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityLabel="Lối tắt Khuyến mãi"
          accessibilityRole="button"
          onPress={() => router.push('/customer/promotions')}
          style={({ pressed }) => [styles.quickCard, pressed ? styles.pressed : null]}
        >
          <View style={[styles.quickIconBox, { backgroundColor: '#FEF3C7' }]}>
            <IconTag color="#D97706" size={20} />
          </View>
          <View style={styles.quickCardText}>
            <Text style={styles.quickTitle}>Khuyến mãi</Text>
            <Text style={styles.quickSubtitle}>Ưu đãi khả dụng ›</Text>
          </View>
        </Pressable>
      </View>

      {/* 📦 3. Nhóm Tiện ích & Lộ trình (Activity & Logistics) */}
      <View style={styles.sectionGroup}>
        <SectionHeader title="VẬN CHUYỂN & ĐỊA ĐIỂM" />
        <View style={styles.insetCard}>
          <MenuRow
            icon={<IconLocationPin color="#0284C7" size={20} />}
            iconBg="#E0F2FE"
            label="Sổ địa chỉ"
            onPress={() => router.push('/customer/addresses')}
            subtitle="Địa chỉ lấy & giao hàng thường dùng"
          />
          <MenuRow
            icon={<IconOrders color="#0284C7" size={20} />}
            iconBg="#E0F2FE"
            isLast
            label="Đơn hàng của tôi"
            onPress={() => router.push('/customer/orders')}
            subtitle="Lịch sử đơn hàng và tiến trình vận chuyển"
          />
        </View>
      </View>

      {/* 💳 4. Nhóm Tài chính & Thanh toán (Finance & Payment) */}
      <View style={styles.sectionGroup}>
        <SectionHeader title="TÀI CHÍNH & THANH TOÁN" />
        <View style={styles.insetCard}>
          <MenuRow
            icon={<IconWallet color="#059669" size={20} />}
            iconBg="#D1FAE5"
            label="Ví VietQR"
            onPress={() => router.push('/customer/wallet')}
            subtitle="Quản lý số dư, hoàn tiền & mã VietQR"
          />
          <MenuRow
            icon={<IconTag color="#D97706" size={20} />}
            iconBg="#FEF3C7"
            isLast
            label="Khuyến mãi & Thanh toán"
            onPress={() => router.push('/customer/promotions')}
            subtitle="Mã giảm giá cước và phương thức liên kết"
          />
        </View>
      </View>

      {/* ⚙️ 5. Nhóm Hỗ trợ & Hệ thống (Support & Settings) */}
      <View style={styles.sectionGroup}>
        <SectionHeader title="HỖ TRỢ & HỆ THỐNG" />
        <View style={styles.insetCard}>
          <MenuRow
            icon={<IconSupport247 color="#2563EB" size={20} />}
            iconBg="#DBEAFE"
            label="Trợ giúp & SOS"
            onPress={() => router.push('/customer/support')}
            subtitle="Tổng đài CSKH 24/7 và báo cáo sự cố"
          />
          <MenuRow
            icon={<IconSettings color="#64748B" size={20} />}
            iconBg="#F1F5F9"
            isLast
            label="Cài đặt"
            onPress={() => router.push('/customer/settings')}
            subtitle="Thông báo, ngôn ngữ và tài khoản"
          />
        </View>
      </View>

      {/* ℹ️ 6. Chân trang Phiên bản (App Version Footer) */}
      <View style={styles.footerInfoBox}>
        <Text style={styles.footerVersionText}>
          Phiên bản ứng dụng: <Text style={styles.footerVersionBold}>{view.appVersion}</Text>
        </Text>
        <Text style={styles.footerCopyrightText}>LEOPARD Logistics Pilot · Hệ thống kết nối vận tải</Text>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  userHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 32,
    borderWidth: 2,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: {
    color: '#0284C7',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  nameText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  editButtonText: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
    gap: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  roleChipBold: {
    color: '#0F172A',
    fontWeight: '700',
  },
  quickUtilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  quickIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardText: {
    flex: 1,
  },
  quickTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  quickSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionGroup: {
    gap: 6,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  insetCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: 12,
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
  },
  menuLabel: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  menuChevron: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '400',
  },
  footerInfoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  footerVersionText: {
    color: '#64748B',
    fontSize: 12,
  },
  footerVersionBold: {
    color: '#334155',
    fontWeight: '600',
  },
  footerCopyrightText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  pressed: {
    opacity: 0.7,
  },
});

