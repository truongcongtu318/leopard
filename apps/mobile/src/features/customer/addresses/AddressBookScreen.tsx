import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

export type SavedAddress = Readonly<{
  id: string;
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
}>;

const mockAddresses: readonly SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Kho trung tâm Quận 7',
    address: '123 Đường Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0901234567',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Văn phòng đại diện',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
    contactName: 'Trần Thị B',
    contactPhone: '0912345678',
    isDefault: false,
  },
  {
    id: 'addr-3',
    label: 'Xưởng may Tân Bình',
    address: '78 Trường Chinh, Phường 12, Quận Tân Bình, TP.HCM',
    contactName: 'Lê Văn C',
    contactPhone: '0987654321',
    isDefault: false,
  },
];

export function AddressBookScreen() {
  const [addresses, setAddresses] = useState<readonly SavedAddress[]>(mockAddresses);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAddAddress = () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    const newItem: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      address: newAddress,
      contactName: newContact || 'Người nhận',
      contactPhone: newPhone || '0900000000',
      isDefault: addresses.length === 0,
    };
    setAddresses((prev) => [newItem, ...prev]);
    setNewLabel('');
    setNewAddress('');
    setNewContact('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  const headerRight = (
    <Pressable
      accessibilityLabel="Thêm địa chỉ mới"
      accessibilityRole="button"
      onPress={() => setIsAdding(!isAdding)}
      style={styles.addBtn}
    >
      <Text style={styles.addBtnText}>{isAdding ? 'Hủy' : '+ Thêm mới'}</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · ADDRESS BOOK"
      headerRight={headerRight}
      subtitle="Lưu sẵn địa chỉ thường dùng để tạo đơn nhanh chóng."
      title="Sổ địa chỉ"
    >
      <View style={styles.container}>
        {isAdding ? (
          <View style={styles.addCard}>
            <Text style={styles.formTitle}>Thêm địa chỉ mới</Text>
            <FormField
              label="Tên gợi nhớ (VD: Kho Quận 7, Nhà riêng)"
              onChangeText={setNewLabel}
              placeholder="Nhập tên gợi nhớ..."
              value={newLabel}
            />
            <FormField
              label="Địa chỉ chi tiết"
              onChangeText={setNewAddress}
              placeholder="Số nhà, tên đường, phường, quận..."
              value={newAddress}
            />
            <FormField
              label="Tên người liên hệ"
              onChangeText={setNewContact}
              placeholder="Tên người gửi/nhận..."
              value={newContact}
            />
            <FormField
              keyboardType="phone-pad"
              label="Số điện thoại liên hệ"
              onChangeText={setNewPhone}
              placeholder="090..."
              value={newPhone}
            />
            <Button
              disabled={!newLabel.trim() || !newAddress.trim()}
              label="Lưu địa chỉ"
              onPress={handleAddAddress}
            />
          </View>
        ) : null}

        <FlatList
          contentContainerStyle={styles.listContent}
          data={addresses}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
              <Text style={styles.emptyMessage}>Bấm "+ Thêm mới" để lưu địa chỉ đầu tiên.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.addressCard}>
              <View style={styles.cardTop}>
                <View style={styles.titleWrap}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  {item.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Mặc định</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.addressText}>{item.address}</Text>
              <Text style={styles.contactText}>
                👤 {item.contactName} · 📞 {item.contactPhone}
              </Text>
              <View style={styles.actionRow}>
                {!item.isDefault ? (
                  <Pressable onPress={() => handleSetDefault(item.id)}>
                    <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Xóa</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  addBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addBtnText: {
    color: colors.brand.background,
    fontSize: 13.5,
    fontWeight: '700',
  },
  addCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  formTitle: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  addressCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addressLabel: {
    color: colors.neutral.titleText,
    fontSize: 14.5,
    fontWeight: '700',
  },
  defaultBadge: {
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: colors.brand.background,
    fontSize: 10.5,
    fontWeight: '700',
  },
  addressText: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 18,
  },
  contactText: {
    color: colors.neutral.mutedText,
    fontSize: 12,
  },
  actionRow: {
    alignItems: 'center',
    borderTopColor: colors.neutral.rowDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  setDefaultText: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '600',
  },
  deleteText: {
    color: colors.danger.text,
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyMessage: {
    color: colors.neutral.mutedText,
    fontSize: 13,
  },
});
