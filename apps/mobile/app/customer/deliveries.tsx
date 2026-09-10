import { useState, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  colors,
  spacing,
  IconChevronLeft,
  IconClose,
  IconLocationPin,
  IconMessage,
  IconRoleDriver,
  IconSearch,
  IconSpeedTruck,
  IconStar,
  ScreenScaffold,
} from '@leopard/mobile-core';

export type DeliveryItem = Readonly<{
  id: string;
  bookingCode: string;
  status: 'IN_TRANSIT' | 'DELIVERED';
  statusLabel: string;
  driverName: string;
  driverPlate: string;
  driverRating: number;
  driverPhone: string;
  origin: string;
  destination: string;
  etaLabel: string;
  distanceRemainingKm: number;
  cargoLabel: string;
  weightKg: number;
  priceVnd: string;
}>;

const INITIAL_DELIVERIES: readonly DeliveryItem[] = [
  {
    id: 'LP-D-260815-001',
    bookingCode: '#LP-260815-001',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang giao',
    driverName: 'Nguyễn Văn Hùng',
    driverPlate: '59C-882.14',
    driverRating: 4.98,
    driverPhone: '0901234567',
    origin: 'Kho VLXD Tân Bình, 142 Tây Thạnh, Tân Phú',
    destination: 'Công trình Landmark 81, P.22, Bình Thạnh',
    etaLabel: '14 phút',
    distanceRemainingKm: 3.8,
    cargoLabel: 'Xi măng Hà Tiên',
    weightKg: 2500,
    priceVnd: '850.000 ₫',
  },
  {
    id: 'LP-D-260815-002',
    bookingCode: '#LP-260815-002',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang giao',
    driverName: 'Trần Minh Quân',
    driverPlate: '59D-334.82',
    driverRating: 4.92,
    driverPhone: '0907654321',
    origin: 'Kho Tổng Sóng Thần, Dĩ An, Bình Dương',
    destination: 'Showroom Lê Lợi, P. Bến Nghé, Quận 1',
    etaLabel: '28 phút',
    distanceRemainingKm: 11.2,
    cargoLabel: 'Linh kiện điện tử cao cấp',
    weightKg: 420,
    priceVnd: '480.000 ₫',
  },
  {
    id: 'LP-D-260815-003',
    bookingCode: '#LP-260815-003',
    status: 'DELIVERED',
    statusLabel: 'Đã giao',
    driverName: 'Lê Hoàng Phúc',
    driverPlate: '50H-192.65',
    driverRating: 5.0,
    driverPhone: '0909998877',
    origin: 'Cảng Cát Lái, P. Cát Lái, TP. Thủ Đức',
    destination: 'Kho Tân Tạo, KCN Tân Tạo, Bình Tân',
    etaLabel: 'Đã hoàn tất',
    distanceRemainingKm: 0,
    cargoLabel: 'Vải sợi may mặc xuất khẩu',
    weightKg: 1200,
    priceVnd: '650.000 ₫',
  },
];

type FilterTab = 'ALL' | 'IN_TRANSIT' | 'DELIVERED';

