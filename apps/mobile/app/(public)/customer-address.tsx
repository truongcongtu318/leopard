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

import {
  BrandLoginLogo,
  IconCheck,
  IconHome,
  IconLocationPin,
  IconOffice,
  IconPhone,
  IconSearch,
  IconTag,
  IconUser,
  IconWarehouse,
  LeopardEmblem,
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
            setLocationSuccessMsg(`Đã xác định vị trí: ${resolved || 'Vị trí đã chọn'}`);
          } catch {
            setSelectedAddress('Vị trí đã chọn');
            setLocationSuccessMsg('Đã xác định vị trí trên bản đồ');
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
          setLocationSuccessMsg('Đã xác định vị trí: 135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
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
        setLocationSuccessMsg('Đã xác định vị trí: 135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
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
      setLocationSuccessMsg(`Đã xác định vị trí: ${item.name}`);
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
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(11, 37, 69, 0.2);
      animation: pinPulse 1.8s ease-out infinite;
    }
    .pulse-pin-core {
      position: relative;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: ${customerPalette.primary};
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            testID="ca-back-btn"
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>

          {/* Centered Brand Pill */}
          <View style={styles.brandRow}>
            <LeopardEmblem testID="address-brand-emblem" width={56} />
            <BrandLoginLogo height={34} testID="address-brand-logo" />
          </View>

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
              placeholderTextColor={customerPalette.offlineGray}
              style={[
                styles.input,
                focusedField === 'label' && styles.inputFocused,
              ]}
              testID="ca-label-input"
              value={addressLabel}
            />
          </View>

          {/* 2. Người liên hệ & Số điện thoại */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Thủ kho giao nhận</Text>
            <View style={styles.contactRow}>
              <View style={styles.contactCol}>
                <View
                  style={[
                    styles.contactInputWrap,
                    focusedField === 'contactName' && styles.inputFocused,
                  ]}
                >
                  <IconUser color={customerPalette.textSubtle} size={16} />
                  <TextInput
                    accessibilityLabel="Tên người liên hệ"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactName}
                    onFocus={() => setFocusedField('contactName')}
                    placeholder="Tên người liên hệ"
                    placeholderTextColor={customerPalette.offlineGray}
                    style={styles.contactTextInput}
                    testID="ca-contact-name"
                    value={contactName}
                  />
                </View>
              </View>

              <View style={styles.contactCol}>
                <View
                  style={[
                    styles.contactInputWrap,
                    focusedField === 'contactPhone' && styles.inputFocused,
                  ]}
                >
                  <IconPhone color={customerPalette.textSubtle} size={16} />
                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    keyboardType="phone-pad"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setContactPhone}
                    onFocus={() => setFocusedField('contactPhone')}
                    placeholder="Số điện thoại"
                    placeholderTextColor={customerPalette.offlineGray}
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
                <IconLocationPin color={customerPalette.primary} size={18} strokeWidth={2} />
              </View>
              <View style={styles.gpsTextCol}>
                <Text style={styles.gpsBtnTitle}>Sử dụng vị trí hiện tại</Text>
                <Text style={styles.gpsBtnDesc}>Tự động nhận diện tọa độ qua GPS và hiển thị lên bản đồ</Text>
              </View>
            </View>
            {isLocating ? (
              <ActivityIndicator color={customerPalette.primary} size="small" />
            ) : (
              <Text style={styles.gpsArrow}>›</Text>
            )}
          </Pressable>

          {/* Location Feedback Pill */}
          {locationSuccessMsg ? (
            <View style={styles.locationFeedbackRow}>
              <View style={styles.locationFeedbackDot} />
              <Text numberOfLines={2} style={styles.locationFeedbackText}>
                {locationSuccessMsg}
              </Text>
            </View>
          ) : null}

          {/* Interactive Map Card */}
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
                    <IconLocationPin color={customerPalette.primary} size={32} strokeWidth={2} />
                  </View>
                </View>
              )}

              {/* Map Telemetry Badge */}
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
                <IconLocationPin color={customerPalette.primary} size={18} strokeWidth={2} />
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
              <IconSearch color={customerPalette.textSubtle} size={18} />
              <TextInput
                accessibilityLabel="Tìm kiếm địa chỉ"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setSearchQuery}
                onFocus={() => setFocusedField('search')}
                placeholder="Tìm đường, tòa nhà, khu công nghiệp..."
                placeholderTextColor={customerPalette.offlineGray}
                style={styles.searchInput}
                testID="ca-search-input"
                value={searchQuery}
              />
              {isSearching ? <ActivityIndicator color={customerPalette.primary} size="small" /> : null}
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
                      <IconLocationPin color={customerPalette.primary} size={16} />
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
                placeholderTextColor={customerPalette.offlineGray}
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
              {isDefault ? <IconCheck color={customerPalette.surfaceWhite} size={14} strokeWidth={3} /> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Đặt làm địa chỉ mặc định khi tạo đơn vận chuyển
            </Text>
          </Pressable>
        </View>

        {/* ================= PRIMARY ACTION ================= */}
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
    </ScrollView>
  );
}

