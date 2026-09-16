import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { typeScale, httpClient } from '@leopard/mobile-core';
import { addressStore } from './address-store';
import { colors, customerPalette, leopardPalette, haptic, iosContinuousCurve, layout, radius, spacing, typography, Button, FormField, IconCheck, IconClose, IconHome, IconLocationPin, IconOffice, IconPhone, IconPin, IconPlus, IconSearch, IconStar, IconTrash, IconUser, IconWarehouse, RealInteractiveMap, resolveLocationCoords, ScreenScaffold } from '@leopard/mobile-core';
import {
  POPULAR_MAP_SUGGESTIONS,
  reverseGeocodeCoords,
  searchVietmapDirect,
  type AddressSuggestion,
} from '../../home/components/MapAddressPickerModal';

export type AddressCategory = 'WAREHOUSE' | 'OFFICE' | 'HOME' | 'OTHER';

export type SavedAddress = Readonly<{
  id: string;
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  category?: AddressCategory;
}>;

type FilterCategory = 'ALL' | AddressCategory;

const categoryOptions = [
  { id: 'WAREHOUSE' as const, label: 'Kho hàng', color: customerPalette.primary, bg: colors.neutral.surfaceMuted },
  { id: 'OFFICE' as const, label: 'Văn phòng', color: customerPalette.primary, bg: colors.neutral.surfaceMuted },
  { id: 'HOME' as const, label: 'Nhà riêng', color: customerPalette.primary, bg: colors.neutral.surfaceMuted },
  { id: 'OTHER' as const, label: 'Khác', color: customerPalette.textSubtle, bg: colors.neutral.surfaceMuted },
] as const;

export type AddressBookScreenProps = Readonly<{
  onOpenAddAddress?: () => void;
  onBack?: () => void;
}>;

