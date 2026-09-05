import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { httpClient } from '../../../api/http-client';
import { IconLocationPin } from '../../../ui/icons/CoreIcons';
import {
  RealInteractiveMap,
  resolveLocationCoords,
  VIETNAM_LOCATION_DICT,
  type MapCoordinate,
} from '../../../ui/RealInteractiveMap';

function formatVietnamesePhone(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+84')) {
    return '0' + trimmed.slice(3);
  }
  if (trimmed.startsWith('84') && trimmed.length > 9) {
    return '0' + trimmed.slice(2);
  }
  return trimmed;
}

export type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * Queries Vietmap Autocomplete v4 directly and resolves coordinates via Place v4.
 * Used for direct client-side search or when backend proxy is unavailable.
 */
export async function searchVietmapDirect(
  query: string,
  apiKey: string,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (!q || !apiKey) return [];

  try {
    const autoUrl = `https://maps.vietmap.vn/api/autocomplete/v4?text=${encodeURIComponent(q)}&apikey=${apiKey}&display_type=5`;
    const res = await fetch(autoUrl);
    if (!res.ok) return [];

    const list = (await res.json()) as Array<{
      ref_id?: string;
      display?: string;
      name?: string;
      address?: string;
      lat?: unknown;
      lng?: unknown;
    }>;

    if (!Array.isArray(list) || list.length === 0) return [];

    const top = list.slice(0, 5);
    const resolved = await Promise.all(
      top.map(async (item, idx): Promise<AddressSuggestion | null> => {
        const placeId = item.ref_id || `sugg-${idx}`;
        const label = item.display || item.name || 'Địa điểm';
        const addr = item.address || item.display || item.name || q;
        const itemLat = typeof item.lat === 'number' ? item.lat : null;
        const itemLng = typeof item.lng === 'number' ? item.lng : null;

        if (itemLat !== null && itemLng !== null) {
          return {
            id: placeId,
            label,
            address: addr,
            lat: itemLat,
            lng: itemLng,
          };
        }

        if (item.ref_id) {
          try {
            const placeUrl = `https://maps.vietmap.vn/api/place/v4?refid=${encodeURIComponent(item.ref_id)}&apikey=${apiKey}`;
            const placeRes = await fetch(placeUrl);
            if (placeRes.ok) {
              const pData = (await placeRes.json()) as {
                display?: string;
                address?: string;
                lat?: unknown;
                lng?: unknown;
              };
              const pLat = typeof pData.lat === 'number' ? pData.lat : null;
              const pLng = typeof pData.lng === 'number' ? pData.lng : null;
              if (pLat !== null && pLng !== null) {
                return {
                  id: placeId,
                  label: pData.display || label,
                  address: pData.address || addr,
                  lat: pLat,
                  lng: pLng,
                };
              }
            }
          } catch {
            return null;
          }
        }
        return null;
      }),
    );

    return resolved.filter((r): r is AddressSuggestion => r !== null);
  } catch {
    return [];
  }
}

/**
 * Matches known Vietnamese logistics hubs (real fixed coordinates).
 * Strictly does NOT synthesize fake/random coordinates.
 */
