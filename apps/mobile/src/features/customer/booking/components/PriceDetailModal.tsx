import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { BookingPricingBreakdown } from '../booking-pricing';

export interface PriceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  breakdown: BookingPricingBreakdown;
  distanceKm: number;
}

export function PriceDetailModal({
  visible,
  onClose,
  breakdown,
  distanceKm,
}: PriceDetailModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />

        <View style={styles.sheetContainer}>
          {/* iOS Grabber */}
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chi tiết cước vận chuyển</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          {/* Itemized breakdown */}
          <View style={styles.itemList}>
            {/* Cước cơ bản / xuất xe */}
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>
                Cước vận chuyển ({breakdown.vehicleName} · {distanceKm.toFixed(1).replace('.', ',')} km)
              </Text>
              <Text style={styles.itemValue}>
                {breakdown.transportFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* Phụ phí điểm dừng */}
            {breakdown.stopFare > 0 && (
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Phụ phí điểm dừng</Text>
                <Text style={styles.itemValue}>
                  {breakdown.stopFare.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            {/* Bốc xếp */}
            {breakdown.loadingFee > 0 && (
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Tài xế hỗ trợ bốc xếp</Text>
                <Text style={styles.itemValue}>
                  {breakdown.loadingFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            {/* VAT */}
            {breakdown.vatFee > 0 && (
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Thuế VAT (8%)</Text>
                <Text style={styles.itemValue}>
                  {breakdown.vatFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.separator} />

            {/* Tổng cộng */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalValue}>
                {breakdown.totalFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <Text style={styles.noteText}>
              (Đã bao gồm tất cả thuế, phụ phí nhiên liệu &amp; phí cầu đường)
            </Text>
          </View>

          {/* Nút Đã hiểu */}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
          >
            <Text style={styles.confirmBtnText}>ĐÃ HIỂU</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    maxHeight: '60%',
    ...iosContinuousCurve,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetTitle: {
    ...typeScale.title3,
    fontWeight: '600',
    color: customerPalette.textPrimary,
  },
  closeText: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.primary,
  },
  itemList: {
    paddingVertical: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemLabel: {
    ...typeScale.subheadline,
    color: customerPalette.textSecondary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemValue: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.textPrimary,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textPrimary,
  },
  totalValue: {
    ...typeScale.title3,
    fontWeight: '700',
    color: customerPalette.primary,
  },
  noteText: {
    ...typeScale.footnote,
    color: customerPalette.textSecondary,
    marginTop: 4,
  },
  confirmBtn: {
    height: 48,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.control,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...iosContinuousCurve,
  },
  confirmBtnPressed: {
    opacity: 0.85,
  },
  confirmBtnText: {
    ...typeScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
