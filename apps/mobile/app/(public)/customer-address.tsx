import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import {
  AppText,
  IconCheck,
  IconChevronLeft,
  IconHome,
  IconLocationPin,
  IconOffice,
  IconPhone,
  IconSearch,
  IconTag,
  IconUser,
  IconWarehouse,
  ScreenScaffold,
  colors,
  customerPalette,
  httpClient,
  iosContinuousCurve,
  layout,
  leopardPalette,
  leopardRadius,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { addressStore, type SavedAddress } from '../../src/features/customer/addresses/address-store';
import {
  POPULAR_MAP_SUGGESTIONS,
  reverseGeocodeCoords,
  searchVietmapDirect,
} from '../../src/features/home/components/MapAddressPickerModal';

interface SearchResultItem {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

const POPULAR_SUGGESTIONS: readonly SearchResultItem[] = POPULAR_MAP_SUGGESTIONS.map((s) => ({
  id: s.id,
  name: s.label,
  address: s.address,
  lat: s.lat,
  lng: s.lng,
}));

type AddressCategory = 'WAREHOUSE' | 'HOME' | 'OFFICE' | 'OTHER';

const CATEGORY_CHIPS = [
  { key: 'WAREHOUSE' as const, label: 'Kho chính', Icon: IconWarehouse, testID: 'ca-chip-warehouse' },
  { key: 'OFFICE' as const, label: 'Văn phòng', Icon: IconOffice, testID: 'ca-chip-office' },
  { key: 'HOME' as const, label: 'Kho phụ', Icon: IconHome, testID: 'ca-chip-home' },
  { key: 'OTHER' as const, label: 'Khác', Icon: IconTag, testID: 'ca-chip-other' },
] as const;

export default function CustomerAddAddressScreen() {
  const router = useRouter();

  const [addressLabel, setAddressLabel] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<readonly SearchResultItem[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.795,
    lng: 106.652,
  });
  const [selectedAddress, setSelectedAddress] = useState(
    '120 Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
  );
  const [addressDetail, setAddressDetail] = useState('');
  const [category, setCategory] = useState<AddressCategory>('WAREHOUSE');
  const [isDefault, setIsDefault] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Debounced search via /maps/search, Vietmap direct, or popular suggestions
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      if (focusedField === 'search') {
        setSearchResults(POPULAR_SUGGESTIONS);
      } else {
        setSearchResults([]);
      }
      return;
    }

    if (q.length < 2) {
      setSearchResults(POPULAR_SUGGESTIONS);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const vietmapApiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
        let list: SearchResultItem[] = [];

        try {
          const res = await httpClient.get<{
            source?: string;
            results: Array<{
              id: string;
              name?: string;
              address?: string;
              label?: string;
              lat?: number;
              lng?: number;
              source?: string;
            }>;
          }>(`/maps/search?q=${encodeURIComponent(q)}`);

          if (res?.source !== 'DEMO' && Array.isArray(res?.results)) {
            list = res.results
              .filter(
                (r) =>
                  r.source !== 'DEMO' &&
                  !r.name?.includes('(Demo data)') &&
                  !r.address?.includes('(Demo data)'),
              )
              .map((r) => ({
                id: r.id,
                name: (r.name || r.label || 'Địa điểm').replace(/\s*\(Demo data\)/gi, '').trim(),
                address: (r.address || r.label || r.name || '').replace(/\s*\(Demo data\)/gi, '').trim(),
                lat: r.lat,
                lng: r.lng,
              }));
          }
        } catch {
          // fallback
        }

        if (list.length === 0 && vietmapApiKey) {
          const direct = await searchVietmapDirect(q, vietmapApiKey);
          list = direct.map((d) => ({
            id: d.id,
            name: d.label,
            address: d.address,
            lat: d.lat,
            lng: d.lng,
          }));
        }

        if (list.length === 0) {
          list = POPULAR_SUGGESTIONS.filter(
            (s) =>
              s.id !== 'popular-gps' &&
              (s.name.toLowerCase().includes(q.toLowerCase()) ||
                s.address.toLowerCase().includes(q.toLowerCase())),
          );
        }

        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [focusedField, searchQuery]);

  // Listen to interactive map pin moves on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'LEOPARD_MAP_PIN_MOVED') {
        const { lat, lng } = event.data as { lat?: number; lng?: number };
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCoords({ lat, lng });
          const vietmapApiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
          try {
            const resolved = await reverseGeocodeCoords({ lat, lng }, vietmapApiKey);
            setSelectedAddress(resolved || 'Vị trí đã chọn');
          } catch {
            setSelectedAddress('Vị trí đã chọn');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/customer/home');
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    const vietmapApiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // 1. Try Native/Expo Location API (iOS & Android devices)
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch {
        // Fallback to browser geolocation
      }

      // 2. Fallback to Web Geolocation API (Browser/PWA)
      if (lat === null || lng === null) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
                resolve();
              },
              () => resolve(),
              { timeout: 8000, enableHighAccuracy: true },
            );
          });
        }
      }

      if (typeof lat === 'number' && typeof lng === 'number') {
        setCoords({ lat, lng });
        try {
          const resolved = await reverseGeocodeCoords({ lat, lng }, vietmapApiKey);
          setSelectedAddress(resolved || 'Vị trí hiện tại của bạn');
        } catch {
          setSelectedAddress('Vị trí hiện tại của bạn');
        }
      } else {
        // Default deterministic fallback if permission was not granted
        const fallbackLat = 10.7725;
        const fallbackLng = 106.698;
        setCoords({ lat: fallbackLat, lng: fallbackLng });
        setSelectedAddress('135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
      }
    } catch {
      const fallbackLat = 10.7725;
      const fallbackLng = 106.698;
      setCoords({ lat: fallbackLat, lng: fallbackLng });
      setSelectedAddress('135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectSuggestion = (item: SearchResultItem) => {
    if (item.id === 'popular-gps') {
      handleGetCurrentLocation();
      setSearchQuery('');
      setSearchResults([]);
      return;
    }
    setSelectedAddress(item.address);
    if (item.lat && item.lng) {
      setCoords({ lat: item.lat, lng: item.lng });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSaveAddress = () => {
    const fullAddress = addressDetail.trim()
      ? `${addressDetail.trim()}, ${selectedAddress}`
      : selectedAddress;

    const labelMap: Record<AddressCategory, string> = {
      WAREHOUSE: 'Kho chính',
      HOME: 'Kho phụ',
      OFFICE: 'Văn phòng',
      OTHER: 'Địa chỉ đã lưu',
    };

    const effectiveLabel = addressLabel.trim() || labelMap[category];

    const saved: Omit<SavedAddress, 'id'> = {
      label: effectiveLabel,
      address: fullAddress,
      category,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      isDefault,
    };

    addressStore.saveAddress(saved);

    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/customer/home');
    }
  };

  // Interactive Leaflet/OpenStreetMap HTML template
  const mapHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.85) !important; padding: 2px 4px !important; }
    .pulse-pin-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pulse-pin-pulse {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(11, 37, 69, 0.2);
      animation: pinPulse 1.8s ease-out infinite;
    }
    .pulse-pin-core {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${customerPalette.primary};
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .pulse-pin-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #FFFFFF;
    }
    @keyframes pinPulse {
      0% { transform: scale(0.5); opacity: 0.95; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lat = ${coords.lat};
    var lng = ${coords.lng};
    var map = L.map('map', {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false
    });

    var primaryTiles = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '© Google Maps'
    }).addTo(map);

    primaryTiles.on('tileerror', function() {
      if (!window._cartoFallback) {
        window._cartoFallback = true;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c', 'd'],
          attribution: '© CARTO'
        }).addTo(map);
      }
    });

    var customIcon = L.divIcon({
      className: 'custom-pin',
      html: '<div class="pulse-pin-wrap"><div class="pulse-pin-pulse"></div><div class="pulse-pin-core"><div class="pulse-pin-dot"></div></div></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    var marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    function notify(newLat, newLng) {
      try {
        window.parent.postMessage({ type: 'LEOPARD_MAP_PIN_MOVED', lat: newLat, lng: newLng }, '*');
      } catch (e) {}
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      notify(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notify(e.latlng.lat, e.latlng.lng);
    });
  </script>
</body>
</html>`;
  }, [coords.lat, coords.lng]);

  return (
    <ScreenScaffold
      headerLeading={
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          testID="ca-back-btn"
        >
          <IconChevronLeft color={customerPalette.primary} size={22} />
        </Pressable>
      }
      stickyFooter={
        <View style={styles.footerWrap}>
          <Pressable
            accessibilityLabel="Lưu kho & Vào trang chủ"
            accessibilityRole="button"
            onPress={handleSaveAddress}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            testID="ca-submit-btn"
          >
            <Text style={styles.primaryBtnText}>Lưu kho & Vào trang chủ</Text>
          </Pressable>
        </View>
      }
      title="Thêm địa chỉ mới"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <View style={styles.innerWrapper}>
          {/* ================= 1. COMPACT MAP & LOCATION CARD ================= */}
          <View style={styles.mapContainerCard}>
            <View style={styles.mapGraphic}>
              {Platform.OS === 'web' ? (
                React.createElement('iframe', {
                  key: `osm-map-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`,
                  srcDoc: mapHtml,
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  },
                  title: 'Bản đồ thực tế OpenStreetMap',
                })
              ) : (
                <View style={styles.nativeMapFallback}>
                  <View style={styles.mapRoadH} />
                  <View style={styles.mapRoadV} />
                  <View style={styles.mapPinPulse} />
                  <View style={styles.mapPinWrap}>
                    <IconLocationPin color={customerPalette.primary} size={28} strokeWidth={2} />
                  </View>
                </View>
              )}

              {/* Floating GPS button */}
              <Pressable
                accessibilityLabel="Sử dụng vị trí hiện tại"
                accessibilityRole="button"
                disabled={isLocating}
                onPress={handleGetCurrentLocation}
                style={({ pressed }) => [styles.mapGpsFloatingBtn, pressed && styles.pressed]}
                testID="ca-use-current-location"
              >
                {isLocating ? (
                  <ActivityIndicator color={customerPalette.primary} size="small" />
                ) : (
                  <>
                    <IconLocationPin color={customerPalette.primary} size={15} strokeWidth={2.2} />
                    <Text style={styles.mapGpsFloatingText}>Vị trí hiện tại</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Address bar under map */}
            <View style={styles.addressBar}>
              <View style={styles.pinIconWrap}>
                <IconLocationPin color={customerPalette.primary} size={16} strokeWidth={2} />
              </View>
              <Text numberOfLines={2} style={styles.addressBarText}>
                {selectedAddress}
              </Text>
            </View>
          </View>

          {/* ================= 2. COMPACT SEARCH BAR ================= */}
          <View style={styles.searchSection}>
            <View
              style={[
                styles.searchInputContainer,
                focusedField === 'search' && styles.inputFocused,
              ]}
            >
              <IconSearch color={customerPalette.textSubtle} size={16} />
              <TextInput
                accessibilityLabel="Tìm kiếm địa chỉ"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setSearchQuery}
                onFocus={() => setFocusedField('search')}
                placeholder="Tìm kiếm địa chỉ khác..."
                placeholderTextColor={customerPalette.offlineGray}
                style={styles.searchInput}
                testID="ca-search-input"
                value={searchQuery}
              />
              {isSearching ? <ActivityIndicator color={customerPalette.primary} size="small" /> : null}
            </View>

            {/* Suggestions list */}
            {searchResults.length > 0 ? (
              <View style={styles.suggestionsCard}>
                {searchResults.map((item, idx) => (
                  <Pressable
                    key={item.id || idx}
                    onPress={() => handleSelectSuggestion(item)}
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      pressed && styles.suggestionItemPressed,
                      idx < searchResults.length - 1 && styles.suggestionDivider,
                    ]}
                  >
                    <IconLocationPin color={customerPalette.primary} size={15} />
                    <View style={styles.suggestionTextWrap}>
                      <Text numberOfLines={1} style={styles.suggestionName}>
                        {item.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.suggestionAddress}>
                        {item.address}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* ================= 3. COMPACT FORM CARD ================= */}
          <View style={styles.formCard}>
            {/* Tên gợi nhớ */}
            <View style={styles.formRow}>
              <Text style={styles.fieldLabel}>Tên gợi nhớ</Text>
              <TextInput
                accessibilityLabel="Tên gợi nhớ địa chỉ"
                onBlur={() => setFocusedField(null)}
                onChangeText={setAddressLabel}
                onFocus={() => setFocusedField('label')}
                placeholder="Kho Tân Bình, Cửa hàng Q1..."
                placeholderTextColor={customerPalette.offlineGray}
                style={[
                  styles.compactInput,
                  focusedField === 'label' && styles.inputFocused,
                ]}
                testID="ca-label-input"
                value={addressLabel}
              />
            </View>

            {/* Chi tiết số nhà, số kho */}
            <View style={styles.formRow}>
              <Text style={styles.fieldLabel}>Chi tiết số kho / phòng</Text>
              <TextInput
                accessibilityLabel="Chi tiết địa chỉ"
                onBlur={() => setFocusedField(null)}
                onChangeText={setAddressDetail}
                onFocus={() => setFocusedField('detail')}
                placeholder="Cổng 2, Kho A3, Tầng 4..."
                placeholderTextColor={customerPalette.offlineGray}
                style={[
                  styles.compactInput,
                  focusedField === 'detail' && styles.inputFocused,
                ]}
                testID="ca-detail-input"
                value={addressDetail}
              />
            </View>

            {/* Phân loại địa chỉ */}
            <View style={styles.formRow}>
              <Text style={styles.fieldLabel}>Loại địa chỉ</Text>
              <View style={styles.chipsRow}>
                {CATEGORY_CHIPS.map((chip) => {
                  const active = category === chip.key;
                  const IconComp = chip.Icon;
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() => setCategory(chip.key)}
                      style={({ pressed }) => [
                        styles.chip,
                        active && styles.chipActive,
                        pressed && styles.pressed,
                      ]}
                      testID={chip.testID}
                    >
                      <IconComp
                        color={active ? customerPalette.surfaceWhite : customerPalette.textSubtle}
                        size={13}
                        strokeWidth={2}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Thủ kho giao nhận */}
            <View style={styles.formRow}>
              <Text style={styles.fieldLabel}>Thủ kho giao nhận</Text>
              <View style={styles.contactTwoCols}>
                <View
                  style={[
                    styles.contactInputWrap,
                    focusedField === 'contactName' && styles.inputFocused,
                  ]}
                >
                  <IconUser color={customerPalette.textSubtle} size={15} />
                  <TextInput
                    accessibilityLabel="Tên người liên hệ"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactName}
                    onFocus={() => setFocusedField('contactName')}
                    placeholder="Tên người liên hệ"
                    placeholderTextColor={customerPalette.offlineGray}
                    style={styles.contactInput}
                    testID="ca-contact-name"
                    value={contactName}
                  />
                </View>

                <View
                  style={[
                    styles.contactInputWrap,
                    focusedField === 'contactPhone' && styles.inputFocused,
                  ]}
                >
                  <IconPhone color={customerPalette.textSubtle} size={15} />
                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    keyboardType="phone-pad"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactPhone}
                    onFocus={() => setFocusedField('contactPhone')}
                    placeholder="Số điện thoại"
                    placeholderTextColor={customerPalette.offlineGray}
                    style={styles.contactInput}
                    testID="ca-contact-phone"
                    value={contactPhone}
                  />
                </View>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Checkbox mặc định */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDefault }}
              onPress={() => setIsDefault((prev) => !prev)}
              style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
              testID="ca-default-checkbox"
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
                {isDefault ? <IconCheck color={customerPalette.surfaceWhite} size={13} strokeWidth={3} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                Đặt làm địa chỉ mặc định khi tạo đơn vận chuyển
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

export const CustomerAddressSetupScreen = CustomerAddAddressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customerPalette.canvas,
  },
  scrollContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: spacing.sm,
  },

  /* Header */
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },

  /* Map Card */
  mapContainerCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    ...iosContinuousCurve,
  },
  mapGraphic: {
    height: 155,
    backgroundColor: customerPalette.cardBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  nativeMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.cardBorder,
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: customerPalette.cardBorder,
    top: '44%',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: customerPalette.cardBorder,
    left: '52%',
  },
  mapPinPulse: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
  },
  mapPinWrap: {
    zIndex: 5,
  },
  mapGpsFloatingBtn: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: customerPalette.surfaceWhite,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapGpsFloatingText: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
  },
  pinIconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBarText: {
    flex: 1,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },

  /* Search */
  searchSection: {
    position: 'relative',
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    height: 42,
    ...iosContinuousCurve,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    color: customerPalette.textSlateDark,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  suggestionsCard: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
    ...iosContinuousCurve,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  suggestionItemPressed: {
    backgroundColor: customerPalette.canvas,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: customerPalette.cardBorder,
  },
  suggestionTextWrap: {
    flex: 1,
    gap: 1,
  },
  suggestionName: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  suggestionAddress: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    color: customerPalette.textSubtle,
  },

  /* Form Card */
  formCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.sm,
    ...iosContinuousCurve,
  },
  formRow: {
    gap: spacing.xxs,
  },
  fieldLabel: {
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  compactInput: {
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    height: 42,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    color: customerPalette.textSlateDark,
    backgroundColor: customerPalette.canvas,
    ...iosContinuousCurve,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  chipActive: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  chipText: {
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    color: customerPalette.textMutedSlate,
  },
  chipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: customerPalette.cardBorder,
    marginVertical: spacing.hairline,
  },
  contactTwoCols: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  contactInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    height: 42,
    backgroundColor: customerPalette.canvas,
    ...iosContinuousCurve,
  },
  contactInput: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    color: customerPalette.textSlateDark,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: leopardRadius.md,
    borderWidth: 1.5,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
  },
  checkboxOn: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    color: customerPalette.textSlateDark,
  },

  /* Input Focus */
  inputFocused: {
    borderColor: customerPalette.primary,
    backgroundColor: customerPalette.surfaceWhite,
  },

  /* Sticky Footer */
  footerWrap: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: customerPalette.primary,
    borderRadius: radius.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    ...iosContinuousCurve,
  },
  primaryBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
