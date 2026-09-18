import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { BookingPricingBreakdown } from '../booking-pricing';
import { useSafeInsets } from '../safe-insets';

export interface PriceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  breakdown: BookingPricingBreakdown;
  /** Real routed distance; undefined until the estimate resolves. */
  distanceKm?: number;
}

export function PriceDetailModal({
  visible,
  onClose,
  breakdown,
  distanceKm,
}: PriceDetailModalProps) {
  const insets = useSafeInsets();

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <Modal
      accessibilityViewIsModal={true}
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Đóng modal"
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {/* iOS Grabber */}
          <View
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
            style={styles.grabber}
          />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                Chi tiết cước vận chuyển
              </Text>
              <Text style={styles.sheetSubtitle}>Bóc tách minh bạch chi phí đơn hàng</Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng chi tiết cước"
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          {/* Itemized breakdown with transparent math */}
          <View style={styles.itemList}>
            {/* 1. Cước xuất xe cơ sở */}
            <View style={styles.itemRow}>
              <View style={styles.labelCol}>
                <Text style={styles.itemLabel}>1. Cước xuất xe cơ sở</Text>
                <Text style={styles.itemHint}>{breakdown.vehicleName} · Đã gồm định mức khởi điểm</Text>
              </View>
              <Text selectable style={styles.itemValue}>
                {breakdown.baseFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* 2. Cước cự ly di chuyển thực tế */}
            <View style={styles.itemRow}>
              <View style={styles.labelCol}>
                <Text style={styles.itemLabel}>
                  2. Cước cự ly
                  {typeof distanceKm === 'number' && distanceKm > 0
                    ? ` (${distanceKm.toFixed(1).replace('.', ',')} km)`
                    : ''}
                </Text>
                <Text style={styles.itemHint}>
                  Tính theo quãng đường thực tế
                </Text>
              </View>
              <Text selectable style={styles.itemValue}>
                {breakdown.distanceFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* 3. Phụ phí điểm dừng (nếu có) */}
            {breakdown.stopFare > 0 && (
              <View style={styles.itemRow}>
                <View style={styles.labelCol}>
                  <Text style={styles.itemLabel}>3. Phụ phí điểm dừng dỡ hàng</Text>
                  <Text style={styles.itemHint}>Phụ phí bến bãi &amp; dừng xe trả hàng</Text>
                </View>
                <Text selectable style={styles.itemValuePlus}>
                  +{breakdown.stopFare.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            {/* 4. Tài xế hỗ trợ bốc xếp (nếu có) */}
            {breakdown.loadingFee > 0 && (
              <View style={styles.itemRow}>
                <View style={styles.labelCol}>
                  <Text style={styles.itemLabel}>4. Tài xế hỗ trợ bốc xếp</Text>
                  <Text style={styles.itemHint}>Dịch vụ bốc dỡ hàng theo yêu cầu</Text>
                </View>
                <Text selectable style={styles.itemValuePlus}>
                  +{breakdown.loadingFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.separator} />

            {/* Tạm tính trước thuế */}
            <View style={styles.itemRowSubtotal}>
              <Text style={styles.subtotalLabel}>Tạm tính cước vận chuyển &amp; dịch vụ</Text>
              <Text selectable style={styles.subtotalValue}>
                {breakdown.subtotal.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* 5. Thuế VAT 8% (nếu có) */}
            {breakdown.vatFee > 0 && (
              <View style={styles.itemRow}>
                <View style={styles.labelCol}>
                  <Text style={styles.itemLabel}>5. Thuế GTGT / VAT (8%)</Text>
                  <Text style={styles.itemHint}>Xuất hóa đơn điện tử hợp lệ</Text>
                </View>
                <Text selectable style={styles.itemValuePlus}>
                  +{breakdown.vatFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.separatorBold} />

            {/* Tổng cộng */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.noteText}>
                  Đã gồm nhiên liệu, phí cầu đường &amp; thuế (nếu có)
                </Text>
              </View>
              <Text selectable style={styles.totalValue}>
                {breakdown.totalFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          {/* Nút Đã hiểu */}
          <Pressable
            accessibilityLabel="Đã hiểu chi tiết cước vận chuyển"
            accessibilityRole="button"
            onPress={handleClose}
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
          >
            <Text style={styles.confirmBtnText}>Đã hiểu</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    maxHeight: '75%',
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.16)',
    ...iosContinuousCurve,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  sheetTitle: {
    ...typeScale.title3,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  sheetSubtitle: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  closeBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  closeText: {
    ...typeScale.body,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  itemList: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xxs,
  },
  labelCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemLabel: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  itemHint: {
    ...typeScale.caption2,
    color: customerPalette.textMutedSlate,
    marginTop: spacing.hairline,
  },
  itemValue: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  itemValuePlus: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  itemRowSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.canvas,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
  },
  subtotalLabel: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  subtotalValue: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: spacing.xxs,
  },
  separatorBold: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  totalValue: {
    ...typeScale.title2,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  noteText: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  confirmBtn: {
    height: 50,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    boxShadow: '0 2px 8px rgba(11, 37, 69, 0.25)',
    ...iosContinuousCurve,
  },
  confirmBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  confirmBtnText: {
    ...typeScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
