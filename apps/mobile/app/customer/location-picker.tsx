import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  IconChevron,
  IconPin,
  IconSearch,
  RealInteractiveMap,
  resolveLocationCoords,
  typography,
  VIETNAM_LOCATION_DICT,
  type MapCoordinate,
} from '@leopard/mobile-core';

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onConfirm?: (result: { lat: number; lng: number; address: string }) => void;
  onBack?: () => void;
}

export default function LocationPickerScreen({
  initialAddress,
  initialLat,
  initialLng,
  onBack,
  onConfirm,
}: LocationPickerProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
    target?: string;
    returnTo?: string;
  }>();

  const defaultLat = initialLat ?? (params.lat ? Number(params.lat) : 10.795);
  const defaultLng = initialLng ?? (params.lng ? Number(params.lng) : 106.652);
  const defaultAddress =
    initialAddress ||
    (typeof params.address === 'string' && params.address.trim().length > 0
      ? params.address
      : 'Kho Tân Bình, TP. Hồ Chí Minh');

  const [coords, setCoords] = useState<MapCoordinate>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [address, setAddress] = useState(defaultAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter known hubs matching query
  const suggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const results: Array<{ key: string; label: string; coords: MapCoordinate }> = [];
    for (const [key, hubCoords] of Object.entries(VIETNAM_LOCATION_DICT)) {
      if (key.includes(q) || q.includes(key)) {
        const formatted = toTitleCase(key);
        results.push({
          key,
          label: `${formatted}, TP. Hồ Chí Minh`,
          coords: hubCoords,
        });
        if (results.length >= 5) break;
      }
    }
    return results;
  }, [searchQuery]);

  const handleSelectSuggestion = useCallback(
    (item: { label: string; coords: MapCoordinate }) => {
      setCoords(item.coords);
      setAddress(item.label);
      setSearchQuery('');
      setIsSearching(false);
    },
    [],
  );

  const handleLocationChange = useCallback((newCoords: MapCoordinate) => {
    setCoords(newCoords);
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm({ lat: coords.lat, lng: coords.lng, address });
      return;
    }
    // Default navigation back
    router.back();
  }, [coords, address, onConfirm, router]);

  return (
    <View style={styles.container}>
      {/* Layer 0: Full-Bleed Map Canvas */}
      <View style={styles.mapContainer}>
        <RealInteractiveMap
          height="100%"
          initialPinCoords={coords}
          interactive={true}
          mode="pin"
          onLocationChange={handleLocationChange}
          testID="location-picker-map"
        />
      </View>

      {/* Layer 1: Fixed Center Pin Marker */}
      <View pointerEvents="none" style={styles.centerPinAnchor}>
        <View style={styles.centerPinWrapper} testID="fixed-center-pin">
          <IconPin color="#F59E0B" size={40} strokeWidth={2} />
          <View style={styles.centerPinShadow} />
        </View>
      </View>

      {/* Layer 2: Floating Top Bar (Back Button + Search Input) */}
      <SafeAreaView edges={['top']} style={styles.topSafeArea}>
        <View style={styles.topBarCard}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            onPress={handleBack}
            style={styles.backBtn}
            testID="btn-location-back"
          >
            <IconChevron color="#0B1E42" direction="left" size={22} />
          </Pressable>

          <View style={styles.searchInputWrap}>
            <IconSearch color="#64748B" size={18} />
            <TextInput
              accessibilityLabel="Tìm kiếm địa chỉ"
              autoCapitalize="none"
              onChangeText={(text) => {
                setSearchQuery(text);
                setIsSearching(text.trim().length > 0);
              }}
              onFocus={() => setIsSearching(searchQuery.trim().length > 0)}
              placeholder="Tìm kiếm địa chỉ, kho bãi..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityLabel="Xóa tìm kiếm"
                accessibilityRole="button"
                onPress={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Search Suggestions Dropdown */}
        {isSearching && suggestions.length > 0 ? (
          <View style={styles.suggestionsCard}>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.suggestionsList}>
              {suggestions.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityLabel={`Chọn ${item.label}`}
                  accessibilityRole="button"
                  onPress={() => handleSelectSuggestion(item)}
                  style={styles.suggestionItem}
                >
                  <IconPin color="#0B1E42" size={16} />
                  <Text numberOfLines={1} style={styles.suggestionText}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Layer 3: Double-Bezel Bottom Floating Card */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <View style={styles.bottomOuterCard}>
          <View style={styles.bottomInnerCard}>
            <View style={styles.addressHeaderRow}>
              <View style={styles.pinIndicatorDot} />
              <Text style={styles.addressHeaderLabel}>Điểm ghim được chọn</Text>
            </View>

            <Text numberOfLines={2} style={styles.detectedAddressText}>
              {address}
            </Text>

            <View style={styles.coordsRow}>
              <Text style={styles.coordsLabel}>Tọa độ GPS:</Text>
              <Text style={styles.coordsValue}>
                {`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Xác nhận điểm này"
            accessibilityRole="button"
            onPress={handleConfirm}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>Xác nhận điểm này</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ponytail: basic fixed coordinates geocoding; add dynamic Vietmap autocomplete API when provider key ready.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapContainer: {
    ...StyleSheet.absoluteFill,
  },
  centerPinAnchor: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerPinWrapper: {
    alignItems: 'center',
    marginBottom: 40, // Offset so pin tip aligns with exact center point
  },
  centerPinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(11, 30, 66, 0.25)',
    marginTop: -2,
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
  },
  topBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0B1E42',
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  suggestionsCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    maxHeight: 220,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  suggestionsList: {
    paddingVertical: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#0B1E42',
    marginLeft: 10,
    flex: 1,
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 16 : 8,
  },
  bottomOuterCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  bottomInnerCard: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.04)',
    padding: 14,
    marginBottom: 14,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pinIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 6,
  },
  addressHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detectedAddressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E42',
    lineHeight: 22,
    marginBottom: 8,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordsLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 6,
  },
  coordsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontVariant: ['tabular-nums'],
  },
  confirmBtn: {
    backgroundColor: '#0B1E42',
    borderRadius: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
