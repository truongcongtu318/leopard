import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconLocationPin,
  IconSearch,
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface AddressItem {
  id: string;
  name: string;
  address: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
}

const DEFAULT_RECENT_ADDRESSES: AddressItem[] = [
  {
    id: 'recent-1',
    name: 'Công trình Jamona City',
    address: 'Đào Trí, P. Phú Thuận, Quận 7, TP.HCM',
    distanceKm: 3.2,
    lat: 10.7325,
    lng: 106.7351,
  },
  {
    id: 'recent-2',
    name: 'Kho Tân Bình',
    address: 'KCN Tân Bình, P. Tây Thạnh, Tân Phú, TP.HCM',
    distanceKm: 8.1,
    lat: 10.8123,
    lng: 106.6234,
  },
  {
    id: 'recent-3',
    name: 'Xưởng Cơ Khí Minh Phát',
    address: '45 Lê Thị Riêng, P. Thới An, Quận 12, TP.HCM',
    distanceKm: 5.4,
    lat: 10.8654,
    lng: 106.6543,
  },
];

const DEFAULT_SAVED_ADDRESSES: AddressItem[] = [
  {
    id: 'saved-1',
    name: 'Kho Tổng Đại Phát',
    address: '120 Song Hành, P. Tân Hưng Thuận, Quận 12, TP.HCM',
    distanceKm: 0.0,
    lat: 10.8421,
    lng: 106.6192,
  },
  {
    id: 'saved-2',
    name: 'Cửa Hàng VLXD Quận 9',
    address: '88 Đỗ Xuân Hợp, Phước Long B, Thủ Đức, TP.HCM',
    distanceKm: 16.5,
    lat: 10.8234,
    lng: 106.7789,
  },
];

export interface SearchAddressScreenProps {
  onBack: () => void;
  onSelectAddress: (address: string, coords?: { lat: number; lng: number }) => void;
  onPickOnMap?: () => void;
  onOpenSettings?: () => void;
  hasLocationPermission?: boolean;
  initialQuery?: string;
  recentAddresses?: AddressItem[];
  savedAddresses?: AddressItem[];
}

