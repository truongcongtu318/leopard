// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  colors,
  layout,
  radius,
  spacing,
  IconChevronRight,
  ScreenState,
  SkeletonCard,
} from '@leopard/mobile-core';
import { DriverBottomNavigation } from '../navigation/DriverBottomNavigation';

export type DriverEarningsScreenProps = Readonly<{
  lifetimeDeliveredVnd: number;
  availableBalanceVnd: number;
  deliveredOrderCount: number;
  totalOrderCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: (route: string) => void;
}>;

/** Scroll distance over which the large title hands off to the inline nav-bar title. */
const TITLE_COLLAPSE_DISTANCE = 44;

/**
 * Every card on this screen sits on a pale canvas that's barely lighter than
 * a muted surface — a border alone reads as washed out here. A soft shadow
 * (not zero, not heavy) is what actually separates card from page.
 */
const cardShadow = {
  shadowColor: colors.neutral.text,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverEarningsScreen({
  lifetimeDeliveredVnd,
  availableBalanceVnd,
  deliveredOrderCount,
  totalOrderCount,
  isLoading,
  isError,
  onRetry,
  onNavigate,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const completionRate = totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    }),
  ).current;

  const barTitleOpacity = scrollY.interpolate({
    inputRange: [TITLE_COLLAPSE_DISTANCE - 16, TITLE_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const barBorderOpacity = scrollY.interpolate({
    inputRange: [0, TITLE_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleNavigate = useCallback(
    (route: string) => (onNavigate ? onNavigate(route) : router.push(route as never)),
    [onNavigate, router],
  );

  // The API only reports a lifetime total today — no per-period breakdown yet.
  // These cards mirror the reference app's carousel shape without inventing
  // day/week/month numbers we don't have.
  const periodCards = [
    { key: 'today', title: 'Thu nhập hôm nay', jobs: 0, amount: 0 },
    { key: 'week', title: 'Thu nhập tuần này', jobs: 0, amount: 0 },
    { key: 'month', title: 'Thu nhập tháng này', jobs: 0, amount: 0 },
  ];

  return (
    <View style={styles.screenRoot}>
      <View style={styles.navBar} testID="driver-earnings-nav-bar">
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.navBarTitle, { opacity: barTitleOpacity }]}
        >
          <AppText numberOfLines={1} style={styles.navBarTitleText} variant="headline">
            Thu nhập
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.navBarBorder, { opacity: barBorderOpacity }]} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <AppText accessibilityRole="header" style={styles.pageTitle} variant="largeTitle">
          Thu nhập
        </AppText>

        {isLoading ? (
          <View style={styles.sectionGap}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isError ? (
          <View style={styles.boundaryBox}>
            <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
          </View>
        ) : (
          <>
            {/* Period cards: a horizontal carousel, one real value today (lifetime), rest 0 until the API reports per-period totals */}
            <ScrollView
              contentContainerStyle={styles.periodRow}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.periodScroll}
            >
              {periodCards.map((card) => (
                <View key={card.key} style={styles.periodCard} testID={`kpi-period-${card.key}`}>
                  <View style={styles.periodHeaderRow}>
                    <AppText tone="secondary" variant="callout">
                      {card.title}
                    </AppText>
                    <AppText tone="subtle" variant="footnote">
                      {card.jobs} chuyến
                    </AppText>
                  </View>
                  <AppText numeric style={styles.periodAmount} variant="title1">
                    {formatCurrency(card.amount)}
                  </AppText>
                  <Pressable
                    accessibilityLabel={`Xem chi tiết ${card.title}`}
                    accessibilityRole="button"
                    onPress={() => handleNavigate('/history')}
                  >
                    <AppText style={styles.detailLinkText} variant="footnote">
                      Xem chi tiết
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            {/* Real totals — flat rows, not another set of bordered cards */}
            <View style={styles.rowGroup} testID="kpi-net-payout">
              <Pressable
                accessibilityLabel="Tổng thu nhập trọn đời"
                onPress={() => handleNavigate('/history')}
                style={styles.row}
              >
                <View>
                  <AppText variant="body">Tổng thu nhập (trọn đời)</AppText>
                  <AppText numeric style={styles.rowValue} variant="title3">
                    {formatCurrency(lifetimeDeliveredVnd)}
                  </AppText>
                </View>
                <IconChevronRight color={colors.neutral.subtleText} size={18} />
              </Pressable>
            </View>

            <View style={styles.rowGroup} testID="kpi-completed-trips">
              <Pressable
                accessibilityLabel="Cuốc xe đã hoàn tất"
                onPress={() => handleNavigate('/history')}
                style={styles.row}
              >
                <View>
                  <AppText variant="body">Cuốc xe đã hoàn tất</AppText>
                  <AppText numeric style={styles.rowValue} variant="title3">
                    {deliveredOrderCount} cuốc xe
                  </AppText>
                </View>
                <IconChevronRight color={colors.neutral.subtleText} size={18} />
              </Pressable>

              <View style={styles.rowDivider} />

              <Pressable
                accessibilityLabel="Tỷ lệ giao thành công"
                style={styles.row}
              >
                <View>
                  <AppText variant="body">Tỷ lệ giao thành công</AppText>
                  <AppText numeric style={styles.rowValue} variant="title3">
                    {completionRate}%
                  </AppText>
                </View>
              </Pressable>
            </View>

            <View style={styles.rowGroup}>
              <Pressable
                accessibilityLabel="Số dư khả dụng để rút"
                onPress={() => handleNavigate('/wallet')}
                style={styles.row}
              >
                <View>
                  <AppText variant="body">Số dư khả dụng để rút</AppText>
                  <AppText numeric style={styles.rowValue} tone="success" variant="title3">
                    {formatCurrency(availableBalanceVnd)}
                  </AppText>
                  <AppText tone="subtle" variant="caption2">
                    Tự động cập nhật
                  </AppText>
                </View>
                <IconChevronRight color={colors.neutral.subtleText} size={18} />
              </Pressable>
            </View>
          </>
        )}
      </Animated.ScrollView>

      <DriverBottomNavigation activeTab="earnings" onNavigate={handleNavigate} />
    </View>
  );
}

const NAV_BAR_HEIGHT = 44;
const PERIOD_CARD_WIDTH = 300;

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
    justifyContent: 'center',
    zIndex: 1,
  },
  navBarTitle: {
    maxWidth: '70%',
  },
  navBarTitleText: {
    color: colors.neutral.titleText,
    textAlign: 'center',
  },
  navBarBorder: {
    backgroundColor: colors.neutral.border,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: layout.contentMaxWidth,
    paddingBottom: layout.bottomNavClearance,
    width: '100%',
  },
  pageTitle: {
    color: colors.neutral.titleText,
    paddingHorizontal: spacing.md,
  },
  sectionGap: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  boundaryBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  periodScroll: {
    flexGrow: 0,
  },
  periodRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  periodCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: PERIOD_CARD_WIDTH,
    ...cardShadow,
  },
  periodHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodAmount: {
    color: colors.neutral.titleText,
  },
  detailLinkText: {
    color: colors.brand.blue,
    fontWeight: '600',
  },

  rowGroup: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowDivider: {
    backgroundColor: colors.neutral.rowDivider,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  rowValue: {
    marginTop: spacing.xxs,
  },
});
