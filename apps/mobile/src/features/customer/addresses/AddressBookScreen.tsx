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

import { addressStore } from './address-store';
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  FormField,
  HStack,
  IconCheck,
  IconClose,
  IconHome,
  IconLocationPin,
  IconOffice,
  IconPhone,
  IconPin,
  IconPlus,
  IconSearch,
  IconStar,
  IconTrash,
  IconUser,
  IconWarehouse,
  Input,
  InputField,
  InputSlot,
  LeopardMapView,
  ScreenScaffold,
  VStack,
  colors,
  customerPalette,
  haptic,
  httpClient,
  iosContinuousCurve,
  layout,
  leopardElevation,
  leopardPalette,
  radius,
  resolveLocationCoords,
  spacing,
  typeScale,
  typography,
} from '@leopard/mobile-core';
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
          bg: '#FFFBEB',
        };
      case 'OFFICE':
        return {
          label: 'Văn phòng',
          icon: <IconOffice color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: '#EFF6FF',
        };
      case 'HOME':
        return {
          label: 'Nhà riêng',
          icon: <IconHome color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: '#F0FDF4',
        };
      default:
        return {
          label: 'Khác',
          icon: <IconPin color={customerPalette.primary} size={20} />,
          color: customerPalette.primary,
          bg: '#F1F5F9',
        };
    }
  };

  const headerRight = isAdding ? null : (
    <Pressable
      accessibilityLabel="+ Thêm mới"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={() => setIsAdding(true)}
      style={({ pressed }) => [styles.addHeaderBtn, pressed ? styles.pressed : null]}
    >
      <IconPlus color={customerPalette.primary} size={20} strokeWidth={2.5} />
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
      title={isAdding ? 'Thêm địa chỉ mới' : 'Sổ địa chỉ'}
    >
      <Box style={styles.container}>
        {/* 1. Thanh Tìm Kiếm Nhanh (Realtime Search Bar) */}
        {!isAdding ? (
          <Box style={styles.searchWrap}>
            <Input size="md" style={styles.searchBar}>
              <InputSlot>
                <IconSearch color={customerPalette.textSubtle} size={18} />
              </InputSlot>
              <InputField
                accessibilityLabel="Tìm kiếm địa chỉ"
                onChangeText={setSearchQuery}
                placeholder="Tìm theo tên kho, địa chỉ, người nhận..."
                placeholderTextColor={leopardPalette.inputPlaceholder}
                style={styles.searchInput}
                value={searchQuery}
              />
              {searchQuery ? (
                <InputSlot>
                  <Pressable
                    accessibilityLabel="Xóa tìm kiếm"
                    accessibilityRole="button"
                    hitSlop={14}
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchBtn}
                  >
                    <IconClose color={leopardPalette.inputPlaceholder} size="sm" />
                  </Pressable>
                </InputSlot>
              ) : null}
            </Input>
          </Box>
        ) : null}

        {/* 2. Phân Loại Địa Chỉ (3 chip cố định, không scroll) */}
        {!isAdding ? (
          <HStack
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
                    <Badge
                      action={active ? 'info' : 'muted'}
                      size="sm"
                      style={[styles.filterBadge, active && styles.filterBadgeActive]}
                    >
                      <Badge.Text
                        style={[
                          styles.filterBadgeText,
                          active && styles.filterBadgeTextActive,
                        ]}
                      >
                        {chip.count}
                      </Badge.Text>
                    </Badge>
                  ) : null}
                </Pressable>
              );
            })}
          </HStack>
        ) : null}

        {/* 3. Form Tạo Địa Chỉ Mới (Apple HIG Inset Grouped) */}
        {isAdding ? (
          <ScrollView
            contentContainerStyle={styles.addFormScroll}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.addFormPlain}>
              {/* Section 1: Loại địa điểm & Địa chỉ */}
              <Text style={styles.formSectionTitle}>Loại địa điểm</Text>
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

              <Text style={styles.formSectionTitle}>Thông tin địa điểm</Text>
              <View style={styles.formGroupCard}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Tên gợi nhớ</Text>
                  <TextInput
                    accessibilityLabel="Tên gợi nhớ (VD: Kho Quận 7, Xưởng may Tân Bình...)"
                    onChangeText={setNewLabel}
                    placeholder="VD: Kho Quận 7, Xưởng Tân Bình..."
                    placeholderTextColor={leopardPalette.inputPlaceholder}
                    style={styles.fieldInput}
                    value={newLabel}
                  />
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.addressFieldWrapper}>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Địa chỉ chi tiết</Text>
                    <TextInput
                      accessibilityLabel="Địa chỉ chi tiết"
                      onChangeText={handleAddressChange}
                      onFocus={() => {
                        if (!newAddress.trim() || newAddress.trim().length < 2) {
                          setAddressSuggestions(POPULAR_MAP_SUGGESTIONS);
                        }
                        setShowAddressSuggestions(true);
                      }}
                      placeholder="Số nhà, tên đường, phường, quận, tỉnh/thành..."
                      placeholderTextColor={leopardPalette.inputPlaceholder}
                      style={styles.fieldInput}
                      value={newAddress}
                    />
                  </View>

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
              </View>

              {/* Định vị vị trí thực tế trên bản đồ vệ tinh / đường phố */}
              <View style={styles.mapPinSection}>
                <View style={styles.mapPinHeader}>
                  <View style={styles.mapPinTitleRow}>
                    <IconLocationPin color={customerPalette.primary} size={15} />
                    <Text style={styles.mapPinTitle}>Định vị trên bản đồ</Text>
                  </View>
                  <Text style={styles.mapPinHint}>Chạm hoặc kéo ghim để chỉnh</Text>
                </View>
                <View style={styles.mapPinBox}>
                  <LeopardMapView
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

              {/* Section 2: Thông tin người liên hệ */}
              <Text style={styles.formSectionTitle}>Thông tin người liên hệ</Text>
              <View style={styles.formGroupCard}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Tên người liên hệ</Text>
                  <TextInput
                    accessibilityLabel="Tên người liên hệ"
                    onChangeText={setNewContact}
                    placeholder="Tên người gửi/nhận"
                    placeholderTextColor={leopardPalette.inputPlaceholder}
                    style={styles.fieldInput}
                    value={newContact}
                  />
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Số điện thoại</Text>
                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    keyboardType="phone-pad"
                    onChangeText={setNewPhone}
                    placeholder="0901234567"
                    placeholderTextColor={leopardPalette.inputPlaceholder}
                    style={styles.fieldInput}
                    value={newPhone}
                  />
                </View>
              </View>

              {/* Section 3: Cài đặt mặc định */}
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
                <Card
                  style={[
                    styles.addressCard,
                    item.isDefault ? styles.addressCardDefault : null,
                  ]}
                >
                  {/* Top Header: Category Icon + Title + Default Badge + Delete */}
                  <HStack style={styles.cardHeaderRow}>
                    <HStack style={styles.cardTitleGroup}>
                      <Box style={styles.inlineCategoryIcon}>{meta.icon}</Box>
                      <Text numberOfLines={1} style={styles.addressLabel}>
                        {item.label}
                      </Text>
                      {item.isDefault ? (
                        <Badge action="warning" size="sm" style={styles.defaultBadge}>
                          <IconStar
                            color={customerPalette.accent}
                            fill={customerPalette.accent}
                            size={10}
                            strokeWidth={2}
                          />
                          <Badge.Text style={styles.defaultBadgeText}>Mặc định</Badge.Text>
                        </Badge>
                      ) : null}
                    </HStack>

                    <HStack style={styles.headerActionGroup}>
                      <Pressable
                        accessibilityLabel={`Xem bản đồ ${item.label}`}
                        accessibilityRole="button"
                        hitSlop={spacing.xs}
                        onPress={() =>
                          setExpandedMapId(expandedMapId === item.id ? null : item.id)
                        }
                        style={({ pressed }) => [
                          styles.actionTextBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <IconLocationPin color={customerPalette.primary} size={13} />
                        <Text style={styles.toggleMapText}>
                          {expandedMapId === item.id ? 'Ẩn bản đồ' : 'Bản đồ'}
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityLabel={`Xóa ${item.label}`}
                        accessibilityRole="button"
                        hitSlop={spacing.xs}
                        onPress={() => handleDelete(item.id)}
                        style={({ pressed }) => [
                          styles.actionTextBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <IconTrash color={colors.danger.text} size={13} />
                        <Text style={styles.deleteText}>Xóa</Text>
                      </Pressable>
                    </HStack>
                  </HStack>

                  {/* Address Line: Clean text without redundant outer icons */}
                  <Text numberOfLines={2} style={styles.addressText}>
                    {item.address}
                  </Text>

                  {/* Contact Line + Set Default Action: Inline, clean and compact */}
                  <HStack style={styles.cardFooterRow}>
                    <Text numberOfLines={1} style={styles.contactInlineText}>
                      <Text style={styles.contactName}>{item.contactName}</Text>
                      <Text style={styles.contactDot}> · </Text>
                      <Text style={styles.contactPhone}>{item.contactPhone}</Text>
                    </Text>

                    {!item.isDefault ? (
                      <Pressable
                        accessibilityLabel={`Đặt ${item.label} làm mặc định`}
                        accessibilityRole="button"
                        hitSlop={spacing.xs}
                        onPress={() => handleSetDefault(item.id)}
                        style={({ pressed }) => [
                          styles.setDefaultBtn,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                      </Pressable>
                    ) : null}
                  </HStack>

                  {/* Bản đồ xem nhanh khi mở rộng */}
                  {expandedMapId === item.id ? (
                    <Box style={styles.cardMapPreviewWrap}>
                      <LeopardMapView
                        height={130}
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
                    </Box>
                  ) : null}
                </Card>
              );
            }}
          />
        ) : null}
      </Box>
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
    ...typeScale.footnote,
    fontWeight: '600',
  },
  cancelHeaderBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cancelHeaderBtnText: {
    color: customerPalette.textMutedSlate,
    ...typeScale.footnote,
    fontWeight: '600',
  },

  // 1. Search Bar
  searchWrap: {
    marginBottom: 2,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: '#E2E8F0',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    color: customerPalette.textSlateDark,
    flex: 1,
    ...typeScale.subheadline,
    padding: 0,
  },
  clearSearchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
    padding: 2,
  },
  clearSearchText: {
    color: leopardPalette.inputPlaceholder,
    ...typeScale.subheadline,
    fontWeight: '600',
  },

  // 2. Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    width: '100%',
    paddingBottom: 4,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    ...iosContinuousCurve,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    color: '#64748B',
    ...typeScale.footnote,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '700',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  filterBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#475569',
  },
  filterBadgeTextActive: {
    color: customerPalette.surfaceWhite,
  },

  // 3. Form
  addFormScroll: {
    flexGrow: 1,
    paddingBottom: layout.bottomNavClearance + spacing.xxl,
  },
  addFormPlain: {
    gap: spacing.sm,
  },
  formSectionTitle: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.hairline,
    marginTop: spacing.xs,
  },
  formGroupCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    overflow: 'hidden',
    ...iosContinuousCurve,
    ...leopardElevation.subtle,
  },
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.hairline,
  },
  fieldLabel: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: colors.neutral.mutedText,
  },
  fieldInput: {
    ...typeScale.body,
    color: colors.neutral.text,
    paddingVertical: spacing.xxs,
    paddingHorizontal: 0,
    minHeight: 36,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: spacing.md,
  },
  submitBtnWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  // Apple HIG Segmented Control
  segmentedControl: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    flexDirection: 'row',
    padding: spacing.hairline,
    minHeight: 40,
    gap: spacing.hairline,
  },
  segmentItem: {
    alignItems: 'center',
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  segmentItemSelected: {
    backgroundColor: customerPalette.surfaceWhite,
    ...leopardElevation.subtle,
  },
  segmentText: {
    color: customerPalette.textSubtle,
    ...typeScale.footnote,
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },

  // Apple HIG iOS Switch Row
  switchRow: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
    ...leopardElevation.subtle,
  },
  switchTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  switchLabel: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  switchSublabel: {
    color: customerPalette.textSubtle,
    ...typeScale.caption1,
  },
  switchTrack: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.hairline,
    width: 48,
  },
  switchTrackActive: {
    backgroundColor: colors.success.text,
  },
  switchThumb: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    ...leopardElevation.subtle,
    width: 24,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },

  // 4. Address Cards List
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance + spacing.xl,
  },
  addressCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...leopardElevation.subtle,
  },
  addressCardDefault: {
    borderColor: colors.neutral.border,
    backgroundColor: customerPalette.surfaceWhite,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  inlineCategoryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    color: customerPalette.textSlateDark,
    ...typeScale.headline,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  defaultBadge: {
    alignItems: 'center',
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: colors.warning.text,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  headerActionGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionTextBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    paddingVertical: spacing.xxs,
  },
  toggleMapText: {
    color: customerPalette.primary,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  deleteText: {
    color: colors.danger.text,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  addressText: {
    color: customerPalette.textMutedSlate,
    ...typeScale.footnote,
    lineHeight: 18,
  },
  cardFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.hairline,
  },
  contactInlineText: {
    color: customerPalette.textSubtle,
    ...typeScale.caption1,
    flex: 1,
  },
  contactName: {
    color: colors.neutral.mutedText,
    fontWeight: '500',
  },
  contactDot: {
    color: colors.neutral.subtleText,
  },
  contactPhone: {
    color: customerPalette.primary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  setDefaultBtn: {
    paddingVertical: spacing.xxs,
  },
  setDefaultText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  cardMapPreviewWrap: {
    borderRadius: radius.cardSm,
    marginTop: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  mapPinSection: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...leopardElevation.subtle,
  },
  mapPinHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapPinTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mapPinTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  mapPinHint: {
    color: customerPalette.textSubtle,
    ...typeScale.caption2,
  },
  mapPinBox: {
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    overflow: 'hidden',
    borderColor: colors.neutral.border,
    borderWidth: 1,
  },
  // Empty State
  emptyBox: {
    alignItems: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    ...leopardElevation.subtle,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xxs,
    width: 56,
  },
  emptyTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    color: customerPalette.textSubtle,
    ...typeScale.footnote,
    lineHeight: 18,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
  },
  resetFilterBtnText: {
    color: customerPalette.textSlateDark,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  firstAddBtn: {
    marginTop: 8,
    backgroundColor: customerPalette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  firstAddBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  addressFieldWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsContainer: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  suggestionsHeaderTitle: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  suggestionsCloseText: {
    ...typeScale.caption2,
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
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  suggestionItemPressed: {
    backgroundColor: '#F1F5F9',
  },
  suggestionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconBoxGps: {
    backgroundColor: '#ECFDF5',
  },
  suggestionTextCol: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  suggestionSubtitle: {
    ...typeScale.caption2,
    color: '#64748B',
  },
  suggestionActionText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  pinnedNotice: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pinnedNoticeText: {
    color: '#059669',
    flex: 1,
    ...typeScale.caption1,
    fontWeight: '600',
  },
});