export function SearchAddressScreen({
  onBack,
  onSelectAddress,
  onPickOnMap,
  onOpenSettings,
  hasLocationPermission = true,
  initialQuery = '',
  recentAddresses = DEFAULT_RECENT_ADDRESSES,
  savedAddresses = DEFAULT_SAVED_ADDRESSES,
}: SearchAddressScreenProps) {
  const [query, setQuery] = useState(initialQuery);

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const pool = [...recentAddresses, ...savedAddresses];
    return pool.filter(
      (item) =>
        item.name.toLowerCase().includes(trimmed) ||
        item.address.toLowerCase().includes(trimmed),
    );
  }, [query, recentAddresses, savedAddresses]);

  const isSearching = query.trim().length > 0;
  const hasNoResults = isSearching && searchResults.length === 0;

  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <Text style={styles.itemTitle}>{text}</Text>;
    }
    const lowerText = text.toLowerCase();
    const lowerHighlight = highlight.trim().toLowerCase();
    const startIndex = lowerText.indexOf(lowerHighlight);
    if (startIndex === -1) {
      return <Text style={styles.itemTitle}>{text}</Text>;
    }
    const before = text.slice(0, startIndex);
    const match = text.slice(startIndex, startIndex + lowerHighlight.length);
    const after = text.slice(startIndex + lowerHighlight.length);

    return (
      <Text style={styles.itemTitle}>
        {before}
        <Text style={styles.highlightedMatch}>{match}</Text>
        {after}
      </Text>
    );
  };

  const handleSelect = (item: AddressItem) => {
    const fullAddress = `${item.name} - ${item.address}`;
    const coords = item.lat && item.lng ? { lat: item.lat, lng: item.lng } : undefined;
    onSelectAddress(fullAddress, coords);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* iOS Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}
        >
          <IconChevronLeft color={customerPalette.primary} size={20} />
        </Pressable>

        <View style={styles.searchFieldContainer}>
          <IconSearch color={customerPalette.textSecondary} size={16} />
          <TextInput
            accessibilityLabel="Tìm địa chỉ giao hàng"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="never"
            onChangeText={setQuery}
            placeholder="Tìm địa chỉ giao hàng"
            placeholderTextColor={customerPalette.textMutedSlate}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityLabel="Xóa tìm kiếm"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <IconClose color={customerPalette.textMutedSlate} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Location Permission Banner if not granted */}
        {!hasLocationPermission && (
          <View style={styles.permissionBanner}>
            <View style={styles.permissionIconWrapper}>
              <IconLocationPin color="#FF9500" size={20} />
            </View>
            <View style={styles.permissionTextWrapper}>
              <Text style={styles.permissionTitle}>Bật vị trí để tính cước chính xác</Text>
              <Text style={styles.permissionSubtitle}>
                Ứng dụng cần quyền vị trí để định vị kho và tính lộ trình giao hàng nhanh nhất.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={styles.permissionActionBtn}
            >
              <Text style={styles.permissionActionBtnText}>Mở Cài đặt</Text>
            </Pressable>
          </View>
        )}

        {/* Pinned "Chọn trên bản đồ" Action Card */}
        <Pressable
          accessibilityLabel="Chọn trên bản đồ"
          accessibilityRole="button"
          onPress={() => {
            if (onPickOnMap) onPickOnMap();
            else onSelectAddress('Vị trí chọn trên bản đồ (Demo)', { lat: 10.7769, lng: 106.7009 });
          }}
          style={({ pressed }) => [styles.mapPickCard, pressed && styles.cardPressed]}
        >
          <View style={styles.mapIconCircle}>
            <IconLocationPin color={customerPalette.primary} size={18} />
          </View>
          <Text style={styles.mapPickTitle}>Chọn trên bản đồ</Text>
          <IconChevronRight color={customerPalette.textSecondary} size={14} />
        </Pressable>

        {/* Active Search Results */}
        {isSearching && !hasNoResults && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>KẾT QUẢ TÌM KIẾM</Text>
            <View style={styles.groupedCard}>
              <FlatList
                data={searchResults}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.rowItem, pressed && styles.cardPressed]}
                  >
                    <View style={styles.itemIconCircle}>
                      <IconLocationPin color={customerPalette.textSecondary} size={16} />
                    </View>
                    <View style={styles.itemContent}>
                      {renderHighlightedText(item.name, query)}
                      <Text numberOfLines={1} style={styles.itemAddress}>
                        {item.address}
                      </Text>
                    </View>
                    {item.distanceKm !== undefined && (
                      <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km</Text>
                    )}
                  </Pressable>
                )}
                scrollEnabled={false}
              />
            </View>
          </View>
        )}

        {/* No Results State */}
        {hasNoResults && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <IconSearch color={customerPalette.textSecondary} size={32} />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy địa chỉ</Text>
            <Text style={styles.emptySubtitle}>
              Thử kiểm tra lại chính tả hoặc chọn vị trí trực tiếp trên bản đồ.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (onPickOnMap) onPickOnMap();
                else onSelectAddress('Vị trí chọn trên bản đồ (Demo)', { lat: 10.7769, lng: 106.7009 });
              }}
              style={styles.emptyMapButton}
            >
              <IconLocationPin color="#FFFFFF" size={16} />
              <Text style={styles.emptyMapButtonText}>Chọn trên bản đồ</Text>
            </Pressable>
          </View>
        )}

        {/* Default Sections: Gần đây & Sổ địa chỉ */}
        {!isSearching && (
          <>
            {/* GẦN ĐÂY */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>GẦN ĐÂY</Text>
              <View style={styles.groupedCard}>
                {recentAddresses.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [styles.rowItem, pressed && styles.cardPressed]}
                    >
                      <View style={styles.itemIconCircle}>
                        <IconSearch color={customerPalette.textSecondary} size={15} />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text numberOfLines={1} style={styles.itemAddress}>
                          {item.address}
                        </Text>
                      </View>
                      {item.distanceKm !== undefined && (
                        <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km</Text>
                      )}
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* SỔ ĐỊA CHỈ */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>SỔ ĐỊA CHỈ</Text>
              <View style={styles.groupedCard}>
                {savedAddresses.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [styles.rowItem, pressed && styles.cardPressed]}
                    >
                      <View style={styles.itemIconCircle}>
                        <IconLocationPin color={customerPalette.primary} size={15} />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text numberOfLines={1} style={styles.itemAddress}>
                          {item.address}
                        </Text>
                      </View>
                      {item.distanceKm !== undefined && (
                        <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km</Text>
                      )}
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: customerPalette.canvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.canvas,
    gap: spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchFieldContainer: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    ...iosContinuousCurve,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typeScale.body,
    color: customerPalette.textPrimary,
    padding: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  mapPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    minHeight: 52,
    ...iosContinuousCurve,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  mapPickTitle: {
    flex: 1,
    ...typeScale.body,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  cardPressed: {
    opacity: 0.75,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.control,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...iosContinuousCurve,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginLeft: 52,
  },
  itemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    ...typeScale.body,
    fontWeight: '500',
    color: customerPalette.textPrimary,
  },
  highlightedMatch: {
    fontWeight: '700',
    color: customerPalette.primary,
  },
  itemAddress: {
    ...typeScale.subheadline,
    color: customerPalette.textSecondary,
    marginTop: 2,
  },
  distanceText: {
    ...typeScale.footnote,
    color: customerPalette.textSecondary,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typeScale.headline,
    fontWeight: '600',
    color: customerPalette.textPrimary,
    marginBottom: spacing.xxs,
  },
  emptySubtitle: {
    ...typeScale.subheadline,
    color: customerPalette.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    minHeight: 44,
    ...iosContinuousCurve,
  },
  emptyMapButtonText: {
    ...typeScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
    ...iosContinuousCurve,
  },
  permissionIconWrapper: {
    marginRight: spacing.sm,
  },
  permissionTextWrapper: {
    flex: 1,
  },
  permissionTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: '#92400E',
  },
  permissionSubtitle: {
    ...typeScale.footnote,
    color: '#B45309',
    marginTop: 2,
  },
  permissionActionBtn: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#D97706',
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionActionBtnText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
