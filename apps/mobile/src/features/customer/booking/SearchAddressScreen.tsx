import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeInsets } from './safe-insets';

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
  const insets = useSafeInsets();
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
    <View style={[styles.rootContainer, { paddingTop: insets.top || 16 }]}>
      {/* iOS 17/18 Navigation Header with Search Field */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onBack}
          style={styles.backButton}
        >
          <IconChevronLeft color={customerPalette.primary} size={22} />
        </Pressable>

        <View style={styles.searchFieldWrapper}>
          <IconSearch color="#8E8E93" size={17} />
          <TextInput
            accessibilityLabel="Tìm địa chỉ giao hàng"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="never"
            onChangeText={setQuery}
            placeholder="Tìm địa chỉ giao hàng"
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityLabel="Xóa tìm kiếm"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <View style={styles.clearCircle}>
                <IconClose color="#FFFFFF" size={12} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.scrollContent}>
        {/* Permission Banner */}
        {!hasLocationPermission && (
          <View style={styles.permissionBanner}>
            <View style={styles.permissionIconCircle}>
              <IconLocationPin color="#F59E0B" size={18} />
            </View>
            <View style={styles.permissionTextCol}>
              <Text style={styles.permissionTitle}>Bật vị trí để tính cước chính xác</Text>
              <Text style={styles.permissionSubtitle}>
                Ứng dụng cần quyền vị trí để tự động định vị kho và tính cự ly tối ưu.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={styles.permissionBtn}
            >
              <Text style={styles.permissionBtnText}>Mở Cài đặt</Text>
            </Pressable>
          </View>
        )}

        {/* Pinned "Chọn trên bản đồ" Action Card */}
        <View style={styles.pinnedSection}>
          <Pressable
            accessibilityLabel="Chọn trên bản đồ"
            accessibilityRole="button"
            onPress={() => {
              if (onPickOnMap) onPickOnMap();
              else onSelectAddress('Vị trí chọn trên bản đồ (Demo)', { lat: 10.7769, lng: 106.7009 });
            }}
            style={({ pressed }) => [styles.mapPickCard, pressed && styles.rowPressed]}
          >
            <View style={styles.mapIconCircle}>
              <IconLocationPin color={customerPalette.primary} size={18} />
            </View>
            <Text style={styles.mapPickTitle}>Chọn trên bản đồ</Text>
            <IconChevronRight color="#C7C7CC" size={14} />
          </Pressable>
        </View>

        {/* Active Search Results */}
        {isSearching && !hasNoResults && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>KẾT QUẢ TÌM KIẾM</Text>
            <View style={styles.insetGroupedCard}>
              <FlatList
                data={searchResults}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}
                  >
                    <View style={styles.itemIconCircle}>
                      <IconLocationPin color="#8E8E93" size={16} />
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

        {/* No Results Empty State */}
        {hasNoResults && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <IconSearch color="#8E8E93" size={32} />
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
              style={({ pressed }) => [styles.emptyMapBtn, pressed && styles.btnPressed]}
            >
              <IconLocationPin color="#FFFFFF" size={16} />
              <Text style={styles.emptyMapBtnText}>Chọn trên bản đồ</Text>
            </Pressable>
          </View>
        )}

        {/* Default Inset Grouped Sections */}
        {!isSearching && (
          <>
            {/* GẦN ĐÂY */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>GẦN ĐÂY</Text>
              <View style={styles.insetGroupedCard}>
                {recentAddresses.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}
                    >
                      <View style={styles.itemIconCircle}>
                        <IconSearch color="#8E8E93" size={15} />
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
              <View style={styles.insetGroupedCard}>
                {savedAddresses.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [styles.rowItem, pressed && styles.rowPressed]}
                    >
                      <View style={[styles.itemIconCircle, styles.savedIconCircle]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Apple standard systemGroupedBackground
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  searchFieldWrapper: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // Apple standard search background
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
    ...iosContinuousCurve,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typeScale.body,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingTop: 8,
  },
  pinnedSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  mapPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mapPickTitle: {
    flex: 1,
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: -0.08,
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  insetGroupedCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  rowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  itemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savedIconCircle: {
    backgroundColor: '#EBF2FA',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  highlightedMatch: {
    fontWeight: '700',
    color: customerPalette.primary,
  },
  itemAddress: {
    ...typeScale.subheadline,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  distanceText: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 12,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...typeScale.headline,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typeScale.subheadline,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: customerPalette.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    ...iosContinuousCurve,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  emptyMapBtnText: {
    ...typeScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...iosContinuousCurve,
  },
  permissionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTextCol: {
    flex: 1,
  },
  permissionTitle: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  permissionSubtitle: {
    ...typeScale.footnote,
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  permissionBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permissionBtnText: {
    ...typeScale.footnote,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
