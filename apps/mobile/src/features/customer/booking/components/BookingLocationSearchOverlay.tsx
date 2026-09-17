import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
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
      // Fallback
    }
    return [];
  }, [visible]);

  // Reset on open
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

    // 1. Instant real places match
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
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
      visible={visible}
    >
      <View style={styles.modalRoot}>
        {/* Semi-transparent backdrop - Tapping here dismisses overlay */}
        <Pressable
          accessibilityLabel="Đóng overlay"
          onPress={onClose}
          style={styles.upperBackdrop}
        />

        {/* Floating Sheet Container (Grab style) */}
        <View style={styles.sheetCard}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {/* Header row */}
          <View style={styles.sheetHeader}>
            <View style={styles.targetBadge}>
              <View
                style={[
                  styles.targetDot,
                  target === 'pickup' ? styles.pickupDot : styles.dropoffDot,
                ]}
              />
              <Text style={styles.targetTitle}>
                {target === 'pickup' ? 'Điểm lấy hàng' : 'Điểm giao hàng'}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Đóng tìm kiếm"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </Pressable>
          </View>

          {/* Search Input Box */}
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

          {/* Action "Chọn trên bản đồ" */}
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
            <View style={styles.resultsWrap}>
              <Text style={styles.sectionHeader}>Kết quả tìm kiếm</Text>
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
                style={styles.listStyle}
              />
            </View>
          )}

          {/* Real Saved Addresses (If any) */}
          {!isSearching && realSavedAddresses.length > 0 && (
            <View style={styles.resultsWrap}>
              <Text style={styles.sectionHeader}>Sổ địa chỉ đã lưu</Text>
              <FlatList
                data={realSavedAddresses}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View style={[styles.pinCircle, styles.savedPinCircle]}>
                      <IconLocationPin color={customerPalette.primary} size={16} />
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
                style={styles.listStyle}
              />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  upperBackdrop: {
    height: 90,
    width: '100%',
  },
  sheetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.16)',
    ...iosContinuousCurve,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickupDot: {
    backgroundColor: '#34C759',
  },
  dropoffDot: {
    backgroundColor: '#FF3B30',
  },
  targetTitle: {
    ...typeScale.title3,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  inputWrapper: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
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
  pickOnMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    ...iosContinuousCurve,
  },
  mapPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pickOnMapText: {
    flex: 1,
    ...typeScale.body,
    fontSize: 15,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  rowPressed: {
    opacity: 0.75,
  },
  resultsWrap: {
    flex: 1,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  listStyle: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    marginLeft: 44,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
