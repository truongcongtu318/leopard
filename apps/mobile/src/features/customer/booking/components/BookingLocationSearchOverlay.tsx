import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
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
import { addressStore, type SavedAddress } from '../../addresses/address-store';
import { searchPlacesDirect } from '../../../home/HomeDashboardScreen';
import { searchVietmapWithCoords, type GeocodedSuggestion } from '../../../home/services/vietmap-search';

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number };
}

export interface BookingLocationSearchOverlayProps {
  visible: boolean;
  target: 'pickup' | 'dropoff';
  currentValue: string;
  onClose: () => void;
  onSelectLocation: (address: string, coords?: { lat: number; lng: number }) => void;
  onPickOnMap?: () => void;
}

export function BookingLocationSearchOverlay({
  visible,
  target,
  currentValue,
  onClose,
  onSelectLocation,
  onPickOnMap,
}: BookingLocationSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load real saved addresses from addressStore
  const realSavedAddresses = useMemo<LocationSearchResult[]>(() => {
    try {
      const addresses = addressStore.getAddresses();
      if (Array.isArray(addresses) && addresses.length > 0) {
        return addresses.map((a: SavedAddress) => ({
          id: a.id,
          name: a.label || 'Địa chỉ đã lưu',
          address: a.address,
          coords:
            typeof a.latitude === 'number' && typeof a.longitude === 'number'
              ? { lat: a.latitude, lng: a.longitude }
              : undefined,
        }));
      }
    } catch {
      // Fallback if addressStore has issue
    }
    return [];
  }, [visible]);

  // Reset query on open
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSearchResults([]);
      setIsSearchingOnline(false);
    }
  }, [visible]);

  // Real-time location search via VietMap + Real Places database
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    // 1. Instant real places match (filtering out fake fallbacks)
    const directMatches = searchPlacesDirect(trimmed)
      .filter((p) => !p.id.startsWith('typed-'))
      .map((p) => ({
        id: p.id,
        name: p.title,
        address: p.address || p.subtitle,
        coords: p.coords,
      }));
    setSearchResults(directMatches);

    // 2. Debounced VietMap Autocomplete API
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearchingOnline(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const onlineList = await searchVietmapWithCoords(trimmed);
        if (onlineList && onlineList.length > 0) {
          const mapped: LocationSearchResult[] = onlineList.map((item: GeocodedSuggestion) => ({
            id: item.id,
            name: item.title,
            address: item.address || item.subtitle,
            coords: item.coords,
          }));

          // Deduplicate by name
          const seen = new Set<string>();
          const deduped: LocationSearchResult[] = [];
          for (const item of [...directMatches, ...mapped]) {
            const key = item.name.toLowerCase().trim();
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(item);
            }
          }
          setSearchResults(deduped);
        }
      } catch {
        // Direct matches stay as fallback
      } finally {
        setIsSearchingOnline(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  if (!visible) return null;

  const isSearching = query.trim().length >= 2;
  const hasNoResults = isSearching && !isSearchingOnline && searchResults.length === 0;

  const handleSelect = (item: LocationSearchResult) => {
    Keyboard.dismiss();
    const fullAddress = item.address.includes(item.name)
      ? item.address
      : `${item.name} - ${item.address}`;
    onSelectLocation(fullAddress, item.coords);
    onClose();
  };

  return (
    <View style={styles.overlayContainer}>
      {/* Header bar with Back button & Input */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Đóng tìm kiếm"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onClose}
          style={styles.backBtn}
        >
          <IconChevronLeft color={customerPalette.primary} size={22} />
        </Pressable>

        <View style={styles.inputWrapper}>
          <IconSearch color="#8E8E93" size={17} />
          <TextInput
            accessibilityLabel={
              target === 'pickup' ? 'Nhập địa chỉ lấy hàng' : 'Nhập địa chỉ giao hàng'
            }
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="never"
            onChangeText={setQuery}
            placeholder={
              target === 'pickup' ? 'Nhập địa chỉ lấy hàng...' : 'Nhập địa chỉ giao hàng...'
            }
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {isSearchingOnline && (
            <ActivityIndicator color={customerPalette.primary} size="small" style={{ marginRight: 4 }} />
          )}
          {query.length > 0 && (
            <Pressable
              accessibilityLabel="Xóa chữ"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setQuery('')}
              style={styles.clearBtn}
            >
              <View style={styles.clearCircle}>
                <IconClose color="#FFFFFF" size={10} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Target indicator */}
      <View style={styles.targetIndicatorRow}>
        <View
          style={[
            styles.targetDot,
            target === 'pickup' ? styles.pickupDot : styles.dropoffDot,
          ]}
        />
        <Text style={styles.targetLabel}>
          {target === 'pickup' ? 'Đang chọn Điểm lấy hàng' : 'Đang chọn Điểm giao hàng'}
        </Text>
      </View>

      {/* Main List */}
      <View style={styles.listContainer}>
        {/* Pinned "Chọn trên bản đồ" Action */}
        <Pressable
          accessibilityLabel="Chọn trên bản đồ"
          accessibilityRole="button"
          onPress={() => {
            onClose();
            if (onPickOnMap) onPickOnMap();
          }}
          style={({ pressed }) => [styles.pickOnMapCard, pressed && styles.rowPressed]}
        >
          <View style={styles.mapPinCircle}>
            <IconLocationPin color={customerPalette.primary} size={18} />
          </View>
          <Text style={styles.pickOnMapText}>Chọn vị trí chính xác trên bản đồ</Text>
          <IconChevronRight color="#C7C7CC" size={15} />
        </Pressable>

        {/* Real Search Results */}
        {isSearching && searchResults.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>KẾT QUẢ TÌM KIẾM THỰC TẾ</Text>
            <View style={styles.insetCard}>
              <FlatList
                data={searchResults}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.pinCircle}>
                      <IconLocationPin color="#64748B" size={16} />
                    </View>
                    <View style={styles.resultTextWrap}>
                      <Text numberOfLines={1} style={styles.resultTitle}>
                        {item.name}
                      </Text>
                      <Text numberOfLines={2} style={styles.resultSubtitle}>
                        {item.address}
                      </Text>
                    </View>
                    <IconChevronRight color="#C7C7CC" size={14} />
                  </Pressable>
                )}
              />
            </View>
          </View>
        )}

        {/* Real Saved Addresses (If User has saved addresses and not searching) */}
        {!isSearching && realSavedAddresses.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>SỔ ĐỊA CHỈ ĐÃ LƯU</Text>
            <View style={styles.insetCard}>
              {realSavedAddresses.map((addr, idx) => (
                <React.Fragment key={addr.id}>
                  {idx > 0 && <View style={styles.separator} />}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelect(addr)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.pinCircle, styles.savedPinCircle]}>
                      <IconLocationPin color={customerPalette.primary} size={16} />
                    </View>
                    <View style={styles.resultTextWrap}>
                      <Text numberOfLines={1} style={styles.resultTitle}>
                        {addr.name}
                      </Text>
                      <Text numberOfLines={2} style={styles.resultSubtitle}>
                        {addr.address}
                      </Text>
                    </View>
                    <IconChevronRight color="#C7C7CC" size={14} />
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* No Results Fallback */}
        {hasNoResults && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <IconSearch color="#8E8E93" size={28} />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy địa chỉ</Text>
            <Text style={styles.emptySubtitle}>
              Thử kiểm tra lại tên đường hoặc chọn vị trí trực tiếp trên bản đồ.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F2F2F7', // Apple systemGroupedBackground
    zIndex: 100,
    paddingTop: 48,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  inputWrapper: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.14)',
    borderRadius: 12,
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
  clearBtn: {
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
  targetIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 6,
    marginBottom: 8,
  },
  targetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickupDot: {
    backgroundColor: '#34C759',
  },
  dropoffDot: {
    backgroundColor: '#FF3B30',
  },
  targetLabel: {
    ...typeScale.caption2,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pickOnMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  mapPinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickOnMapText: {
    flex: 1,
    ...typeScale.body,
    fontSize: 15,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  insetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  rowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savedPinCircle: {
    backgroundColor: '#EBF2FA',
  },
  resultTextWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  resultTitle: {
    ...typeScale.body,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  resultSubtitle: {
    ...typeScale.subheadline,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 17,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    ...typeScale.headline,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typeScale.subheadline,
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
