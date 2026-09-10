import { useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography, IconBell, IconOrders, IconTag, IconTxPayment, ScreenScaffold } from '@leopard/mobile-core';
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
        icon: <IconOrders color="#0B1E42" size={18} />,
        bg: '#F0F4F9',
        badgeText: 'Đơn hàng',
        badgeColor: '#0B1E42',
      };
    case 'payment':
      return {
        icon: <IconTxPayment color="#16A34A" size={18} />,
        bg: '#DCFCE7',
        badgeText: 'Thanh toán',
        badgeColor: '#16A34A',
      };
    case 'promo':
      return {
        icon: <IconTag color="#D97706" size={18} />,
        bg: '#FEF3C7',
        badgeText: 'Ưu đãi',
        badgeColor: '#D97706',
      };
    case 'system':
    default:
      return {
        icon: <IconBell color="#475569" size={18} />,
        bg: '#F1F5F9',
        badgeText: 'Hệ thống',
        badgeColor: '#475569',
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
        onPress={onMarkAllRead}
        style={({ pressed }) => [styles.markAllBtn, pressed ? styles.pressed : null]}
      >
        <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
      </Pressable>
    ) : null;

  return (
    <ScreenScaffold
      headerRight={markAllButton}
      onBack={onBack}
      subtitle="Cập nhật trạng thái đơn hàng, thanh toán và tin tức hệ thống."
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
              let countLabel = '';
              if (opt.id === 'all') {
                countLabel = ` (${items.length})`;
              } else if (opt.id === 'unread') {
                countLabel = ` (${unreadCount})`;
              } else {
                const count = items.filter((n) => n.type === opt.id).length;
                countLabel = count > 0 ? ` (${count})` : '';
              }

              return (
                <Pressable
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={opt.id}
                  onPress={() => setFilter(opt.id)}
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
                    {countLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <SectionList
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <IconBell color="#94A3B8" size={32} />
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
                  onPress={() => setFilter('all')}
                  style={styles.resetFilterBtn}
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
                accessibilityLabel={item.title}
                accessibilityRole="button"
                onPress={() => onPressItem(item)}
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
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  noticeBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm,
  },
  noticeText: {
    ...typography.body,
    color: colors.neutral.text,
  },
  markAllBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllBtnText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  filterWrap: {
    marginBottom: 2,
  },
  filterStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 2,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  sectionHeaderWrap: {
    paddingVertical: 4,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#FAFCFF',
    borderColor: '#CBD5E1',
    borderLeftColor: '#0B1E42',
    borderLeftWidth: 3.5,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardHeaderContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardMetaTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  cardTime: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  unreadDot: {
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    height: 8,
    width: 8,
    alignSelf: 'center',
  },
  cardBody: {
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 18,
    paddingLeft: 46,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  resetFilterBtnText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  loadMoreBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    marginTop: spacing.sm,
    paddingVertical: 10,
  },
  loadMoreBtnText: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
