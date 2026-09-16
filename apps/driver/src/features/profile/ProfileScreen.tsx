import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  driverPrimitives,
  iosContinuousCurve,
  Button,
  ScreenState,
  IconChevron,
  IconClock,
  IconSecurityShield,
  IconSpeedTruck,
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

const DRIVER_AVATAR_IMG = require('../../../assets/brand/driver-avatar.png');

/* SVG Icons for Profile Header & Actions */
function BackArrowIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={color} />
    </Svg>
  );
}

function GearIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
        fill={color}
      />
    </Svg>
  );
}

function HelpIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"
        fill={color}
      />
    </Svg>
  );
}

function SparkleIcon({ size = 20, color = driverPrimitives.colors.blue500 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M9 21.5l1.5-4.5L15 15.5l-4.5-1.5L9 9.5l-1.5 4.5L3 15.5l4.5 1.5L9 21.5zm10-7l.9-2.6L22.5 11l-2.6-.9L19 7.5l-.9 2.6L15.5 11l2.6.9.9 2.6zm-2-10l.6-1.9L19.5 2l-1.9-.6L17 0l-.6 1.9L14.5 2l1.9.6.6 1.9z"
        fill={color}
      />
    </Svg>
  );
}

function ChatBubbleIcon({ size = 22, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
        fill={color}
      />
    </Svg>
  );
}

function CalendarIcon({ size = 22, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
        fill={color}
      />
    </Svg>
  );
}

function LightbulbIcon({ size = 22, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C7.8 13.16 7 11.18 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.18-.8 4.16-2.15 5.1z"
        fill={color}
      />
    </Svg>
  );
}

function DiamondIcon({ size = 22, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M19 3H5L2 9l10 12L22 9l-3-6zM9.62 8l1.5-3h1.76l1.5 3H9.62zM11 10v6.68L5.44 10H11zm2 0h5.56L13 16.68V10zm3.8-2l-1.5-3h2.64l1.5 3H16.8zM4.06 8l1.5-3h2.64l-1.5 3H4.06z"
        fill={color}
      />
    </Svg>
  );
}

