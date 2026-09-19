import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeInsets } from './safe-insets';

import {
  appendFileToFormData,
  colors,
  customerPalette,
  decodePolyline,
  httpClient,
  spacing,
  typeScale,
  type NearbyDriver,
} from '@leopard/mobile-core';
import * as Location from 'expo-location';
import { addressStore } from '../addresses/address-store';
import { reverseGeocodeCoords } from '../../home/components/MapAddressPickerModal';
import { createCustomerHttpAdapter } from '../orders/adapter';
import { calculateBookingFare, type VehicleTypeId } from './booking-pricing';
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
  initialVehicleId?: VehicleTypeId;
  initialFocusTarget?: 'pickup' | 'dropoff';
  onBack?: () => void;
  onOrderCreated?: (
    orderId: string,
    totalFare: number,
    paymentMethod?: PaymentMethod,
    vehicleType?: string,
    vehicleName?: string,
    routeDetails?: {
      pickup?: string;
      pickupCoords?: { lat: number; lng: number };
      dropoff?: string;
      dropoffCoords?: { lat: number; lng: number };
    },
    loadingFee?: number,
    breakdown?: {
      distanceKm: number;
      baseFare: number;
      distanceFare: number;
      stopFare: number;
      vatFee: number;
    },
  ) => void;
}

function resolveVehicleOrderType(vehicleId: string): {
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  cargoWeight: string;
} {
  if (vehicleId === 'TRUCK_25T') {
    return { vehicleType: 'TRUCK', cargoWeight: '2500' };
  }
  if (vehicleId === 'TRUCK_125T') {
    return { vehicleType: 'TRUCK', cargoWeight: '1250' };
  }
  if (vehicleId === 'VAN_500KG') {
    return { vehicleType: 'VAN', cargoWeight: '500' };
  }
  if (vehicleId === 'BIKE_3W') {
    return { vehicleType: 'MOTORBIKE', cargoWeight: '300' };
  }
  return { vehicleType: 'TRUCK', cargoWeight: '1250' };
}

