import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  colors,
  radius,
  spacing,
  IconChevronRight,
  IconClose,
  IconEarnings,
  IconOrders,
  IconUser,
  IconWallet,
} from '@leopard/mobile-core';

export type DriverQuickNavOverlayProps = Readonly<{
  driverName?: string | null;
  onNavigate?: (route: string) => void;
}>;

const MENU_ITEMS = [
  { key: 'earnings', label: 'Thu nhập', route: '/earnings', icon: IconEarnings },
  { key: 'board', label: 'Đơn', route: '/board', icon: IconOrders },
  { key: 'wallet', label: 'Ví', route: '/wallet', icon: IconWallet },
] as const;

/**
 * Grab's own driver Home has no persistent bottom tab bar — a floating pill
 * opens an overlay menu instead, so the map keeps the full viewport. Applied
 * here only to Home; other screens keep the standard tab bar until we have a
 * matching reference for them.
 */
export function DriverQuickNavOverlay({ driverName, onNavigate }: DriverQuickNavOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initial = driverName?.trim()?.[0]?.toUpperCase();

  return (
    <>
      <View pointerEvents="box-none" style={styles.topLayer}>
        <Pressable
          accessibilityLabel="Mở menu Thu nhập, Đơn, Ví"
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
          testID="driver-quick-nav-pill"
        >
          <IconEarnings color={colors.brand.primary} size={18} />
          <AppText style={styles.pillText} variant="footnote">
            Thu nhập
          </AppText>
        </Pressable>

        <Pressable
          accessibilityLabel="Mở hồ sơ"
          accessibilityRole="button"
          onPress={() => onNavigate?.('/profile')}
          style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
          testID="driver-quick-nav-avatar"
        >
          {initial ? (
            <AppText style={styles.avatarInitial} variant="callout">
              {initial}
            </AppText>
          ) : (
            <IconUser color={colors.brand.primary} size={20} />
          )}
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setIsOpen(false)} transparent visible={isOpen}>
        <Pressable onPress={() => setIsOpen(false)} style={styles.scrim}>
          <View style={styles.menuLayer}>
            <Pressable
              accessibilityLabel="Đóng menu"
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              style={styles.closeBtn}
              testID="driver-quick-nav-close"
            >
              <IconClose color={colors.neutral.titleText} size={18} />
            </Pressable>

            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  key={item.key}
                  onPress={() => {
                    setIsOpen(false);
                    onNavigate?.(item.route);
                  }}
                  style={({ pressed }) => [styles.menuCard, pressed ? styles.pressed : null]}
                >
                  <item.icon color={colors.brand.primary} size={20} />
                  <AppText style={styles.menuLabel} variant="body">
                    {item.label}
                  </AppText>
                  <IconChevronRight color={colors.neutral.subtleText} size={18} />
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const cardShadow = {
  shadowColor: colors.neutral.text,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  topLayer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 30,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 44,
    paddingHorizontal: spacing.md,
    ...cardShadow,
  },
  pillText: {
    color: colors.neutral.titleText,
    fontWeight: '700',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...cardShadow,
  },
  avatarInitial: {
    color: colors.brand.primary,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  scrim: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
  },
  menuLayer: {
    left: 16,
    position: 'absolute',
    top: 16,
    width: 260,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 44,
    ...cardShadow,
  },
  menuList: {
    gap: spacing.sm,
  },
  menuCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
  },
  menuLabel: {
    color: colors.neutral.titleText,
    flex: 1,
    fontWeight: '700',
  },
});
