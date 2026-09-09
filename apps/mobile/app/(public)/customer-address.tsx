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

import { httpClient } from '../../src/api/http-client';
import { addressStore, type SavedAddress } from '../../src/features/customer/addresses/address-store';
import {
  BrandLoginLogo,
  IconHome,
  IconLocationPin,
  IconOffice,
  IconPhone,
  IconSearch,
  IconTag,
  IconUser,
  IconWarehouse,
  LeopardEmblem,
  LeopardMobileLogo,
} from '@leopard/mobile-core';
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
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
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
            setLocationSuccessMsg(`Đã chọn vị trí: ${resolved || 'Vị trí đã chọn'}`);
          } catch {
            setSelectedAddress('Vị trí đã chọn');
            setLocationSuccessMsg('Đã chọn vị trí trên bản đồ');
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

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    setLocationSuccessMsg(null);

    const vietmapApiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsLocating(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          try {
            const resolved = await reverseGeocodeCoords({ lat, lng }, vietmapApiKey);
            setSelectedAddress(resolved || 'Vị trí hiện tại của bạn');
            setLocationSuccessMsg(`Đã xác định vị trí: ${resolved || 'Vị trí hiện tại của bạn'}`);
          } catch {
            setSelectedAddress('Vị trí hiện tại của bạn');
            setLocationSuccessMsg('Đã xác định vị trí hiện tại của bạn');
          }
        },
        () => {
          setIsLocating(false);
          const fallbackLat = 10.7725;
          const fallbackLng = 106.698;
          setCoords({ lat: fallbackLat, lng: fallbackLng });
          setSelectedAddress('135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
          setLocationSuccessMsg('Đã xác định vị trí hiện tại của bạn');
        },
        { timeout: 8000, enableHighAccuracy: true },
      );
    } else {
      setTimeout(() => {
        setIsLocating(false);
        const fallbackLat = 10.7725;
        const fallbackLng = 106.698;
        setCoords({ lat: fallbackLat, lng: fallbackLng });
        setSelectedAddress('135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
        setLocationSuccessMsg('Đã xác định vị trí hiện tại của bạn');
      }, 500);
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
      setLocationSuccessMsg(`Đã chọn: ${item.name}`);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSaveAddress = () => {
    const fullAddress = addressDetail.trim()
      ? `${addressDetail.trim()}, ${selectedAddress}`
      : selectedAddress;

    const labelMap: Record<AddressCategory, string> = {
      WAREHOUSE: 'Kho hàng',
      HOME: 'Nhà riêng',
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

  // Real interactive Leaflet/OpenStreetMap HTML template
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
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.28);
      animation: pinPulse 1.8s ease-out infinite;
    }
    .pulse-pin-core {
      position: relative;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #EF4444;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
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
      zoomControl: true
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
      iconSize: [26, 26],
      iconAnchor: [13, 13]
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
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      style={styles.container}
    >
      <View style={styles.innerWrapper}>
        {/* ================= TOP NAVIGATION BAR ================= */}
        <View style={styles.topNavBar}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={10}
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            testID="ca-back-btn"
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>

          {/* Centered Brand Pill */}
          <View style={styles.brandRow}>
            <LeopardEmblem testID="address-brand-emblem" width={56} />
            <BrandLoginLogo height={34} testID="address-brand-logo" />
          </View>

          {/* Invisible 44px spacer balancing back button */}
          <View style={styles.navSpacer} />
        </View>

        {/* ================= MAIN UNIFIED CARD ================= */}
        <View style={styles.card}>
          {/* Header Title */}
          <View style={styles.cardMasthead}>
            <Text accessibilityRole="header" style={styles.headline}>
              Thêm địa chỉ mới
            </Text>
            <Text style={styles.subline}>
              Lưu thông tin kho bãi, văn phòng hoặc điểm nhận/gửi hàng vào sổ địa chỉ để thuận tiện tạo đơn vận chuyển.
            </Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* 1. Tên gợi nhớ địa chỉ */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Tên gợi nhớ địa chỉ</Text>
            <TextInput
              accessibilityLabel="Tên gợi nhớ địa chỉ"
              onBlur={() => setFocusedField(null)}
              onChangeText={setAddressLabel}
              onFocus={() => setFocusedField('label')}
              placeholder="VD: Kho tổng Tân Bình, Cửa hàng Q1, Xưởng may..."
              placeholderTextColor="#94A3B8"
              style={[
                styles.input,
                focusedField === 'label' && styles.inputFocused,
              ]}
              testID="ca-label-input"
              value={addressLabel}
            />
          </View>

          {/* 2. Người liên hệ & Số điện thoại (tùy chọn) */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ tại địa chỉ này (tùy chọn)</Text>
            <View style={styles.contactRow}>
              <View style={styles.contactCol}>
                <View style={styles.contactInputWrap}>
                  <IconUser color="#64748B" size={16} />
                  <TextInput
                    accessibilityLabel="Tên người liên hệ"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactName}
                    onFocus={() => setFocusedField('contactName')}
                    placeholder="Tên người liên hệ"
                    placeholderTextColor="#94A3B8"
                    style={styles.contactTextInput}
                    testID="ca-contact-name"
                    value={contactName}
                  />
                </View>
              </View>

              <View style={styles.contactCol}>
                <View style={styles.contactInputWrap}>
                  <IconPhone color="#64748B" size={16} />
                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    keyboardType="phone-pad"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactPhone}
                    onFocus={() => setFocusedField('contactPhone')}
                    placeholder="Số điện thoại"
                    placeholderTextColor="#94A3B8"
                    style={styles.contactTextInput}
                    testID="ca-contact-phone"
                    value={contactPhone}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* Action: Lấy vị trí hiện tại */}
          <Pressable
            accessibilityLabel="Sử dụng vị trí hiện tại"
            accessibilityRole="button"
            disabled={isLocating}
            onPress={handleGetCurrentLocation}
            style={({ pressed }) => [styles.gpsActionBtn, pressed && styles.pressed]}
            testID="ca-use-current-location"
          >
            <View style={styles.gpsLeft}>
              <View style={styles.gpsIconCircle}>
                <IconLocationPin color="#2563EB" size={20} strokeWidth={2} />
              </View>
              <View style={styles.gpsTextCol}>
                <Text style={styles.gpsBtnTitle}>Sử dụng vị trí hiện tại</Text>
                <Text style={styles.gpsBtnDesc}>Tự động nhận diện tọa độ qua GPS và hiển thị lên bản đồ</Text>
              </View>
            </View>
            {isLocating ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <Text style={styles.gpsArrow}>›</Text>
            )}
          </Pressable>

          {locationSuccessMsg ? (
            <View style={styles.successToast}>
              <Text style={styles.successToastText}>✓ {locationSuccessMsg}</Text>
            </View>
          ) : null}

          {/* Real Interactive Map Card */}
          <View style={styles.mapCard}>
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
                    <IconLocationPin color="#DC2626" secondaryColor="#FEE2E2" size={32} strokeWidth={2} />
                  </View>
                </View>
              )}

              {/* Real Map Telemetry Badge */}
              <View style={styles.mapTelemetryBadge}>
                <View style={styles.telemetryDot} />
                <Text style={styles.telemetryText}>
                  Bản đồ trực tuyến · Kéo ghim hoặc chạm để đổi vị trí
                </Text>
              </View>
            </View>

            {/* Address Banner on Map */}
            <View style={styles.selectedAddressBanner}>
              <View style={styles.selectedPinIcon}>
                <IconLocationPin color="#2563EB" size={18} strokeWidth={2} />
              </View>
              <View style={styles.selectedAddressCol}>
                <Text numberOfLines={2} style={styles.selectedAddressText}>
                  {selectedAddress}
                </Text>
                <Text style={styles.selectedCoordsText}>
                  Đã ghim vị trí chính xác trên bản đồ
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* Search or Pick from Map */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Tìm kiếm hoặc chọn địa chỉ khác</Text>

            <View
              style={[
                styles.searchInputContainer,
                focusedField === 'search' && styles.inputFocused,
              ]}
            >
              <IconSearch color="#64748B" size={18} />
              <TextInput
                accessibilityLabel="Tìm kiếm địa chỉ"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setSearchQuery}
                onFocus={() => setFocusedField('search')}
                placeholder="Tìm đường, tòa nhà, khu công nghiệp..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                testID="ca-search-input"
                value={searchQuery}
              />
              {isSearching ? <ActivityIndicator color="#2563EB" size="small" /> : null}
            </View>

            {/* Autocomplete suggestions list */}
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
                    <View style={styles.suggestionPin}>
                      <IconLocationPin color="#2563EB" size={16} />
                    </View>
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

            {/* Detailed Street / Unit Input */}
            <View style={styles.fieldItem}>
              <Text style={styles.label}>Chi tiết số nhà, số kho hoặc phòng (tùy chọn)</Text>
              <TextInput
                accessibilityLabel="Chi tiết địa chỉ"
                onBlur={() => setFocusedField(null)}
                onChangeText={setAddressDetail}
                onFocus={() => setFocusedField('detail')}
                placeholder="VD: Cổng số 2, Kho A3 hoặc Tầng 4, Phòng 402"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'detail' && styles.inputFocused,
                ]}
                testID="ca-detail-input"
                value={addressDetail}
              />
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* Address Category Chips */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Loại địa chỉ</Text>
            <View style={styles.categoryChipsRow}>
              {(
                [
                  { key: 'WAREHOUSE', label: 'Kho hàng', Icon: IconWarehouse, testID: 'ca-chip-warehouse' },
                  { key: 'HOME', label: 'Nhà riêng', Icon: IconHome, testID: 'ca-chip-home' },
                  { key: 'OFFICE', label: 'Văn phòng', Icon: IconOffice, testID: 'ca-chip-office' },
                  { key: 'OTHER', label: 'Khác', Icon: IconTag, testID: 'ca-chip-other' },
                ] as const
              ).map((chip) => {
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
                      color={active ? '#2563EB' : '#64748B'}
                      size={15}
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

          {/* Default Address Checkbox */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDefault }}
            onPress={() => setIsDefault((prev) => !prev)}
            style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
            testID="ca-default-checkbox"
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
              {isDefault ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Đặt làm địa chỉ mặc định khi tạo đơn vận chuyển
            </Text>
          </Pressable>
        </View>

        {/* ================= PRIMARY ACTION ================= */}
        <Pressable
          accessibilityLabel="Lưu vào sổ địa chỉ"
          accessibilityRole="button"
          onPress={handleSaveAddress}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          testID="ca-submit-btn"
        >
          <Text style={styles.primaryBtnText}>Lưu vào sổ địa chỉ</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export const CustomerAddressSetupScreen = CustomerAddAddressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 520,
    gap: 16,
  },

  /* Top Navigation */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtnPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.94 }],
  },
  backChevron: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: -2,
    marginTop: -2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 2,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  navSpacer: {
    width: 44,
    height: 44,
  },

  /* Main Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },
  cardMasthead: {
    gap: 6,
    paddingBottom: 2,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subline: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },

  /* Contact Person & Phone Row */
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactCol: {
    flex: 1,
  },
  contactInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  contactTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },

  /* GPS Action Button */
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  gpsTextCol: {
    flex: 1,
    gap: 2,
  },
  gpsBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1E42',
  },
  gpsBtnDesc: {
    fontSize: 12,
    color: '#475569',
  },
  gpsArrow: {
    fontSize: 22,
    color: '#0B1E42',
    fontWeight: '700',
    marginLeft: 8,
  },
  successToast: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },

  /* Real Map Graphic Card */
  mapCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  mapGraphic: {
    height: 230,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  nativeMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#CBD5E1',
    top: '44%',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 22,
    backgroundColor: '#CBD5E1',
    left: '52%',
  },
  mapPinPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
  },
  mapPinWrap: {
    zIndex: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapTelemetryBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  telemetryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  selectedAddressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectedPinIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  selectedAddressCol: {
    flex: 1,
    gap: 2,
  },
  selectedAddressText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  selectedCoordsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Search Section */
  sectionGroup: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Autocomplete Suggestions */
  suggestionsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionItemPressed: {
    backgroundColor: '#F1F5F9',
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextWrap: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#64748B',
  },

  /* Field Item */
  fieldItem: {
    gap: 6,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },

  /* Category Chips */
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  /* Checkbox */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },

  /* Action Buttons */
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