export function AddressBookScreen({ onBack, onOpenAddAddress }: AddressBookScreenProps = {}) {
  const [addresses, setAddresses] = useState<readonly SavedAddress[]>(() => {
    return addressStore.getAddresses().map((s) => ({
      id: s.id,
      label: s.label,
      address: s.address,
      contactName: s.contactName || 'Người nhận',
      contactPhone: s.contactPhone || '0900000000',
      isDefault: s.isDefault,
      latitude: s.latitude,
      longitude: s.longitude,
      category: s.category || 'OTHER',
    }));
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    addressStore
      .fetchAddresses()
      .then((list) => {
        if (!mounted) return;
        setAddresses(
          list.map((s) => ({
            id: s.id,
            label: s.label,
            address: s.address,
            contactName: s.contactName || 'Người nhận',
            contactPhone: s.contactPhone || '0900000000',
            isDefault: s.isDefault,
            latitude: s.latitude,
            longitude: s.longitude,
            category: s.category || 'OTHER',
          })),
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');

  // Form states
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState<AddressCategory>('WAREHOUSE');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<readonly AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddressChange = (text: string) => {
    setNewAddress(text);
    if (!text.trim() || text.trim().length < 2) {
      setAddressSuggestions(POPULAR_MAP_SUGGESTIONS);
      setShowAddressSuggestions(true);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
        let results: AddressSuggestion[] = [];

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
          }>(`/maps/search?q=${encodeURIComponent(text.trim())}`);

          if (res?.source !== 'DEMO' && Array.isArray(res?.results)) {
            results = res.results
              .filter(
                (r) =>
                  r.source !== 'DEMO' &&
                  !r.name?.includes('(Demo data)') &&
                  !r.address?.includes('(Demo data)'),
              )
              .map((r) => ({
                id: r.id,
                label: (r.name || r.label || 'Địa điểm').replace(/\s*\(Demo data\)/gi, '').trim(),
                address: (r.address || r.label || r.name || '').replace(/\s*\(Demo data\)/gi, '').trim(),
                lat: r.lat || 10.7725,
                lng: r.lng || 106.698,
              }));
          }
        } catch {
          // ignore
        }

        if (results.length === 0 && apiKey) {
          results = await searchVietmapDirect(text.trim(), apiKey);
        }

        if (results.length === 0) {
          results = POPULAR_MAP_SUGGESTIONS.filter(
            (s) =>
              s.id !== 'popular-gps' &&
              (s.label.toLowerCase().includes(text.toLowerCase()) ||
                s.address.toLowerCase().includes(text.toLowerCase())),
          );
        }

        setAddressSuggestions(results);
        setShowAddressSuggestions(true);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);
  };

  const handleSelectAddressSuggestion = (item: AddressSuggestion) => {
    if (item.id === 'popular-gps') {
      handleGetGpsForNewAddress();
      setShowAddressSuggestions(false);
      return;
    }

    const chosenAddress = item.label.includes(item.address)
      ? item.label
      : item.address.includes(item.label)
        ? item.address
        : `${item.label}, ${item.address}`;
    setNewAddress(chosenAddress);
    if (item.lat && item.lng) {
      setNewPinCoords({ lat: item.lat, lng: item.lng });
    }
    setShowAddressSuggestions(false);
  };

  const handleGetGpsForNewAddress = () => {
    const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsReverseGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setNewPinCoords({ lat, lng });
          try {
            const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
            if (resolved) {
              setNewAddress(resolved);
            }
          } catch {
            // keep
          } finally {
            setIsReverseGeocoding(false);
          }
        },
        () => {
          setIsReverseGeocoding(false);
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  };

  const handlePinMoved = (coords: { lat: number; lng: number }) => {
    setNewPinCoords(coords);
    if (pinDebounceRef.current) {
      clearTimeout(pinDebounceRef.current);
    }
    setIsReverseGeocoding(true);
    pinDebounceRef.current = setTimeout(async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
        const resolved = await reverseGeocodeCoords(coords, apiKey);
        if (resolved) {
          setNewAddress(resolved);
        }
      } catch {
        // keep
      } finally {
        setIsReverseGeocoding(false);
      }
    }, 500);
  };

  const handleAddAddress = async () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    const shouldBeDefault = newIsDefault || addresses.length === 0;

    const created = await addressStore.saveAddress({
      label: newLabel.trim(),
      address: newAddress.trim(),
      contactName: newContact.trim() || 'Người nhận',
      contactPhone: newPhone.trim() || '0900000000',
      isDefault: shouldBeDefault,
      category: newCategory,
      latitude: newPinCoords?.lat,
      longitude: newPinCoords?.lng,
    });

    const createdRow: SavedAddress = {
      id: created.id,
      label: created.label,
      address: created.address,
      contactName: created.contactName || 'Người nhận',
      contactPhone: created.contactPhone || '0900000000',
      isDefault: created.isDefault,
      category: created.category || 'OTHER',
    };

    setAddresses((prev) => {
      const base = shouldBeDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev.filter((a) => a.id !== created.id);
      return [createdRow, ...base];
    });

    setNewLabel('');
    setNewAddress('');
    setNewContact('');
    setNewPhone('');
    setNewCategory('WAREHOUSE');
    setNewIsDefault(false);
    setNewPinCoords(null);
    setShowAddressSuggestions(false);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    await addressStore.deleteAddress(id);
    setAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      // If deleted address was default and there are other addresses, promote first one
      const wasDefault = prev.find((a) => a.id === id)?.isDefault;
      if (wasDefault && remaining.length > 0) {
        return remaining.map((a, idx) => ({ ...a, isDefault: idx === 0 }));
      }
      return remaining;
    });
  };

  const handleSetDefault = async (id: string) => {
    await addressStore.setDefaultAddress(id);
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  // Filter & search logic
  const filteredAddresses = addresses.filter((item) => {
    // Category match
    if (selectedFilter !== 'ALL') {
      const itemCategory = item.category || 'OTHER';
      if (itemCategory !== selectedFilter) return false;
    }
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchAddress = item.address.toLowerCase().includes(q);
      const matchContact = item.contactName.toLowerCase().includes(q);
      const matchPhone = item.contactPhone.toLowerCase().includes(q);
      return matchLabel || matchAddress || matchContact || matchPhone;
    }
    return true;
  });

  const getCategoryMeta = (cat?: AddressCategory) => {
    switch (cat) {
      case 'WAREHOUSE':
        return {
          label: 'Kho hàng',
          icon: <IconWarehouse color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: colors.neutral.surfaceMuted,
        };
      case 'OFFICE':
        return {
          label: 'Văn phòng',
          icon: <IconOffice color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: colors.neutral.surfaceMuted,
        };
      case 'HOME':
        return {
          label: 'Nhà riêng',
          icon: <IconHome color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: colors.neutral.surfaceMuted,
        };
      default:
        return {
          label: 'Khác',
          icon: <IconPin color={customerPalette.textSubtle} size={20} />,
          color: customerPalette.textSubtle,
          bg: colors.neutral.surfaceMuted,
        };
    }
  };

  const headerRight = (
    <Pressable
      accessibilityLabel={isAdding ? 'Hủy thêm địa chỉ' : '+ Thêm mới'}
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={() => setIsAdding(!isAdding)}
      style={({ pressed }) => [
        isAdding ? styles.cancelHeaderBtn : styles.addHeaderBtn,
        pressed ? styles.pressed : null,
      ]}
    >
      {isAdding ? (
        <IconClose color={customerPalette.primary} size="sm" />
      ) : (
        <IconPlus color={customerPalette.primary} size={20} strokeWidth={2.5} />
      )}
    </Pressable>
  );

  const handleBack = () => {
    if (isAdding) {
      setIsAdding(false);
    } else {
      onBack?.();
    }
  };

  return (
    <ScreenScaffold
      hasFloatingNavBar
      headerRight={headerRight}
      onBack={handleBack}
      subtitle={
        isAdding
          ? 'Lưu địa điểm thường xuyên gửi/nhận hàng'
          : 'Lưu sẵn địa chỉ thường dùng để tạo đơn và giao hàng nhanh chóng.'
      }
      title={isAdding ? 'Thêm địa chỉ mới' : 'Sổ địa chỉ'}
    >
      <View style={styles.container}>
        {/* 1. Thanh Tìm Kiếm Nhanh (Realtime Search Bar) */}
        {!isAdding ? (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <IconSearch color={customerPalette.textSubtle} size={18} />
              <TextInput
                accessibilityLabel="Tìm kiếm địa chỉ"
                onChangeText={setSearchQuery}
                placeholder="Tìm theo tên kho, địa chỉ, người nhận..."
                placeholderTextColor={leopardPalette.inputPlaceholder}
                style={styles.searchInput}
                value={searchQuery}
              />
              {searchQuery ? (
                <Pressable
                  accessibilityLabel="Xóa tìm kiếm"
                  accessibilityRole="button"
                  hitSlop={14}
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <IconClose color={leopardPalette.inputPlaceholder} size="sm" />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 2. Phân Loại Địa Chỉ (3 chip cố định, không scroll) */}
        {!isAdding ? (
          <View
            accessibilityLabel="Thanh lọc phân loại địa chỉ"
            style={styles.filterRow}
          >
            {(
              [
                { id: 'ALL' as FilterCategory, label: 'Tất cả', count: addresses.length },
                {
                  id: 'WAREHOUSE' as FilterCategory,
                  label: 'Kho hàng',
                  count: addresses.filter((a) => (a.category || 'OTHER') === 'WAREHOUSE').length,
                },
                {
                  id: 'OFFICE' as FilterCategory,
                  label: 'Văn phòng',
                  count: addresses.filter((a) => (a.category || 'OTHER') === 'OFFICE').length,
                },
              ] as const
            ).map((chip) => {
              const active = selectedFilter === chip.id;
              return (
                <Pressable
                  accessibilityLabel={chip.id === 'ALL' ? 'Tất cả địa chỉ' : chip.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  key={chip.id}
                  onPress={() => {
                    haptic.selection();
                    setSelectedFilter(chip.id);
                  }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {chip.label}
                  </Text>
                  {chip.count > 0 ? (
                    <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                      <Text
                        style={[
                          styles.filterBadgeText,
                          active && styles.filterBadgeTextActive,
                        ]}
                      >
                        {chip.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* 3. Form Tạo Địa Chỉ Mới (Apple HIG Inset Grouped, không box lồng) */}
        {isAdding ? (
          <ScrollView
            contentContainerStyle={styles.addFormScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.addFormPlain}>
              {/* Chọn Loại Địa Điểm (Apple HIG Segmented Control) */}
              <View style={styles.categoryPickerSection}>
                <Text style={styles.categoryPickerLabel}>Loại địa điểm</Text>
                <View style={styles.segmentedControl}>
                  {categoryOptions.map((cat) => {
                    const selected = newCategory === cat.id;
                    return (
                      <Pressable
                        accessibilityLabel={cat.label}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={cat.id}
                        onPress={() => {
                          haptic.selection();
                          setNewCategory(cat.id);
                        }}
                        style={({ pressed }) => [
                          styles.segmentItem,
                          selected ? styles.segmentItemSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.segmentText,
                            selected ? styles.segmentTextSelected : null,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <FormField
                label="Tên gợi nhớ (VD: Kho Quận 7, Xưởng may Tân Bình...)"
                onChangeText={setNewLabel}
                placeholder="Nhập tên gọi nhớ..."
                value={newLabel}
              />

              <View style={styles.addressFieldWrapper}>
                <FormField
                  label="Địa chỉ chi tiết"
                  onChangeText={handleAddressChange}
                  onFocus={() => {
                    if (!newAddress.trim() || newAddress.trim().length < 2) {
                      setAddressSuggestions(POPULAR_MAP_SUGGESTIONS);
                    }
                    setShowAddressSuggestions(true);
                  }}
                  placeholder="Số nhà, tên đường, phường, quận, tỉnh/thành..."
                  value={newAddress}
                />
                {showAddressSuggestions && addressSuggestions.length > 0 ? (
                  <View style={styles.suggestionsContainer}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={styles.suggestionsHeaderTitle}>
                        {newAddress.trim().length < 2 ? 'GỢI Ý ĐỊA ĐIỂM PHỔ BIẾN' : 'GỢI Ý TỪ BẢN ĐỒ'}
                      </Text>
                      <Pressable
                        accessibilityLabel="Đóng danh sách gợi ý"
                        hitSlop={12}
                        onPress={() => setShowAddressSuggestions(false)}
                      >
                        <Text style={styles.suggestionsCloseText}>Đóng</Text>
                      </Pressable>
                    </View>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      style={styles.suggestionsListScroll}
                    >
                      {addressSuggestions.map((item, index) => {
                        const isGpsItem = item.id === 'popular-gps';
                        return (
                          <Pressable
                            key={`${item.id}-${index}`}
                            onPress={() => handleSelectAddressSuggestion(item)}
                            style={({ pressed }) => [
                              styles.suggestionItem,
                              pressed && styles.suggestionItemPressed,
                            ]}
                          >
                            <View
                              style={[
                                styles.suggestionIconBox,
                                isGpsItem && styles.suggestionIconBoxGps,
                              ]}
                            >
                              <IconLocationPin
                                color={isGpsItem ? colors.brand.green : customerPalette.primary}
                                size={16}
                              />
                            </View>
                            <View style={styles.suggestionTextCol}>
                              <Text numberOfLines={1} style={styles.suggestionTitle}>
                                {item.label}
                              </Text>
                              <Text numberOfLines={1} style={styles.suggestionSubtitle}>
                                {item.address}
                              </Text>
                            </View>
                            <Text style={styles.suggestionActionText}>
                              {isGpsItem ? 'Định vị ›' : 'Chọn ›'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              {/* Định vị vị trí thực tế trên bản đồ vệ tinh / đường phố (Apple Maps style) */}
              <View style={styles.mapPinSection}>
                <View style={styles.mapPinHeader}>
                  <View style={styles.mapPinTitleRow}>
                    <IconLocationPin color={customerPalette.primary} size={15} />
                    <Text style={styles.mapPinTitle}>Định vị trên bản đồ</Text>
                  </View>
                  <Text style={styles.mapPinHint}>Chạm hoặc kéo ghim để chỉnh</Text>
                </View>
                <View style={styles.mapPinBox}>
                  <RealInteractiveMap
                    height={165}
                    initialPinCoords={newPinCoords || resolveLocationCoords(newAddress)}
                    interactive={true}
                    mode="pin"
                    onLocationChange={handlePinMoved}
                    title="Bản đồ định vị địa chỉ mới"
                  />
                </View>
                {newAddress.trim() || newPinCoords ? (
                  <View style={styles.pinnedNotice}>
                    <IconLocationPin color={colors.success.text} size={13} />
                    <Text numberOfLines={2} style={styles.pinnedNoticeText}>
                      {isReverseGeocoding ? 'Đang cập nhật địa chỉ…' : `Đã ghim: ${newAddress || 'Vị trí đã chọn'}`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.contactFieldsRow}>
                <View style={styles.flexField}>
                  <FormField
                    label="Tên người liên hệ"
                    onChangeText={setNewContact}
                    placeholder="Tên người gửi/nhận"
                    value={newContact}
                  />
                </View>
                <View style={styles.flexField}>
                  <FormField
                    keyboardType="phone-pad"
                    label="Số điện thoại"
                    onChangeText={setNewPhone}
                    placeholder="0901234567"
                    value={newPhone}
                  />
                </View>
              </View>

              {/* Apple HIG iOS Switch Row */}
              <Pressable
                accessibilityLabel="Đặt làm địa chỉ mặc định"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: newIsDefault }}
                onPress={() => {
                  haptic.selection();
                  setNewIsDefault(!newIsDefault);
                }}
                style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}
              >
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchLabel}>Đặt làm địa chỉ mặc định khi tạo đơn</Text>
                  <Text style={styles.switchSublabel}>Tự động chọn địa chỉ này khi tạo chuyến mới</Text>
                </View>
                <View style={[styles.switchTrack, newIsDefault ? styles.switchTrackActive : null]}>
                  <View style={[styles.switchThumb, newIsDefault ? styles.switchThumbActive : null]}>
                    {newIsDefault ? <IconCheck color={customerPalette.primary} size={10} strokeWidth={3} /> : null}
                  </View>
                </View>
              </Pressable>

              {/* Nút lưu địa chỉ cuộn theo trang */}
              <View style={styles.submitBtnWrap}>
                <Button
                  disabled={!newLabel.trim() || !newAddress.trim()}
                  label="Lưu địa chỉ vào sổ"
                  onPress={handleAddAddress}
                  size="driver-primary"
                  variant="primary"
                />
              </View>
            </View>
          </ScrollView>
        ) : null}

        {/* 4. Danh Sách Thẻ Địa Chỉ (Address Cards List) */}
        {!isAdding ? (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={filteredAddresses}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <IconLocationPin color={leopardPalette.inputPlaceholder} size={32} />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery || selectedFilter !== 'ALL'
                    ? 'Không tìm thấy địa chỉ phù hợp'
                    : 'Chưa có địa chỉ nào trong sổ'}
                </Text>
                <Text style={styles.emptyMessage}>
                  {searchQuery || selectedFilter !== 'ALL'
                    ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.'
                    : 'Lưu sẵn địa chỉ thường dùng để tạo đơn và giao nhận nhanh chóng hơn.'}
                </Text>
                {searchQuery || selectedFilter !== 'ALL' ? (
                  <Pressable
                    accessibilityLabel="Xóa bộ lọc"
                    accessibilityRole="button"
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedFilter('ALL');
                    }}
                    style={styles.resetFilterBtn}
                  >
                    <Text style={styles.resetFilterBtnText}>Xem tất cả địa chỉ</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityLabel="+ Thêm địa chỉ đầu tiên"
                    accessibilityRole="button"
                    onPress={() => setIsAdding(true)}
                    style={styles.firstAddBtn}
                  >
                    <Text style={styles.firstAddBtnText}>+ Thêm địa chỉ đầu tiên</Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const meta = getCategoryMeta(item.category);

              return (
                <View
                  style={[
                    styles.addressCard,
                    item.isDefault ? styles.addressCardDefault : null,
                  ]}
                >
                  <View style={styles.cardMainRow}>
                    {/* Hộp icon phân loại */}
                    <View style={[styles.categoryIconBox, { backgroundColor: meta.bg }]}>
                      {meta.icon}
                    </View>

                    {/* Nội dung thông tin địa chỉ */}
                    <View style={styles.cardContentCol}>
                      <View style={styles.cardTitleRow}>
                        <Text numberOfLines={1} style={styles.addressLabel}>
                          {item.label}
                        </Text>
                        {item.isDefault ? (
                          <View style={styles.defaultBadge}>
                            <IconStar
                              color={customerPalette.primary}
                              fill={customerPalette.primary}
                              size={11}
                              strokeWidth={2}
                            />
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.addressLineWrap}>
                        <IconLocationPin color={customerPalette.textSubtle} size={13} />
                        <Text numberOfLines={2} style={styles.addressText}>
                          {item.address}
                        </Text>
                      </View>

                      {/* Thông tin liên hệ dạng Pill mềm mại (100% Vector Icons) */}
                      <View style={styles.contactPill}>
                        <View style={styles.contactItem}>
                          <IconUser color={customerPalette.textMutedSlate} size={12} />
                          <Text style={styles.contactNameText}>{item.contactName}</Text>
                        </View>
                        <Text style={styles.contactDivider}>•</Text>
                        <View style={styles.contactItem}>
                          <IconPhone color={customerPalette.primary} size={12} />
                          <Text style={styles.contactPhoneText}>{item.contactPhone}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Bản đồ xem nhanh khi mở rộng */}
                  {expandedMapId === item.id ? (
                    <View style={styles.cardMapPreviewWrap}>
                      <RealInteractiveMap
                        height={140}
                        mode="preview"
                        origin={{
                          label: item.label,
                          coords:
                            typeof item.latitude === 'number' && typeof item.longitude === 'number'
                              ? { lat: item.latitude, lng: item.longitude }
                              : resolveLocationCoords(item.address),
                        }}
                        title={`Bản đồ ${item.label}`}
                      />
                    </View>
                  ) : null}

                  {/* Thanh thao tác dưới thẻ */}
                  <View style={styles.cardActionFooter}>
                    <View style={styles.leftActions}>
                      {!item.isDefault ? (
                        <Pressable
                          accessibilityLabel={`Đặt ${item.label} làm mặc định`}
                          accessibilityRole="button"
                          onPress={() => handleSetDefault(item.id)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <IconStar color={customerPalette.primary} size={13} strokeWidth={2} />
                          <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.defaultActiveNote}>
                          <IconCheck color={colors.success.text} size={12} strokeWidth={2.5} />
                          <Text style={styles.defaultActiveNoteText}>
                            Đang áp dụng cho đơn mới
                          </Text>
                        </View>
                      )}

                      <Pressable
                        accessibilityLabel={`Xem bản đồ ${item.label}`}
                        accessibilityRole="button"
                        onPress={() =>
                          setExpandedMapId(expandedMapId === item.id ? null : item.id)
                        }
                        style={({ pressed }) => [
                          styles.toggleMapBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <IconLocationPin color={customerPalette.primary} size={13} />
                        <Text style={styles.toggleMapText}>
                          {expandedMapId === item.id ? 'Ẩn bản đồ' : 'Bản đồ'}
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      accessibilityLabel={`Xóa ${item.label}`}
                      accessibilityRole="button"
                      onPress={() => handleDelete(item.id)}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <IconTrash color={colors.danger.text} size={13} />
                      <Text style={styles.deleteText}>Xóa</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        ) : null}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  // Header Action
  addHeaderBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addHeaderBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
  },
  cancelHeaderBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cancelHeaderBtnText: {
    color: customerPalette.textMutedSlate,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },

  // 1. Search Bar
  searchWrap: {
    marginBottom: 2,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  searchInput: {
    color: customerPalette.textSlateDark,
    flex: 1,
    fontSize: typeScale.footnote.fontSize,
    padding: 0,
  },
  clearSearchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    padding: 2,
  },
  clearSearchText: {
    color: leopardPalette.inputPlaceholder,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },

  // 2. Filter Row (3 chips cố định, không scroll, không bao giờ bị cắt chữ)
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    paddingBottom: 4,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 10,
    ...iosContinuousCurve,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
  },
  filterChipText: {
    color: customerPalette.textSubtle,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: customerPalette.textMutedSlate,
  },
  filterBadgeTextActive: {
    color: customerPalette.surfaceWhite,
  },

  // 3. Form (Apple HIG Grouped, không box lồng)
  addFormScroll: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance,
  },
  addFormPlain: {
    gap: spacing.md,
  },
  submitBtnWrap: {
    paddingTop: spacing.xs,
  },

  // Apple HIG Segmented Control
  categoryPickerSection: {
    gap: 6,
  },
  categoryPickerLabel: {
    color: customerPalette.textSubtle,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  segmentedControl: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 10,
    ...iosContinuousCurve,
    flexDirection: 'row',
    padding: 3,
    minHeight: 36,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: 8,
    ...iosContinuousCurve,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  segmentItemSelected: {
    backgroundColor: customerPalette.surfaceWhite,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    color: customerPalette.textSubtle,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },

  // Fields & Contact
  contactFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexField: {
    flex: 1,
  },

  // Apple HIG iOS Switch Row
  switchRow: {
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    borderColor: customerPalette.cardBorder,
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    gap: spacing.xs,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    color: customerPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '600',
  },
  switchSublabel: {
    color: customerPalette.textSubtle,
    fontSize: typeScale.caption1.fontSize,
  },
  switchTrack: {
    backgroundColor: customerPalette.cardBorder,
    borderRadius: 16,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: 48,
  },
  switchTrackActive: {
    backgroundColor: customerPalette.primary,
  },
  switchThumb: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    shadowColor: customerPalette.accentDark,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 2,
    width: 24,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },

  // 4. Address Cards List
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  addressCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressCardDefault: {
    borderColor: leopardPalette.inputBorder,
    backgroundColor: '#FAFCFF',
    borderWidth: 1.5,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardContentCol: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addressLabel: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  defaultBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: customerPalette.primary,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
  },
  addressLineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 1,
  },
  addressText: {
    color: colors.neutral.mutedText,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  contactPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: customerPalette.canvas,
    borderColor: colors.neutral.surfaceMuted,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contactItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  contactNameText: {
    color: customerPalette.textMutedSlate,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
  contactDivider: {
    color: leopardPalette.inputBorder,
    fontSize: typeScale.caption2.fontSize,
  },
  contactPhoneText: {
    color: customerPalette.primary,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },

  // Actions Footer
  cardActionFooter: {
    alignItems: 'center',
    borderTopColor: colors.neutral.surfaceMuted,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
  },
  leftActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  toggleMapBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  toggleMapText: {
    color: customerPalette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardMapPreviewWrap: {
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  mapPinSection: {
    backgroundColor: customerPalette.canvas,
    borderColor: customerPalette.cardBorder,
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 8,
    padding: spacing.sm,
  },
  mapPinHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapPinTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  mapPinTitle: {
    color: customerPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
  },
  mapPinHint: {
    color: customerPalette.textSubtle,
    fontSize: typeScale.caption1.fontSize,
  },
  mapPinBox: {
    borderRadius: 10,
    ...iosContinuousCurve,
    overflow: 'hidden',
    borderColor: leopardPalette.inputBorder,
    borderWidth: 1,
  },
  actionBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  setDefaultText: {
    color: customerPalette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  defaultActiveNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  defaultActiveNoteText: {
    color: colors.success.text,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
  deleteBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteText: {
    color: colors.danger.text,
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: {
    color: customerPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    color: customerPalette.textSubtle,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: 18,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  resetFilterBtnText: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },
  firstAddBtn: {
    marginTop: 8,
    backgroundColor: customerPalette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  firstAddBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  addressFieldWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsContainer: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: leopardPalette.inputBorder,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 12,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: customerPalette.canvas,
    borderBottomWidth: 1,
    borderBottomColor: customerPalette.cardBorder,
  },
  suggestionsHeaderTitle: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    color: customerPalette.textSubtle,
    letterSpacing: 0.5,
  },
  suggestionsCloseText: {
    fontSize: 11,
    color: customerPalette.primary,
    fontWeight: '600',
  },
  suggestionsListScroll: {
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.surfaceMuted,
    gap: 10,
  },
  suggestionItemPressed: {
    backgroundColor: colors.neutral.surfaceMuted,
  },
  suggestionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconBoxGps: {
    backgroundColor: colors.success.background,
  },
  suggestionTextCol: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: customerPalette.textSubtle,
  },
  suggestionActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  pinnedNotice: {
    alignItems: 'center',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreenBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pinnedNoticeText: {
    color: colors.success.text,
    flex: 1,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
});
