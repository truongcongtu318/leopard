import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  IconClock,
  IconLocationPin,
  IconOrders,
  IconRadarPulse,
  IconRoute,
  IconSpeedTruck,
  RealInteractiveMap,
  radius,
  ScreenScaffold,
  spacing,
  StatusBadge,
} from '@leopard/mobile-core';
import type { DriverDetailContentView } from '../../model';

export type PublicDetailViewProps = Readonly<{
  view: Extract<DriverDetailContentView, { accessScope: 'PUBLIC_SUMMARY' }>;
  stickyFooter?: React.ReactNode;
  onBack?: () => void;
}>;

export function PublicDetailView({
  view,
  stickyFooter,
  onBack,
}: PublicDetailViewProps) {
  const pickupLabel =
    view.order.pickupLocationLabel ||
    view.order.publicRouteLabel.split('→')[0]?.trim() ||
    'Khu vực lấy hàng';
  const dropoffLabel =
    view.order.dropoffLocationLabel ||
    view.order.publicRouteLabel.split('→')[1]?.trim() ||
    'Khu vực giao hàng';

  return (
    <ScreenScaffold
      eyebrow="DRIVER · FIELD COCKPIT"
      headerTone="ink"
      onBack={onBack}
      stickyFooter={stickyFooter}
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Interactive Preview Map Canvas */}
        <View style={styles.mapCanvasContainer} testID="public-route-map-schematic">
          <RealInteractiveMap
            destination={{ label: dropoffLabel }}
            height="100%"
            mode="route"
            origin={{ label: pickupLabel }}
          />

          {/* Floating Tag Top Right: Public Preview Mode */}
          <View style={styles.publicMapTopTag}>
            <View style={styles.publicMapDot} />
            <Text style={styles.publicMapTopTagText}>XEM TRƯỚC LỘ TRÌNH</Text>
          </View>

          {/* Floating Pill Bottom Left: ETA & Distance */}
          <View style={styles.mapFloatingEtaPill}>
            <IconClock color="#0B1E42" size={13} />
            <Text style={styles.mapFloatingEtaText}>
              {view.order.distanceLabel ? `${view.order.distanceLabel} · ` : ''}{view.order.etaLabel}
            </Text>
          </View>

          {/* Floating Pill Bottom Right: Protected View */}
          <View style={styles.publicProtectedTag}>
            <Text style={styles.publicProtectedText}>Chế độ xem trước</Text>
          </View>
        </View>

        {/* 2. Sheet Container */}
        <View style={styles.publicSheetContainer}>
          {/* Header Row: Title and Status */}
          <View style={styles.missionHeaderRow}>
            <View style={styles.missionTitleCol}>
              <Text style={styles.missionEyebrow}>ĐƠN HÀNG CHỜ TIẾP NHẬN</Text>
              <Text style={styles.missionLegTitle}>THÔNG TIN QUYẾT ĐỊNH NHẬN ĐƠN</Text>
            </View>
            <StatusBadge domain="order" status={view.order.status} />
          </View>

          {/* 3. Dispatch Fare Slab: Prominent Earnings */}
          <View style={styles.fareSlab}>
            <View style={styles.fareSlabTopRow}>
              <View style={styles.fareIconBadge}>
                <IconOrders color="#0B1E42" size={16} />
              </View>
              <View style={styles.fareTitleCol}>
                <Text style={styles.fareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
                <Text style={styles.fareSubcaption}>Nhận vào ví ngay khi hoàn tất giao hàng</Text>
              </View>
              <View style={styles.fareNetPill}>
                <Text style={styles.fareNetPillText}>Thu nhập ròng</Text>
              </View>
            </View>
            <View style={styles.fareAmountRow}>
              <Text style={styles.fareAmountText}>{view.order.priceLabel || '285.000 ₫'}</Text>
            </View>
            <View style={styles.fareTermsRow}>
              <View style={styles.checkIconDot}>
                <Text style={styles.checkIconDotText}>✓</Text>
              </View>
              <Text style={styles.fareTermsText}>
                Đã khấu trừ phí nền tảng · Khách thanh toán bảo đảm qua VietQR Napas247
              </Text>
            </View>
          </View>

          {/* 4. Vertical Route Spine (Public Scope) */}
          <View style={styles.publicRouteCard}>
            <Text style={styles.cardSectionTitle}>LỘ TRÌNH VẬN CHUYỂN</Text>
            <View style={styles.publicRouteSpineRow}>
              <View style={styles.publicSpineColumn}>
                <View style={styles.publicSpinePointA}>
                  <Text style={styles.publicSpinePointTextA}>A</Text>
                </View>
                <View style={styles.publicSpineDashedLine} />
                <View style={styles.publicSpinePointB}>
                  <Text style={styles.publicSpinePointTextB}>B</Text>
                </View>
              </View>

              <View style={styles.publicSpineLabelsCol}>
                <View style={styles.publicPointBlock}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.publicPointSubA}>ĐIỂM LẤY HÀNG (A)</Text>
                    <View style={styles.publicDistanceChip}>
                      <IconLocationPin color="#0B1E42" size={10} />
                      <Text style={styles.publicDistanceChipText}>
                        {view.order.pickupDistanceLabel || 'Cách bạn 1.2 km'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.publicPointTitleA}>{pickupLabel}</Text>
                </View>

                <View style={styles.publicDistanceBetweenRow}>
                  <IconRoute color="#0B1E42" size={12} />
                  <Text style={styles.publicDistanceBetweenText}>
                    Khoảng cách chặng · {view.order.distanceLabel || '18,4 km'}
                  </Text>
                </View>

                <View style={styles.publicPointBlock}>
                  <Text style={styles.publicPointSubB}>ĐIỂM GIAO HÀNG (B)</Text>
                  <Text style={styles.publicPointTitleB}>{dropoffLabel}</Text>
                </View>
              </View>
            </View>

            {/* Accessible full route string for screen readers and test assertions */}
            <View style={styles.publicRouteMetaFooter}>
              <Text style={styles.publicRouteMetaText}>
                {view.order.publicRouteLabel}
              </Text>
            </View>
          </View>

          {/* 5. Cargo & Vehicle Specs Grid */}
          <View style={styles.publicSpecsGrid}>
            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconSpeedTruck color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>LOẠI XE YÊU CẦU</Text>
                <Text style={styles.specCellValue}>{view.order.vehicleLabel}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconOrders color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>QUY CÁCH HÀNG HÓA</Text>
                <Text numberOfLines={2} style={styles.specCellValue}>{view.order.cargoSummary}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconClock color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>THỜI GIAN DỰ KIẾN</Text>
                <Text style={styles.specCellValue}>{view.order.etaLabel}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconLocationPin color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>CẬP NHẬT ĐƠN</Text>
                <Text style={styles.specCellValue}>{view.order.updatedAtLabel}</Text>
              </View>
            </View>
          </View>

          {/* 6. Dispatch Notice: Open offer to nearby drivers */}
          <View style={styles.publicDispatchNotice}>
            <View style={styles.noticeIconCircle}>
              <IconRadarPulse color="#0B1E42" size={16} />
            </View>
            <View style={styles.noticeTextCol}>
              <Text style={styles.noticeHeader}>Đơn đang mở cho tài xế khu vực</Text>
              <Text style={styles.noticeBodyText}>
                Đơn hàng đang phát cho các tài xế phù hợp trong bán kính 5 km. Hãy nhận đơn sớm nếu sẵn sàng nhận hàng.
              </Text>
            </View>
          </View>

          {/* 7. Privacy statement */}
          <View style={styles.publicPrivacyCard}>
            <Text style={styles.publicPrivacyTitle}>Bảo mật thông tin trước khi nhận</Text>
            <Text style={styles.privacyCopy}>
              Địa chỉ đầy đủ, liên hệ, media và tracking chỉ xuất hiện sau khi hệ thống xác nhận phân công.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: 110,
  },
  mapCanvasContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    height: 270,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  publicMapTopTag: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  publicMapDot: {
    backgroundColor: '#38BDF8',
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  publicMapTopTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mapFloatingEtaPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 14,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    zIndex: 10,
  },
  mapFloatingEtaText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
  },
  publicProtectedTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    bottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  publicProtectedText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  publicSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm + 2,
    marginTop: -8,
    padding: spacing.md,
  },
  missionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  missionTitleCol: {
    flex: 1,
    gap: 2,
  },
  missionEyebrow: {
    color: '#0B1E42',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  missionLegTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  fareSlab: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
  },
  fareSlabTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  fareIconBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fareTitleCol: {
    flex: 1,
  },
  fareCaption: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  fareSubcaption: {
    color: '#94A3B8',
    fontSize: 10,
  },
  fareNetPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fareNetPillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  fareAmountRow: {
    marginVertical: 2,
  },
  fareAmountText: {
    color: '#0B1E42',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  fareTermsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  checkIconDot: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  checkIconDotText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '900',
  },
  fareTermsText: {
    color: '#475569',
    flex: 1,
    fontSize: 10.5,
  },
  publicRouteCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  cardSectionTitle: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  publicRouteSpineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  publicSpineColumn: {
    alignItems: 'center',
    paddingVertical: 4,
    width: 28,
  },
  publicSpinePointA: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  publicSpinePointTextA: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  publicSpineDashedLine: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 4,
    minHeight: 40,
    width: 2,
  },
  publicSpinePointB: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  publicSpinePointTextB: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  publicSpineLabelsCol: {
    flex: 1,
    gap: 8,
  },
  publicPointBlock: {
    gap: 2,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  publicPointSubA: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  publicDistanceChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  publicDistanceChipText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  publicPointTitleA: {
    color: '#0B1E42',
    fontSize: 13.5,
    fontWeight: '700',
  },
  publicDistanceBetweenRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  publicDistanceBetweenText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  publicPointSubB: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  publicPointTitleB: {
    color: '#0B1E42',
    fontSize: 13.5,
    fontWeight: '700',
  },
  publicRouteMetaFooter: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  publicRouteMetaText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  publicSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  publicSpecCell: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    width: '48%',
  },
  specCellIconOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  specCellTextCol: {
    flex: 1,
    gap: 2,
  },
  specCellLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  specCellValue: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  publicDispatchNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  noticeIconCircle: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  noticeTextCol: {
    flex: 1,
    gap: 3,
  },
  noticeHeader: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeBodyText: {
    color: '#1E3A8A',
    fontSize: 11,
    lineHeight: 16,
  },
  publicPrivacyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    gap: 3,
    padding: 10,
  },
  publicPrivacyTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  privacyCopy: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
  },
});
