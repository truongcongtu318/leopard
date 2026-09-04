import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import {
  IconIdCard,
  IconLicense,
  IconPhone,
  IconSecurityShield,
  IconStar,
  IconUser,
} from '../../../ui/icons/CoreIcons';
import type { DriverProfileView } from './model';

export type DriverProfileScreenProps = Readonly<{
  view: DriverProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

function InfoRow({
  icon,
  label,
  value,
  badge,
  isLast = false,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: React.ReactNode;
  isLast?: boolean;
}>) {
  return (
    <View style={[styles.infoRow, isLast ? styles.infoRowLast : null]}>
      <View style={styles.infoRowIconChip}>
        {icon}
      </View>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <View style={styles.infoRowRight}>
        {value ? <Text style={styles.infoRowValue}>{value}</Text> : null}
        {badge}
      </View>
    </View>
  );
}

function MenuRow({
  isLast = false,
  label,
  onPress,
}: Readonly<{ label: string; onPress?: () => void; isLast?: boolean }>) {
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
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export function DriverProfileScreen({ onLogout, onRetry, view }: DriverProfileScreenProps) {
  const router = useRouter();

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Hồ sơ">
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

  // Mock data for the new design
  const driverName = "Nguyễn Văn A";
  const rating = "4.9";
  const vehicleInfo = "Xe tải 1 Tấn · 29H-123.45";

  return (
    <ScreenScaffold
      eyebrow="DRIVER · FIELD COCKPIT"
      headerTone="ink"
      title="Hồ sơ tài xế"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.vehicleInfo}>{vehicleInfo}</Text>
          <View style={styles.ratingRow}>
            <IconStar color={leopardPalette.accentYellow} fill={leopardPalette.accentYellow} size={14} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>1,245</Text>
            <Text style={styles.statLabel}>Chuyến xe</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rating}</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>2 năm</Text>
            <Text style={styles.statLabel}>Tham gia</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.infoListCard}>
            <InfoRow
              icon={<IconPhone color={colors.brand.softText} size={16} />}
              label="SĐT"
              value={view.phone}
            />
            <InfoRow
              icon={<IconUser color={colors.brand.softText} size={16} />}
              label="Vai trò"
              value={view.roleLabel}
            />
            <InfoRow
              icon={<IconLicense color={colors.brand.softText} size={16} />}
              label="Hạng GPLX"
              value="C"
            />
            <InfoRow
              badge={<StatusBadge domain="kyc" status="PENDING" />}
              icon={<IconSecurityShield color={colors.brand.softText} size={16} />}
              isLast
              label="KYC"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt hệ thống</Text>
          <View style={styles.menuCard}>
            <MenuRow label="Ví & rút tiền" onPress={() => router.push('/driver/wallet')} />
            <MenuRow label="Điểm hiệu suất" onPress={() => router.push('/driver/performance')} />
            <MenuRow label="Hồ sơ KYC" onPress={() => router.push('/driver/kyc')} />
            <MenuRow label="Cài đặt" onPress={() => router.push('/driver/settings')} />
            <MenuRow isLast label={`Phiên bản ứng dụng: ${view.appVersion}`} />
          </View>
        </View>
        
        <View style={styles.logoutWrapper}>
          <Button
            disabledLabel="Đăng xuất"
            isLoading={view.isLoggingOut}
            label="Đăng xuất tài khoản"
            loadingLabel="Đang đăng xuất…"
            onPress={onLogout}
            variant="destructive"
          />
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    backgroundColor: leopardPalette.canvas,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
    borderWidth: 2,
    borderColor: leopardPalette.primaryBorder,
  },
  avatarText: {
    color: leopardPalette.primaryDark,
    fontSize: 32,
    fontWeight: '800',
  },
  driverName: {
    color: leopardPalette.textSlateDark,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  vehicleInfo: {
    color: leopardPalette.textMutedSlate,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: leopardPalette.accentYellow,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: leopardPalette.textSlateDark,
  },
  statLabel: {
    fontSize: 12,
    color: leopardPalette.textMutedSlate,
    marginTop: 4,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: leopardPalette.textMutedSlate,
    marginLeft: 4,
    marginTop: 8,
  },
  infoListCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  infoRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowIconChip: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.card,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  infoRowLabel: {
    color: leopardPalette.textMutedSlate,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  infoRowRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoRowValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '600',
  },
  menuChevron: {
    color: leopardPalette.textSubtle,
    fontSize: 20,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: leopardPalette.bgMuted,
  },
  logoutWrapper: {
    marginTop: spacing.lg,
  }
});
