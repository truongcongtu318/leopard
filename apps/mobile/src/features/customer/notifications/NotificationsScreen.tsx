import { useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  control,
  customerPalette,
  haptic,
  hitSlop,
  iosContinuousCurve,
  layout,
  leopardElevation,
  leopardPalette,
  radius,
  spacing,
  typeScale,
  IconBell,
  IconOrders,
  IconTag,
  IconTxPayment,
  ScreenScaffold,
} from '@leopard/mobile-core';
import { isOlderThanOneDay } from './adapter';
import type { NotificationFilter, NotificationItemView, NotificationsContentView } from './model';

export type NotificationsScreenProps = Readonly<{
  view: NotificationsContentView;
  onBack: () => void;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onPressItem: (item: NotificationItemView) => void;
}>;

const filterOptions: readonly Readonly<{ id: NotificationFilter; label: string }>[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'order', label: 'Đơn hàng' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'promo', label: 'Ưu đãi' },
  { id: 'system', label: 'Hệ thống' },
];

function getItemMeta(type: NotificationItemView['type']) {
  switch (type) {
    case 'order':
      return {
        icon: <IconOrders color={customerPalette.primary} size={18} />,
        bg: colors.neutral.surfaceMuted,
        badgeText: 'Đơn hàng',
        badgeColor: customerPalette.primary,
      };
    case 'payment':
      return {
        icon: <IconTxPayment color={colors.brand.green} size={18} />,
        bg: colors.success.background,
        badgeText: 'Thanh toán',
        badgeColor: colors.brand.green,
      };
    case 'promo':
      return {
        icon: <IconTag color={colors.warning.text} size={18} />,
        bg: colors.warning.background,
        badgeText: 'Ưu đãi',
        badgeColor: colors.warning.text,
      };
    case 'system':
    default:
      return {
        icon: <IconBell color={colors.neutral.mutedText} size={18} />,
        bg: colors.neutral.surfaceMuted,
        badgeText: 'Hệ thống',
        badgeColor: colors.neutral.mutedText,
      };
  }
}

