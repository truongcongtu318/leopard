import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconLocationPin, IconTrash } from '../../../ui/icons/CoreIcons';
import type { SavedAddress } from '../../customer/addresses/address-store';

export type SavedAddressPickerModalProps = Readonly<{
  visible: boolean;
  target: 'pickup' | 'dropoff';
  currentAddress: string;
  addressList: readonly SavedAddress[];
  onClose: () => void;
  onSelectAddress: (address: SavedAddress) => void;
  onOpenMapPicker: (target: 'pickup' | 'dropoff') => void;
  onOpenSavedAddresses?: () => void;
  onDeleteAddress?: (id: string) => void;
}>;

export function SavedAddressPickerModal({
  visible,
  target,
  currentAddress,
  addressList,
  onClose,
  onSelectAddress,
  onOpenMapPicker,
  onOpenSavedAddresses,
  onDeleteAddress,
}: SavedAddressPickerModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Đóng sổ địa chỉ"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetHeader}>
            <View>
              <Text style={styles.bottomSheetTitle}>Sổ địa chỉ đã lưu</Text>
              <Text style={styles.bottomSheetSub}>
                Chọn địa chỉ cho {target === 'pickup' ? 'điểm lấy hàng' : 'điểm giao hàng'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng modal sổ địa chỉ"
              hitSlop={8}
              onPress={onClose}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.savedAddressListScroll}
            keyboardShouldPersistTaps="handled"
            style={styles.savedAddressScrollArea}
          >
            {addressList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Chưa có địa chỉ nào trong sổ</Text>
                <Text style={styles.emptySubtitle}>
                  Thêm địa chỉ mới hoặc ghim vị trí trên bản đồ để sử dụng.
                </Text>
              </View>
            ) : (
              addressList.map((addr) => {
                const isSelected = currentAddress === addr.address;
                return (
                  <Pressable
                    accessibilityLabel={`Chọn ${addr.label}: ${addr.address}`}
                    accessibilityRole="button"
                    key={addr.id}
                    onPress={() => onSelectAddress(addr)}
                    style={({ pressed }) => [
                      styles.savedAddressItemRow,
                      isSelected ? styles.savedAddressItemRowActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                    testID={`pickup-chip-${addr.id}`}
                  >
                    <View
                      style={[
                        styles.savedAddrIconSquircle,
                        isSelected ? styles.savedAddrIconSquircleActive : null,
                      ]}
                    >
                      <IconLocationPin
                        color={isSelected ? '#2563EB' : '#64748B'}
                        size={18}
                      />
                    </View>
                    <View style={styles.savedAddrTextCol}>
                      <View style={styles.savedAddrLabelRow}>
                        <Text style={styles.savedAddrLabelTitle}>{addr.label}</Text>
                        {addr.isDefault ? (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={2} style={styles.savedAddrFullText}>
                        {addr.address}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkCircleText}>✓</Text>
                      </View>
                    ) : null}
                    {onDeleteAddress ? (
                      <Pressable
                        accessibilityLabel={`Xóa ${addr.label}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={(e) => {
                          if (typeof (e as any)?.stopPropagation === 'function') {
                            (e as any).stopPropagation();
                          }
                          onDeleteAddress(addr.id);
                        }}
                        style={({ pressed }) => [
                          styles.deleteBtn,
                          pressed && styles.deleteBtnPressed,
                        ]}
                        testID={`delete-addr-${addr.id}`}
                      >
                        <IconTrash color="#94A3B8" size={15} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.bottomSheetFooter}>
            <Pressable
              accessibilityLabel="Ghim vị trí trên bản đồ"
              accessibilityRole="button"
              onPress={() => onOpenMapPicker(target)}
              style={styles.bottomSheetMapBtn}
            >
              <IconLocationPin color="#EA580C" size={15} />
              <Text style={styles.bottomSheetMapBtnText}>Ghim vị trí trên bản đồ</Text>
            </Pressable>

            {onOpenSavedAddresses ? (
              <Pressable
                accessibilityLabel="Thêm địa chỉ mới"
                accessibilityRole="button"
                onPress={onOpenSavedAddresses}
                style={styles.bottomSheetManageBtn}
              >
                <Text style={styles.bottomSheetManageBtnText}>+ Thêm địa chỉ mới</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
      } as any,
    }),
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  bottomSheetCard: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '80%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomSheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  savedAddressListScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  savedAddressScrollArea: {
    maxHeight: 320,
  },
  savedAddressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  savedAddressItemRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  savedAddrIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAddrIconSquircleActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  savedAddrTextCol: {
    flex: 1,
  },
  savedAddrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  savedAddrLabelTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  savedAddrFullText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomSheetMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    height: 44,
  },
  bottomSheetMapBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  bottomSheetManageBtn: {
    paddingHorizontal: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  bottomSheetManageBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  pressed: {
    opacity: 0.8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 4,
  },
  deleteBtnPressed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
