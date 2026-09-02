import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, pastelTheme, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import type { CustomerProfileView } from './model';

export type CustomerProfileScreenProps = Readonly<{
  view: CustomerProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

function InfoRow({
  isLast = false,
  label,
  value,
}: Readonly<{ label: string; value: string; isLast?: boolean }>) {
  return (
    <View style={[styles.infoRow, isLast ? styles.infoRowLast : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
      <View style={styles.avatarCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>C</Text>
        </View>
        <Text style={styles.phoneText}>{view.phone}</Text>
        <StatusBadge domain="driver-availability" status="AVAILABLE" />
      </View>

      <View style={styles.card}>
        <InfoRow label="Vai trò" value={view.roleLabel} />
        <InfoRow isLast label="Phiên bản ứng dụng" value={view.appVersion} />
      </View>

      <View style={[styles.menuCard, styles.addressCard]}>
        <MenuRow isLast label="Sổ địa chỉ" onPress={() => router.push('/customer/addresses')} />
      </View>

      <View style={[styles.menuCard, styles.paymentCard]}>
        <MenuRow label="Ví VietQR" onPress={() => router.push('/customer/wallet')} />
        <MenuRow isLast label="Khuyến mãi & Thanh toán" onPress={() => router.push('/customer/promotions')} />
      </View>

      <View style={styles.menuCard}>
        <MenuRow label="Trợ giúp & SOS" onPress={() => router.push('/customer/support')} />
        <MenuRow isLast label="Cài đặt" onPress={() => router.push('/customer/settings')} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  avatarCard: {
    alignItems: 'center',
    backgroundColor: pastelTheme.blueCard.bg,
    borderColor: pastelTheme.blueCard.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    textAlign: 'center',
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: radius.control,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: leopardPalette.primaryDark,
    fontSize: 26,
    fontWeight: '800',
  },
  phoneText: {
    color: pastelTheme.blueCard.text,
    fontSize: 17,
    fontWeight: '700',
  },
  card: {
    backgroundColor: pastelTheme.blueCard.bg,
    borderColor: pastelTheme.blueCard.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  addressCard: {
    backgroundColor: pastelTheme.slateCard.bg,
    borderColor: pastelTheme.slateCard.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  paymentCard: {
    backgroundColor: pastelTheme.greenCard.bg,
    borderColor: pastelTheme.greenCard.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  infoRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
  },
  infoValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 4,
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '600',
  },
  menuChevron: {
    color: leopardPalette.textSubtle,
    fontSize: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});

