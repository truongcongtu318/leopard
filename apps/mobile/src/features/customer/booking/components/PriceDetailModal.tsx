import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeInsets } from '../safe-insets';

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
  const insets = useSafeInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {/* iOS Grabber */}
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chi tiết cước vận chuyển</Text>
            <Pressable hitSlop={12} onPress={onClose}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '65%',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    ...iosContinuousCurve,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetTitle: {
    ...typeScale.title3,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeText: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  itemList: {
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemLabel: {
    ...typeScale.subheadline,
    fontSize: 14,
    color: '#6E6E73',
    flex: 1,
    paddingRight: 12,
  },
  itemValue: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
  },
  totalLabel: {
    ...typeScale.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  totalValue: {
    ...typeScale.title2,
    fontSize: 20,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  noteText: {
    ...typeScale.footnote,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
  },
  confirmBtn: {
    height: 50,
    backgroundColor: customerPalette.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...iosContinuousCurve,
  },
  confirmBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  confirmBtnText: {
    ...typeScale.callout,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
