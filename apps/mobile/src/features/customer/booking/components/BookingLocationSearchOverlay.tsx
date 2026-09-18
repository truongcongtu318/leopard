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
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import * as Location from 'expo-location';
import { addressStore, type SavedAddress } from '../../addresses/address-store';
import { searchVietmapWithCoords, type GeocodedSuggestion } from '../../../home/services/vietmap-search';
import { reverseGeocodeCoords } from '../../../home/components/MapAddressPickerModal';

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number };
}

export interface BookingLocationSearchOverlayProps {
  visible: boolean;
  target: string;
  currentValue?: string;
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
  const [isLocatingCurrentPosition, setIsLocatingCurrentPosition] = useState(false);
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

    // Only the real VietMap Autocomplete API feeds this list. A hardcoded
    // "places" list used to be shown here instantly, so the picker displayed
    // addresses that were never real search results.
    setSearchResults([]);
    setIsSearchingOnline(true);

    // Debounced VietMap Autocomplete API
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
          for (const item of mapped) {
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

  const handleUseCurrentLocation = async () => {
    haptic.light();
    setIsLocatingCurrentPosition(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setIsLocatingCurrentPosition(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      } as any);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
      const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
      const chosenAddress =
        resolved && resolved.trim().length > 0
          ? resolved.trim()
          : `Vị trí hiện tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      handleSelect({
        id: 'current-gps',
        name: 'Vị trí hiện tại',
        address: chosenAddress,
        coords: { lat, lng },
      });
    } catch (err) {
      console.warn('[BookingLocationSearchOverlay] Location error:', err);
    } finally {
      setIsLocatingCurrentPosition(false);
    }
  };

  const isSearching = query.trim().length >= 2;
  const hasNoResults = isSearching && !isSearchingOnline && searchResults.length === 0;

  const handleSelect = (item: LocationSearchResult) => {
    haptic.selection();
    Keyboard.dismiss();
    const fullAddress = item.address.includes(item.name)
      ? item.address
      : `${item.name} - ${item.address}`;
    onSelectLocation(fullAddress, item.coords);
    onClose();
  };

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent={true}
      visible={visible}
    >
      <View style={styles.modalRoot}>
        {/* Semi-transparent backdrop - Tapping here dismisses overlay */}
        <Pressable
          accessibilityLabel="Đóng overlay"
          onPress={handleClose}
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
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </Pressable>
          </View>

          {/* Search Input Box */}
          <View style={styles.inputWrapper}>
            <View
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              <IconSearch color={customerPalette.offlineGray} size={17} />
            </View>
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
              placeholderTextColor={customerPalette.offlineGray}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {isSearchingOnline && (
              <ActivityIndicator color={customerPalette.primary} size="small" style={{ marginRight: spacing.xxs }} />
            )}
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Xóa nội dung tìm kiếm"
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

          {/* Action "Chọn vị trí hiện tại" */}
          <Pressable
            accessibilityLabel="Chọn vị trí hiện tại theo GPS thiết bị"
            accessibilityRole="button"
            disabled={isLocatingCurrentPosition}
            onPress={handleUseCurrentLocation}
            style={({ pressed }) => [styles.pickOnMapCard, pressed && styles.rowPressed]}
          >
            <View
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
              style={styles.mapPinCircle}
            >
              {isLocatingCurrentPosition ? (
                <ActivityIndicator color={customerPalette.primary} size="small" />
              ) : (
                <IconLocationPin color={customerPalette.primary} size={18} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickOnMapText}>
                {isLocatingCurrentPosition ? 'Đang định vị GPS…' : 'Chọn vị trí hiện tại'}
              </Text>
              <Text style={styles.pickOnMapSub}>
                Lấy tọa độ GPS thiết bị làm điểm {target === 'pickup' ? 'lấy hàng' : 'giao hàng'}
              </Text>
            </View>
            <IconChevronRight color={customerPalette.offlineGray} size={15} />
          </Pressable>

          {/* Real Search Results */}
          {isSearching && searchResults.length > 0 && (
            <View style={styles.resultsWrap}>
              <Text accessibilityRole="header" style={styles.sectionHeader}>
                Kết quả tìm kiếm
              </Text>
              <FlatList
                data={searchResults}
                ItemSeparatorComponent={() => (
                  <View
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                    style={styles.separator}
                  />
                )}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityLabel={`${item.name}, ${item.address}`}
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View
                      accessibilityElementsHidden={true}
                      importantForAccessibility="no"
                      style={styles.pinCircle}
                    >
                      <IconLocationPin color={colors.neutral.mutedText} size={16} />
                    </View>
                    <View style={styles.resultTextWrap}>
                      <Text numberOfLines={1} style={styles.resultTitle}>
                        {item.name}
                      </Text>
                      <Text numberOfLines={2} style={styles.resultSubtitle}>
                        {item.address}
                      </Text>
                    </View>
                    <IconChevronRight color={customerPalette.offlineGray} size={14} />
                  </Pressable>
                )}
                style={styles.listStyle}
              />
            </View>
          )}

          {/* Real Saved Addresses (If any) */}
          {!isSearching && realSavedAddresses.length > 0 && (
            <View style={styles.resultsWrap}>
              <Text accessibilityRole="header" style={styles.sectionHeader}>
                Sổ địa chỉ đã lưu
              </Text>
              <FlatList
                data={realSavedAddresses}
                ItemSeparatorComponent={() => (
                  <View
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                    style={styles.separator}
                  />
                )}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityLabel={`${item.name}, ${item.address}`}
                    accessibilityRole="button"
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View
                      accessibilityElementsHidden={true}
                      importantForAccessibility="no"
                      style={[styles.pinCircle, styles.savedPinCircle]}
                    >
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
                    <IconChevronRight color={customerPalette.offlineGray} size={14} />
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
                <IconSearch color={customerPalette.offlineGray} size={28} />
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
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.16)',
    ...iosContinuousCurve,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  pickupDot: {
    backgroundColor: colors.success.text,
  },
  dropoffDot: {
    backgroundColor: colors.danger.text,
  },
  targetTitle: {
    ...typeScale.title3,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  closeBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  closeBtnText: {
    ...typeScale.body,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  inputWrapper: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    ...iosContinuousCurve,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...typeScale.body,
    color: customerPalette.textSlateDark,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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
    borderRadius: radius.pill,
    backgroundColor: customerPalette.textSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickOnMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    ...iosContinuousCurve,
  },
  pickOnMapSub: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  mapPinCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  pickOnMapText: {
    ...typeScale.subheadline,
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
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginBottom: spacing.xs,
  },
  listStyle: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  savedPinCircle: {
    backgroundColor: customerPalette.primaryBg,
  },
  resultTextWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  resultTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    marginBottom: spacing.hairline,
  },
  resultSubtitle: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
    lineHeight: 17,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: 44,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typeScale.headline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    marginBottom: spacing.xxs,
  },
  emptySubtitle: {
    ...typeScale.subheadline,
    color: customerPalette.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
