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

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconLocationPin,
  IconTrash,
  VStack,
  colors,
  customerPalette,
  leopardPalette,
  typeScale,
} from '@leopard/mobile-core';
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
      <Box style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Đóng sổ địa chỉ"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <Card style={styles.bottomSheetCard}>
          <Box style={styles.bottomSheetHandle} />
          <HStack style={styles.bottomSheetHeader}>
            <VStack>
              <Text style={styles.bottomSheetTitle}>Sổ địa chỉ đã lưu</Text>
              <Text style={styles.bottomSheetSub}>
                Chọn địa chỉ cho {target === 'pickup' ? 'điểm lấy hàng' : 'điểm giao hàng'}
              </Text>
            </VStack>
            <Pressable
              accessibilityLabel="Đóng modal sổ địa chỉ"
              hitSlop={8}
              onPress={onClose}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </Pressable>
          </HStack>

          <ScrollView
            contentContainerStyle={styles.savedAddressListScroll}
            keyboardShouldPersistTaps="handled"
            style={styles.savedAddressScrollArea}
          >
            {addressList.length === 0 ? (
              <VStack style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Chưa có địa chỉ nào trong sổ</Text>
                <Text style={styles.emptySubtitle}>
                  Thêm địa chỉ mới hoặc ghim vị trí trên bản đồ để sử dụng.
                </Text>
              </VStack>
            ) : (
              addressList.map((addr) => {
                const isSelected = currentAddress === addr.address;
                return (
                  <Card
                    key={addr.id}
                    style={[
                      styles.savedAddressItemRow,
                      isSelected ? styles.savedAddressItemRowActive : null,
                    ]}
                  >
                    <Pressable
                      accessibilityLabel={`Chọn ${addr.label}: ${addr.address}`}
                      accessibilityRole="button"
                      onPress={() => onSelectAddress(addr)}
                      style={({ pressed }) => [
                        styles.savedAddressSelectArea,
                        pressed ? styles.pressed : null,
                      ]}
                      testID={`pickup-chip-${addr.id}`}
                    >
                      <Box
                        style={[
                          styles.savedAddrIconSquircle,
                          isSelected ? styles.savedAddrIconSquircleActive : null,
                        ]}
                      >
                        <IconLocationPin
                          color={isSelected ? colors.info.text : customerPalette.textSubtle}
                          size={18}
                        />
                      </Box>
                      <VStack style={styles.savedAddrTextCol}>
                        <HStack style={styles.savedAddrLabelRow}>
                          <Text style={styles.savedAddrLabelTitle}>{addr.label}</Text>
                          {addr.isDefault ? (
                            <Badge action="warning" size="sm" style={styles.defaultBadge}>
                              <Badge.Text style={styles.defaultBadgeText}>Mặc định</Badge.Text>
                            </Badge>
                          ) : null}
                        </HStack>
                        <Text numberOfLines={2} style={styles.savedAddrFullText}>
                          {addr.address}
                        </Text>
                      </VStack>
                      {isSelected ? (
                        <Box style={styles.checkCircle}>
                          <Text style={styles.checkCircleText}>✓</Text>
                        </Box>
                      ) : null}
                    </Pressable>
                    {onDeleteAddress ? (
                      <Pressable
                        accessibilityLabel={`Xóa ${addr.label}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => onDeleteAddress(addr.id)}
                        style={({ pressed }) => [
                          styles.deleteBtn,
                          pressed && styles.deleteBtnPressed,
                        ]}
                        testID={`delete-addr-${addr.id}`}
                      >
                        <IconTrash color={leopardPalette.inputPlaceholder} size={15} />
                      </Pressable>
                    ) : null}
                  </Card>
                );
              })
            )}
          </ScrollView>

          <VStack space="xs" style={styles.bottomSheetFooter}>
            <Pressable
              accessibilityLabel="Ghim vị trí trên bản đồ"
              accessibilityRole="button"
              onPress={() => onOpenMapPicker(target)}
              style={styles.bottomSheetMapBtn}
            >
              <IconLocationPin color={customerPalette.primaryDark} size={15} />
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
          </VStack>
        </Card>
      </Box>
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
    backgroundColor: customerPalette.surfaceWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '80%',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.subtleBorder,
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
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  bottomSheetSub: {
    fontSize: 12,
    color: customerPalette.textSubtle,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: typeScale.subheadline.fontSize,
    color: customerPalette.textSubtle,
    fontWeight: '600',
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
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 8,
  },
  savedAddressItemRowActive: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
  },
  savedAddressSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedAddrIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAddrIconSquircleActive: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
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
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  defaultBadge: {
    backgroundColor: colors.success.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    color: leopardPalette.ecoGreen,
  },
  savedAddrFullText: {
    fontSize: 12,
    color: customerPalette.textSubtle,
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.info.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleText: {
    color: customerPalette.surfaceWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.surfaceMuted,
  },
  bottomSheetMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: 12,
    height: 44,
  },
  bottomSheetMapBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  bottomSheetManageBtn: {
    paddingHorizontal: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 12,
  },
  bottomSheetManageBtnText: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
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
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    marginLeft: 4,
  },
  deleteBtnPressed: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  emptySubtitle: {
    fontSize: 12,
    color: customerPalette.textSubtle,
    textAlign: 'center',
  },
});
