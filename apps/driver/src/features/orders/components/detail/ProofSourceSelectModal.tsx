import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  customerPalette,
  haptic,
  IconCamera,
  IconCameraProof,
  IconChevron,
  IconClose,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface ProofSourceSelectModalProps {
  visible: boolean;
  leg: 'pickup' | 'delivery' | null;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
  onClose: () => void;
}

export const ProofSourceSelectModal = memo(function ProofSourceSelectModal({
  visible,
  leg,
  onSelectCamera,
  onSelectLibrary,
  onClose,
}: ProofSourceSelectModalProps) {
  const isPickup = leg === 'pickup';
  const title = isPickup
    ? 'Ảnh kiểm hàng tại điểm lấy'
    : 'Ảnh xác nhận đã giao hàng';
  const subtitle = isPickup
    ? 'Chụp hoặc tải ảnh kiện hàng trước khi rời điểm lấy'
    : 'Chụp hoặc tải ảnh hàng hóa/chứng từ bàn giao thành công';

  const handleCamera = () => {
    haptic.selection();
    onSelectCamera();
  };

  const handleLibrary = () => {
    haptic.selection();
    onSelectLibrary();
  };

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent={true}
      visible={visible}
    >
      <View style={styles.scrim} testID="proof-source-modal">
        <Pressable
          accessibilityLabel="Đóng lựa chọn phương thức"
          accessibilityRole="button"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.sheetCard}>
          {/* Apple HIG Sheet Grabber */}
          <View style={styles.grabberContainer} pointerEvents="none">
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng"
              accessibilityRole="button"
              hitSlop={spacing.xs}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed ? styles.btnPressed : null,
              ]}
              testID="btn-close-source-modal"
            >
              <IconClose color={colors.neutral.mutedText} size={18} />
            </Pressable>
          </View>

          {/* Options list */}
          <View style={styles.optionsWrap}>
            {/* Option 1: Chụp ảnh máy ảnh */}
            <Pressable
              accessibilityHint="Mở máy ảnh để chụp trực tiếp hàng hóa"
              accessibilityLabel="Chụp ảnh bằng máy ảnh"
              accessibilityRole="button"
              onPress={handleCamera}
              style={({ pressed }) => [
                styles.optionCard,
                pressed ? styles.optionCardPressed : null,
              ]}
              testID="btn-source-camera"
            >
              <View style={styles.iconCircleAmber}>
                <IconCamera color={leopardPalette.primary} size={24} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Chụp ảnh bằng máy ảnh</Text>
                <Text style={styles.optionDesc}>
                  Mở camera chụp ảnh kiểm hàng trực tiếp tại chỗ
                </Text>
              </View>
              <IconChevron color="#94A3B8" direction="right" size={18} />
            </Pressable>

            {/* Option 2: Chọn từ thư viện */}
            <Pressable
              accessibilityHint="Mở album ảnh trên điện thoại để chọn ảnh có sẵn"
              accessibilityLabel="Chọn ảnh từ thư viện"
              accessibilityRole="button"
              onPress={handleLibrary}
              style={({ pressed }) => [
                styles.optionCard,
                pressed ? styles.optionCardPressed : null,
              ]}
              testID="btn-source-library"
            >
              <View style={styles.iconCircleBlue}>
                <IconCameraProof color={customerPalette.primary} size={24} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Chọn ảnh từ thư viện</Text>
                <Text style={styles.optionDesc}>
                  Tải lên ảnh chụp hàng hóa hoặc biên bản có sẵn trong máy
                </Text>
              </View>
              <IconChevron color="#94A3B8" direction="right" size={18} />
            </Pressable>
          </View>

          {/* Cancel button */}
          <Pressable
            accessibilityLabel="Hủy bỏ"
            accessibilityRole="button"
            onPress={handleClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed ? styles.btnPressed : null,
            ]}
          >
            <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(11, 21, 38, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
    gap: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  grabber: {
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    height: 5,
    width: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
  },
  subtitleText: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionCardPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.985 }],
  },
  iconCircleAmber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBlue: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  optionDesc: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    lineHeight: 16,
  },
  cancelBtn: {
    height: 48,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxs,
  },
  cancelBtnText: {
    color: '#475569',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
