import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  IconChevronRight,
  IconClose,
  IconLocationPin,
  IconPlus,
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
import type { RouteStop } from '../booking-schema';

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number };
}

export interface BookingRouteSectionProps {
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
  distanceKm: number;
  etaMinutes: number;
  onPressPickup?: () => void;
  onPressDropoff?: () => void;
  onUpdatePickup?: (address: string, coords?: { lat: number; lng: number }) => void;
  onUpdateDropoff?: (address: string, coords?: { lat: number; lng: number }) => void;
  onAddStop: () => void;
  onRemoveStop: (stopId: string) => void;
  onPickOnMap?: () => void;
  routeError?: string;
  initialActiveTarget?: 'pickup' | 'dropoff' | null;
}

/**
 * Parses a raw geocoded or user address into clean, Apple HIG 2-tier typography:
 * Line 1: Main place name or street (e.g. "Kho Tổng Đại Phát" or "Xã Cát Sơn")
 * Line 2: Detailed ward, district, city (e.g. "120 Song Hành, P. Tân Hưng Thuận, Q.12")
 */
export function formatAddressForDisplay(rawAddress: string, defaultName: string): { title: string; subtitle: string } {
  if (!rawAddress || !rawAddress.trim()) {
    return { title: defaultName, subtitle: '' };
  }
  let clean = rawAddress.trim();
  // Strip raw plus code prefix if present (e.g. "7P6C3XXG+XQ ")
  clean = clean.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}\s*,?\s*/i, '');

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return {
      title: parts[0]?.trim() || defaultName,
      subtitle: parts.slice(1).join(' - ').trim(),
    };
  }

  const commaIndex = clean.indexOf(',');
  if (commaIndex !== -1) {
    return {
      title: clean.slice(0, commaIndex).trim(),
      subtitle: clean.slice(commaIndex + 1).trim(),
    };
  }

  return { title: clean, subtitle: '' };
}