function MoreDotsIcon({ size = 22, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill={color}
      />
    </Svg>
  );
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
      <View style={styles.screenContainer}>
        <View style={styles.headerBar}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
            style={styles.headerBtn}
          >
            <BackArrowIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Hồ sơ tài xế</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <View style={styles.errorBody}>
          <ScreenState
            actionLabel={view.kind === 'error' ? 'Thử lại' : undefined}
            message={view.message}
            onAction={onRetry}
            state={view.kind}
            title={view.title}
          />
        </View>
      </View>
    );
  }

  const driverName = view.name ?? 'Trần Văn Nam';

  return (
    <View style={styles.screenContainer}>
      {/* ── Single Clean Top Header (Image 5) ── */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
          style={styles.headerBtn}
        >
          <BackArrowIcon />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          Hồ sơ tài xế
        </Text>

        <View style={styles.headerRightCluster}>
          <View style={styles.gearTooltipWrap}>
            <Pressable
              accessibilityLabel="Cài đặt"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/settings')}
              style={styles.headerBtn}
            >
              <GearIcon />
            </Pressable>

            {/* Blue "Cài đặt" Speech Bubble Tooltip pointing UP to Gear */}
            <View pointerEvents="none" style={styles.gearTooltip}>
              <View style={styles.tooltipArrowUp} />
              <View style={styles.tooltipBody}>
                <Text style={styles.tooltipBodyText}>Cài đặt</Text>
              </View>
            </View>
          </View>

          <Pressable accessibilityLabel="Trợ giúp" accessibilityRole="button" hitSlop={12} style={styles.headerBtn}>
            <HelpIcon />
          </Pressable>
          <Pressable accessibilityLabel="Tính năng mới" accessibilityRole="button" hitSlop={12} style={styles.headerBtn}>
            <SparkleIcon />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. Driver Profile Card (Image 5) ── */}
        <Pressable
          accessibilityLabel={`Chỉnh sửa hồ sơ ${driverName}`}
          accessibilityRole="button"
          onPress={() => router.push('/profile-edit')}
          style={({ pressed }) => [styles.driverSummaryCard, pressed ? styles.pressed : null]}
        >
          <View style={styles.avatarWrap}>
            <Image
              resizeMode="cover"
              source={DRIVER_AVATAR_IMG}
              style={styles.avatarPhoto}
            />
          </View>

          <View style={styles.driverMeta}>
            <Text style={styles.driverFullName}>{driverName}</Text>
            <View style={styles.starRatingRow}>
              <Text style={styles.goldStar}>★</Text>
              <Text style={styles.ratingNumber}>{ratingAvg.toFixed(1)}</Text>
            </View>
          </View>

          <IconChevron color={driverPrimitives.colors.gray400} direction="right" size={18} />
        </Pressable>

        {/* ── 2. Daily Performance KPI Card ("Hàng ngày" - Image 5) ── */}
        <View style={styles.kpiContainer}>
          <Text style={styles.kpiHeading}>Hàng ngày</Text>
          <View style={styles.kpiColumns}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiPercent}>{acceptancePct.toFixed(1)}%</Text>
              <Text style={styles.kpiLabel}>Chấp nhận</Text>
            </View>
            <View style={styles.kpiColDivider} />
            <View style={styles.kpiCol}>
              <Text style={styles.kpiPercent}>{cancellationPct.toFixed(1)}%</Text>
              <Text style={styles.kpiLabel}>Huỷ bỏ</Text>
            </View>
          </View>
        </View>

        {/* ── 3. "Tài khoản của tôi" (Image 5) ── */}
        <View style={styles.myAccountSection}>
          <Text style={styles.sectionTitleText}>Tài khoản của tôi</Text>
          <View style={styles.actionGridRow}>
            {/* 1. Hộp thư đến */}
            <Pressable
              accessibilityLabel="Hộp thư đến"
              accessibilityRole="button"
              onPress={() => router.push('/chat')}
              style={styles.actionGridBtn}
            >
              <View style={styles.circleBtn}>
                <ChatBubbleIcon />
                <View style={styles.redBadgeDot} />
              </View>
              <Text style={styles.actionBtnLabel}>Hộp thư đến</Text>
            </Pressable>

            {/* 2. Lịch nhận cuốc */}
            <Pressable
              accessibilityLabel="Lịch nhận cuốc"
              accessibilityRole="button"
              onPress={() => router.push('/board')}
              style={styles.actionGridBtn}
            >
              <View style={styles.circleBtn}>
                <CalendarIcon />
              </View>
              <Text style={styles.actionBtnLabel}>Lịch nhận cuốc</Text>
            </Pressable>

            {/* 3. Khám phá */}
            <Pressable
              accessibilityLabel="Khám phá"
              accessibilityRole="button"
              onPress={() => router.push('/performance')}
              style={styles.actionGridBtn}
            >
              <View style={styles.circleBtn}>
                <LightbulbIcon />
              </View>
              <Text style={styles.actionBtnLabel}>Khám phá</Text>
            </Pressable>

            {/* 4. Thưởng */}
            <Pressable
              accessibilityLabel="Thưởng"
              accessibilityRole="button"
              onPress={() => router.push('/earnings')}
              style={styles.actionGridBtn}
            >
              <View style={styles.circleBtn}>
                <DiamondIcon />
              </View>
              <Text style={styles.actionBtnLabel}>Thưởng</Text>
            </Pressable>

            {/* 5. Xem thêm */}
            <Pressable
              accessibilityLabel="Xem thêm"
              accessibilityRole="button"
              onPress={() => router.push('/settings')}
              style={styles.actionGridBtn}
            >
              <View style={styles.circleBtn}>
                <MoreDotsIcon />
              </View>
              <Text style={styles.actionBtnLabel}>Xem thêm</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 4. Promo Card ("Chỉ có tại LEOPARD" - Image 5) ── */}
        <View style={styles.promoCardContainer}>
          <Text style={styles.sectionTitleText}>Chỉ có tại LEOPARD</Text>
          <View style={styles.promoBannerCard}>
            <View style={styles.promoTextCol}>
              <Text style={styles.promoBannerTitle}>Bảo vệ bạn mọi lúc</Text>
              <Pressable style={styles.promoPillBtn}>
                <Text style={styles.promoPillText}>Khám phá ngay →</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── 5. Guide Card ("Tìm hiểu cách thức" - Image 5) ── */}
        <View style={styles.guideCardContainer}>
          <Text style={styles.sectionTitleText}>Tìm hiểu cách thức</Text>
          <View style={styles.guideCard}>
            <View style={styles.guideIconWrap}>
              <IconSpeedTruck color={driverPrimitives.colors.green500} size={28} />
            </View>
            <View style={styles.guideTextCol}>
              <Text style={styles.guideTitle}>Cải thiện kỹ năng vận tải & an toàn</Text>
              <Pressable style={styles.guidePillBtn}>
                <Text style={styles.guidePillText}>Tìm hiểu thêm</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── 6. App Info & Logout (Bottom) ── */}
        <View style={styles.appInfoRow}>
          <Text style={styles.appVersionText}>Phiên bản: {view.appVersion}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderBottomColor: driverPrimitives.colors.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '700',
  },
  headerRightSpacer: {
    width: 40,
  },
  headerRightCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  gearTooltipWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  gearTooltip: {
    alignItems: 'center',
    position: 'absolute',
    top: 40,
    zIndex: 20,
  },
  tooltipArrowUp: {
    borderBottomColor: driverPrimitives.colors.blue500,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    height: 0,
    width: 0,
  },
  tooltipBody: {
    backgroundColor: driverPrimitives.colors.blue500,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tooltipBodyText: {
    color: driverPrimitives.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBody: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },

  scrollWrap: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
  },

  driverSummaryCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarPhoto: {
    borderColor: driverPrimitives.colors.green500,
    borderRadius: 9999,
    borderWidth: 2,
    height: 54,
    width: 54,
  },
  driverMeta: {
    flex: 1,
    gap: 4,
  },
  driverFullName: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '700',
  },
  starRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  goldStar: {
    color: driverPrimitives.colors.amber500,
    fontSize: 14,
  },
  ratingNumber: {
    color: driverPrimitives.colors.gray700,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  kpiContainer: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  kpiHeading: {
    color: driverPrimitives.colors.gray500,
    fontSize: 13,
    fontWeight: '600',
  },
  kpiColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  kpiCol: {
    alignItems: 'center',
    gap: 2,
  },
  kpiPercent: {
    color: driverPrimitives.colors.gray900,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12.5,
  },
  kpiColDivider: {
    backgroundColor: driverPrimitives.colors.gray200,
    width: 1,
  },

  myAccountSection: {
    gap: 12,
  },
  sectionTitleText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 16,
    fontWeight: '700',
  },
  actionGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionGridBtn: {
    alignItems: 'center',
    gap: 6,
    width: 62,
  },
  circleBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 9999,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  redBadgeDot: {
    backgroundColor: driverPrimitives.colors.red500,
    borderColor: driverPrimitives.colors.white,
    borderRadius: 9999,
    borderWidth: 1.5,
    height: 10,
    position: 'absolute',
    right: 2,
    top: 2,
    width: 10,
  },
  actionBtnLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  promoCardContainer: {
    gap: 10,
  },
  promoBannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    overflow: 'hidden',
    padding: 18,
    ...driverPrimitives.shadows.sm,
  },
  promoTextCol: {
    gap: 10,
  },
  promoBannerTitle: {
    color: driverPrimitives.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  promoPillBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoPillText: {
    color: driverPrimitives.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  guideCardContainer: {
    gap: 10,
  },
  guideCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  guideIconWrap: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.green50,
    borderRadius: 9999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  guideTextCol: {
    flex: 1,
    gap: 6,
  },
  guideTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  guidePillBtn: {
    alignSelf: 'flex-start',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  guidePillText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11.5,
    fontWeight: '600',
  },

  appInfoRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  appVersionText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
  },
  logoutWrapper: {
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
