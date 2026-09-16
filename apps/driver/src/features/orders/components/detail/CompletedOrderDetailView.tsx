import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  driverPrimitives,
  IconClock,
  IconOrders,
  iosContinuousCurve,
  ScreenScaffold,
  StatusTimeline,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { CompletionSummaryCard } from './CompletionSummaryCard';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { CargoAndContactCard } from './CargoAndContactCard';

export type CompletedOrderDetailViewProps = Readonly<{
  view: DriverAssignedDetailView;
  onBack?: () => void;
}>;

export function CompletedOrderDetailView({ onBack, view }: CompletedOrderDetailViewProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const { order, proof } = view;
  const hasProof = Boolean(
    proof && (proof.kind === 'persisted' || proof.fileLabel || proof.mediaId),
  );

  return (
    <ScreenScaffold headerTone="plain" onBack={onBack} title={`Biên bản đơn ${order.reference}`}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Thẻ tóm tắt cước và trạng thái hoàn thành */}
        <CompletionSummaryCard
          deliveredAtLabel={order.updatedAtLabel}
          priceLabel={order.priceLabel}
          reference={order.reference}
          status={order.status}
        />

        {/* 2. Lộ trình giao hàng thực tế */}
        <VerticalRouteStepper
          destination={order.route.destination}
          destinationLabel={order.route.destination.label}
          distanceLabel={order.route.distanceLabel}
          origin={order.route.origin}
          originLabel={order.route.origin.label}
          status={order.status}
          stops={order.route.stops}
        />

        {/* 3. Chi tiết hàng hoá & Khách hàng */}
        <CargoAndContactCard
          cargoSummary={order.cargoSummary}
          cargoWeightKg={order.cargoWeightKg}
          contactRoleLabel={order.contactRoleLabel}
          customerContact={order.customerContact}
          vehicleLabel={order.vehicleLabel}
        />

        {/* 4. Biên bản e-POD bàn giao hàng (chỉ đọc) */}
        {hasProof ? (
          <View style={styles.epodReceiptCard} testID="epod-saved-receipt">
            <View style={styles.epodHeaderRow}>
              <IconOrders color="#0F172A" size={16} />
              <Text style={styles.epodTitle}>BIÊN BẢN GIAO NHẬN (e-POD)</Text>
            </View>

            <View style={styles.proofItemCol}>
              <Text style={styles.proofLabel}>Ảnh chụp bàn giao kiện hàng:</Text>
              <View
                accessibilityLabel="Ảnh chụp bàn giao kiện hàng"
                style={styles.proofPlaceholderBox}
              >
                <Text style={styles.proofFileText}>{proof.fileLabel || 'Đã lưu ảnh chứng từ giao hàng'}</Text>
                <Text style={styles.watermarkText}>LEOPARD e-POD · {order.reference}</Text>
              </View>
            </View>

            <View style={styles.proofItemCol}>
              <Text style={styles.proofLabel}>Chữ ký người nhận hàng:</Text>
              <View
                accessibilityLabel="Chữ ký người nhận hàng"
                style={styles.signatureBox}
              >
                <Text style={styles.signaturePathPreview}>Đã ký điện tử xác thực</Text>
                <Text style={styles.signerNameText}>Xác nhận bởi người nhận hàng</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 5. Nhật ký thời gian & sự kiện */}
        <View style={styles.timelineSection}>
          <Pressable
            accessibilityLabel={`Xem nhật ký sự kiện, ${order.history.length} mốc`}
            accessibilityRole="button"
            onPress={() => setIsTimelineOpen(!isTimelineOpen)}
            style={({ pressed }) => [styles.timelineToggleBtn, pressed ? styles.pressed : null]}
          >
            <View style={styles.timelineToggleLeft}>
              <IconClock color="#0B1E42" size={15} />
              <Text style={styles.timelineToggleText}>
                Lịch sử hành trình ({order.history.length} sự kiện)
              </Text>
            </View>
            <Text style={styles.timelineToggleArrow}>{isTimelineOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {isTimelineOpen ? (
            <View style={styles.timelineContentWrap}>
              <StatusTimeline entries={order.history} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    padding: 16,
    paddingBottom: 40,
  },
  epodReceiptCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  epodHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  epodTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proofItemCol: {
    gap: 6,
  },
  proofLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12,
    fontWeight: '600',
  },
  proofPlaceholderBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    padding: 12,
  },
  proofFileText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '700',
  },
  watermarkText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  signatureBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 90,
    justifyContent: 'center',
    padding: 8,
    width: '100%',
  },
  signaturePathPreview: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  signerNameText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  timelineSection: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineToggleBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  timelineToggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineToggleText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  timelineToggleArrow: {
    color: '#64748B',
    fontSize: 11,
  },
  timelineContentWrap: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    padding: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
