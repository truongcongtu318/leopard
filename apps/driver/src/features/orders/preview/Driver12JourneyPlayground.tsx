import React, { memo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RealInteractiveMap,
  driverHapticMatrix,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { IncomingDispatchModal } from '../IncomingDispatchModal';
import { DriverNavigationSheet } from '../components/detail/DriverNavigationSheet';
import { PickupVerificationView } from '../components/detail/PickupVerificationView';
import { MultiStopProgressHeader } from '../components/detail/MultiStopProgressHeader';
import { DeliveryVerificationView } from '../components/detail/DeliveryVerificationView';
import { TripCompletedSummaryView } from '../components/detail/TripCompletedSummaryView';

export type JourneyStateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const STATE_NAMES: Record<JourneyStateId, string> = {
  1: '1. Nổ đơn (20s đầy)',
  2: '2. Nổ đơn (<5s đỏ)',
  3: '3. Vuốt dở chừng',
  4: '4. Điều hướng lấy hàng',
  5: '5. Đã đến điểm lấy (<100m)',
  6: '6. POD Lấy hàng (Ảnh)',
  7: '7. Giao hàng đa chặng',
  8: '8. Giao hàng COD',
  9: '9. Không giao được',
  10: '10. Hoàn tất chuyến',
  11: '11. Hàng đợi đơn thứ 2',
  12: '12. Dark Mode (Lái đêm)',
};

const SAMPLE_OFFER = {
  orderId: 'LP-8921',
  pickupAddress: '124 Hoàng Hoa Thám, Ba Đình, Hà Nội',
  dropoffAddress: '58 Trần Duy Hưng, Cầu Giấy, Hà Nội',
  earningsAmount: 245000,
  distanceKm: 8.4,
  pickupDistanceKm: 1.2,
  cargoName: '24 thùng sơn nước (800kg)',
  vehicleLabel: 'Xe tải 1.5 tấn',
};

const SAMPLE_STOPS = [
  { id: 'pickup', title: 'Điểm lấy: Hoàng Hoa Thám', status: 'completed' as const },
  { id: 'stop-1', title: 'Điểm 1: Trần Duy Hưng', status: 'active' as const },
  { id: 'stop-2', title: 'Điểm 2: Lê Đức Thọ', status: 'pending' as const },
];

export const Driver12JourneyPlayground = memo(function Driver12JourneyPlayground() {
  const [currentState, setCurrentState] = useState<JourneyStateId>(1);
  const [showDock, setShowDock] = useState(true);

  const handleSelectState = (id: JourneyStateId) => {
    setCurrentState(id);
    driverHapticMatrix.swipeThreshold();
  };

  const isOfferState = currentState === 1 || currentState === 2 || currentState === 3 || currentState === 11;

  const renderStateContent = () => {
    switch (currentState) {
      case 1:
        return (
          <IncomingDispatchModal
            countdownSeconds={20}
            offer={SAMPLE_OFFER}
            onAccept={() => handleSelectState(4)}
            onDecline={() => {}}
            visible={true}
          />
        );

      case 2:
        return (
          <IncomingDispatchModal
            countdownSeconds={4}
            offer={SAMPLE_OFFER}
            onAccept={() => handleSelectState(4)}
            onDecline={() => {}}
            visible={true}
          />
        );

      case 3:
        return (
          <IncomingDispatchModal
            countdownSeconds={12}
            offer={SAMPLE_OFFER}
            onAccept={() => handleSelectState(4)}
            onDecline={() => {}}
            visible={true}
          />
        );

      case 4:
        return (
          <View style={styles.screenWrapper} testID="playground-state-4">
            <View style={styles.mapArea}>
              <RealInteractiveMap
                destination={{ label: SAMPLE_OFFER.dropoffAddress }}
                height="100%"
                mode="route"
                origin={{ label: SAMPLE_OFFER.pickupAddress }}
              />
            </View>
            <View style={styles.sheetArea}>
              <DriverNavigationSheet
                address={SAMPLE_OFFER.pickupAddress}
                cargoSummary={SAMPLE_OFFER.cargoName}
                contactName="Anh Tuấn (Thủ kho)"
                contactPhone="0912345678"
                distanceLabel="1.2 km"
                etaLabel="4 phút"
                isAtPickupGeofence={false}
                isDarkMode={false}
                onConfirmArrival={() => handleSelectState(5)}
                orderCode="#LP-8921"
              />
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.screenWrapper} testID="playground-state-5">
            <View style={styles.mapArea}>
              <RealInteractiveMap
                destination={{ label: SAMPLE_OFFER.dropoffAddress }}
                height="100%"
                mode="route"
                origin={{ label: SAMPLE_OFFER.pickupAddress }}
              />
            </View>
            <View style={styles.sheetArea}>
              <DriverNavigationSheet
                address={SAMPLE_OFFER.pickupAddress}
                cargoSummary={SAMPLE_OFFER.cargoName}
                contactName="Anh Tuấn (Thủ kho)"
                contactPhone="0912345678"
                distanceLabel="35m"
                etaLabel="Đã đến nơi"
                isAtPickupGeofence={true}
                isDarkMode={false}
                onConfirmArrival={() => handleSelectState(6)}
                orderCode="#LP-8921"
              />
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.screenWrapper} testID="playground-state-6">
            <PickupVerificationView
              initialPackageCount={24}
              onCapturePhoto={() => {}}
              onConfirmPickup={() => handleSelectState(7)}
              orderCode="#LP-8921"
              photos={['file://simulated-cargo.jpg']}
              senderPhotoReferenceUrl="https://placehold.co/120x120.png"
            />
          </View>
        );

      case 7:
        return (
          <View style={styles.screenWrapper} testID="playground-state-7">
            <MultiStopProgressHeader stops={SAMPLE_STOPS} />
            <View style={styles.mapArea}>
              <RealInteractiveMap
                destination={{ label: '58 Trần Duy Hưng, Cầu Giấy' }}
                height="100%"
                mode="route"
                origin={{ label: SAMPLE_OFFER.pickupAddress }}
              />
            </View>
            <View style={styles.sheetArea}>
              <DriverNavigationSheet
                address="58 Trần Duy Hưng, Cầu Giấy, Hà Nội"
                cargoSummary="Chặng 1/2 • 12 thùng sơn"
                contactName="Chị Mai (Người nhận)"
                contactPhone="0988123456"
                distanceLabel="7.1 km"
                etaLabel="22 phút"
                isAtPickupGeofence={false}
                isDarkMode={false}
                onConfirmArrival={() => handleSelectState(8)}
                orderCode="#LP-8921-1"
              />
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles.screenWrapper} testID="playground-state-8">
            <DeliveryVerificationView
              expectedAmount={520000}
              onCapturePhoto={() => {}}
              onCompleteDelivery={() => handleSelectState(10)}
              onSwitchToFailure={() => handleSelectState(9)}
              orderCode="#LP-8921"
              photos={['file://simulated-delivered.jpg']}
              type="COD"
            />
          </View>
        );

      case 9:
        return (
          <View style={styles.screenWrapper} testID="playground-state-9">
            <DeliveryVerificationView
              onCapturePhoto={() => {}}
              onCompleteDelivery={() => {}}
              onReportFailure={() => handleSelectState(10)}
              orderCode="#LP-8921"
              photos={['file://simulated-closed-store.jpg']}
              type="FAILURE"
            />
          </View>
        );

      case 10:
        return (
          <View style={styles.screenWrapper} testID="playground-state-10">
            <TripCompletedSummaryView
              codCollected={520000}
              deliveryFare={210000}
              distanceKm={8.6}
              durationMinutes={42}
              loadingFee={35000}
              onGoHome={() => handleSelectState(1)}
              orderCode="#LP-8921"
              totalEarnings={245000}
            />
          </View>
        );

      case 11:
        return (
          <IncomingDispatchModal
            countdownSeconds={14}
            offer={SAMPLE_OFFER}
            onAccept={() => handleSelectState(4)}
            onDecline={() => {}}
            queuedOfferCount={1}
            visible={true}
          />
        );

      case 12:
        return (
          <View
            style={[styles.screenWrapper, { backgroundColor: '#0B0F17' }]}
            testID="playground-dark-surface"
          >
            <View style={styles.mapArea}>
              <RealInteractiveMap
                destination={{ label: SAMPLE_OFFER.dropoffAddress }}
                height="100%"
                mode="route"
                origin={{ label: SAMPLE_OFFER.pickupAddress }}
              />
            </View>
            <View style={styles.sheetArea}>
              <DriverNavigationSheet
                address={SAMPLE_OFFER.pickupAddress}
                cargoSummary={SAMPLE_OFFER.cargoName}
                contactName="Anh Tuấn (Thủ kho đêm)"
                contactPhone="0912345678"
                distanceLabel="3.8 km"
                etaLabel="12 phút"
                isAtPickupGeofence={false}
                isDarkMode={true}
                onConfirmArrival={() => handleSelectState(5)}
                orderCode="#LP-8921"
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container} testID="driver-12-journey-playground">
      {/* Active State Canvas - 100% Full Screen */}
      <View style={styles.activeCanvas}>{renderStateContent()}</View>

      {/* Floating HIG State Switcher */}
      <View
        style={[
          styles.dockContainer,
          isOfferState ? styles.dockContainerOfferMode : styles.dockContainerBottom,
        ]}
        testID="playground-dock-container"
      >
        <Pressable
          onPress={() => setShowDock(!showDock)}
          style={styles.dockToggleBar}
        >
          <Text style={styles.dockTitle}>
            ✦ KỊCH BẢN: {STATE_NAMES[currentState]} {showDock ? '▲' : '▼'}
          </Text>
        </Pressable>

        {showDock && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dockScroll}
          >
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as JourneyStateId[]).map((id) => {
              const isSelected = currentState === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  onPress={() => handleSelectState(id)}
                  style={[styles.dockPill, isSelected ? styles.dockPillActive : null]}
                  testID={`switch-state-${id}`}
                >
                  <Text style={[styles.dockPillText, isSelected ? styles.dockPillTextActive : null]}>
                    {STATE_NAMES[id]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  activeCanvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  mapArea: {
    flex: 1,
  },
  sheetArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dockContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingVertical: spacing.xs,
    zIndex: 99999,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  dockContainerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dockContainerOfferMode: {
    position: 'absolute',
    top: 44,
    left: spacing.md,
    right: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
  },
  dockToggleBar: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockTitle: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#0B2545',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dockScroll: {
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  dockPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dockPillActive: {
    backgroundColor: '#0B2545',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  dockPillText: {
    ...typeScale.caption1,
    color: '#64748B',
    fontWeight: '600',
  },
  dockPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
