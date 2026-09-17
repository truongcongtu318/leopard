import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeInsets } from './safe-insets';

import { customerPalette, spacing, typeScale } from '@leopard/mobile-core';
import { calculateBookingFare } from './booking-pricing';
import {
  type BookingDraftState,
  type CargoCategory,
  type PaymentMethod,
  type RouteStop,
  validateBookingForm,
} from './booking-schema';
import { bookingDraftStore } from './bookingDraftStore';
import { BookingCargoSection } from './components/BookingCargoSection';
import { BookingFixedBottomBar } from './components/BookingFixedBottomBar';
import { BookingPaymentSection } from './components/BookingPaymentSection';
import { BookingReceiverSection } from './components/BookingReceiverSection';
import { BookingRouteMapHeader } from './components/BookingRouteMapHeader';
import { BookingRouteSection } from './components/BookingRouteSection';
import { BookingServicesSection } from './components/BookingServicesSection';
import { BookingVehicleSection } from './components/BookingVehicleSection';
import { showDiscardBookingActionSheet } from './components/DiscardBookingActionSheet';
import { PriceDetailModal } from './components/PriceDetailModal';

export interface BookingScreenProps {
  initialPickup?: string;
  initialPickupLat?: number;
  initialPickupLng?: number;
  initialDropoff?: string;
  initialDropoffLat?: number;
  initialDropoffLng?: number;
  distanceKm?: number;
  etaMinutes?: number;
  initialFocusTarget?: 'pickup' | 'dropoff';
  onBack?: () => void;
  onOrderCreated?: (orderId: string, totalFare: number) => void;
  onOpenSearchAddress?: () => void;
}

