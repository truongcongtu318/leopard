import React, { useContext, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  AppText,
  IconClose,
  NavigableMetricCard,
  colors,
  driverPrimitives,
  iconSize,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type DriverQuickNavOverlayProps = Readonly<{
  avatarUrl?: string | null;
  driverName?: string | null;
  rating?: string | number;
  isOnline?: boolean;
  earningsTodayLabel?: string;
  bonusCount?: number;
  walletBalanceLabel?: string;
  onNavigate?: (route: string) => void;
}>;

function BarChartIcon({ size = iconSize.md, color = colors.brand.primary }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M5 9.5a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0V9.5zm5.5-4a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0V5.5zm5.5 7a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0v-5.5z"
        fill={color}
      />
    </Svg>
  );
}

// Local avatar asset extracted from Grab driver reference
const DRIVER_AVATAR_IMG = require('../../../../assets/brand/driver-avatar.png');

export function DriverQuickNavOverlay({
  avatarUrl,
  driverName,
  earningsTodayLabel = 'đ 0',
  isOnline = false,
  onNavigate,
  rating = '5.00',
  walletBalanceLabel = 'đ 0',
}: DriverQuickNavOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useContext(SafeAreaInsetsContext);
  // Safe clearance below phone status bar / notch
  const topOffset = Math.max(insets?.top ?? 0, 16) + 12;
  const avatarSource = avatarUrl ? { uri: avatarUrl } : DRIVER_AVATAR_IMG;

  return (
    <>
      {/* ── Top HUD Layer (Image 1 & Image 2) ── */}
      <View pointerEvents="box-none" style={[styles.topLayer, { top: topOffset }]}>
        {/* Left: "Thu nhập" capsule - HIDDEN when popup is open so it does not collide with ✕ */}
        {!isOpen ? (
          <Pressable
            accessibilityLabel="Mở menu nhanh Thu nhập, Thưởng, Ví"
            accessibilityRole="button"
            onPress={() => setIsOpen(true)}
            style={({ pressed }) => [styles.earningsCapsule, pressed ? styles.pressed : null]}
            testID="driver-quick-nav-pill"
          >
            <View style={styles.chartIconWrap}>
              <BarChartIcon color={colors.brand.primary} size={iconSize.md} />
            </View>
            <Text style={styles.earningsCapsuleText}>Thu nhập</Text>
          </Pressable>
        ) : (
          <View style={styles.hiddenPillPlaceholder} />
        )}

        {/* Right: Driver Avatar with overlay rating pill (Image 2) */}
        <View style={styles.avatarGroup}>
          <Pressable
            accessibilityLabel={`Hồ sơ tài xế ${driverName || ''}`}
            accessibilityRole="button"
            onPress={() => onNavigate?.('/profile')}
            style={({ pressed }) => [styles.avatarButton, pressed ? styles.pressed : null]}
            testID="driver-quick-nav-avatar"
          >
            {/* Real driver portrait image */}
            <Image
              resizeMode="cover"
              source={avatarSource}
              style={styles.avatarPhoto}
            />

            {/* Status dot (Red when offline, Green when online) */}
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? driverPrimitives.colors.green500
                    : driverPrimitives.colors.red500,
                },
              ]}
            />

            {/* Rating Pill (★ 5.00) overlapping bottom center */}
            <View style={styles.ratingPillOverlay}>
              <Text style={styles.starGlyph}>★</Text>
              <Text style={styles.ratingText}>{typeof rating === 'number' ? rating.toFixed(2) : rating}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Popover Modal (Exact Grab Driver Overlay Image 1) ── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable onPress={() => setIsOpen(false)} style={styles.scrim}>
          <View style={[styles.popoverContainer, { top: topOffset }]}>
            {/* Circular Close Button at top left */}
            <Pressable
              accessibilityLabel="Đóng menu thu nhập"
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressed : null]}
              testID="driver-quick-nav-close"
            >
              <IconClose color="#1E293B" size={iconSize.md} />
            </Pressable>

            {/* Stacked 2 Cards: Thu nhập, Ví tài khoản (dùng chung NavigableMetricCard) */}
            <View style={styles.popoverCardStack}>
              <NavigableMetricCard
                onPress={() => {
                  setIsOpen(false);
                  onNavigate?.('/earnings');
                }}
                title="Thu nhập"
                value={earningsTodayLabel}
              />
              <NavigableMetricCard
                onPress={() => {
                  setIsOpen(false);
                  onNavigate?.('/wallet');
                }}
                title="Ví tài khoản"
                value={walletBalanceLabel}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topLayer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 30,
  },
  earningsCapsule: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 48,
    paddingHorizontal: 18,
    ...driverPrimitives.shadows.md,
  },
  hiddenPillPlaceholder: {
    height: 48,
    width: 130,
  },
  chartIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsCapsuleText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  avatarGroup: {
    alignItems: 'center',
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    position: 'relative',
    width: 56,
  },
  avatarPhoto: {
    backgroundColor: colors.neutral.border,
    borderColor: colors.brand.primary,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 52,
    width: 52,
  },
  statusDot: {
    borderColor: driverPrimitives.colors.white,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    height: 15,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 15,
    zIndex: 2,
  },
  ratingPillOverlay: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: -8,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    zIndex: 3,
    ...driverPrimitives.shadows.sm,
  },
  starGlyph: {
    color: driverPrimitives.colors.amber500,
    fontSize: 12,
  },
  ratingText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
  },
  popoverContainer: {
    left: spacing.md,
    position: 'absolute',
    width: 180,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 48,
    ...driverPrimitives.shadows.md,
  },
  popoverCardStack: {
    gap: spacing.xs,
  },
  popoverCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...driverPrimitives.shadows.md,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
  },
  cardValue: {
    color: colors.neutral.text,
    ...typeScale.title2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
