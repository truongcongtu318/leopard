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

import { httpClient } from '../../../api/http-client';
import { addressStore } from './address-store';
import { colors, layout, radius, spacing, typography, Button, FormField, IconHome, IconLocationPin, IconOffice, IconPhone, IconPlus, IconSearch, IconStar, IconTrash, IconUser, IconWarehouse, RealInteractiveMap, resolveLocationCoords, ScreenScaffold } from '@leopard/mobile-core';
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
  category?: AddressCategory;
}>;

const mockAddresses: readonly SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Kho trung tâm Quận 7',
    address: '123 Đường Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0901234567',
    isDefault: true,
    category: 'WAREHOUSE',
  },
  {
    id: 'addr-2',
    label: 'Văn phòng đại diện',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
    contactName: 'Trần Thị B',
    contactPhone: '0912345678',
    isDefault: false,
    category: 'OFFICE',
  },
  {
    id: 'addr-3',
    label: 'Xưởng may Tân Bình',
    address: '78 Trường Chinh, Phường 12, Quận Tân Bình, TP.HCM',
    contactName: 'Lê Văn C',
    contactPhone: '0987654321',
    isDefault: false,
    category: 'WAREHOUSE',
  },
];

type FilterCategory = 'ALL' | AddressCategory;

const categoryOptions = [
  { id: 'WAREHOUSE' as const, label: 'Kho hàng', color: '#0B1E42', bg: '#F0F4F9' },
  { id: 'OFFICE' as const, label: 'Văn phòng', color: '#6366F1', bg: '#EEF2FF' },
  { id: 'HOME' as const, label: 'Nhà riêng', color: '#0D9488', bg: '#CCFBF1' },
  { id: 'OTHER' as const, label: 'Khác', color: '#64748B', bg: '#F1F5F9' },
] as const;

export type AddressBookScreenProps = Readonly<{
  onOpenAddAddress?: () => void;
  onBack?: () => void;
}>;