export function BookingScreen({
  initialPickup = 'Kho VLXD Đại Phát - 120 Song Hành, Q.12',
  initialPickupLat = 10.8421,
  initialPickupLng = 106.6192,
  initialDropoff = 'Công trình Jamona City, Đào Trí, Q.7',
  initialDropoffLat = 10.7325,
  initialDropoffLng = 106.7351,
  distanceKm = 12.5,
  etaMinutes = 35,
  initialFocusTarget,
  onBack,
  onOrderCreated,
  onOpenSearchAddress,
}: BookingScreenProps) {
  const insets = useSafeInsets();

  // Initialize store draft synchronously
  const [draft, setDraft] = useState<BookingDraftState>(() => {
    const existing = bookingDraftStore.getDraft();
    const resolvedPickup = existing.pickupAddress || initialPickup;
    const resolvedDropoff = existing.dropoffAddress || initialDropoff;
    const resolvedName = existing.receiverName || 'Anh Tuấn';
    const resolvedPhone = existing.receiverPhone || '90 123 4567';
    bookingDraftStore.initDraft({
      ...existing,
      pickupAddress: resolvedPickup,
      pickupLat: initialPickupLat,
      pickupLng: initialPickupLng,
      dropoffAddress: resolvedDropoff,
      dropoffLat: initialDropoffLat,
      dropoffLng: initialDropoffLng,
      receiverName: resolvedName,
      receiverPhone: resolvedPhone,
    });
    return bookingDraftStore.getDraft();
  });

  const [showPriceDetail, setShowPriceDetail] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsub = bookingDraftStore.subscribe(() => {
      setDraft({ ...bookingDraftStore.getDraft() });
    });
    return () => {
      unsub();
    };
  }, []);

  // Keyboard show/hide detection
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollY = useRef(new Animated.Value(0)).current;
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.96)).current;

  // Fluid entrance animation (Fade + Scale from 96% to 100%)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        damping: 20,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceFade, entranceScale]);

  // Live Pricing Calculation
  const pricingBreakdown = useMemo(() => {
    return calculateBookingFare({
      vehicleId: draft.vehicleId,
      distanceKm,
      stopCount: draft.stops.length,
      hasLoadingSupport: draft.hasLoadingSupport,
      hasVatInvoice: draft.hasVatInvoice,
    });
  }, [draft.vehicleId, distanceKm, draft.stops.length, draft.hasLoadingSupport, draft.hasVatInvoice]);

  // Validation
  const validation = useMemo(() => {
    return validateBookingForm(draft);
  }, [draft]);

  const handleBack = () => {
    if (bookingDraftStore.isDirty()) {
      showDiscardBookingActionSheet({
        onDiscard: () => {
          bookingDraftStore.reset();
          if (onBack) onBack();
        },
      });
    } else if (onBack) {
      onBack();
    }
  };

  const handleAddStop = () => {
    if (draft.stops.length >= 3) return;
    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      address: `Điểm dừng trả hàng ${draft.stops.length + 1} (Khu Công Nghiệp)`,
    };
    bookingDraftStore.updateDraft({
      stops: [...draft.stops, newStop],
    });
  };

  const handleRemoveStop = (stopId: string) => {
    bookingDraftStore.updateDraft({
      stops: draft.stops.filter((s) => s.id !== stopId),
    });
  };

  const handleCreateOrder = async () => {
    if (!validation.isValid) return;
    setIsSubmitting(true);
    const orderId = `ord-${Date.now()}`;
    setTimeout(() => {
      setIsSubmitting(false);
      if (onOrderCreated) {
        onOrderCreated(orderId, pricingBreakdown.totalFare);
      }
    }, 400);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.rootView}
    >
      <Animated.View
        style={[
          styles.rootView,
          {
            opacity: entranceFade,
            transform: [{ scale: entranceScale }],
          },
        ]}
      >
        {/* Animated ScrollView */}
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Map 190pt */}
          <BookingRouteMapHeader
            dropoffAddress={draft.dropoffAddress}
            dropoffCoords={
              draft.dropoffLat && draft.dropoffLng
                ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
                : undefined
            }
            onBack={handleBack}
            pickupAddress={draft.pickupAddress}
            pickupCoords={
              draft.pickupLat && draft.pickupLng
                ? { lat: draft.pickupLat, lng: draft.pickupLng }
                : undefined
            }
            scrollY={scrollY}
          />

          {/* Section 1: Lộ trình với Dropdown Overlay đè lên component bên dưới */}
          <BookingRouteSection
            distanceKm={distanceKm}
            dropoffAddress={draft.dropoffAddress}
            etaMinutes={etaMinutes}
            onAddStop={handleAddStop}
            onPickOnMap={onOpenSearchAddress}
            onRemoveStop={handleRemoveStop}
            onUpdateDropoff={(address, coords) => {
              bookingDraftStore.updateDraft({
                dropoffAddress: address,
                dropoffLat: coords?.lat,
                dropoffLng: coords?.lng,
              });
            }}
            onUpdatePickup={(address, coords) => {
              bookingDraftStore.updateDraft({
                pickupAddress: address,
                pickupLat: coords?.lat,
                pickupLng: coords?.lng,
              });
            }}
            pickupAddress={draft.pickupAddress}
            routeError={validation.errors.route}
            stops={draft.stops}
          />

          {/* Section 2: Loại xe */}
          <BookingVehicleSection
            distanceKm={distanceKm}
            onSelectVehicle={(vehicleId) => bookingDraftStore.updateDraft({ vehicleId })}
            selectedVehicleId={draft.vehicleId}
          />

          {/* Section 3: Người nhận */}
          <BookingReceiverSection
            nameError={validation.errors.receiverName}
            onChangeName={(name) => bookingDraftStore.updateDraft({ receiverName: name })}
            onChangePhone={(phone) => bookingDraftStore.updateDraft({ receiverPhone: phone })}
            phoneError={validation.errors.receiverPhone}
            receiverName={draft.receiverName}
            receiverPhone={draft.receiverPhone}
          />

          {/* Section 4: Hàng hóa */}
          <BookingCargoSection
            cargoImages={draft.cargoImages}
            cargoNote={draft.cargoNote}
            onAddImage={(uri) =>
              bookingDraftStore.updateDraft({ cargoImages: [...draft.cargoImages, uri] })
            }
            onChangeNote={(note) => bookingDraftStore.updateDraft({ cargoNote: note })}
            onRemoveImage={(idx) =>
              bookingDraftStore.updateDraft({
                cargoImages: draft.cargoImages.filter((_, i) => i !== idx),
              })
            }
            onSelectCategory={(category: CargoCategory) =>
              bookingDraftStore.updateDraft({ cargoCategory: category })
            }
            selectedCategory={draft.cargoCategory}
          />

          {/* Section 5: Dịch vụ thêm */}
          <BookingServicesSection
            hasLoadingSupport={draft.hasLoadingSupport}
            hasVatInvoice={draft.hasVatInvoice}
            onChangeVatField={(field, value) => bookingDraftStore.updateDraft({ [field]: value })}
            onToggleLoading={(value) => bookingDraftStore.updateDraft({ hasLoadingSupport: value })}
            onToggleVat={(value) => bookingDraftStore.updateDraft({ hasVatInvoice: value })}
            vatCompany={draft.vatCompany}
            vatEmail={draft.vatEmail}
            vatErrors={{
              company: validation.errors.vatCompany,
              taxId: validation.errors.vatTaxId,
              email: validation.errors.vatEmail,
            }}
            vatTaxId={draft.vatTaxId}
          />

          {/* Section 6: Phương thức thanh toán */}
          <BookingPaymentSection
            onSelectMethod={(method: PaymentMethod) =>
              bookingDraftStore.updateDraft({ paymentMethod: method })
            }
            selectedMethod={draft.paymentMethod}
          />
        </Animated.ScrollView>

        {/* Keyboard Toolbar when typing */}
        {isKeyboardVisible && (
          <View style={styles.keyboardToolbar}>
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardDoneBtn}
            >
              <Text style={styles.keyboardDoneText}>Xong</Text>
            </Pressable>
          </View>
        )}

        {/* Section 7: Sticky Bottom Dock (Hidden when keyboard is open) */}
        {!isKeyboardVisible && (
          <BookingFixedBottomBar
            isLoading={isSubmitting}
            isValid={validation.isValid}
            onPressBook={handleCreateOrder}
            onPressDetails={() => setShowPriceDetail(true)}
            totalFare={pricingBreakdown.totalFare}
          />
        )}

        {/* Price Detail Presentation Sheet */}
        <PriceDetailModal
          breakdown={pricingBreakdown}
          distanceKm={distanceKm}
          onClose={() => setShowPriceDetail(false)}
          visible={showPriceDetail}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Apple systemGroupedBackground
  },
  scrollContent: {
    paddingBottom: 60,
  },
  keyboardToolbar: {
    height: 44,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  keyboardDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  keyboardDoneText: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: customerPalette.primary,
  },
});
