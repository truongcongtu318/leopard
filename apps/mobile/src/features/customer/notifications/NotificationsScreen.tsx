import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import {
  IconBell,
  IconOrders,
  IconTag,
  IconTxPayment,
} from '../../../ui/icons/CoreIcons';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

export type NotificationItem = Readonly<{
  id: string;
  type: 'order' | 'payment' | 'promo' | 'system';
  title: string;
  body: string;
  createdAtLabel: string;
  isRead: boolean;
  orderId?: string;
}>;

const mockNotifications: readonly NotificationItem[] = [
  {
    id: 'n-001',
    type: 'order',
    title: 'Tài xế đang giao hàng',
    body: 'Đơn hàng LP-D-260815-001 đang trên đường đến điểm giao.',
    createdAtLabel: '5 phút trước',
    isRead: false,
    orderId: 'ord-001',
  },
  {
    id: 'n-002',
    type: 'payment',
    title: 'Thanh toán thành công',
    body: 'Giao dịch 150.000 ₫ cho đơn LP-D-260815-001 đã được xác nhận qua VietQR.',
    createdAtLabel: '30 phút trước',
    isRead: false,
    orderId: 'ord-001',
  },
  {
    id: 'n-003',
    type: 'promo',
    title: 'Ưu đãi 20% cước xe tải',
    body: 'Nhập mã LEOPARD20 để được giảm giá cho chuyến hàng liên tỉnh.',
    createdAtLabel: '2 giờ trước',
    isRead: true,
  },
  {
    id: 'n-004',
    type: 'system',
    title: 'Bảo trì hệ thống định kỳ',
    body: 'Hệ thống sẽ bảo trì nhẹ từ 02:00 đến 03:00 ngày 25/08.',
    createdAtLabel: '1 ngày trước',
    isRead: true,
  },
];

export type NotificationFilter = 'all' | 'unread' | 'order' | 'payment' | 'promo' | 'system';

const filterOptions: readonly Readonly<{ id: NotificationFilter; label: string }>[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'order', label: 'Đơn hàng' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'promo', label: 'Ưu đãi' },
  { id: 'system', label: 'Hệ thống' },
];

export function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const displayedList = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
    );
    if (item.orderId) {
      router.push(`/customer/orders/${item.orderId}`);
    }
  };

  const getItemMeta = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return {
          icon: <IconOrders color="#0284C7" size={18} />,
          bg: '#E0F2FE',
          badgeText: 'Đơn hàng',
          badgeColor: '#0284C7',
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
  };

  const markAllButton = unreadCount > 0 ? (
    <Pressable
      accessibilityLabel="Đọc tất cả thông báo"
      accessibilityRole="button"
      onPress={handleMarkAllRead}
      style={({ pressed }) => [styles.markAllBtn, pressed ? styles.pressed : null]}
    >
      <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
    </Pressable>
  ) : null;

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · NOTIFICATIONS"
      headerRight={markAllButton}
      subtitle="Cập nhật trạng thái đơn hàng, thanh toán và tin tức hệ thống."
      title="Thông báo"
    >
      <View style={styles.container}>
        {/* 🏷️ 1. Thanh Chip Lọc Phân Loại (Topic Filter Toolbar) */}
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
                countLabel = ` (${notifications.length})`;
              } else if (opt.id === 'unread') {
                countLabel = unreadCount > 0 ? ` (${unreadCount})` : ' (0)';
              } else {
                const count = notifications.filter((n) => n.type === opt.id).length;
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

        {/* 📜 2. Danh Sách Thông Báo Phân Nhóm Thời Gian (SectionList) */}
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
          renderItem={({ item }) => {
            const meta = getItemMeta(item.type);

            return (
              <Pressable
                accessibilityLabel={item.title}
                accessibilityRole="button"
                onPress={() => handleNotificationPress(item)}
                style={({ pressed }) => [
                  styles.card,
                  !item.isRead ? styles.cardUnread : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.cardHeader}>
                  {/* Hộp Vector Icon Phân Loại Chuẩn 100% */}
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

                  {/* Chấm Xanh Chỉ Báo Chưa Đọc */}
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
              data: displayedList.filter((n) => !n.createdAtLabel.includes('ngày')),
            },
            {
              title: 'Trước đó',
              data: displayedList.filter((n) => n.createdAtLabel.includes('ngày')),
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
  // Header Action
  markAllBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },

  // 1. Topic Filter Toolbar
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

  // 2. Notification Card List
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
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
    borderColor: '#BAE6FD',
    borderLeftColor: '#0284C7',
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
    backgroundColor: '#0284C7',
    borderRadius: 4,
    height: 8,
    width: 8,
    alignSelf: 'center',
  },
  cardBody: {
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 18,
    paddingLeft: 46, // Indent aligned with title
  },

  // Empty State
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
});