export function BookingScreen({
  initialPickup = '',
  initialPickupLat,
  initialPickupLng,
  initialDropoff = '',
  initialDropoffLat,
  initialDropoffLng,
  initialVehicleId,
  initialFocusTarget,
  onBack,
  onOrderCreated,
}: BookingScreenProps) {
  const insets = useSafeInsets();

  const [isLocatingPickup, setIsLocatingPickup] = useState<boolean>(() => {
    if (initialPickupLat !== undefined) return false;
    const defaultAddr = addressStore.getDefaultAddress();
    return !(defaultAddr?.latitude && defaultAddr?.longitude);
  });

  // Initialize store draft synchronously on mount
  useMemo(() => {
    const defaultAddr = addressStore.getDefaultAddress();
    const hasInitialCoords = initialPickupLat !== undefined && initialPickupLng !== undefined;
    const hasDefaultCoords =
      typeof defaultAddr?.latitude === 'number' && typeof defaultAddr?.longitude === 'number';

    let resolvedPickup = '';
    let resolvedPickupLat: number | undefined;
    let resolvedPickupLng: number | undefined;

    if (hasInitialCoords) {
      resolvedPickup = initialPickup || defaultAddr?.address || '';
      resolvedPickupLat = initialPickupLat;
      resolvedPickupLng = initialPickupLng;
    } else if (hasDefaultCoords) {
      resolvedPickup = defaultAddr!.address;
      resolvedPickupLat = defaultAddr!.latitude;
      resolvedPickupLng = defaultAddr!.longitude;
    } else if (initialPickup && initialPickup !== 'Vị trí hiện tại') {
      resolvedPickup = initialPickup;
    }

    const resolvedDropoff = initialDropoff ?? '';
    bookingDraftStore.initDraft({
      pickupAddress: resolvedPickup,
      pickupLat: resolvedPickupLat,
      pickupLng: resolvedPickupLng,
      dropoffAddress: resolvedDropoff,
      ...(initialDropoffLat !== undefined ? { dropoffLat: initialDropoffLat } : { dropoffLat: undefined }),
      ...(initialDropoffLng !== undefined ? { dropoffLng: initialDropoffLng } : { dropoffLng: undefined }),
      ...(initialVehicleId ? { vehicleId: initialVehicleId } : {}),
    });
  }, []);

  // Query GPS if pickup coordinates were not provided
  useEffect(() => {
    if (initialPickupLat !== undefined) {
      setIsLocatingPickup(false);
      return;
    }
    const defaultAddr = addressStore.getDefaultAddress();
    if (defaultAddr?.latitude && defaultAddr?.longitude) {
      bookingDraftStore.updateDraft({
        pickupAddress: defaultAddr.address,
        pickupLat: defaultAddr.latitude,
        pickupLng: defaultAddr.longitude,
      });
      setIsLocatingPickup(false);
      return;
    }

    let isCancelled = false;
    setIsLocatingPickup(true);

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          let lat: number;
          let lng: number;
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              maximumAge: 5000,
              timeout: 10000,
            } as any);
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch (gpsErr) {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
              const webPos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 5000,
                });
              });
              lat = webPos.coords.latitude;
              lng = webPos.coords.longitude;
            } else {
              throw gpsErr;
            }
          }
          if (isCancelled) return;
          const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
          const rev = await reverseGeocodeCoords({ lat, lng }, apiKey);
          if (isCancelled) return;
          const chosenAddress =
            rev && rev.trim().length > 0
              ? rev.trim()
              : `Vị trí hiện tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          bookingDraftStore.updateDraft({
            pickupAddress: chosenAddress,
            pickupLat: lat,
            pickupLng: lng,
          });
        } else {
          const currentDraft = bookingDraftStore.getDraft();
          if (currentDraft.pickupLat === undefined && currentDraft.pickupAddress === 'Vị trí hiện tại') {
            bookingDraftStore.updateDraft({ pickupAddress: '' });
          }
        }
      } catch {
        const currentDraft = bookingDraftStore.getDraft();
        if (currentDraft.pickupLat === undefined && currentDraft.pickupAddress === 'Vị trí hiện tại') {
          bookingDraftStore.updateDraft({ pickupAddress: '' });
        }
      } finally {
        if (!isCancelled) {
          setIsLocatingPickup(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [initialPickupLat]);

  const draft = useSyncExternalStore(
    bookingDraftStore.subscribe,
    bookingDraftStore.getDraft,
  );

  const [showPriceDetail, setShowPriceDetail] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [liveRouteCoords, setLiveRouteCoords] = useState<readonly { lat: number; lng: number }[] | undefined>(undefined);
  /**
   * Real distance/duration from the routing backend. Null until the estimate
   * resolves for a complete route, and null again if it fails — the UI shows
   * nothing rather than a made-up kilometre figure.
   */
  const [routeEstimate, setRouteEstimate] = useState<
    Readonly<{ distanceKm: number; etaMinutes: number }> | null
  >(null);
  const [isEstimatingRoute, setIsEstimatingRoute] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<readonly NearbyDriver[]>([]);

  // Fetch nearby drivers matching selected vehicle category from backend DB
  useEffect(() => {
    let isMounted = true;
    async function loadNearbyDrivers() {
      const lat = draft.pickupLat;
      const lng = draft.pickupLng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return;
      }
      const vehicleType = resolveVehicleOrderType(draft.vehicleId).vehicleType;
      try {
        const queryParams = `lat=${lat}&lng=${lng}&radiusM=15000&vehicleType=${vehicleType}&limit=20`;
        const res = await httpClient.get<{
          source: string;
          drivers: Array<NearbyDriver>;
        }>(`/maps/nearby-drivers?${queryParams}`);
        if (isMounted && res && Array.isArray(res.drivers)) {
          setNearbyDrivers(res.drivers);
        } else if (isMounted) {
          setNearbyDrivers([]);
        }
      } catch {
        if (isMounted) {
          setNearbyDrivers([]);
        }
      }
    }

    void loadNearbyDrivers();
    const intervalTimer = setInterval(() => {
      void loadNearbyDrivers();
    }, 20_000);

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
    };
  }, [draft.pickupLat, draft.pickupLng, draft.vehicleId]);

  // Clean up store on unmount
  useEffect(() => {
    return () => {
      bookingDraftStore.reset();
    };
  }, []);

  const prevInitialVehicleIdRef = useRef(initialVehicleId);
  useEffect(() => {
    if (initialVehicleId && initialVehicleId !== prevInitialVehicleIdRef.current) {
      prevInitialVehicleIdRef.current = initialVehicleId;
      bookingDraftStore.updateDraft({ vehicleId: initialVehicleId });
    }
  }, [initialVehicleId]);

  // Fetch real street routing via backend estimate API
  useEffect(() => {
    let mounted = true;
    async function fetchRouteEstimate() {
      if (!draft.pickupAddress || !draft.dropoffAddress) return;
      // Real coordinates are required. Guessing them from an address dictionary
      // sent the estimate to a fabricated point, so the returned distance and
      // fare described a route the customer never chose.
      const pickupCoords =
        draft.pickupLat !== undefined && draft.pickupLng !== undefined
          ? { lat: draft.pickupLat, lng: draft.pickupLng }
          : undefined;
      const dropoffCoords =
        draft.dropoffLat !== undefined && draft.dropoffLng !== undefined
          ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
          : undefined;

      if (!pickupCoords || !dropoffCoords) {
        if (mounted) {
          setRouteEstimate(null);
          setLiveRouteCoords(undefined);
          setIsEstimatingRoute(false);
        }
        return;
      }

      if (mounted) setIsEstimatingRoute(true);

      try {
        const payload = {
          pickup: {
            type: 'PICKUP',
            address: draft.pickupAddress.trim(),
            lat: pickupCoords.lat,
            lng: pickupCoords.lng,
          },
          stops: draft.stops
            .filter(
              (s) =>
                s.address.trim().length > 0 && s.lat !== undefined && s.lng !== undefined,
            )
            .map((s) => ({
              type: 'STOP',
              address: s.address.trim(),
              lat: s.lat as number,
              lng: s.lng as number,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: draft.dropoffAddress.trim(),
            lat: dropoffCoords.lat,
            lng: dropoffCoords.lng,
          },
          vehicleType: 'TRUCK',
          cargoWeightKg: 1250,
        };

        const response = await httpClient.post<{
          routes?: Array<{
            polyline?: string;
            distanceM?: number;
            durationS?: number;
          }>;
        }>('/orders/estimate', payload);

        if (!mounted) return;

        const route = response?.routes?.[0];

        // Distance and duration now drive the fare and the ETA line, so they
        // must come from this response rather than a constant.
        if (route && typeof route.distanceM === 'number' && route.distanceM > 0) {
          setRouteEstimate({
            distanceKm: route.distanceM / 1000,
            etaMinutes:
              typeof route.durationS === 'number' && route.durationS > 0
                ? Math.max(1, Math.round(route.durationS / 60))
                : 0,
          });
        } else {
          setRouteEstimate(null);
        }

        if (route?.polyline) {
          const rawPolyline = route.polyline;
          try {
            setLiveRouteCoords(decodePolyline(rawPolyline.trim(), 'POLYLINE5'));
          } catch {
            try {
              setLiveRouteCoords(decodePolyline(rawPolyline.trim(), 'POLYLINE6'));
            } catch {
              // A malformed polyline is dropped rather than replaced with a
              // straight line that pretends to be the real road route.
              setLiveRouteCoords(undefined);
            }
          }
        } else {
          setLiveRouteCoords(undefined);
        }
      } catch {
        if (mounted) {
          setRouteEstimate(null);
          setLiveRouteCoords(undefined);
        }
      } finally {
        if (mounted) setIsEstimatingRoute(false);
      }
    }
    void fetchRouteEstimate();
    return () => {
      mounted = false;
    };
  }, [
    draft.pickupAddress,
    draft.dropoffAddress,
    draft.pickupLat,
    draft.pickupLng,
    draft.dropoffLat,
    draft.dropoffLng,
    draft.stops,
  ]);

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

  // Live pricing from the real routed distance. Until the estimate resolves the
  // distance is unknown, so the fare is withheld instead of quoting a made-up
  // number the customer would then be charged against.
  const estimatedDistanceKm = routeEstimate?.distanceKm;
  const hasFare = estimatedDistanceKm !== undefined && estimatedDistanceKm > 0;

  const pricingBreakdown = useMemo(() => {
    return calculateBookingFare({
      vehicleId: draft.vehicleId,
      distanceKm: estimatedDistanceKm ?? 0,
      stopCount: draft.stops.length,
      hasLoadingSupport: draft.hasLoadingSupport,
      hasVatInvoice: draft.hasVatInvoice,
    });
  }, [
    draft.vehicleId,
    estimatedDistanceKm,
    draft.stops.length,
    draft.hasLoadingSupport,
    draft.hasVatInvoice,
  ]);

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
    } else {
      bookingDraftStore.reset();
      if (onBack) onBack();
    }
  };

  const handleAddStop = () => {
    if (draft.stops.length >= 3) return;
    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      address: '',
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
    setSubmissionError(null);

    let orderId: string | null = null;
    let finalAmount = pricingBreakdown.totalFare;

    const { vehicleType, cargoWeight } = resolveVehicleOrderType(draft.vehicleId);

    // Only real, customer-chosen coordinates are submitted. Falling back to a
    // dictionary guess would place the order at a location nobody selected.
    const pickupCoords =
      draft.pickupLat !== undefined && draft.pickupLng !== undefined
        ? { lat: draft.pickupLat, lng: draft.pickupLng }
        : undefined;
    const dropoffCoords =
      draft.dropoffLat !== undefined && draft.dropoffLng !== undefined
        ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
        : undefined;

    try {
      const port = createCustomerHttpAdapter();

      const formPayload = {
        pickup: draft.pickupAddress,
        pickupCoords,
        stops: draft.stops
          .filter((s) => s.address.trim().length > 0)
          .map((s) => ({
            id: s.id,
            value: s.address,
            coords:
              s.lat !== undefined && s.lng !== undefined
                ? { lat: s.lat, lng: s.lng }
                : undefined,
          })),
        dropoff: draft.dropoffAddress,
        dropoffCoords,
        vehicleType,
        cargoNote: [
          pricingBreakdown.vehicleName ? `Loại xe: ${pricingBreakdown.vehicleName}` : null,
          draft.hasLoadingSupport ? 'Bốc xếp: Có' : null,
          draft.receiverName ? `Người nhận: ${draft.receiverName} (${draft.receiverPhone})` : null,
          draft.cargoCategory,
          draft.cargoNote,
        ]
          .filter(Boolean)
          .join(' · '),
        cargoWeight,
        requiresLoadingSupport: draft.hasLoadingSupport,
        hasLoadingSupport: draft.hasLoadingSupport,
        hasVatInvoice: draft.hasVatInvoice,
        paymentMethod: draft.paymentMethod,
        fieldErrors: {},
      };

      // 1. Get estimate from real backend API
      const estimateView = await port.estimateOrder(formPayload);
      const estimateToken =
        estimateView.kind === 'form' && estimateView.estimate.kind === 'ready'
          ? estimateView.estimate.routes[0]?.estimateToken
          : undefined;

      if (
        estimateView.kind === 'form' &&
        estimateView.estimate.kind === 'ready' &&
        estimateView.estimate.routes[0]?.priceLabel
      ) {
        const rawDigits = estimateView.estimate.routes[0].priceLabel.replace(/[^0-9]/g, '');
        const parsed = Number(rawDigits);
        if (Number.isFinite(parsed) && parsed > 0) {
          finalAmount = parsed;
        }
      }

      if (!estimateToken) {
        throw new Error('Chưa thể lấy báo giá chính xác từ hệ thống. Vui lòng thử lại trong giây lát.');
      }

      // 2. Call real createOrder
      const created = await port.createOrder(formPayload, estimateToken);
      if (created.kind === 'content') {
        orderId = created.order.id;
        if (created.order.priceLabel) {
          const rawDigits = created.order.priceLabel.replace(/[^0-9]/g, '');
          const parsed = Number(rawDigits);
          if (Number.isFinite(parsed) && parsed > 0) {
            finalAmount = parsed;
          }
        }

        // 3. Upload cargo photo if selected
        if (draft.cargoImages.length > 0) {
          try {
            const form = new FormData();
            await appendFileToFormData(form, 'file', {
              uri: draft.cargoImages[0],
              name: 'cargo.jpg',
              mimeType: 'image/jpeg',
            });
            form.append('clientRequestId', `req-${Date.now()}`);
            await httpClient.postForm(`/orders/${orderId}/media/cargo`, form);
          } catch {
            // Non-blocking upload fallback
          }
        }
      } else {
        const errDetail =
          created.kind === 'error'
            ? created.message
            : 'Hệ thống không thể tạo đơn lúc này.';
        throw new Error(errDetail || 'Không thể tạo đơn hàng.');
      }
    } catch (err: any) {
      console.error('[CustomerBooking] Backend createOrder error:', err);
      const errorMsg =
        err?.message ||
        'Không thể khởi tạo đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại.';
      setSubmissionError(errorMsg);
      if (Platform.OS !== 'web') {
        Alert.alert('Không thể tạo đơn', errorMsg);
      }
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (orderId && onOrderCreated) {
      onOrderCreated(
        orderId,
        finalAmount,
        draft.paymentMethod,
        vehicleType,
        pricingBreakdown.vehicleName,
        {
          pickup: draft.pickupAddress,
          pickupCoords,
          dropoff: draft.dropoffAddress,
          dropoffCoords,
        },
        pricingBreakdown.loadingFee,
        {
          distanceKm: estimatedDistanceKm ?? 0,
          baseFare: pricingBreakdown.baseFare,
          distanceFare: pricingBreakdown.distanceFare,
          stopFare: pricingBreakdown.stopFare,
          vatFee: pricingBreakdown.vatFee,
        },
      );
    }
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + Math.max(insets.bottom, spacing.md) },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Map */}
          <BookingRouteMapHeader
            dropoffAddress={draft.dropoffAddress}
            dropoffCoords={
              draft.dropoffLat && draft.dropoffLng
                ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
                : undefined
            }
            mapHeight={isSearchingAddress ? 130 : 210}
            nearbyDrivers={nearbyDrivers}
            onBack={handleBack}
            pickupAddress={draft.pickupAddress}
            pickupCoords={
              draft.pickupLat && draft.pickupLng
                ? { lat: draft.pickupLat, lng: draft.pickupLng }
                : undefined
            }
            routeCoords={liveRouteCoords}
            scrollY={scrollY}
            stops={draft.stops.map((s) => ({
              id: s.id,
              label: s.address,
              coords: s.lat && s.lng ? { lat: s.lat, lng: s.lng } : undefined,
            }))}
          />

          {/* Section 1: Lộ trình với Dropdown Overlay đè lên component bên dưới */}
          <BookingRouteSection
            distanceKm={estimatedDistanceKm}
            dropoffAddress={draft.dropoffAddress}
            etaMinutes={routeEstimate?.etaMinutes}
            hasPickupCoords={typeof draft.pickupLat === 'number' && typeof draft.pickupLng === 'number'}
            initialActiveTarget={initialFocusTarget}
            isEstimating={isEstimatingRoute}
            isLocatingPickup={isLocatingPickup}
            onAddStop={handleAddStop}
            onRemoveStop={handleRemoveStop}
            onSearchStateChange={(isSearching) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsSearchingAddress(isSearching);
            }}
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
            onUpdateStop={(stopId, address, coords) => {
              bookingDraftStore.updateDraft({
                stops: draft.stops.map((s) =>
                  s.id === stopId ? { ...s, address, lat: coords?.lat, lng: coords?.lng } : s,
                ),
              });
            }}
            pickupAddress={draft.pickupAddress}
            routeError={validation.errors.route}
            stops={draft.stops}
          />

          {/* Section 2: Loại xe */}
          <BookingVehicleSection
            distanceKm={estimatedDistanceKm}
            hasLoadingSupport={draft.hasLoadingSupport}
            hasVatInvoice={draft.hasVatInvoice}
            onSelectVehicle={(vehicleId) => bookingDraftStore.updateDraft({ vehicleId })}
            selectedVehicleId={draft.vehicleId}
            stopCount={draft.stops.length}
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
            imageError={validation.errors.cargoImages}
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

        {/* Submission Error Banner */}
        {submissionError && !isKeyboardVisible && (
          <View style={styles.submissionErrorBanner} testID="booking-submission-error">
            <Text numberOfLines={2} style={styles.submissionErrorText}>
              {submissionError}
            </Text>
            <Pressable
              accessibilityLabel="Đóng thông báo lỗi"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSubmissionError(null)}
              style={styles.submissionErrorCloseBtn}
            >
              <Text style={styles.submissionErrorCloseText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Section 7: Sticky Bottom Dock (Hidden when keyboard or address search is open) */}
        {!isKeyboardVisible && !isSearchingAddress && (
          <BookingFixedBottomBar
            isLoading={isSubmitting}
            hasFare={hasFare}
            isValid={validation.isValid && hasFare}
            onPressBook={handleCreateOrder}
            onPressDetails={() => setShowPriceDetail(true)}
            totalFare={pricingBreakdown.totalFare}
          />
        )}

        {/* Price Detail Presentation Sheet */}
        <PriceDetailModal
          breakdown={pricingBreakdown}
          distanceKm={estimatedDistanceKm}
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
    backgroundColor: customerPalette.canvas,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardToolbar: {
    height: 44,
    backgroundColor: customerPalette.surfaceWhite,
    borderTopWidth: 0.5,
    borderTopColor: colors.neutral.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  keyboardDoneBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  keyboardDoneText: {
    ...typeScale.headline,
    color: customerPalette.primary,
  },
  submissionErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submissionErrorText: {
    ...typeScale.footnote,
    color: '#DC2626',
    flex: 1,
    marginRight: spacing.xs,
  },
  submissionErrorCloseBtn: {
    padding: spacing.xxs,
  },
  submissionErrorCloseText: {
    ...typeScale.subheadline,
    color: '#991B1B',
    fontWeight: '700',
  },
});
