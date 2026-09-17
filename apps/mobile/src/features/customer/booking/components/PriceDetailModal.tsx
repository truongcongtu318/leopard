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
import { useSafeInsets } from '../safe-insets';

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
            <View>
              <Text style={styles.sheetTitle}>Chi tiết cước vận chuyển</Text>
              <Text style={styles.sheetSubtitle}>Bóc tách minh bạch chi phí đơn hàng</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
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
              <Text style={styles.itemValue}>
                {breakdown.baseFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* 2. Cước cự ly di chuyển thực tế */}
            <View style={styles.itemRow}>
              <View style={styles.labelCol}>
                <Text style={styles.itemLabel}>
                  2. Cước cự ly ({distanceKm.toFixed(1).replace('.', ',')} km)
                </Text>
                <Text style={styles.itemHint}>
                  Tính theo quãng đường thực tế
                </Text>
              </View>
              <Text style={styles.itemValue}>
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
                <Text style={styles.itemValuePlus}>
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
                <Text style={styles.itemValuePlus}>
                  +{breakdown.loadingFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.separator} />

            {/* Tạm tính trước thuế */}
            <View style={styles.itemRowSubtotal}>
              <Text style={styles.subtotalLabel}>Tạm tính cước vận chuyển &amp; dịch vụ</Text>
              <Text style={styles.subtotalValue}>
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
                <Text style={styles.itemValuePlus}>
                  +{breakdown.vatFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.separatorBold} />

            {/* Tổng cộng */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                <Text style={styles.noteText}>
                  Đã gồm nhiên liệu, phí cầu đường &amp; thuế (nếu có)
                </Text>
              </View>
              <Text style={styles.totalValue}>
                {breakdown.totalFare.toLocaleString('vi-VN')} đ
              </Text>
            </View>
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '75%',
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.16)',
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
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  sheetTitle: {
    ...typeScale.title3,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    ...typeScale.caption1,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  itemList: {
    paddingVertical: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  labelCol: {
    flex: 1,
    paddingRight: 12,
  },
  itemLabel: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemHint: {
    ...typeScale.caption2,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  itemValue: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontVariant: ['tabular-nums'],
  },
  itemValuePlus: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  itemRowSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  subtotalLabel: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  subtotalValue: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  separatorBold: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalLabel: {
    ...typeScale.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  totalValue: {
    ...typeScale.title2,
    fontSize: 22,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  noteText: {
    ...typeScale.footnote,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  confirmBtn: {
    height: 50,
    backgroundColor: customerPalette.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    boxShadow: '0 2px 8px rgba(11, 37, 69, 0.25)',
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
