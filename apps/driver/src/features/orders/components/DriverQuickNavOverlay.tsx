import React, { useContext, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  AppText,
  NavigableMetricCard,
  colors,
  driverPrimitives,
  driverSemantics,
  iosContinuousCurve,
} from '@leopard/mobile-core';

export type DriverQuickNavOverlayProps = Readonly<{
  driverName?: string | null;
  rating?: string | number;
  isOnline?: boolean;
  earningsTodayLabel?: string;
  bonusCount?: number;
  walletBalanceLabel?: string;
  onNavigate?: (route: string) => void;
}>;

function BarChartIcon({ size = 18, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M5 9.5a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0V9.5zm5.5-4a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0V5.5zm5.5 7a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-3 0v-5.5z"
        fill={color}
      />
    </Svg>
  );
}

function CloseCrossIcon({ size = 18, color = '#1E293B' }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
        fill={color}
      />
    </Svg>
  );
}

// Local avatar asset extracted from Grab driver reference
const DRIVER_AVATAR_IMG = require('../../../../assets/brand/driver-avatar.png');

export function DriverQuickNavOverlay({
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
              <BarChartIcon color={driverPrimitives.colors.gray900} size={18} />
            </View>
            <AppText style={styles.earningsCapsuleText} variant="footnote">
              Thu nhập
            </AppText>
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
              source={DRIVER_AVATAR_IMG}
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
              <CloseCrossIcon color="#1E293B" size={18} />
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
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 30,
  },
  earningsCapsule: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 9999,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    paddingHorizontal: 16,
    ...driverPrimitives.shadows.md,
  },
  hiddenPillPlaceholder: {
    height: 42,
    width: 120,
  },
  chartIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsCapsuleText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15,
    fontWeight: '700',
  },
  avatarGroup: {
    alignItems: 'center',
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 9999,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  avatarPhoto: {
    backgroundColor: colors.neutral.border,
    borderColor: driverPrimitives.colors.green500,
    borderRadius: 9999,
    borderWidth: 2,
    height: 48,
    width: 48,
  },
  statusDot: {
    borderColor: driverPrimitives.colors.white,
    borderRadius: 9999,
    borderWidth: 2,
    height: 13,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 13,
    zIndex: 2,
  },
  ratingPillOverlay: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 9999,
    borderWidth: 1,
    bottom: -6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    position: 'absolute',
    zIndex: 3,
    ...driverPrimitives.shadows.sm,
  },
  starGlyph: {
    color: driverPrimitives.colors.amber500,
    fontSize: 11,
  },
  ratingText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 11.5,
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
    left: 16,
    position: 'absolute',
    width: 175,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: 9999,
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
    width: 44,
    ...driverPrimitives.shadows.md,
  },
  popoverCardStack: {
    gap: 8,
  },
  popoverCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 14,
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
    fontSize: 13,
    fontWeight: '400',
  },
  cardValue: {
    color: colors.neutral.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