export function AddressBookScreen({ onBack, onOpenAddAddress }: AddressBookScreenProps = {}) {
  const [addresses, setAddresses] = useState<readonly SavedAddress[]>(() => {
    const stored = addressStore.getAddresses();
    if (stored && stored.length > 0) {
      const storedIds = new Set(stored.map((s) => s.id));
      const remainingMocks = mockAddresses.filter((m) => !storedIds.has(m.id));
      return [
        ...stored.map((s) => ({
          id: s.id,
          label: s.label,
          address: s.address,
          contactName: s.contactName || 'Người nhận',
          contactPhone: s.contactPhone || '0900000000',
          isDefault: s.isDefault,
          category: s.category || 'OTHER',
        })),
        ...remainingMocks,
      ];
    }
    return mockAddresses;
  });
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

    setNewAddress(item.address);
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

  const handleAddAddress = () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    const shouldBeDefault = newIsDefault || addresses.length === 0;

    const newItem: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel.trim(),
      address: newAddress.trim(),
      contactName: newContact.trim() || 'Người nhận',
      contactPhone: newPhone.trim() || '0900000000',
      isDefault: shouldBeDefault,
      category: newCategory,
    };

    setAddresses((prev) => {
      const base = shouldBeDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [newItem, ...base];
    });

    addressStore.saveAddress({
      id: newItem.id,
      label: newItem.label,
      address: newItem.address,
      contactName: newItem.contactName,
      contactPhone: newItem.contactPhone,
      isDefault: newItem.isDefault,
      category: newItem.category,
      latitude: newPinCoords?.lat,
      longitude: newPinCoords?.lng,
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

  const handleDelete = (id: string) => {
    addressStore.deleteAddress(id);
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

  const handleSetDefault = (id: string) => {
    addressStore.setDefaultAddress(id);
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
          icon: <IconWarehouse color="#0B1E42" size={20} />,
          color: '#0B1E42',
          bg: '#F0F4F9',
        };
      case 'OFFICE':
        return {
          label: 'Văn phòng',
          icon: <IconOffice color="#6366F1" size={20} />,
          color: '#6366F1',
          bg: '#EEF2FF',
        };
      case 'HOME':
        return {
          label: 'Nhà riêng',
          icon: <IconHome color="#0D9488" size={20} />,
          color: '#0D9488',
          bg: '#CCFBF1',
        };
      default:
        return {
          label: 'Khác',
          icon: <IconLocationPin color="#64748B" size={20} />,
          color: '#64748B',
          bg: '#F1F5F9',
        };
    }
  };

  const headerRight = (
    <Pressable
      accessibilityLabel={isAdding ? 'Hủy thêm địa chỉ' : '+ Thêm mới'}
      accessibilityRole="button"
      onPress={() => setIsAdding(!isAdding)}
      style={({ pressed }) => [
        isAdding ? styles.cancelHeaderBtn : styles.addHeaderBtn,
        pressed ? styles.pressed : null,
      ]}
    >
      {isAdding ? null : <IconPlus color="#FFFFFF" size={14} strokeWidth={2.5} />}
      <Text style={isAdding ? styles.cancelHeaderBtnText : styles.addHeaderBtnText}>
        {isAdding ? 'Hủy' : 'Thêm mới'}
      </Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      headerRight={headerRight}
      onBack={onBack}
      subtitle="Lưu sẵn địa chỉ thường dùng để tạo đơn và giao hàng nhanh chóng."
      title="Sổ địa chỉ"
    >
      <View style={styles.container}>
        {/* 🔍 1. Thanh Tìm Kiếm Nhanh (Realtime Search Bar) */}
        {!isAdding ? (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <IconSearch color="#64748B" size={18} />
              <TextInput
                accessibilityLabel="Tìm kiếm địa chỉ"
                onChangeText={setSearchQuery}
                placeholder="Tìm theo tên kho, địa chỉ, người nhận..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={searchQuery}
              />
              {searchQuery ? (
                <Pressable
                  accessibilityLabel="Xóa tìm kiếm"
                  accessibilityRole="button"
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <Text style={styles.clearSearchText}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 🏷️ 2. Thanh Chip Phân Loại (Category Filter Strip) */}
        {!isAdding ? (
          <ScrollView
            accessibilityLabel="Thanh lọc phân loại địa chỉ"
            contentContainerStyle={styles.filterStrip}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              accessibilityLabel="Tất cả địa chỉ"
              accessibilityRole="button"
              onPress={() => setSelectedFilter('ALL')}
              style={({ pressed }) => [
                styles.filterChip,
                selectedFilter === 'ALL' ? styles.filterChipActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === 'ALL' ? styles.filterChipTextActive : null,
                ]}
              >
                Tất cả ({addresses.length})
              </Text>
            </Pressable>

            {categoryOptions.map((opt) => {
              const active = selectedFilter === opt.id;
              const count = addresses.filter((a) => (a.category || 'OTHER') === opt.id).length;
              return (
                <Pressable
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                  key={opt.id}
                  onPress={() => setSelectedFilter(opt.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {opt.label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* 📝 3. Thẻ Tạo Địa Chỉ Mới (Add Address Card / Sheet) */}
        {isAdding ? (
          <View style={styles.addCard}>
            <View style={styles.addCardHeader}>
              <View style={styles.addTitleGroup}>
                <View style={styles.addIconCircle}>
                  <IconLocationPin color="#0B1E42" size={20} />
                </View>
                <View>
                  <Text style={styles.formTitle}>Thêm địa chỉ mới</Text>
                  <Text style={styles.formSubtitle}>Lưu địa điểm thường xuyên gửi/nhận hàng</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Đóng biểu mẫu"
                accessibilityRole="button"
                onPress={() => setIsAdding(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Chọn Loại Địa Điểm */}
            <View style={styles.categoryPickerSection}>
              <Text style={styles.categoryPickerLabel}>Loại địa điểm:</Text>
              <View style={styles.categoryGrid}>
                {categoryOptions.map((cat) => {
                  const selected = newCategory === cat.id;
                  return (
                    <Pressable
                      accessibilityLabel={cat.label}
                      accessibilityRole="button"
                      key={cat.id}
                      onPress={() => setNewCategory(cat.id)}
                      style={({ pressed }) => [
                        styles.catOption,
                        selected ? styles.catOptionSelected : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          selected ? styles.catOptionTextSelected : null,
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
                      hitSlop={8}
                      onPress={() => setShowAddressSuggestions(false)}
                    >
                      <Text style={styles.suggestionsCloseText}>✕ Đóng</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={styles.suggestionsListScroll}
                  >
                    {addressSuggestions.map((item) => {
                      const isGpsItem = item.id === 'popular-gps';
                      return (
                        <Pressable
                          key={item.id}
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
                              color={isGpsItem ? '#16A34A' : '#0B1E42'}
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

            {/* Định vị vị trí thực tế trên bản đồ vệ tinh / đường phố */}
            <View style={styles.mapPinSection}>
              <View style={styles.mapPinHeader}>
                <View style={styles.mapPinTitleRow}>
                  <IconLocationPin color="#0B1E42" size={15} />
                  <Text style={styles.mapPinTitle}>Định vị trên bản đồ</Text>
                </View>
                <Text style={styles.mapPinHint}>Chạm hoặc kéo ghim để chỉnh</Text>
              </View>
              <View style={styles.mapPinBox}>
                <RealInteractiveMap
                  height={150}
                  initialPinCoords={newPinCoords || resolveLocationCoords(newAddress)}
                  interactive={true}
                  mode="pin"
                  onLocationChange={handlePinMoved}
                  title="Bản đồ định vị địa chỉ mới"
                />
              </View>
              {newAddress.trim() || newPinCoords ? (
                <View style={styles.pinnedNotice}>
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

            {/* Checkbox Đặt làm mặc định */}
            <Pressable
              accessibilityLabel="Đặt làm địa chỉ mặc định"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: newIsDefault }}
              onPress={() => setNewIsDefault(!newIsDefault)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkboxBox, newIsDefault ? styles.checkboxChecked : null]}>
                {newIsDefault ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định khi tạo đơn</Text>
            </Pressable>

            <View style={styles.formActionRow}>
              <Button
                disabled={!newLabel.trim() || !newAddress.trim()}
                label="Lưu địa chỉ vào sổ"
                onPress={handleAddAddress}
                size="driver-primary"
                variant="primary"
              />
            </View>
          </View>
        ) : null}

        {/* 📋 4. Danh Sách Thẻ Địa Chỉ (Address Cards List) */}
        {!isAdding ? (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={filteredAddresses}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <IconLocationPin color="#94A3B8" size={32} />
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
                              color="#0B1E42"
                              fill="#0B1E42"
                              size={12}
                              strokeWidth={2}
                            />
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.addressLineWrap}>
                        <IconLocationPin color="#64748B" size={14} />
                        <Text numberOfLines={2} style={styles.addressText}>
                          {item.address}
                        </Text>
                      </View>

                      {/* Thông tin liên hệ dạng Pill mềm mại (100% Vector Icons) */}
                      <View style={styles.contactPill}>
                        <View style={styles.contactItem}>
                          <IconUser color="#475569" size={13} />
                          <Text style={styles.contactNameText}>{item.contactName}</Text>
                        </View>
                        <Text style={styles.contactDivider}>•</Text>
                        <View style={styles.contactItem}>
                          <IconPhone color="#0B1E42" size={13} />
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
                        origin={{ label: item.label, coords: resolveLocationCoords(item.address) }}
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
                          <IconStar color="#0B1E42" size={14} strokeWidth={2} />
                          <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.defaultActiveNote}>
                          <Text style={styles.defaultActiveNoteText}>
                            ✓ Đang áp dụng cho đơn mới
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
                        <IconLocationPin color="#0B1E42" size={13} />
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
                      <IconTrash color="#EF4444" size={14} />
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
    backgroundColor: '#0B1E42',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  cancelHeaderBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelHeaderBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // 1. Search Bar
  searchWrap: {
    marginBottom: 2,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  searchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },

  // 2. Filter Strip
  filterStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 4,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 3. Add Card
  addCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  addCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  addTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  formSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryPickerSection: {
    gap: 6,
  },
  categoryPickerLabel: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  catOption: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 7,
    alignItems: 'center',
  },
  catOptionSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  catOptionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  catOptionTextSelected: {
    color: '#0B1E42',
    fontWeight: '700',
  },
  contactFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexField: {
    flex: 1,
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxBox: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  checkboxChecked: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
  checkboxLabel: {
    color: '#334155',
    fontSize: 12.5,
  },
  formActionRow: {
    marginTop: 4,
  },

  // 4. Address Cards List
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressCardDefault: {
    borderColor: '#CBD5E1',
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
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  defaultBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: '#0B1E42',
    fontSize: 10.5,
    fontWeight: '700',
  },
  addressLineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 1,
  },
  addressText: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  contactPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
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
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  contactDivider: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  contactPhoneText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Actions Footer
  cardActionFooter: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
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
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '600',
  },
  cardMapPreviewWrap: {
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPinSection: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  mapPinHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapPinTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  mapPinTitle: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  mapPinHint: {
    color: '#64748B',
    fontSize: 11,
  },
  mapPinBox: {
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  actionBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  setDefaultText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '600',
  },
  defaultActiveNote: {
    paddingVertical: 2,
  },
  defaultActiveNoteText: {
    color: '#059669',
    fontSize: 11.5,
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
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  resetFilterBtnText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  firstAddBtn: {
    marginTop: 8,
    backgroundColor: '#0B1E42',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  firstAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addressFieldWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 12,
    shadowColor: '#0F172A',
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
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  suggestionsCloseText: {
    fontSize: 11,
    color: '#0B1E42',
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
    backgroundColor: '#F0F4F9',
  },
  suggestionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconBoxGps: {
    backgroundColor: '#DCFCE7',
  },
  suggestionTextCol: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  suggestionActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1E42',
  },
  pinnedNotice: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.cardLg,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  pinnedNoticeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
});