export function BookingRouteSection({
  pickupAddress,
  dropoffAddress,
  stops,
  distanceKm,
  etaMinutes,
  onPressPickup,
  onPressDropoff,
  onUpdatePickup,
  onUpdateDropoff,
  onAddStop,
  onRemoveStop,
  onPickOnMap,
  routeError,
  initialActiveTarget = null,
}: BookingRouteSectionProps) {
  const [activeTarget, setActiveTarget] = useState<'pickup' | 'dropoff' | null>(initialActiveTarget);
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [activeTarget]);

  // Real-time location search via VietMap + Real Places database
  useEffect(() => {
    const trimmed = searchQuery.trim();
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
        // Direct matches stay
      } finally {
        setIsSearchingOnline(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleOpenSearch = (target: 'pickup' | 'dropoff') => {
    setActiveTarget(target);
    setSearchQuery('');
    setSearchResults([]);
    if (target === 'pickup' && onPressPickup) onPressPickup();
    if (target === 'dropoff' && onPressDropoff) onPressDropoff();
  };

  const handleCloseSearch = () => {
    Keyboard.dismiss();
    setActiveTarget(null);
    setSearchQuery('');
  };

  const handleSelectLocation = (item: LocationSearchResult) => {
    Keyboard.dismiss();
    const fullAddress = item.address.includes(item.name)
      ? item.address
      : `${item.name} - ${item.address}`;

    if (activeTarget === 'pickup') {
      if (onUpdatePickup) onUpdatePickup(fullAddress, item.coords);
    } else {
      if (onUpdateDropoff) onUpdateDropoff(fullAddress, item.coords);
    }
    setActiveTarget(null);
    setSearchQuery('');
  };

  const isIdentical =
    pickupAddress.trim().length > 0 &&
    pickupAddress.trim().toLowerCase() === dropoffAddress.trim().toLowerCase();

  const pickupParsed = formatAddressForDisplay(pickupAddress, 'Kho VLXD Đại Phát');
  const dropoffParsed = formatAddressForDisplay(dropoffAddress, 'Điểm giao hàng');

  const isSearching = activeTarget !== null;
  const isQueryActive = searchQuery.trim().length >= 2;
  const hasNoResults = isQueryActive && !isSearchingOnline && searchResults.length === 0;

  return (
    <View style={[styles.container, isSearching && styles.containerElevated]}>
      <View style={[styles.card, (routeError || isIdentical) && styles.cardError]}>
        {/* Điểm lấy hàng */}
        {activeTarget === 'pickup' ? (
          <View style={styles.activeInputRow}>
            <View style={styles.indicatorCol}>
              <View style={styles.greenHalo}>
                <View style={styles.greenInnerDot} />
              </View>
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.stopTypeLabel}>ĐANG NHẬP ĐIỂM LẤY HÀNG</Text>
              <TextInput
                accessibilityLabel="Nhập địa chỉ lấy hàng"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onChangeText={setSearchQuery}
                placeholder="Nhập địa chỉ lấy hàng..."
                placeholderTextColor="#8E8E93"
                style={styles.inlineSearchInput}
                value={searchQuery}
              />
            </View>
            {searchQuery.length > 0 && (
              <Pressable hitSlop={10} onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <View style={styles.clearCircle}>
                  <IconClose color="#FFFFFF" size={10} />
                </View>
              </Pressable>
            )}
            <Pressable hitSlop={8} onPress={handleCloseSearch} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => handleOpenSearch('pickup')}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.indicatorCol}>
              <View style={styles.greenHalo}>
                <View style={styles.greenInnerDot} />
              </View>
              <View style={styles.connectorLine} />
            </View>
            <View style={styles.addressTextCol}>
              <View style={styles.tagRow}>
                <Text style={styles.stopTypeLabel}>ĐIỂM LẤY HÀNG</Text>
                <View style={styles.warehouseTag}>
                  <Text style={styles.warehouseTagText}>Kho</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.addressLine1}>
                {pickupParsed.title}
              </Text>
              {pickupParsed.subtitle ? (
                <Text numberOfLines={1} style={styles.addressLine2}>
                  {pickupParsed.subtitle}
                </Text>
              ) : null}
            </View>
            <IconChevronRight color="#C7C7CC" size={14} />
          </Pressable>
        )}

        {/* Điểm dừng trung gian (nếu có) */}
        {stops.map((stop, index) => {
          const stopParsed = formatAddressForDisplay(stop.address, `Điểm dừng ${index + 1}`);
          return (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.indicatorCol}>
                <View style={styles.orangeHalo}>
                  <View style={styles.orangeInnerDot} />
                </View>
                <View style={styles.connectorLine} />
              </View>
              <View style={styles.addressTextCol}>
                <Text style={styles.stopTypeLabel}>ĐIỂM DỪNG {index + 1}</Text>
                <Text numberOfLines={1} style={styles.addressLine1}>
                  {stopParsed.title}
                </Text>
                {stopParsed.subtitle ? (
                  <Text numberOfLines={1} style={styles.addressLine2}>
                    {stopParsed.subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={`Xóa điểm dừng ${index + 1}`}
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => onRemoveStop(stop.id)}
                style={styles.removeStopBtn}
              >
                <View style={styles.removeStopCircle}>
                  <IconClose color="#FFFFFF" size={10} />
                </View>
              </Pressable>
            </View>
          );
        })}

        {/* Điểm giao hàng */}
        {activeTarget === 'dropoff' ? (
          <View style={styles.activeInputRow}>
            <View style={styles.indicatorCol}>
              <View style={styles.redHalo}>
                <View style={styles.redInnerSquare} />
              </View>
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.stopTypeLabel}>ĐANG NHẬP ĐIỂM GIAO HÀNG</Text>
              <TextInput
                accessibilityLabel="Nhập địa chỉ giao hàng"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onChangeText={setSearchQuery}
                placeholder="Nhập địa chỉ giao hàng..."
                placeholderTextColor="#8E8E93"
                style={styles.inlineSearchInput}
                value={searchQuery}
              />
            </View>
            {searchQuery.length > 0 && (
              <Pressable hitSlop={10} onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <View style={styles.clearCircle}>
                  <IconClose color="#FFFFFF" size={10} />
                </View>
              </Pressable>
            )}
            <Pressable hitSlop={8} onPress={handleCloseSearch} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => handleOpenSearch('dropoff')}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.indicatorCol}>
              <View style={styles.redHalo}>
                <View style={styles.redInnerSquare} />
              </View>
            </View>
            <View style={styles.addressTextCol}>
              <Text style={styles.stopTypeLabel}>ĐIỂM GIAO HÀNG</Text>
              <Text numberOfLines={1} style={styles.addressLine1}>
                {dropoffParsed.title}
              </Text>
              {dropoffParsed.subtitle ? (
                <Text numberOfLines={1} style={styles.addressLine2}>
                  {dropoffParsed.subtitle}
                </Text>
              ) : null}
            </View>
            <IconChevronRight color="#C7C7CC" size={14} />
          </Pressable>
        )}

        {/* Hàng "Thêm điểm dừng" */}
        {stops.length < 3 && !isSearching && (
          <View style={styles.addStopWrap}>
            <View style={styles.separator} />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onAddStop}
              style={({ pressed }) => [styles.addStopBtn, pressed && styles.rowPressed]}
            >
              <View style={styles.plusCircle}>
                <IconPlus color={customerPalette.primary} size={14} />
              </View>
              <Text style={styles.addStopBtnText}>Thêm điểm dừng</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Footer lộ trình */}
      {!isSearching && (
        <Text style={styles.routeFooter}>
          Khoảng {distanceKm.toFixed(1).replace('.', ',')} km · dự kiến {etaMinutes} phút
        </Text>
      )}

      {/* Lỗi lộ trình */}
      {(routeError || isIdentical) && !isSearching && (
        <Text style={styles.errorText}>
          {routeError || 'Điểm giao hàng không được trùng với điểm lấy hàng'}
        </Text>
      )}

      {/* ========================================================================= */}
      {/* 🚀 DROPDOWN OVERLAY LIST: ĐÈ LÊN CÁC COMPONENT BÊN DƯỚI (GRAB/UBER STYLE) */}
      {/* ========================================================================= */}
      {isSearching && (
        <View style={styles.dropdownOverlay}>
          {/* Action: Chọn trên bản đồ */}
          <Pressable
            accessibilityLabel="Chọn trên bản đồ"
            accessibilityRole="button"
            onPress={() => {
              handleCloseSearch();
              if (onPickOnMap) onPickOnMap();
            }}
            style={({ pressed }) => [styles.pickOnMapRow, pressed && styles.rowPressed]}
          >
            <View style={styles.mapPinCircle}>
              <IconLocationPin color={customerPalette.primary} size={16} />
            </View>
            <Text style={styles.pickOnMapText}>Chọn vị trí chính xác trên bản đồ</Text>
            <IconChevronRight color="#C7C7CC" size={14} />
          </Pressable>

          <View style={styles.separator} />

          {/* Results list */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={styles.resultsScroll}
          >
            {isSearchingOnline && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={customerPalette.primary} size="small" />
                <Text style={styles.loadingText}>Đang tìm kiếm vị trí thực tế...</Text>
              </View>
            )}

            {/* Real Search Results */}
            {isQueryActive &&
              searchResults.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.separator} />}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleSelectLocation(item)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.pinCircle}>
                      <IconLocationPin color="#64748B" size={15} />
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
                </React.Fragment>
              ))}

            {/* Real Saved Addresses (When not typing query) */}
            {!isQueryActive && realSavedAddresses.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>SỔ ĐỊA CHỈ ĐÃ LƯU</Text>
                {realSavedAddresses.map((addr, idx) => (
                  <React.Fragment key={addr.id}>
                    {idx > 0 && <View style={styles.separator} />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleSelectLocation(addr)}
                      style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}
                    >
                      <View style={[styles.pinCircle, styles.savedPinCircle]}>
                        <IconLocationPin color={customerPalette.primary} size={15} />
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
              </>
            )}

            {/* No Results */}
            {hasNoResults && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Không tìm thấy địa chỉ phù hợp</Text>
                <Text style={styles.emptyHint}>
                  Vui lòng kiểm tra lại chính tả hoặc chọn vị trí trên bản đồ ở trên.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: -24,
    zIndex: 10,
    position: 'relative',
  },
  containerElevated: {
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    ...iosContinuousCurve,
  },
  cardError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  activeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  inputCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  inlineSearchInput: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    padding: 0,
    marginTop: 2,
  },
  clearBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  clearCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doneBtnText: {
    ...typeScale.body,
    fontSize: 15,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  rowPressed: {
    opacity: 0.7,
  },
  indicatorCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenHalo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34C759',
  },
  orangeHalo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF9500',
  },
  redHalo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redInnerSquare: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
  },
  connectorLine: {
    width: 1.5,
    height: 32,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  addressTextCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  stopTypeLabel: {
    ...typeScale.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  warehouseTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  warehouseTagText: {
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  addressLine1: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  addressLine2: {
    ...typeScale.subheadline,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 38,
  },
  addStopWrap: {
    marginTop: 4,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 38,
    minHeight: 44,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStopBtnText: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  removeStopBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeStopCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeFooter: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  errorText: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: 340,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
    elevation: 20,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    zIndex: 9999,
    ...iosContinuousCurve,
  },
  pickOnMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  resultsScroll: {
    maxHeight: 280,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadingText: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
  },
  sectionHeader: {
    ...typeScale.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  savedPinCircle: {
    backgroundColor: '#EBF2FA',
  },
  resultTextWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  resultTitle: {
    ...typeScale.body,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  resultSubtitle: {
    ...typeScale.caption1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  emptyHint: {
    ...typeScale.caption1,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
