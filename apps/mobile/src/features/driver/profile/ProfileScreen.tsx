import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';

import { colors, leopardPalette, pastelTheme, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import type { DriverProfileView } from './model';

export type DriverProfileScreenProps = Readonly<{
  view: DriverProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatBox label="Chuyến xe" value="1,245" />
          <StatBox label="Đánh giá" value={rating} />
          <StatBox label="Tham gia" value="2 năm" />
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={[styles.infoCard, { backgroundColor: pastelTheme.blueCard.bg, borderColor: pastelTheme.blueCard.border }]}>
            <Text style={[styles.cardTitle, { color: pastelTheme.blueCard.text }]}>Liên hệ</Text>
            <Text style={[styles.cardBody, { color: pastelTheme.blueCard.text }]}>SĐT: {view.phone}</Text>
            <Text style={[styles.cardBody, { color: pastelTheme.blueCard.text }]}>Vai trò: {view.roleLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hồ sơ năng lực</Text>
          <View style={[styles.infoCard, { backgroundColor: pastelTheme.greenCard.bg, borderColor: pastelTheme.greenCard.border }]}>
            <Text style={[styles.cardTitle, { color: pastelTheme.greenCard.text }]}>Phương tiện & Bằng lái</Text>
            <Text style={[styles.cardBody, { color: pastelTheme.greenCard.text }]}>Hạng GPLX: C</Text>
            <Text style={[styles.cardBody, { color: pastelTheme.greenCard.text }]}>Trạng thái xe: Đã kiểm định</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái tài khoản</Text>
          <View style={[styles.infoCard, { backgroundColor: pastelTheme.yellowCard.bg, borderColor: pastelTheme.yellowCard.border }]}>
            <Text style={[styles.cardTitle, { color: pastelTheme.yellowCard.text }]}>Xác thực KYC (Đang chờ)</Text>
            <Text style={[styles.cardBody, { color: pastelTheme.yellowCard.text }]}>Hồ sơ của bạn đang được xem xét.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt hệ thống</Text>
          <View style={styles.menuCard}>
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
  infoCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
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
