import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  layout,
  leopardElevation,
  leopardPalette,
  leopardRadius,
  spacing,
  typography,
} from '../../theme/tokens';
import {
  IconOrders,
  IconSearch,
  IconSpeedTruck,
  IconTag,
  IconVehicle3Wheel,
  IconVehicleHeavyTruck,
} from '../../ui/icons/CoreIcons';

// ── Types ────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

export type CargoType = 'CEMENT_STEEL' | 'FURNITURE' | 'BA_GAC_MISC' | 'PRODUCE' | 'GENERAL';

export type DeliveryOrder = Readonly<{
  id: string;
  bookingCode: string;
  cargoType: CargoType;
  cargoLabel: string;
  origin: string;
  destination: string;
  scheduledDate: string;
  status: DeliveryStatus;
  vehicleName: string;
  weightKg: number;
  priceVnd: string;
}>;

export type FilterChip = 'ALL' | 'IN_TRANSIT' | 'LOADING';

export type MyDeliveriesScreenProps = Readonly<{
  orders: readonly DeliveryOrder[];
  onOrderPress?: (orderId: string) => void;
  onCreateOrder?: () => void;
  onViewHistory?: () => void;
}>;

/**
 * This tab shows only in-progress shipments. Delivered and cancelled orders
 * live in the "Đơn hàng" ledger tab, so they are filtered out here.
 */
const ACTIVE_STATUSES: readonly DeliveryStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'LOADING',
  'IN_TRANSIT',
  'ARRIVED',
];