export const CustomerAddressSetupScreen = CustomerAddAddressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customerPalette.canvas,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: spacing.md,
  },

  /* Top Navigation */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    ...iosContinuousCurve,
  },
  backChevron: {
    fontSize: typeScale.title1.fontSize,
    lineHeight: typeScale.title1.lineHeight,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    marginLeft: -2,
    marginTop: -2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: customerPalette.surfaceWhite,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.textSlateDark,
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
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.bezelOuter,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: spacing.md,
    ...iosContinuousCurve,
  },
  cardMasthead: {
    gap: spacing.xxs,
    paddingBottom: spacing.hairline,
  },
  headline: {
    fontSize: typeScale.title2.fontSize,
    lineHeight: typeScale.title2.lineHeight,
    fontWeight: '800',
    color: customerPalette.textSlateDark,
    letterSpacing: -0.4,
  },
  subline: {
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    color: customerPalette.textMutedSlate,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: customerPalette.cardBorder,
    marginVertical: spacing.xxs,
  },

  /* Contact Person & Phone Row */
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactCol: {
    flex: 1,
  },
  contactInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    height: 48,
    backgroundColor: customerPalette.surfaceWhite,
    ...iosContinuousCurve,
  },
  contactTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    color: customerPalette.textSlateDark,
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
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    padding: spacing.sm,
    ...iosContinuousCurve,
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  gpsTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  gpsBtnTitle: {
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  gpsBtnDesc: {
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    color: customerPalette.textMutedSlate,
  },
  gpsArrow: {
    fontSize: typeScale.title2.fontSize,
    color: customerPalette.textSubtle,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },

  /* Location Feedback Pill */
  locationFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primaryBg,
    borderWidth: 1,
    borderColor: customerPalette.primaryBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  locationFeedbackDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
  },
  locationFeedbackText: {
    flex: 1,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    fontWeight: '600',
    color: customerPalette.primary,
  },

  /* Map Graphic Card */
  mapCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    backgroundColor: customerPalette.canvas,
    ...iosContinuousCurve,
  },
  mapGraphic: {
    height: 220,
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
    height: 22,
    backgroundColor: customerPalette.cardBorder,
    top: '44%',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 22,
    backgroundColor: customerPalette.cardBorder,
    left: '52%',
  },
  mapPinPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
  },
  mapPinWrap: {
    zIndex: 5,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapTelemetryBadge: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: customerPalette.surfaceWhite,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  telemetryDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.onlineGreen,
  },
  telemetryText: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  selectedAddressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: customerPalette.surfaceWhite,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: customerPalette.cardBorder,
  },
  selectedPinIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: customerPalette.primaryBorder,
  },
  selectedAddressCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  selectedAddressText: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  selectedCoordsText: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    color: customerPalette.textSubtle,
    fontWeight: '500',
  },

  /* Search Section */
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
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
    height: 48,
    ...iosContinuousCurve,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    color: customerPalette.textSlateDark,
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
    borderColor: customerPalette.primary,
    backgroundColor: customerPalette.surfaceWhite,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },

  /* Autocomplete Suggestions */
  suggestionsCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    ...iosContinuousCurve,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  suggestionPin: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextWrap: {
    flex: 1,
    gap: spacing.hairline,
  },
  suggestionName: {
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  suggestionAddress: {
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    color: customerPalette.textSubtle,
  },

  /* Field Item */
  fieldItem: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  label: {
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    fontWeight: '500',
    color: customerPalette.textMutedSlate,
  },
  input: {
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    height: 48,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    color: customerPalette.textSlateDark,
    fontWeight: '500',
    backgroundColor: customerPalette.surfaceWhite,
    ...iosContinuousCurve,
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
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  chipActive: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  chipText: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '500',
    color: customerPalette.textMutedSlate,
  },
  chipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },

  /* Checkbox */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
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
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    color: customerPalette.textMutedSlate,
    fontWeight: '500',
  },

  /* Action Buttons */
  primaryBtn: {
    backgroundColor: customerPalette.primary,
    borderRadius: radius.card,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    ...iosContinuousCurve,
  },
  primaryBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: typeScale.callout.fontSize,
    lineHeight: typeScale.callout.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
