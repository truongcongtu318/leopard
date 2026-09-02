import { useState } from 'react';
import { SectionList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, leopardPalette, pastelTheme, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
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

export function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>(mockNotifications);

  const displayedList = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

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

  const markAllButton = (
    <Pressable
      accessibilityLabel="Đọc tất cả thông báo"
      accessibilityRole="button"
      onPress={handleMarkAllRead}
      style={({ pressed }) => [styles.markAllBtn, pressed ? styles.pressed : null]}
    >
      <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · NOTIFICATIONS"
      headerRight={markAllButton}
      subtitle="Cập nhật trạng thái đơn hàng và tin tức hệ thống."
      title="Thông báo"
    >
      <View style={styles.container}>
        <View accessibilityRole="toolbar" style={styles.filterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === 'all' }}
            onPress={() => setFilter('all')}
            style={[styles.filterChip, filter === 'all' ? styles.filterChipActive : null]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' ? styles.filterChipTextActive : null,
              ]}
            >
              Tất cả ({notifications.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === 'unread' }}
            onPress={() => setFilter('unread')}
            style={[styles.filterChip, filter === 'unread' ? styles.filterChipActive : null]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'unread' ? styles.filterChipTextActive : null,
              ]}
            >
              Chưa đọc ({notifications.filter((n) => !n.isRead).length})
            </Text>
          </Pressable>
        </View>

        <SectionList
          contentContainerStyle={styles.listContent}
          sections={[
            { title: 'Hôm nay', data: displayedList.filter(n => !n.createdAtLabel.includes('ngày')) },
            { title: 'Trước đó', data: displayedList.filter(n => n.createdAtLabel.includes('ngày')) }
          ].filter(s => s.data.length > 0)}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không có thông báo</Text>
              <Text style={styles.emptyMessage}>
                {filter === 'unread'
                  ? 'Bạn đã đọc tất cả thông báo.'
                  : 'Chưa có thông báo nào trong hộp thư của bạn.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconSymbol =
              item.type === 'order'
                ? '📦'
                : item.type === 'payment'
                  ? '💰'
                  : item.type === 'promo'
                    ? '🎁'
                    : '📢';

            const cardTheme = item.type === 'order' ? pastelTheme.blueCard :
                              item.type === 'payment' ? pastelTheme.greenCard :
                              item.type === 'promo' ? pastelTheme.yellowCard :
                              pastelTheme.slateCard;

            return (
              <Pressable
                accessibilityLabel={item.title}
                accessibilityRole="button"
                onPress={() => handleNotificationPress(item)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: cardTheme.bg, borderColor: cardTheme.border },
                  !item.isRead ? styles.cardUnread : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>{iconSymbol}</Text>
                  </View>
                  <View style={styles.cardHeaderContent}>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>{item.createdAtLabel}</Text>
                  </View>
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
              </Pressable>
            );
          }}
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.brand.background,
  },
  filterChipText: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.neutral.background,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconText: {
    fontSize: 16,
  },
  cardHeaderContent: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeader: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '700',
  },
  cardTime: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    marginTop: 1,
  },
  unreadDot: {
    backgroundColor: leopardPalette.primaryDark,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  cardBody: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyBox: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyMessage: {
    color: colors.neutral.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllBtnText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
