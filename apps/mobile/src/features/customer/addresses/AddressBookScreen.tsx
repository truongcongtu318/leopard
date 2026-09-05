import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import {
  IconHome,
  IconLocationPin,
  IconOffice,
  IconPhone,
  IconPlus,
  IconSearch,
  IconStar,
  IconTrash,
  IconUser,
  IconWarehouse,
} from '../../../ui/icons/CoreIcons';
import { RealInteractiveMap, resolveLocationCoords } from '../../../ui/RealInteractiveMap';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { addressStore, type SavedAddress } from './address-store';

export type AddressCategory = NonNullable<SavedAddress['category']>;

type FilterCategory = 'ALL' | AddressCategory;

const categoryOptions = [
  { id: 'WAREHOUSE' as const, label: 'Kho hàng', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'OFFICE' as const, label: 'Văn phòng', color: '#6366F1', bg: '#EEF2FF' },
  { id: 'HOME' as const, label: 'Nhà riêng', color: '#0D9488', bg: '#CCFBF1' },
  { id: 'OTHER' as const, label: 'Khác', color: '#64748B', bg: '#F1F5F9' },
] as const;

export function AddressBookScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    addressStore.getAddresses().then((list) => {
      if (!cancelled) {
        setAddresses(list);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddAddress = async () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    const shouldBeDefault = newIsDefault || addresses.length === 0;

    await addressStore.saveAddress({
      label: newLabel.trim(),
      address: newAddress.trim(),
      contactName: newContact.trim() || 'Người nhận',
      contactPhone: newPhone.trim() || '0900000000',
      isDefault: shouldBeDefault,
      category: newCategory,
    });
    setAddresses(await addressStore.getAddresses());

    setNewLabel('');
    setNewAddress('');
    setNewContact('');
    setNewPhone('');
    setNewCategory('WAREHOUSE');
    setNewIsDefault(false);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    // NOTE: address-store has no delete API yet — this remains a local-only
    // removal for this render pass. A subsequent addressStore.getAddresses()
    // call (e.g. after adding or setting a default) will restore the item
    // from persisted storage. See task-3-report.md "Concerns".
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
    setAddresses(await addressStore.getAddresses());
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
      const matchContact = (item.contactName ?? '').toLowerCase().includes(q);
      const matchPhone = (item.contactPhone ?? '').toLowerCase().includes(q);
      return matchLabel || matchAddress || matchContact || matchPhone;
    }
    return true;
  });

  const getCategoryMeta = (cat?: AddressCategory) => {
    switch (cat) {
      case 'WAREHOUSE':
        return {
          label: 'Kho hàng',
          icon: <IconWarehouse color="#0284C7" size={20} />,
          color: '#0284C7',
          bg: '#E0F2FE',
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
      eyebrow="CUSTOMER · ADDRESS BOOK"
      headerRight={headerRight}
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
                  <IconLocationPin color="#0284C7" size={20} />
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

            <FormField
              label="Địa chỉ chi tiết"
              onChangeText={setNewAddress}
              placeholder="Số nhà, tên đường, phường, quận, tỉnh/thành..."
              value={newAddress}
            />

            {/* 📍 Ghim vị trí thực tế trên bản đồ vệ tinh / đường phố */}
            <View style={styles.mapPinSection}>
              <View style={styles.mapPinHeader}>
                <View style={styles.mapPinTitleRow}>
                  <IconLocationPin color="#0284C7" size={15} />
                  <Text style={styles.mapPinTitle}>Định vị trên bản đồ</Text>
                </View>
                <Text style={styles.mapPinHint}>Chạm hoặc kéo ghim để chỉnh</Text>
              </View>
              <View style={styles.mapPinBox}>
                <RealInteractiveMap
                  height={150}
                  initialPinCoords={resolveLocationCoords(newAddress)}
                  mode="pin"
                  title="Bản đồ định vị địa chỉ mới"
                />
              </View>
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
              isLoading ? null : (
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
              )
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
                              color="#0284C7"
                              fill="#0284C7"
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
                          <IconPhone color="#0284C7" size={13} />
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
                          <IconStar color="#0284C7" size={14} strokeWidth={2} />
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
                        <IconLocationPin color="#0284C7" size={13} />
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
    backgroundColor: '#0284C7',
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
    backgroundColor: '#E0F2FE',
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
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  catOptionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  catOptionTextSelected: {
    color: '#0284C7',
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
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
    paddingBottom: spacing.xl,
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
    borderColor: '#BAE6FD',
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
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: '#0284C7',
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
    color: '#0284C7',
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
    color: '#0284C7',
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
    color: '#0284C7',
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
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  firstAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