function isActiveStatus(status: DeliveryStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

// ── Helpers ──────────────────────────────────────────────────────────

function CargoIcon({ type }: { type: CargoType }) {
  switch (type) {
    case 'CEMENT_STEEL':
      return <IconVehicleHeavyTruck color={leopardPalette.primaryDark} size={20} />;
    case 'FURNITURE':
      return <IconOrders color={leopardPalette.primaryDark} size={20} />;
    case 'BA_GAC_MISC':
      return <IconVehicle3Wheel color={leopardPalette.primaryDark} size={20} />;
    case 'PRODUCE':
      return <IconTag color={leopardPalette.primaryDark} size={20} />;
    case 'GENERAL':
    default:
      return <IconSpeedTruck color={leopardPalette.primaryDark} size={20} />;
  }
}

type StatusPresentation = Readonly<{
  label: string;
  bg: string;
  text: string;
  dot: string;
}>;

const STATUS_PRESENTATION: Record<DeliveryStatus, StatusPresentation> = {
  REQUESTED: { label: 'Chờ xác nhận', bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  ACCEPTED: { label: 'Đã nhận', bg: leopardPalette.primaryBg, text: '#1E40AF', dot: leopardPalette.primary },
  LOADING: { label: 'Đang bốc hàng', bg: leopardPalette.accentYellowBg, text: '#854D0E', dot: leopardPalette.accentYellow },
  IN_TRANSIT: { label: 'Đang vận chuyển', bg: leopardPalette.primaryBg, text: '#1D4ED8', dot: leopardPalette.primary },
  ARRIVED: { label: 'Đã đến', bg: leopardPalette.ecoGreenBg, text: '#166534', dot: leopardPalette.ecoGreen },
  DELIVERED: { label: 'Hoàn thành', bg: leopardPalette.ecoGreenBg, text: '#166534', dot: leopardPalette.ecoGreen },
  CANCELLED: { label: 'Đã hủy', bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

const FILTER_CHIPS: readonly { key: FilterChip; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'IN_TRANSIT', label: 'Đang chạy' },
  { key: 'LOADING', label: 'Đang bốc' },
];

function matchesFilter(status: DeliveryStatus, filter: FilterChip): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'IN_TRANSIT') return status === 'IN_TRANSIT' || status === 'ARRIVED' || status === 'ACCEPTED';
  return status === 'LOADING' || status === 'REQUESTED';
}

function getStepperProgress(status: DeliveryStatus): number {
  switch (status) {
    case 'REQUESTED':
    case 'ACCEPTED':
      return 0;
    case 'LOADING':
      return 1;
    case 'IN_TRANSIT':
    case 'ARRIVED':
      return 2;
    case 'DELIVERED':
      return 3;
    case 'CANCELLED':
      return -1;
    default:
      return 0;
  }
}

const STEPPER_LABELS = ['Đã nhận', 'Bốc hàng', 'Đang giao', 'Đã giao'];

// ── Staggered Card Component ─────────────────────────────────────────

type OrderCardProps = Readonly<{
  order: DeliveryOrder;
  index: number;
  onPress?: (orderId: string) => void;
}>;

function OrderCardComponent({ index, onPress, order }: OrderCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 350,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, index]);

  const pres = STATUS_PRESENTATION[order.status];
  const stepperProgress = getStepperProgress(order.status);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`Đơn ${order.bookingCode}, ${order.cargoLabel}, ${pres.label}`}
        accessibilityRole="button"
        onPress={() => onPress?.(order.id)}
        style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      >
        {/* Main row: cargo info + status badge */}
        <View style={styles.mainRow}>
          <View style={styles.leftCol}>
            <View style={styles.cargoIconRow}>
              <View style={styles.cargoIconBox}>
                <CargoIcon type={order.cargoType} />
              </View>
              <View style={styles.cargoMeta}>
                <Text numberOfLines={1} style={styles.cargoLabel}>
                  {order.cargoLabel}
                </Text>
                <Text style={styles.bookingCode}>{order.bookingCode}</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeDot} />
              <Text numberOfLines={1} style={styles.routeOriginText}>
                {order.origin}
              </Text>
            </View>
            <View style={styles.routeConnectorLine} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.routeDotDestination]} />
              <Text numberOfLines={1} style={styles.routeDestText}>
                {order.destination}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{order.scheduledDate}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{order.weightKg} kg</Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={[styles.statusBadge, { backgroundColor: pres.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: pres.dot }]} />
              <Text style={[styles.statusText, { color: pres.text }]}>{pres.label}</Text>
            </View>
            <Text style={styles.priceText}>{order.priceVnd}</Text>
            <Text style={styles.vehicleText}>{order.vehicleName}</Text>
          </View>
        </View>

        {/* 3-step dotted progress stepper */}
        {stepperProgress >= 0 ? (
          <View style={styles.stepperContainer}>
            {STEPPER_LABELS.map((label, i) => {
              const isCompleted = i <= stepperProgress;
              const isActive = i === stepperProgress;
              return (
                <React.Fragment key={label}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isCompleted ? styles.stepDotCompleted : null,
                        isActive ? styles.stepDotActive : null,
                      ]}
                    >
                      {isCompleted ? (
                        <Text style={styles.stepCheck}>✓</Text>
                      ) : (
                        <Text style={styles.stepNumber}>{i + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCompleted ? styles.stepLabelCompleted : null,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                  {i < STEPPER_LABELS.length - 1 ? (
                    <View
                      style={[
                        styles.stepConnector,
                        isCompleted && i < stepperProgress
                          ? styles.stepConnectorCompleted
                          : null,
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const OrderCard = React.memo(OrderCardComponent);

// ── Main Screen ──────────────────────────────────────────────────────

export function MyDeliveriesScreen({
  onCreateOrder,
  onOrderPress,
  onViewHistory,
  orders,
}: MyDeliveriesScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterChip>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Only in-progress shipments belong on this tab.
  const activeOrders = orders.filter((o) => isActiveStatus(o.status));

  const filtered = activeOrders.filter((o) => {
    if (!matchesFilter(o.status, activeFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.bookingCode.toLowerCase().includes(q) ||
        o.cargoLabel.toLowerCase().includes(q) ||
        o.origin.toLowerCase().includes(q) ||
        o.destination.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const chipCounts: Record<FilterChip, number> = {
    ALL: activeOrders.length,
    IN_TRANSIT: activeOrders.filter((o) => matchesFilter(o.status, 'IN_TRANSIT')).length,
    LOADING: activeOrders.filter((o) => matchesFilter(o.status, 'LOADING')).length,
  };

  const renderItem = useCallback(
    ({ index, item }: { index: number; item: DeliveryOrder }) => (
      <OrderCard index={index} onPress={onOrderPress} order={item} />
    ),
    [onOrderPress],
  );

  const keyExtractor = useCallback((item: DeliveryOrder) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text accessibilityRole="header" style={styles.pageTitle}>
            Đang giao
          </Text>
          {onCreateOrder ? (
            <Pressable
              accessibilityLabel="Tạo đơn hàng mới"
              accessibilityRole="button"
              onPress={onCreateOrder}
              style={({ pressed }) => [styles.newOrderBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.newOrderBtnText}>+ Tạo đơn</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <IconSearch color={leopardPalette.textMutedSlate} size={18} />
          <TextInput
            accessibilityLabel="Tìm kiếm đơn hàng"
            onChangeText={setSearchQuery}
            placeholder="Tìm mã đơn, hàng hóa, địa chỉ..."
            placeholderTextColor={leopardPalette.textMutedSlate}
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.chipRow}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.key;
            return (
              <Pressable
                accessibilityLabel={`Lọc: ${chip.label} (${chipCounts[chip.key]})`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                style={[styles.chip, isActive ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>
                  {chip.label}
                </Text>
                <View style={[styles.chipBadge, isActive ? styles.chipBadgeActive : null]}>
                  <Text
                    style={[
                      styles.chipBadgeText,
                      isActive ? styles.chipBadgeTextActive : null,
                    ]}
                  >
                    {chipCounts[chip.key]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Order List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <IconSpeedTruck color={leopardPalette.primary} size={36} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có chuyến đang giao</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? `Không tìm thấy kết quả cho "${searchQuery}"`
              : 'Các chuyến đang vận chuyển sẽ xuất hiện ở đây để bạn theo dõi.'}
          </Text>
          {!searchQuery && onViewHistory ? (
            <Pressable
              accessibilityLabel="Xem lịch sử đơn"
              accessibilityRole="button"
              onPress={onViewHistory}
              style={({ pressed }) => [styles.historyBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.historyBtnText}>Xem lịch sử đơn</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filtered}
          initialNumToRender={6}
          keyExtractor={keyExtractor}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          windowSize={5}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: leopardPalette.bgMuted,
  },
  header: {
    backgroundColor: leopardPalette.surfaceWhite,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: leopardPalette.cardBorder,
    gap: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    ...typography.pageTitle,
    color: leopardPalette.textSlateDark,
    fontSize: 22,
    fontWeight: '800',
  },
  newOrderBtn: {
    backgroundColor: leopardPalette.primary,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: leopardRadius.pill,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    paddingHorizontal: spacing.md,
    minHeight: 42,
    gap: spacing.xs,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchIcon: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  chipActive: {
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primary,
  },
  chipLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: leopardPalette.primary,
    fontWeight: '700',
  },
  chipBadge: {
    backgroundColor: leopardPalette.cardBorder,
    borderRadius: leopardRadius.pill,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipBadgeActive: {
    backgroundColor: leopardPalette.primary,
  },
  chipBadgeText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10,
    fontWeight: '800',
  },
  chipBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  cardWrapper: {},
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    gap: spacing.sm,
    ...leopardElevation.subtle,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  leftCol: {
    flex: 1,
    gap: 4,
  },
  cargoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  cargoIconBox: {
    width: 36,
    height: 36,
    borderRadius: leopardRadius.sm,
    backgroundColor: leopardPalette.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargoIcon: {
    fontSize: 18,
  },
  cargoMeta: {
    gap: 1,
  },
  cargoLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '700',
  },
  bookingCode: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: leopardPalette.primary,
  },
  routeDotDestination: {
    backgroundColor: leopardPalette.ecoGreen,
  },
  routeConnectorLine: {
    width: 2,
    height: 12,
    backgroundColor: leopardPalette.cardBorder,
    marginLeft: 7,
  },
  routeOriginText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  routeDestText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '500',
  },
  metaDot: {
    color: leopardPalette.cardBorder,
    fontSize: 10,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 90,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: leopardRadius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceText: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: leopardPalette.cardBorder,
  },
  stepItem: {
    alignItems: 'center',
    gap: 3,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: leopardPalette.bgMuted,
    borderWidth: 1.5,
    borderColor: leopardPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreen,
  },
  stepDotActive: {
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primary,
  },
  stepCheck: {
    color: leopardPalette.ecoGreen,
    fontSize: 11,
    fontWeight: '800',
  },
  stepNumber: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10,
    fontWeight: '700',
  },
  stepLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 9.5,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: leopardPalette.ecoGreen,
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: leopardPalette.cardBorder,
    marginBottom: 16,
    marginHorizontal: 2,
  },
  stepConnectorCompleted: {
    backgroundColor: leopardPalette.ecoGreen,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: layout.bottomNavClearance,
    gap: spacing.xs,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: leopardPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtext: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    textAlign: 'center',
  },
  historyBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: leopardPalette.primary,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  historyBtnText: {
    color: leopardPalette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});