export default function CustomerDeliveriesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeliveries = useMemo(() => {
    return INITIAL_DELIVERIES.filter((item) => {
      if (activeTab === 'IN_TRANSIT' && item.status !== 'IN_TRANSIT') return false;
      if (activeTab === 'DELIVERED' && item.status !== 'DELIVERED') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchCode = item.bookingCode.toLowerCase().includes(query);
        const matchPlate = item.driverPlate.toLowerCase().includes(query);
        const matchDriver = item.driverName.toLowerCase().includes(query);
        const matchOrigin = item.origin.toLowerCase().includes(query);
        const matchDest = item.destination.toLowerCase().includes(query);
        return matchCode || matchPlate || matchDriver || matchOrigin || matchDest;
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  return (
    <ScreenScaffold
      eyebrow="ĐIỀU PHỐI VẬN HÀNH"
      onBack={() => router.back()}
      subtitle="Bảng điều phối và giám sát lộ trình kiện hàng thời gian thực."
      title="Bảng điều phối chuyến xe"
    >
      <View style={styles.container}>
        {/* ── Search Input (>= 44px) ───────────────────────── */}
        <View style={styles.searchBar}>
          <IconSearch color="#64748B" size={18} strokeWidth={2} />
          <TextInput
            accessibilityLabel="Tìm kiếm chuyến xe"
            onChangeText={setSearchQuery}
            placeholder="Tìm theo mã đơn, biển số, điểm giao..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery ? (
            <Pressable
              accessibilityLabel="Xóa tìm kiếm"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <IconClose color="#64748B" size={16} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Status Filter Pills (>= 44px touch targets) ──── */}
        <View style={styles.filterTabsRow}>
          <Pressable
            accessibilityLabel="Tất cả chuyến xe"
            accessibilityRole="button"
            onPress={() => setActiveTab('ALL')}
            style={[styles.filterPill, activeTab === 'ALL' ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterPillText, activeTab === 'ALL' ? styles.filterPillTextActive : null]}>
              Tất cả
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Chuyến đang giao"
            accessibilityRole="button"
            onPress={() => setActiveTab('IN_TRANSIT')}
            style={[styles.filterPill, activeTab === 'IN_TRANSIT' ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterPillText, activeTab === 'IN_TRANSIT' ? styles.filterPillTextActive : null]}>
              Đang giao
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Chuyến đã giao"
            accessibilityRole="button"
            onPress={() => setActiveTab('DELIVERED')}
            style={[styles.filterPill, activeTab === 'DELIVERED' ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterPillText, activeTab === 'DELIVERED' ? styles.filterPillTextActive : null]}>
              Đã giao
            </Text>
          </Pressable>
        </View>

        {/* ── Active Shipment Cards List ───────────────────── */}
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredDeliveries}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSearch color="#94A3B8" size={36} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Không tìm thấy chuyến xe</Text>
              <Text style={styles.emptySubtitle}>
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isDelivered = item.status === 'DELIVERED';
            const etaText = isDelivered
              ? 'ETA dự kiến: Đã hoàn tất'
              : `ETA dự kiến: ${item.etaLabel} · Còn ${item.distanceRemainingKm.toFixed(1)} km`;

            return (
              <View style={styles.shipmentCardOuter}>
                <View style={styles.shipmentCardInner}>
                  {/* Header: Booking code, Plate, Status */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.codeWrap}>
                      <Text style={styles.bookingCodeText}>{item.bookingCode}</Text>
                      <View style={styles.plateBadge}>
                        <Text style={styles.plateText}>{item.driverPlate}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, isDelivered ? styles.statusBadgeDelivered : styles.statusBadgeActive]}>
                      <View style={[styles.statusDot, isDelivered ? styles.statusDotDelivered : styles.statusDotActive]} />
                      <Text style={[styles.statusText, isDelivered ? styles.statusTextDelivered : styles.statusTextActive]}>
                        {item.statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Route Spine */}
                  <View style={styles.routeContainer}>
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, styles.originDot]} />
                      <Text numberOfLines={1} style={styles.routeLabel}>{item.origin}</Text>
                    </View>
                    <View style={styles.routeSpineLine} />
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, styles.destDot]} />
                      <Text numberOfLines={1} style={styles.routeLabel}>{item.destination}</Text>
                    </View>
                  </View>

                  {/* ETA Status Bar: Strictly "ETA dự kiến", Tabular Nums */}
                  <View style={styles.etaStatusBar}>
                    <IconSpeedTruck color="#0B1E42" size={16} strokeWidth={2} />
                    <Text style={styles.etaStatusText}>{etaText}</Text>
                  </View>

                  {/* Driver & Cargo info */}
                  <View style={styles.metaRow}>
                    <View style={styles.driverCol}>
                      <View style={styles.driverInfoInline}>
                        <IconRoleDriver color="#0B1E42" size={16} />
                        <Text style={styles.driverNameText}>{item.driverName}</Text>
                        <View style={styles.ratingBadge}>
                          <IconStar color="#F59E0B" fill="#F59E0B" size={12} strokeWidth={1.8} />
                          <Text style={styles.ratingText}>{item.driverRating.toFixed(2)}</Text>
                        </View>
                      </View>
                      <Text style={styles.cargoText}>
                        {item.cargoLabel} • {item.weightKg} kg
                      </Text>
                    </View>

                    <View style={styles.priceCol}>
                      <Text style={styles.priceLabel}>Cước phí</Text>
                      <Text style={styles.priceText}>{item.priceVnd}</Text>
                    </View>
                  </View>

                  {/* 1-Tap Jump Action Buttons (>= 44x44px) */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      accessibilityLabel={`Theo dõi trực tiếp đơn ${item.bookingCode}`}
                      accessibilityRole="button"
                      onPress={() => router.push('/customer/tracking')}
                      style={({ pressed }) => [styles.actionBtn, styles.trackingBtn, pressed ? styles.pressed : null]}
                    >
                      <IconLocationPin color="#FFFFFF" size={16} strokeWidth={2} />
                      <Text style={styles.trackingBtnText}>Theo dõi trực tiếp</Text>
                    </Pressable>

                    <Pressable
                      accessibilityLabel={`Nhắn tin tài xế đơn ${item.bookingCode}`}
                      accessibilityRole="button"
                      onPress={() => router.push(`/customer/chat/${item.id}`)}
                      style={({ pressed }) => [styles.actionBtn, styles.chatBtn, pressed ? styles.pressed : null]}
                    >
                      <IconMessage color="#0F172A" size={16} strokeWidth={2} />
                      <Text style={styles.chatBtnText}>Nhắn tin</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
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

  // ── Search Bar ────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    minHeight: 46,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Filter Pills ──────────────────────────────────
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  filterPillText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // ── List ──────────────────────────────────────────
  listContent: {
    gap: 14,
    paddingBottom: 32,
  },

  // ── Double-Bezel Shipment Card (24px outer, 18px inner) ──
  shipmentCardOuter: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  shipmentCardInner: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingCodeText: {
    color: '#0B1E42',
    fontSize: 13.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusBadgeDelivered: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#2563EB',
  },
  statusDotDelivered: {
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#1D4ED8',
  },
  statusTextDelivered: {
    color: '#15803D',
  },

  // Route Spine
  routeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  originDot: {
    backgroundColor: '#10B981',
  },
  destDot: {
    backgroundColor: '#EF4444',
  },
  routeSpineLine: {
    width: 1.5,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginLeft: 3.25,
  },
  routeLabel: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },

  // ETA Status Bar
  etaStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  etaStatusText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  driverCol: {
    gap: 3,
    flex: 1,
  },
  driverInfoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverNameText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ratingText: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cargoText: {
    color: '#64748B',
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  priceText: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackingBtn: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  trackingBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  chatBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  chatBtnText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12.5,
  },
});