export function NotificationsScreen({
  view,
  onBack,
  onLoadMore,
  onMarkAllRead,
  onPressItem,
}: NotificationsScreenProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const { items, unreadCount, canLoadMore, isLoadingMore, notice } = view;

  const displayedList = items.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const markAllButton =
    unreadCount > 0 ? (
      <Pressable
        accessibilityLabel="Đọc tất cả thông báo"
        accessibilityRole="button"
        hitSlop={hitSlop(32, control.minimumTouchHeight)}
        onPress={() => {
          haptic.selection();
          onMarkAllRead();
        }}
        style={({ pressed }) => [styles.markAllBtn, pressed ? styles.pressed : null]}
      >
        <Text numberOfLines={1} style={styles.markAllBtnText}>
          Đọc tất cả
        </Text>
      </Pressable>
    ) : null;

  return (
    <ScreenScaffold
      headerRight={markAllButton}
      onBack={onBack}
      title="Thông báo"
    >
      <View style={styles.container}>
        {notice ? (
          <View accessibilityLiveRegion="polite" style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.filterWrap}>
          <ScrollView
            accessibilityLabel="Thanh lọc danh mục thông báo"
            contentContainerStyle={styles.filterStrip}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {filterOptions.map((opt) => {
              const active = filter === opt.id;
              let count = 0;
              if (opt.id === 'all') {
                count = items.length;
              } else if (opt.id === 'unread') {
                count = unreadCount;
              } else {
                count = items.filter((n) => n.type === opt.id).length;
              }

              return (
                <Pressable
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={opt.id}
                  onPress={() => {
                    haptic.selection();
                    setFilter(opt.id);
                  }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {count > 0 ? (
                    <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                      <Text
                        style={[
                          styles.filterBadgeText,
                          active && styles.filterBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <SectionList
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <IconBell color={colors.neutral.subtleText} size={32} />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
              <Text style={styles.emptyMessage}>
                {filter === 'unread'
                  ? 'Tuyệt vời! Bạn đã đọc tất cả thông báo trong hộp thư.'
                  : 'Chưa có thông báo nào phù hợp với bộ lọc hiện tại.'}
              </Text>
              {filter !== 'all' ? (
                <Pressable
                  accessibilityLabel="Xem tất cả thông báo"
                  accessibilityRole="button"
                  hitSlop={hitSlop(36, control.minimumTouchHeight)}
                  onPress={() => setFilter('all')}
                  style={({ pressed }) => [
                    styles.resetFilterBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.resetFilterBtnText}>Xem tất cả thông báo</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            canLoadMore ? (
              <Pressable
                accessibilityLabel="Tải thêm thông báo"
                accessibilityRole="button"
                accessibilityState={{ busy: isLoadingMore }}
                disabled={isLoadingMore}
                onPress={onLoadMore}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.loadMoreBtnText}>
                  {isLoadingMore ? 'Đang tải…' : 'Tải thêm thông báo'}
                </Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const meta = getItemMeta(item.type);

            return (
              <Pressable
                accessibilityHint={`${item.isRead ? '' : 'Chưa đọc. '}${item.body}. ${item.createdAtLabel}`}
                accessibilityLabel={item.title}
                accessibilityRole="button"
                onPress={() => {
                  haptic.light();
                  onPressItem(item);
                }}
                style={({ pressed }) => [
                  styles.card,
                  !item.isRead ? styles.cardUnread : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                    {meta.icon}
                  </View>

                  <View style={styles.cardHeaderContent}>
                    <View style={styles.cardMetaTopRow}>
                      <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: meta.badgeColor }]}>
                          {meta.badgeText}
                        </Text>
                      </View>
                      <Text style={styles.cardTime}>{item.createdAtLabel}</Text>
                    </View>

                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {item.title}
                    </Text>
                  </View>

                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>

                <Text style={styles.cardBody}>{item.body}</Text>
              </Pressable>
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
          sections={[
            {
              title: 'Hôm nay',
              data: displayedList.filter((n) => !isOlderThanOneDay(n.createdAt)),
            },
            {
              title: 'Trước đó',
              data: displayedList.filter((n) => isOlderThanOneDay(n.createdAt)),
            },
          ].filter((s) => s.data.length > 0)}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  noticeBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: spacing.sm,
  },
  noticeText: {
    ...typeScale.body,
    color: colors.neutral.text,
  },
  markAllBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    minHeight: control.minimumTouchHeight,
  },
  markAllBtnText: {
    color: customerPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  filterWrap: {
    marginBottom: spacing.hairline,
  },
  filterStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
  },
  filterChipText: {
    ...typeScale.footnote,
    color: colors.neutral.subtleText,
  },
  filterChipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    marginLeft: spacing.xs,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.neutral.mutedText,
  },
  filterBadgeTextActive: {
    color: customerPalette.surfaceWhite,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance + spacing.md,
  },
  sectionHeaderWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.hairline,
  },
  sectionHeader: {
    color: colors.neutral.subtleText,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  card: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...leopardElevation.subtle,
  },
  cardUnread: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.primaryBorder,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardHeaderContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing.hairline,
  },
  cardMetaTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  typeBadge: {
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  typeBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
  },
  cardTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  cardTime: {
    color: customerPalette.offlineGray,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
  },
  unreadDot: {
    backgroundColor: leopardPalette.accentYellow,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
    alignSelf: 'center',
  },
  cardBody: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    lineHeight: 18,
    paddingLeft: 48,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    ...leopardElevation.subtle,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xxs,
    width: 56,
  },
  emptyTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.neutral.subtleText,
    ...typeScale.footnote,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: colors.neutral.surfaceMuted,
    minHeight: control.minimumTouchHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    marginTop: spacing.sm,
    minHeight: control.minimumTouchHeight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  loadMoreBtnText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
  },
});