function findKnownHubSuggestions(query: string): AddressSuggestion[] {
  const q = query.toLowerCase().trim();
  const results: AddressSuggestion[] = [];

  for (const [key, coords] of Object.entries(VIETNAM_LOCATION_DICT)) {
    if (key.includes(q) || q.includes(key)) {
      const formattedTitle = key.charAt(0).toUpperCase() + key.slice(1);
      results.push({
        id: `hub-${key}`,
        label: formattedTitle,
        address: `${formattedTitle}, TP. Hồ Chí Minh`,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (results.length >= 4) break;
    }
  }

  return results;
}

export const POPULAR_MAP_SUGGESTIONS: readonly AddressSuggestion[] = [
  {
    id: 'popular-gps',
    label: 'Vị trí hiện tại của bạn',
    address: 'Chạm để tự động xác định địa chỉ chính xác qua GPS',
    lat: 0,
    lng: 0,
  },
  {
    id: 'popular-tsn',
    label: 'Sân bay Quốc tế Tân Sơn Nhất',
    address: 'Đường Trường Sơn, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
    lat: 10.8185,
    lng: 106.6588,
  },
  {
    id: 'popular-benthanh',
    label: 'Chợ Bến Thành',
    address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    lat: 10.7725,
    lng: 106.698,
  },
  {
    id: 'popular-landmark81',
    label: 'Tòa nhà Landmark 81',
    address: '720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.7954,
    lng: 106.722,
  },
  {
    id: 'popular-tanbinh',
    label: 'Kho Hàng Tân Bình',
    address: 'Kho VLXD Tân Bình, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
    lat: 10.795,
    lng: 106.652,
  },
  {
    id: 'popular-catlai',
    label: 'Cảng Cát Lái',
    address: 'Đường Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh',
    lat: 10.764,
    lng: 106.796,
  },
  {
    id: 'popular-bxmd',
    label: 'Bến Xe Miền Đông',
    address: '292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.813,
    lng: 106.711,
  },
];

/**
 * Reverse geocodes coordinates into an exact human-readable street address.
 * Uses Vietmap Reverse API v3, then OpenStreetMap Nominatim, then closest known hub.
 */
export async function reverseGeocodeCoords(
  coords: { lat: number; lng: number },
  apiKey?: string,
): Promise<string> {
  const { lat, lng } = coords;

  // 1. Vietmap Reverse Geocode API v3 (returns exact street name & house number in Vietnam)
  if (apiKey) {
    try {
      const url = `https://maps.vietmap.vn/api/reverse/v3?lat=${lat}&lng=${lng}&apikey=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Array<{
          name?: string;
          display?: string;
          address?: string;
        }>;
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const formatted =
            item.display ||
            (item.name && item.address ? `${item.name}, ${item.address}` : item.name) ||
            item.address;
          if (formatted && formatted.trim().length > 0) {
            return formatted.trim();
          }
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  // 2. OpenStreetMap Nominatim Reverse Geocoding fallback
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(osmUrl, {
      headers: {
        'Accept-Language': 'vi',
        'User-Agent': 'LEOPARD-Logistics-App/1.0',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // Continue to next fallback
  }

  // 3. Proximity to known logistics hubs
  for (const [key, hubCoords] of Object.entries(VIETNAM_LOCATION_DICT)) {
    const dLat = Math.abs(hubCoords.lat - lat);
    const dLng = Math.abs(hubCoords.lng - lng);
    if (dLat < 0.015 && dLng < 0.015) {
      const formattedTitle = key.charAt(0).toUpperCase() + key.slice(1);
      return `${formattedTitle}, TP. Hồ Chí Minh`;
    }
  }

  return `Vị trí tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export type MapAddressPickerModalProps = Readonly<{
  visible: boolean;
  target: 'pickup' | 'dropoff';
  initialAddress: string;
  defaultFallbackAddress: string;
  userName?: string;
  userPhone?: string;
  loggedInCustomer?: { name?: string; phone?: string } | null;
  vietmapApiKey?: string;
  onClose: () => void;
  onConfirm: (
    confirmedAddress: string,
    details?: {
      note: string;
      senderName: string;
      senderPhone: string;
      coords?: MapCoordinate;
    },
  ) => void;
}>;

export function MapAddressPickerModal({
  visible,
  target,
  initialAddress,
  defaultFallbackAddress,
  userName,
  userPhone,
  loggedInCustomer,
  vietmapApiKey,
  onClose,
  onConfirm,
}: MapAddressPickerModalProps) {
  const [modalAddress, setModalAddress] = useState(initialAddress);
  const [customPinCoords, setCustomPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [mapAddressNote, setMapAddressNote] = useState('');
  const [senderName, setSenderName] = useState(userName || 'Anh Hoàng');
  const [senderPhone, setSenderPhone] = useState(userPhone || '0901234567');
  const [focusedModalInput, setFocusedModalInput] = useState<'address' | 'note' | 'name' | 'phone' | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const modalAddressInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const starting = initialAddress.trim()
        ? initialAddress.trim()
        : target === 'pickup'
          ? defaultFallbackAddress
          : '';
      setModalAddress(starting);
      setCustomPinCoords(null);
      setMapAddressNote('');
      setSenderName(loggedInCustomer?.name || userName || 'Anh Hoàng');
      setSenderPhone(
        formatVietnamesePhone(loggedInCustomer?.phone || userPhone) ||
          userPhone ||
          '0901234567',
      );
      setFocusedModalInput(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [visible, initialAddress, defaultFallbackAddress, target, userName, userPhone, loggedInCustomer]);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const reverseGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveVietmapApiKey =
    vietmapApiKey ||
    (typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_VIETMAP_API_KEY
      : undefined);

  // Debounced Realtime Address Search (Vietmap Backend -> Direct Vietmap -> Known Hubs)
  useEffect(() => {
    if (focusedModalInput !== 'address') {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    const q = modalAddress?.trim() || '';

    // When query is empty or 1 character: present popular and quick suggestions like Grab/Google Maps
    if (q.length < 2) {
      setSuggestions([...POPULAR_MAP_SUGGESTIONS]);
      setShowSuggestions(true);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let foundItems: AddressSuggestion[] = [];

        // 1. Primary: Backend API proxy with VietmapProvider (reject any DEMO source)
        try {
          const res = await httpClient.get<{
            results?: Array<{
              placeId?: string;
              id?: string;
              label?: string;
              name?: string;
              address?: string;
              lat?: number;
              lng?: number;
            }>;
            source?: string;
          }>(`/maps/search?q=${encodeURIComponent(q)}`);

          if (
            res?.source !== 'DEMO' &&
            res?.results &&
            res.results.length > 0
          ) {
            foundItems = res.results
              .filter(
                (r) =>
                  typeof r.lat === 'number' &&
                  typeof r.lng === 'number' &&
                  !r.label?.includes('(Demo data)') &&
                  !r.address?.includes('(Demo data)'),
              )
              .map((r, idx) => ({
                id: r.placeId || r.id || `sugg-${idx}`,
                label: (r.label || r.name || 'Địa điểm').replace(/\s*\(Demo data\)/gi, ''),
                address: (r.address || r.label || r.name || q).replace(/\s*\(Demo data\)/gi, ''),
                lat: r.lat as number,
                lng: r.lng as number,
              }));
          }
        } catch {
          // Backend may be offline or unauthenticated
        }

        // 2. Direct Vietmap Autocomplete v4 + Geocode v4 API
        if (foundItems.length === 0 && effectiveVietmapApiKey) {
          foundItems = await searchVietmapDirect(q, effectiveVietmapApiKey);
        }

        // 3. Known real logistics hubs (strictly real coordinates, no random fake hash)
        if (foundItems.length === 0) {
          foundItems = findKnownHubSuggestions(q);
        }

        setSuggestions(foundItems);
        setShowSuggestions(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [modalAddress, focusedModalInput, effectiveVietmapApiKey]);

  const mapCoords = useMemo(() => {
    if (customPinCoords) return customPinCoords;
    if (modalAddress && modalAddress.trim()) {
      return resolveLocationCoords(modalAddress);
    }
    return resolveLocationCoords(defaultFallbackAddress || 'Kho Tân Bình, TP. Hồ Chí Minh');
  }, [customPinCoords, modalAddress, defaultFallbackAddress]);

  const handleChangeAddress = () => {
    setModalAddress('');
    setCustomPinCoords(null);
    setSuggestions([...POPULAR_MAP_SUGGESTIONS]);
    setShowSuggestions(true);
    setTimeout(() => {
      modalAddressInputRef.current?.focus();
    }, 60);
  };

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    if (item.id === 'popular-gps') {
      handleGetCurrentGpsLocation();
      return;
    }
    const selectedText = item.address || item.label;
    setModalAddress(selectedText);
    setCustomPinCoords({ lat: item.lat, lng: item.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Reverse geocodes coords when user drags or taps map pin
  const handlePinMoved = (coords: { lat: number; lng: number }) => {
    setCustomPinCoords(coords);
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
    }
    reverseGeocodeTimerRef.current = setTimeout(async () => {
      setIsReverseGeocoding(true);
      try {
        const readableAddress = await reverseGeocodeCoords(coords, effectiveVietmapApiKey);
        if (readableAddress && readableAddress.trim()) {
          setModalAddress(readableAddress);
        }
      } catch {
        // Keep current address on error
      } finally {
        setIsReverseGeocoding(false);
      }
    }, 400);
  };

  const handleGetCurrentGpsLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocatingGps(true);
      setIsReverseGeocoding(true);
      setModalAddress('Đang định vị GPS…');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setCustomPinCoords({ lat, lng });

          try {
            const humanAddress = await reverseGeocodeCoords(
              { lat, lng },
              effectiveVietmapApiKey,
            );
            setModalAddress(humanAddress);
          } catch {
            setModalAddress(`Vị trí tại (${lat}, ${lng})`);
          } finally {
            setIsLocatingGps(false);
            setIsReverseGeocoding(false);
            setSuggestions([]);
            setShowSuggestions(false);
          }
        },
        (err) => {
          setIsLocatingGps(false);
          setIsReverseGeocoding(false);
          console.warn('Geolocation error:', err.message);
          setModalAddress(initialAddress || defaultFallbackAddress);
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  };

  const handleFillMySenderInfo = () => {
    const resolvedName = loggedInCustomer?.name || userName || 'Anh Hoàng';
    const rawPhone = loggedInCustomer?.phone || userPhone;
    const resolvedPhone = formatVietnamesePhone(rawPhone) || rawPhone || '0901234567';
    setSenderName(resolvedName);
    setSenderPhone(resolvedPhone);
  };

  const handleSave = () => {
    const finalAddress =
      modalAddress.trim() && !modalAddress.includes('Đang định vị')
        ? modalAddress.trim()
        : defaultFallbackAddress;
    onConfirm(finalAddress, {
      note: mapAddressNote,
      senderName,
      senderPhone,
      coords: customPinCoords || mapCoords,
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.mapModalOverlay}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.mapModalSafeArea}>
          {/* Top Bar with Close X and Title */}
          <View style={styles.mapModalTopBar}>
            <Pressable
              accessibilityLabel="Đóng màn hình bản đồ"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.mapModalCloseBtn}
            >
              <Text style={styles.mapModalCloseBtnText}>✕</Text>
            </Pressable>
            <Text style={styles.mapModalTopBarTitle}>
              {target === 'pickup' ? 'Thông tin người gửi' : 'Thông tin người nhận'}
            </Text>
            <View style={styles.topBarSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.mapModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Real Interactive Map Stage */}
            <View style={styles.mapStageContainer}>
              <RealInteractiveMap
                height={260}
                initialPinCoords={mapCoords}
                interactive={true}
                mode="pin"
                onLocationChange={(coords) => {
                  handlePinMoved(coords);
                }}
                origin={{ label: modalAddress || 'Vị trí đã chọn', coords: mapCoords }}
                title="Xác nhận vị trí giao nhận"
                vietmapApiKey={effectiveVietmapApiKey}
              />

              {/* Top-Left Close overlay pill */}
              <Pressable
                accessibilityLabel="Đóng bản đồ"
                onPress={onClose}
                style={styles.mapOverlayCloseBtn}
              >
                <Text style={styles.mapOverlayCloseBtnText}>‹ Đóng</Text>
              </Pressable>
            </View>

            {/* Detail Address Card */}
            <View style={styles.mapAddressCard}>
              <View style={styles.mapAddressHeaderRow}>
                <View style={styles.mapAddressHeaderLabelRow}>
                  <View
                    style={[
                      styles.mapAddressTypeDot,
                      target === 'pickup'
                        ? styles.mapAddressTypeDotPickup
                        : styles.mapAddressTypeDotDropoff,
                    ]}
                  />
                  <Text style={styles.mapAddressSectionTitle}>
                    {target === 'pickup' ? 'Lấy hàng tại' : 'Giao hàng đến'}
                  </Text>
                </View>

                <Pressable
                  accessibilityLabel="Thay đổi địa chỉ"
                  accessibilityRole="button"
                  onPress={handleChangeAddress}
                  style={styles.mapChangeAddrBtn}
                >
                  <Text style={styles.mapChangeAddrBtnText}>Thay đổi</Text>
                </Pressable>
              </View>

              {/* Address Input Field */}
              <View
                style={[
                  styles.mapInputWrapper,
                  styles.mapAddressInputWrapper,
                  focusedModalInput === 'address' && styles.mapInputWrapperFocused,
                ]}
              >
                <View style={styles.mapInputLeadingIcon}>
                  <IconLocationPin
                    color={target === 'pickup' ? '#16A34A' : '#0284C7'}
                    size={20}
                  />
                </View>
                <TextInput
                  accessibilityLabel={target === 'pickup' ? 'Địa chỉ lấy hàng' : 'Địa chỉ giao hàng'}
                  onBlur={() => {
                    // Short timeout to allow clicking a suggestion before blur dismisses it
                    setTimeout(() => {
                      setFocusedModalInput(null);
                    }, 200);
                  }}
                  onChangeText={(val) => {
                    setModalAddress(val);
                    setCustomPinCoords(null);
                  }}
                  onFocus={() => {
                    setFocusedModalInput('address');
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder={
                    target === 'pickup'
                      ? 'Nhập địa chỉ lấy hàng (số nhà, đường, quận...)'
                      : 'Nhập địa chỉ giao hàng (số nhà, đường, quận...)'
                  }
                  placeholderTextColor="#94A3B8"
                  ref={modalAddressInputRef}
                  style={styles.mapTextInput}
                  value={modalAddress}
                />

                {isSearching ? (
                  <View style={styles.searchingBadge}>
                    <Text style={styles.searchingBadgeText}>Đang tìm…</Text>
                  </View>
                ) : null}

                {modalAddress.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa địa chỉ"
                    hitSlop={8}
                    onPress={() => {
                      setModalAddress('');
                      setCustomPinCoords(null);
                      setSuggestions([]);
                      setShowSuggestions(false);
                      modalAddressInputRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Realtime Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 ? (
                <View style={styles.suggestionsContainer} testID="address-suggestions-dropdown">
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderTitle}>
                      {modalAddress.trim().length < 2
                        ? 'VỊ TRÍ PHỔ BIẾN & TIỆN ÍCH'
                        : 'GỢI Ý TỪ BẢN ĐỒ'}
                    </Text>
                    <Pressable
                      accessibilityLabel="Đóng gợi ý địa chỉ"
                      hitSlop={8}
                      onPress={() => setShowSuggestions(false)}
                      style={styles.suggestionsCloseBtn}
                    >
                      <Text style={styles.suggestionsCloseBtnText}>✕ Đóng</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={styles.suggestionsListScroll}
                  >
                    {suggestions.map((item) => {
                      const isGpsItem = item.id === 'popular-gps';
                      return (
                        <Pressable
                          accessibilityLabel={`Chọn ${item.label}`}
                          accessibilityRole="button"
                          key={item.id}
                          onPress={() => handleSelectSuggestion(item)}
                          style={({ pressed }) => [
                            styles.suggestionItem,
                            isGpsItem && styles.suggestionItemGps,
                            pressed && styles.suggestionItemPressed,
                          ]}
                          testID={`suggestion-item-${item.id}`}
                        >
                          <View
                            style={[
                              styles.suggestionIconSquircle,
                              isGpsItem && styles.suggestionIconSquircleGps,
                            ]}
                          >
                            <IconLocationPin
                              color={isGpsItem ? '#16A34A' : '#0284C7'}
                              size={16}
                            />
                          </View>
                          <View style={styles.suggestionTextCol}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.suggestionTitle,
                                isGpsItem && styles.suggestionTitleGps,
                              ]}
                            >
                              {item.label}
                            </Text>
                            <Text numberOfLines={2} style={styles.suggestionAddress}>
                              {item.address}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.suggestionActionApply,
                              isGpsItem && styles.suggestionActionGps,
                            ]}
                          >
                            {isGpsItem ? 'Định vị ›' : 'Áp dụng ›'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* No results notice */}
              {showSuggestions && !isSearching && suggestions.length === 0 && modalAddress.trim().length >= 2 ? (
                <View style={styles.noSuggestionsContainer} testID="address-no-suggestions">
                  <Text style={styles.noSuggestionsTitle}>Không tìm thấy địa điểm trên bản đồ</Text>
                  <Text style={styles.noSuggestionsSubtitle}>
                    Vui lòng nhập tên đường, tòa nhà hoặc chọn vị trí hiện tại để định vị.
                  </Text>
                </View>
              ) : null}

              {/* Coordinates Confirmation Notice (Human-readable address, NO raw numbers!) */}
              {customPinCoords ? (
                <View style={styles.pinnedNotice}>
                  <Text numberOfLines={2} style={styles.pinnedNoticeText}>
                    {isReverseGeocoding ? 'Đang cập nhật địa chỉ…' : `Đã ghim: ${modalAddress || 'Vị trí đã chọn'}`}
                  </Text>
                </View>
              ) : null}

              {/* Address Note Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'note' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel="Thêm ghi chú địa chỉ"
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setMapAddressNote}
                  onFocus={() => setFocusedModalInput('note')}
                  placeholder="Thêm ghi chú địa chỉ (tòa nhà, số tầng, chỉ dẫn...)"
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={mapAddressNote}
                />
                {mapAddressNote.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa ghi chú"
                    hitSlop={8}
                    onPress={() => setMapAddressNote('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.mapSectionSeparator} />

            {/* Sender / Contact Information Section */}
            <View style={styles.mapSenderSection}>
              <View style={styles.mapSenderHeaderRow}>
                <Text style={styles.mapSenderSectionTitle}>
                  {target === 'pickup' ? 'THÔNG TIN NGƯỜI GỬI' : 'THÔNG TIN NGƯỜI NHẬN'}
                </Text>
                <Pressable
                  accessibilityLabel={target === 'pickup' ? 'Tôi là người gửi' : 'Tôi là người nhận'}
                  onPress={handleFillMySenderInfo}
                  style={styles.mapSenderMeBtn}
                >
                  <Text style={styles.mapSenderMeBtnText}>
                    {target === 'pickup' ? 'Tôi là người gửi' : 'Tôi là người nhận'}
                  </Text>
                </Pressable>
              </View>

              {/* Name Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'name' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel={target === 'pickup' ? 'Tên người gửi' : 'Tên người nhận'}
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setSenderName}
                  onFocus={() => setFocusedModalInput('name')}
                  placeholder={target === 'pickup' ? 'Tên người gửi' : 'Tên người nhận'}
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={senderName}
                />
                {senderName.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa tên người gửi"
                    hitSlop={8}
                    onPress={() => setSenderName('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Phone Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'phone' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  keyboardType="phone-pad"
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setSenderPhone}
                  onFocus={() => setFocusedModalInput('phone')}
                  placeholder="Số điện thoại liên hệ"
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={senderPhone}
                />
                {senderPhone.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa số điện thoại"
                    hitSlop={8}
                    onPress={() => setSenderPhone('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Action Bar (Hủy / Lưu) */}
          <View style={styles.mapModalBottomBar}>
            <Pressable
              accessibilityLabel="Hủy xác nhận địa chỉ"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.mapCancelBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.mapCancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Lưu thông tin vị trí"
              accessibilityRole="button"
              onPress={handleSave}
              style={({ pressed }) => [
                styles.mapSaveBtn,
                pressed && styles.mapSaveBtnPressed,
              ]}
            >
              <Text style={styles.mapSaveBtnText}>Lưu</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mapModalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      } as any,
    }),
  },
  mapModalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBarSpacer: {
    width: 32,
  },
  mapModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  mapModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  mapModalCloseBtnText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
  mapModalTopBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  mapModalScrollContent: {
    paddingBottom: 24,
  },
  mapStageContainer: {
    height: 260,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlayCloseBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  mapOverlayCloseBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapAddressCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  mapAddressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapAddressHeaderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapAddressSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapAddressTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapAddressTypeDotPickup: {
    backgroundColor: '#16A34A',
  },
  mapAddressTypeDotDropoff: {
    backgroundColor: '#DC2626',
  },
  mapChangeAddrBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mapChangeAddrBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  mapAddressInputWrapper: {
    borderColor: '#94A3B8',
  },
  mapInputLeadingIcon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  searchingBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  mapInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    minHeight: 50,
  },
  mapInputWrapperFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  mapTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginTop: -4,
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  suggestionsHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.3,
  },
  suggestionsCloseBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
  },
  suggestionsCloseBtnText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '700',
  },
  suggestionsListScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  suggestionItemPressed: {
    backgroundColor: '#F0F9FF',
  },
  suggestionIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionAddress: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  suggestionActionApply: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  suggestionItemGps: {
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#DCFCE7',
  },
  suggestionIconSquircleGps: {
    backgroundColor: '#DCFCE7',
  },
  suggestionTitleGps: {
    color: '#15803D',
    fontWeight: '800',
  },
  suggestionActionGps: {
    color: '#16A34A',
    fontWeight: '800',
  },
  noSuggestionsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: -4,
    marginBottom: 4,
    gap: 4,
  },
  noSuggestionsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  noSuggestionsSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  pinnedNotice: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: -4,
  },
  pinnedNoticeText: {
    fontSize: 11.5,
    color: '#15803D',
    fontWeight: '600',
  },
  mapSectionSeparator: {
    height: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  mapSenderSection: {
    padding: 16,
    gap: 12,
  },
  mapSenderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapSenderSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapSenderMeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  mapSenderMeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  mapModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  mapCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#475569',
  },
  mapSaveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  mapSaveBtnPressed: {
    backgroundColor: '#0369A1',
    transform: [{ scale: 0.98 }],
  },
  mapSaveBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 13,
  },
  pressed: {
    opacity: 0.8,
  },
});
