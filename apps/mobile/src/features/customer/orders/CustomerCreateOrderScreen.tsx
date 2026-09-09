import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { httpClient } from '../../../api/http-client';
import { colors, layout, leopardPalette, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import {
  IconCamera,
  IconLocationPin,
  IconOrders,
  IconPaymentConvenient,
  IconQrPayment,
  IconRoute,
  IconSecurityShield,
  IconSpeedTruck,
  IconVehicleHeavyTruck,
  IconVehicleMotorbike,
  IconVehicleVan,
  IconWallet,
  IconWarningShield,
} from '../../../ui/icons/CoreIcons';
import { RealInteractiveMap } from '../../../ui/RealInteractiveMap';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { SkeletonBar } from '../../../ui/Skeleton';
import { MapAddressPickerModal } from '../../home/components/MapAddressPickerModal';
import { AddressSearchField } from './AddressSearchField';
import { VietQRPaymentModal } from './components/VietQRPaymentModal';
import type {
  AddressCandidate,
  CustomerActionView,
  CustomerCreateFormScreenView,
  CustomerCreateView,
  CustomerPaymentView,
  CustomerRouteOptionView,
  LatLng,
  PriceBreakdown,
} from './model';

export type CustomerCreateOrderScreenProps = Readonly<{
  view: CustomerCreateView;
  onFieldChange?: (field: string, value: string) => void;
  onAddressSelect?: (field: string, candidate: AddressCandidate) => void;
  searchAddress?: (query: string) => Promise<readonly AddressCandidate[]>;
  onAddStop?: () => void;
  onRemoveStop?: (stopId: string) => void;
  onSelectVehicle?: (vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') => void;
  onSelectRoute?: (routeId: string) => void;
  onPrimaryAction?: (actionId: string) => void;
  onRetry?: () => void;
  onBack?: () => void;
  step?: 1 | 2 | 3 | 4 | 5;
  onStepChange?: (step: 1 | 2 | 3 | 4 | 5) => void;
  onOpenMapPicker?: (target: 'pickup' | 'dropoff') => void;
  onConfirmContactDetails?: (
    target: 'pickup' | 'dropoff',
    details: { name: string; phone: string; note: string; address?: string; coords?: LatLng },
  ) => void;
  onPickCargoImage?: () => void;
  onRemoveCargoImage?: () => void;
  onToggleLoadingSupport?: (val: boolean) => void;
  onSelectPaymentMethod?: (method: 'VIETQR' | 'CASH') => void;
  onSelectCategory?: (category: string) => void;
  loggedInCustomer?: { name?: string; phone?: string } | null;
  onViewCreatedOrder?: () => void;
  onCancelOrder?: () => void;
  createdPayment?: CustomerPaymentView | null;
}>;

export const CARGO_CATEGORIES: readonly string[] = [
  'Vật liệu xây dựng',
  'Hàng đóng thùng',
  'Nội thất & Gia dụng',
  'Thiết bị điện máy',
  'Nông sản / Thực phẩm',
  'Khác',
];

export const DIMENSION_PRESETS = [
  {
    label: 'Gói nhỏ (< 0.5 m³)',
    chipTitle: 'Gói nhỏ',
    chipDesc: '40×30×30',
    l: '40',
    w: '30',
    h: '30',
    desc: 'Thùng carton, balo',
  },
  {
    label: 'Kiện vừa (0.5–1.5 m³)',
    chipTitle: 'Kiện vừa',
    chipDesc: '80×60×60',
    l: '80',
    w: '60',
    h: '60',
    desc: 'Tủ lạnh mini, máy giặt',
  },
  {
    label: 'Hàng lớn (> 1.5 m³)',
    chipTitle: 'Hàng lớn',
    chipDesc: '180×90×80',
    l: '180',
    w: '90',
    h: '80',
    desc: 'Sofa, đệm, tủ áo',
  },
] as const;

const vehicleOptions = [
  {
    value: 'MOTORBIKE',
    label: 'Xe ba gác',
    subLabel: 'Hàng cồng kềnh vừa < 500kg',
    maxWeight: 'Tối đa 500kg',
    desc: 'Linh hoạt ngõ nhỏ, chở tủ bàn ghế, đồ gia dụng vừa',
    renderIcon: (selected: boolean) => (
      <IconVehicleMotorbike color={selected ? '#0B1E42' : '#64748B'} size={32} />
    ),
  },
  {
    value: 'VAN',
    label: 'Xe tải nhẹ',
    subLabel: 'Thùng kín che mưa nắng < 1 tấn',
    maxWeight: 'Tối đa 1.000kg',
    desc: 'Thùng kín bảo vệ hàng, chuyển trọ, hàng đóng kiện',
    renderIcon: (selected: boolean) => (
      <IconVehicleVan color={selected ? '#0B1E42' : '#64748B'} size={32} />
    ),
  },
  {
    value: 'TRUCK',
    label: 'Xe tải nặng',
    subLabel: 'Hàng tải trọng lớn 1–3.5 tấn',
    maxWeight: 'Tối đa 3.500kg',
    desc: 'Vật liệu công trình, máy móc công nghiệp, hàng cồng kềnh',
    renderIcon: (selected: boolean) => (
      <IconVehicleHeavyTruck color={selected ? '#0B1E42' : '#64748B'} size={32} />
    ),
  },
] as const;

function formatVndPriceNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function computeBreakdown(
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK',
  distanceMeters: number,
  stopsCount: number,
  requiresLoadingSupport: boolean,
  fallbackTotalVnd?: number,
): PriceBreakdown {
  const rates: Record<'MOTORBIKE' | 'VAN' | 'TRUCK', { base: number; perKm: number }> = {
    MOTORBIKE: { base: 10000, perKm: 3500 },
    VAN: { base: 20000, perKm: 8000 },
    TRUCK: { base: 35000, perKm: 12000 },
  };

  const rate = rates[vehicleType] || rates.VAN;
  const distanceKm = Math.max(1, distanceMeters / 1000);
  const distanceFareVnd = Math.round(distanceKm * rate.perKm);
  const stopSurchargeVnd = stopsCount * 25000;
  const loadingFeeVnd = requiresLoadingSupport
    ? vehicleType === 'TRUCK'
      ? 30000
      : 20000
    : 0;

  const baseFareVnd = rate.base;
  const calculatedFare = baseFareVnd + distanceFareVnd + stopSurchargeVnd + loadingFeeVnd;
  const totalVnd = fallbackTotalVnd && fallbackTotalVnd > 0 ? fallbackTotalVnd : calculatedFare;

  return {
    baseFareVnd,
    distanceFareVnd,
    stopSurchargeVnd,
    loadingFeeVnd,
    totalVnd,
  };
}

function ActionButton({
  action,
  onPress,
}: Readonly<{ action: CustomerActionView; onPress?: () => void }>) {
  return (
    <Button
      disabled={action.disabled}
      disabledLabel={
        action.disabledReason ? `${action.label} — ${action.disabledReason}` : undefined
      }
      isLoading={action.isPending}
      label={action.label}
      loadingLabel={action.pendingLabel}
      onPress={onPress}
      size="driver-primary"
      variant="primary"
    />
  );
}

const CONGESTION_BADGE_STYLE: Record<
  CustomerRouteOptionView['congestionLevel'],
  { bg: string; text: string }
> = {
  low: { bg: '#DCFCE7', text: '#15803D' },
  moderate: { bg: '#FEF3C7', text: '#B45309' },
  heavy: { bg: '#FFEDD5', text: '#C2410C' },
  severe: { bg: '#FEE2E2', text: '#B91C1C' },
  unknown: { bg: '#F1F5F9', text: '#64748B' },
};

function RouteOptionCard({
  dropoff,
  onPress,
  option,
  pickup,
  selected,
  stops,
}: Readonly<{
  dropoff?: string;
  onPress?: () => void;
  option: CustomerRouteOptionView;
  pickup?: string;
  selected: boolean;
  stops?: readonly { id: string; value: string }[];
}>) {
  const badge = CONGESTION_BADGE_STYLE[option.congestionLevel];
  const filledStops = (stops ?? []).filter((s) => s.value && s.value.trim().length > 0);

  return (
    <Pressable
      accessibilityLabel={`Tuyến ${option.priceLabel}, ${Math.round(option.durationSeconds / 60)} phút`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        selected ? styles.routeCardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.routeCardHeader}>
        <View style={styles.routeSourcePill}>
          <Text style={styles.routeSourcePillText}>Vietmap</Text>
        </View>
        {option.isRecommended ? (
          <View style={styles.recommendedTag}>
            <Text style={styles.recommendedTagText}>⭐ Đề xuất</Text>
          </View>
        ) : null}
        <View style={[styles.congestionBadge, { backgroundColor: badge.bg, marginLeft: 'auto' }]}>
          <View style={[styles.congestionDot, { backgroundColor: badge.text }]} />
          <Text style={[styles.congestionBadgeText, { color: badge.text }]}>
            <Text>{option.congestionLabel}</Text>
          </Text>
        </View>
      </View>

      {/* Trục lộ trình có các điểm dừng hợp lý */}
      {pickup || dropoff ? (
        <View style={styles.routeCardStopsBox}>
          <View style={styles.routeCardStopItem}>
            <View style={styles.routeCardStopDotPickup} />
            <Text numberOfLines={1} style={styles.routeCardStopText}>
              {pickup || 'Điểm lấy hàng'}
            </Text>
          </View>

          {filledStops.map((st, idx) => (
            <View key={st.id || idx} style={styles.routeCardStopItem}>
              <View style={styles.routeCardStopDotStop}>
                <Text style={styles.routeCardStopDotNum}>{idx + 1}</Text>
              </View>
              <Text numberOfLines={1} style={styles.routeCardStopText}>
                {st.value}
              </Text>
            </View>
          ))}

          <View style={styles.routeCardStopItem}>
            <View style={styles.routeCardStopDotDropoff} />
            <Text numberOfLines={1} style={styles.routeCardStopText}>
              {dropoff || 'Điểm giao hàng'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.metricsBadgeRow}>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Thời gian dự kiến</Text>
          <Text style={styles.metricValue}>{Math.round(option.durationSeconds / 60)} phút</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Khoảng cách</Text>
          <Text style={styles.metricValue}>{option.distanceLabel}</Text>
        </View>
      </View>

      <View style={styles.priceHeaderRow}>
        <Text style={styles.estimateRowLabel}>Giá dự kiến</Text>
        <Text style={styles.estimatePrice}>{option.priceLabel}</Text>
      </View>
    </Pressable>
  );
}

function Notice({ isAlert, message }: Readonly<{ message: string | null; isAlert: boolean }>) {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, isAlert ? styles.noticeError : styles.noticeInfo]}
    >
      <Text accessibilityRole={isAlert ? 'alert' : undefined} style={styles.noticeText}>
        {message}
      </Text>
    </View>
  );
}

function resolveInitialStep(view: CustomerCreateView, propStep?: 1 | 2 | 3 | 4 | 5): 1 | 2 | 3 | 4 | 5 {
  if (propStep) return propStep;
  if (view.kind !== 'form') return 1;
  if (view.phase === 'success' || view.actions.some((a) => a.id === 'view-created-order')) {
    return 5;
  }
  if (view.phase === 'submit-pending') {
    return 4;
  }
  if (
    view.estimate.kind === 'ready' ||
    view.estimate.kind === 'loading' ||
    view.estimate.kind === 'error' ||
    view.estimate.kind === 'outdated' ||
    view.estimate.kind === 'expired' ||
    view.phase === 'estimate-ready' ||
    view.phase === 'estimate-error'
  ) {
    return 3;
  }
  return 1;
}

export function CustomerCreateOrderScreen({
  createdPayment,
  loggedInCustomer,
  onAddressSelect,
  onAddStop,
  onBack,
  onCancelOrder,
  onConfirmContactDetails,
  onFieldChange,
  onOpenMapPicker,
  onPickCargoImage,
  onPrimaryAction,
  onRemoveCargoImage,
  onRemoveStop,
  onRetry,
  onSelectCategory,
  onSelectPaymentMethod,
  onSelectRoute,
  onSelectVehicle,
  onStepChange,
  onToggleLoadingSupport,
  onViewCreatedOrder,
  searchAddress,
  step: controlledStep,
  view,
}: CustomerCreateOrderScreenProps) {
  if (view.kind === 'permission-denied') {
    return (
      <ScreenScaffold title="Tạo đơn">
        <ScreenState message={view.message} state="permission-denied" title={view.title} />
      </ScreenScaffold>
    );
  }

  const formView: CustomerCreateFormScreenView = view;

  const [internalStep, setInternalStep] = useState<1 | 2 | 3 | 4 | 5>(() =>
    resolveInitialStep(formView, controlledStep),
  );
  const currentStep = controlledStep ?? internalStep;

  const setStep = (nextStep: 1 | 2 | 3 | 4 | 5) => {
    setInternalStep(nextStep);
    onStepChange?.(nextStep);
  };

  // Customer Profile state
  const [currentCustomer, setCurrentCustomer] = useState<{ name?: string; phone?: string } | null>(
    loggedInCustomer ?? null,
  );

  useEffect(() => {
    if (loggedInCustomer) {
      setCurrentCustomer(loggedInCustomer);
      return;
    }
    let isMounted = true;
    async function loadCustomer() {
      try {
        const user = await httpClient.get<{ id: string; phone?: string | null; name?: string | null }>('/me');
        if (isMounted && user) {
          setCurrentCustomer({
            name: user.name || undefined,
            phone: user.phone || undefined,
          });
        }
      } catch {
        // Silently ignore if unauthenticated
      }
    }
    void loadCustomer();
    return () => {
      isMounted = false;
    };
  }, [loggedInCustomer]);

  // Local state for MapAddressPickerModal & payment/cancel modals
  const [mapPickerTarget, setMapPickerTarget] = useState<'pickup' | 'dropoff' | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelSearchModal, setShowCancelSearchModal] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [driverMatched, setDriverMatched] = useState<{
    name: string;
    phone: string;
    vehiclePlate: string;
    distanceLabel: string;
    etaMinutes: number;
  } | null>(null);

  // Radar wave loop animation for Step 5
  const radarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (currentStep === 5) {
      const anim = Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        }),
      );
      anim.start();
      return () => anim.stop();
    }
    radarAnim.setValue(0);
  }, [currentStep, radarAnim]);

  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.85],
  });

  const radarOpacity = radarAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.7, 0.25, 0],
  });

  // Active search timer for Step 5
  useEffect(() => {
    if (currentStep !== 5) {
      setSearchSeconds(0);
      setDriverMatched(null);
      return;
    }
    const interval = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  const searchMinutes = Math.floor(searchSeconds / 60);
  const searchSecs = searchSeconds % 60;
  const searchTimeFormatted = `${searchMinutes.toString().padStart(2, '0')}:${searchSecs.toString().padStart(2, '0')}`;

  const handleSimulateDriverMatch = () => {
    setDriverMatched({
      name: 'Nguyễn Văn Hùng',
      phone: '0908 123 456',
      vehiclePlate: '51C-892.45',
      distanceLabel: '1,2 km',
      etaMinutes: 4,
    });
  };

  // Auto-advance to step 3 when estimate becomes ready if currently on step 2
  useEffect(() => {
    if (formView.estimate.kind === 'ready' && currentStep === 2) {
      setStep(3);
    }
  }, [formView.estimate.kind, currentStep]);

  // Auto-advance to step 5 on success
  useEffect(() => {
    if (formView.phase === 'success' && currentStep !== 5) {
      setStep(5);
    }
  }, [formView.phase, currentStep]);

  const [customCategoryText, setCustomCategoryText] = useState(
    formView.form.cargoCategory?.startsWith('Khác')
      ? formView.form.cargoCategory.replace(/^Khác:\s*/, '')
      : '',
  );

  const isOtherCategory = Boolean(
    formView.form.cargoCategory === 'Khác' || formView.form.cargoCategory?.startsWith('Khác:'),
  );

  const calculatedVolume = useMemo(() => {
    const l = Number(formView.form.cargoDimensions?.length);
    const w = Number(formView.form.cargoDimensions?.width);
    const h = Number(formView.form.cargoDimensions?.height);
    if (l > 0 && w > 0 && h > 0) {
      const m3 = (l * w * h) / 1000000;
      return m3 < 0.01 ? '< 0.01' : m3.toFixed(2);
    }
    return null;
  }, [formView.form.cargoDimensions]);

  const handleSelectDimPreset = (preset: (typeof DIMENSION_PRESETS)[number]) => {
    onFieldChange?.('dimLength', preset.l);
    onFieldChange?.('dimWidth', preset.w);
    onFieldChange?.('dimHeight', preset.h);
  };

  const isFormDirty = Boolean(
    formView.form.pickup ||
      formView.form.dropoff ||
      formView.form.stops.some((s) => s.value) ||
      formView.form.cargoWeight ||
      formView.form.cargoNote ||
      formView.form.cargoName,
  );

  const handleBackPress = () => {
    if (currentStep > 1 && currentStep < 5) {
      setStep((currentStep - 1) as 1 | 2 | 3 | 4);
      return;
    }
    if (currentStep === 5) {
      onViewCreatedOrder?.();
      return;
    }
    if (isFormDirty) {
      setShowLeaveModal(true);
    } else {
      onBack?.();
    }
  };

  const primaryAction = formView.actions[0];
  const routeStops = formView.form.stops
    .filter((stop) => stop.value && stop.value.trim().length > 0 && stop.value !== 'Chưa chọn')
    .map((stop) => ({
      id: stop.id,
      label: stop.value.trim(),
      coords: stop.coords,
    }));

  const stepAnim = useRef(new Animated.Value(currentStep)).current;
  useEffect(() => {
    Animated.spring(stepAnim, {
      toValue: currentStep,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [currentStep, stepAnim]);

  const progressPercent = stepAnim.interpolate({
    inputRange: [1, 2, 3, 4],
    outputRange: ['25%', '50%', '75%', '100%'],
    extrapolate: 'clamp',
  });

  const isAlert =
    formView.phase === 'invalid' ||
    formView.phase.endsWith('error') ||
    formView.phase === 'submit-conflict' ||
    formView.phase === 'media-invalid';

  const isRouteDone = Boolean(formView.form.pickup?.trim() && formView.form.dropoff?.trim());
  const isVehicleDone = Boolean(formView.form.vehicleType);
  const isEstimateDone = formView.estimate.kind === 'ready';

  const selectedVehicle = useMemo(
    () => vehicleOptions.find((opt) => opt.value === formView.form.vehicleType) || vehicleOptions[1],
    [formView.form.vehicleType],
  );

  const recommendedRoute = useMemo(() => {
    if (formView.estimate.kind !== 'ready') return null;
    const est = formView.estimate;
    return (
      est.routes.find((r) => r.routeId === est.selectedRouteId) ||
      est.routes.find((r) => r.isRecommended) ||
      est.routes[0] ||
      null
    );
  }, [formView.estimate]);

  const priceBreakdown = useMemo(() => {
    let distanceM = 15000;
    if (recommendedRoute?.distanceLabel) {
      const numKm = parseFloat(recommendedRoute.distanceLabel.replace(',', '.').replace(/[^\d.]/g, ''));
      if (!isNaN(numKm) && numKm > 0) {
        distanceM = Math.round(numKm * 1000);
      }
    }
    const totalVnd = recommendedRoute ? parseInt(recommendedRoute.priceLabel.replace(/\D/g, ''), 10) : 0;
    return computeBreakdown(
      formView.form.vehicleType,
      distanceM,
      formView.form.stops.length,
      Boolean(formView.form.requiresLoadingSupport),
      totalVnd,
    );
  }, [formView.form.vehicleType, formView.form.stops.length, formView.form.requiresLoadingSupport, recommendedRoute]);

  const isClosingModalRef = useRef(false);
  const modalCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (modalCloseTimerRef.current) clearTimeout(modalCloseTimerRef.current);
    };
  }, []);

  const handleOpenMap = (target: 'pickup' | 'dropoff') => {
    if (isClosingModalRef.current) return;
    if (onOpenMapPicker) {
      onOpenMapPicker(target);
    } else {
      setMapPickerTarget(target);
    }
  };

  const handleCloseMapModal = () => {
    setMapPickerTarget(null);
    isClosingModalRef.current = true;
    if (modalCloseTimerRef.current) clearTimeout(modalCloseTimerRef.current);
    modalCloseTimerRef.current = setTimeout(() => {
      isClosingModalRef.current = false;
    }, 400);
  };

  const handleConfirmModal = (
    confirmedAddress: string,
    details?: {
      note: string;
      senderName: string;
      senderPhone: string;
      coords?: { lat: number; lng: number };
    },
  ) => {
    const target = mapPickerTarget;
    if (!target) return;

    handleCloseMapModal();

    if (onConfirmContactDetails && details) {
      onConfirmContactDetails(target, {
        name: details.senderName,
        phone: details.senderPhone,
        note: details.note,
        address: confirmedAddress,
        coords: details.coords,
      });
    }

    if (onFieldChange) {
      onFieldChange(target, confirmedAddress);
    }

    if (onAddressSelect && details?.coords) {
      onAddressSelect(target, {
        placeId: `pin-${Date.now()}`,
        label: confirmedAddress,
        coords: details.coords,
      });
    }
  };

  // Sticky bottom footer CTA per step
  function renderFooter() {
    if (currentStep === 1) {
      return (
        <View style={styles.footerSingleBtn}>
          <Button
            disabled={!isRouteDone}
            disabledLabel="Tiếp tục: Chọn xe — Nhập điểm lấy và điểm giao để tiếp tục"
            label="Tiếp tục: Chọn xe & hàng ➔"
            onPress={() => {
              if (isRouteDone) setStep(2);
            }}
            size="driver-primary"
            variant="primary"
          />
        </View>
      );
    }

    if (currentStep === 2) {
      const isTruckMissingWeight =
        formView.form.vehicleType === 'TRUCK' &&
        (!formView.form.cargoWeight || Number(formView.form.cargoWeight) <= 0);
      const isCalculating = formView.estimate.kind === 'loading';

      return (
        <View style={styles.footerButtonRow}>
          <View style={styles.footerBtnHalf}>
            <Button
              label="← Quay lại"
              onPress={() => setStep(1)}
              variant="secondary"
            />
          </View>
          <View style={styles.footerBtnHalf}>
            <Button
              disabled={isTruckMissingWeight || isCalculating}
              disabledLabel={
                isTruckMissingWeight ? 'Nhập khối lượng xe tải' : undefined
              }
              isLoading={isCalculating}
              label={
                formView.estimate.kind === 'ready'
                  ? 'Xem báo giá ➔'
                  : 'Tiếp tục — Báo giá ➔'
              }
              loadingLabel="Đang tính giá..."
              onPress={() => {
                if (formView.estimate.kind === 'ready') {
                  setStep(3);
                } else if (onPrimaryAction) {
                  onPrimaryAction('estimate-order');
                }
              }}
              size="driver-primary"
              variant="primary"
            />
          </View>
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View style={styles.footerButtonRow}>
          <View style={styles.footerBtnHalf}>
            <Button
              label="← Quay lại"
              onPress={() => setStep(2)}
              variant="secondary"
            />
          </View>
          <View style={styles.footerBtnHalf}>
            <Button
              disabled={formView.estimate.kind !== 'ready'}
              disabledLabel="Chưa có báo giá hợp lệ"
              label="Tiếp tục — Xác nhận ➔"
              onPress={() => setStep(4)}
              size="driver-primary"
              variant="primary"
            />
          </View>
        </View>
      );
    }

    if (currentStep === 4) {
      const canSubmit = formView.estimate.kind === 'ready';
      const handlePressSubmit = () => {
        onPrimaryAction?.('create-order');
        if (formView.form.paymentMethod !== 'CASH') {
          setShowPaymentModal(true);
        } else {
          setStep(5);
        }
      };

      return (
        <View style={styles.footerButtonRow}>
          <View style={styles.footerBtnHalf}>
            <Button
              label="← Quay lại"
              onPress={() => setStep(3)}
              variant="secondary"
            />
          </View>
          <View style={styles.footerBtnHalf}>
            {primaryAction && primaryAction.id === 'create-order' ? (
              <ActionButton
                action={{
                  ...primaryAction,
                  label: 'Tạo đơn',
                }}
                onPress={
                  onPrimaryAction && !primaryAction.disabled && !primaryAction.isPending
                    ? handlePressSubmit
                    : undefined
                }
              />
            ) : (
              <Button
                disabled={!canSubmit}
                disabledLabel="Chưa có báo giá hợp lệ"
                label="Tạo đơn"
                onPress={
                  onPrimaryAction && canSubmit
                    ? handlePressSubmit
                    : undefined
                }
                size="driver-primary"
                variant="primary"
              />
            )}
          </View>
        </View>
      );
    }

    // Step 5: Finding driver
    return (
      <View style={styles.footerButtonRow}>
        <View style={styles.footerBtnHalf}>
          <Button
            label="✕ Hủy tìm kiếm"
            onPress={() => setShowCancelSearchModal(true)}
            variant="secondary"
          />
        </View>
        <View style={styles.footerBtnHalf}>
          <Button
            label="Chi tiết đơn hàng ➔"
            onPress={onViewCreatedOrder || onBack}
            size="driver-primary"
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <ScreenScaffold
      hasFloatingNavBar
      onBack={onBack ? handleBackPress : undefined}
      stickyFooter={renderFooter()}
      subtitle={
        currentStep === 1
          ? 'Bước 1/4 · Xác định lộ trình'
          : currentStep === 2
            ? 'Bước 2/4 · Chọn hàng & xe'
            : currentStep === 3
              ? 'Bước 3/4 · Báo giá vận chuyển'
              : currentStep === 4
                ? 'Bước 4/4 · Kiểm tra & chốt đơn'
                : 'Đang tìm kiếm tài xế gần bạn nhất...'
      }
      title={currentStep === 5 ? 'Đặt đơn thành công' : 'Tạo đơn'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Thanh Tiến Độ 4 Bước Chuẩn Mobile App với Hiệu Ứng Động */}
          {currentStep <= 4 ? (
            <View accessibilityRole="tablist" style={styles.stepperCard}>
              <View style={styles.stepperRow}>
                {/* Bước 1 */}
                <Pressable
                  accessibilityLabel="Bước 1: Lộ trình"
                  accessibilityRole="button"
                  onPress={() => setStep(1)}
                  style={styles.stepTouchTarget}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep === 1
                        ? styles.stepCircleActive
                        : isRouteDone
                          ? styles.stepCircleCompleted
                          : styles.stepCircleInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        currentStep === 1
                          ? styles.stepCircleTextActive
                          : isRouteDone
                            ? styles.stepCircleTextCompleted
                            : styles.stepCircleTextInactive,
                      ]}
                    >
                      {isRouteDone && currentStep > 1 ? '✓' : '1'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      currentStep === 1
                        ? styles.stepTitleActive
                        : isRouteDone
                          ? styles.stepTitleCompleted
                          : styles.stepTitleInactive,
                    ]}
                  >
                    1. Lộ trình
                  </Text>
                </Pressable>

                <View
                  style={[
                    styles.stepConnector,
                    isRouteDone ? styles.stepConnectorFilled : null,
                  ]}
                />

                {/* Bước 2 */}
                <Pressable
                  accessibilityLabel="Bước 2: Xe & Hàng"
                  accessibilityRole="button"
                  onPress={() => {
                    if (isRouteDone) setStep(2);
                  }}
                  style={styles.stepTouchTarget}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep === 2
                        ? styles.stepCircleActive
                        : isVehicleDone && isRouteDone
                          ? styles.stepCircleCompleted
                          : styles.stepCircleInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        currentStep === 2
                          ? styles.stepCircleTextActive
                          : isVehicleDone && isRouteDone
                            ? styles.stepCircleTextCompleted
                            : styles.stepCircleTextInactive,
                      ]}
                    >
                      {isVehicleDone && isRouteDone && currentStep > 2 ? '✓' : '2'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      currentStep === 2
                        ? styles.stepTitleActive
                        : isVehicleDone && isRouteDone
                          ? styles.stepTitleCompleted
                          : styles.stepTitleInactive,
                    ]}
                  >
                    2. Xe & Hàng
                  </Text>
                </Pressable>

                <View
                  style={[
                    styles.stepConnector,
                    isEstimateDone ? styles.stepConnectorFilled : null,
                  ]}
                />

                {/* Bước 3 */}
                <Pressable
                  accessibilityLabel="Bước 3: Báo giá"
                  accessibilityRole="button"
                  onPress={() => {
                    if (isRouteDone) setStep(3);
                  }}
                  style={styles.stepTouchTarget}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep === 3
                        ? styles.stepCircleActive
                        : isEstimateDone
                          ? styles.stepCircleCompleted
                          : styles.stepCircleInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        currentStep === 3
                          ? styles.stepCircleTextActive
                          : isEstimateDone
                            ? styles.stepCircleTextCompleted
                            : styles.stepCircleTextInactive,
                      ]}
                    >
                      {isEstimateDone && currentStep > 3 ? '✓' : '3'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      currentStep === 3
                        ? styles.stepTitleActive
                        : isEstimateDone
                          ? styles.stepTitleCompleted
                          : styles.stepTitleInactive,
                    ]}
                  >
                    3. Báo giá
                  </Text>
                </Pressable>

                <View
                  style={[
                    styles.stepConnector,
                    currentStep === 4 ? styles.stepConnectorFilled : null,
                  ]}
                />

                {/* Bước 4 */}
                <Pressable
                  accessibilityLabel="Bước 4: Xác nhận"
                  accessibilityRole="button"
                  onPress={() => {
                    if (isRouteDone && isEstimateDone) setStep(4);
                  }}
                  style={styles.stepTouchTarget}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      currentStep === 4
                        ? styles.stepCircleActive
                        : styles.stepCircleInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        currentStep === 4
                          ? styles.stepCircleTextActive
                          : styles.stepCircleTextInactive,
                      ]}
                    >
                      4
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      currentStep === 4
                        ? styles.stepTitleActive
                        : styles.stepTitleInactive,
                    ]}
                  >
                    4. Xác nhận
                  </Text>
                </Pressable>
              </View>

              {/* Thanh tiến độ hiệu ứng động */}
              <View style={styles.progressBarTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: progressPercent },
                  ]}
                />
              </View>
            </View>
          ) : null}

          <Notice isAlert={isAlert} message={view.notice} />

          {/* ========================================================= */}
          {/* 🛣️ BƯỚC 1: LỘ TRÌNH VẬN CHUYỂN */}
          {/* ========================================================= */}
          {currentStep === 1 ? (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.sectionIndex}>01</Text>
                </View>
                <View style={styles.sectionHeaderCol}>
                  <Text style={styles.sectionLabel}>LỘ TRÌNH VẬN CHUYỂN</Text>
                  <Text style={styles.sectionSublabel}>
                    Chạm để định vị bản đồ & xác nhận thông tin người liên hệ
                  </Text>
                </View>
              </View>

              {/* Bản đồ lộ trình trực quan (Compact Map 25-30%) */}
              {formView.form.pickup || formView.form.dropoff ? (
                <View style={styles.interactiveMapContainer}>
                  <RealInteractiveMap
                    destination={{
                      label: formView.form.dropoff || 'Điểm giao',
                      coords: formView.form.dropoffCoords,
                    }}
                    height={190}
                    mode="route"
                    origin={{
                      label: formView.form.pickup || 'Điểm lấy',
                      coords: formView.form.pickupCoords,
                    }}
                    stops={routeStops}
                    testID="create-order-map-preview"
                    vietmapApiKey={process.env.EXPO_PUBLIC_VIETMAP_API_KEY}
                  />
                </View>
              ) : null}

              {/* Unified Route Box: Trục hành trình thẳng đứng liền mạch y hệt Home */}
              <View style={styles.routeBox}>
                {/* Cột trục hành trình (Journey Spine) */}
                <View style={styles.spineColumn}>
                  <View style={styles.pickupPinCircle}>
                    <View style={styles.pickupPinInner} />
                  </View>
                  <View style={styles.spineLine} />
                  {formView.form.stops.map((stop, idx) => (
                    <Fragment key={stop.id}>
                      <View style={styles.stopPinCircle}>
                        <Text style={styles.stopPinText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.spineLine} />
                    </Fragment>
                  ))}
                  <View style={styles.dropoffPinSquare} />
                </View>

                {/* Cột các trường nhập liệu (Inputs Column) */}
                <View style={styles.inputsColumn}>
                  {/* Điểm lấy hàng */}
                  <AddressSearchField
                    contactInfoText={
                      formView.form.senderInfo?.name
                        ? `${formView.form.senderInfo.name} (${formView.form.senderInfo.phone})`
                        : currentCustomer?.name
                          ? `${currentCustomer.name} (${currentCustomer.phone || ''})`
                          : null
                    }
                    error={formView.form.fieldErrors.pickup}
                    label="Điểm lấy hàng"
                    mapActionLabel="Xác nhận người gửi & vị trí lấy"
                    onChangeText={
                      onFieldChange ? (value) => onFieldChange('pickup', value) : () => {}
                    }
                    onOpenMapModal={() => handleOpenMap('pickup')}
                    onSelect={
                      onAddressSelect
                        ? (candidate) => onAddressSelect('pickup', candidate)
                        : () => {}
                    }
                    pinColor="#0B1E42"
                    placeholder="Nhập địa chỉ lấy hàng..."
                    search={searchAddress ?? (async () => [])}
                    testID="create-order-pickup-field"
                    value={formView.form.pickup}
                  />

                  {/* Các điểm dừng trung gian (0-3 điểm) */}
                  {formView.form.stops.map((stop, index) => (
                    <AddressSearchField
                      isStop
                      key={stop.id}
                      label={`Điểm dừng ${index + 1}`}
                      onChangeText={
                        onFieldChange
                          ? (value) => onFieldChange(`stop:${stop.id}`, value)
                          : () => {}
                      }
                      onRemove={onRemoveStop ? () => onRemoveStop(stop.id) : undefined}
                      onSelect={
                        onAddressSelect
                          ? (candidate) => onAddressSelect(`stop:${stop.id}`, candidate)
                          : () => {}
                      }
                      pinColor="#F59E0B"
                      placeholder="Nhập địa chỉ điểm dừng..."
                      removeLabel={`Xóa điểm dừng ${index + 1}`}
                      search={searchAddress ?? (async () => [])}
                      testID={`create-order-stop-field-${index}`}
                      value={stop.value}
                    />
                  ))}

                  {/* Nút thêm điểm dừng (tối đa 3 điểm) */}
                  {formView.form.stops.length < 3 ? (
                    <Pressable
                      accessibilityLabel="+ Thêm điểm dừng (0–3)"
                      accessibilityRole="button"
                      onPress={onAddStop}
                      style={({ pressed }) => [styles.addStopInlineBtn, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.addStopInlinePlus}>+</Text>
                      <Text style={styles.addStopInlineText}>Thêm điểm dừng (tối đa 3 điểm)</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.helper}>Đã đạt tối đa 3 điểm dừng.</Text>
                  )}

                  {/* Điểm giao hàng */}
                  <AddressSearchField
                    contactInfoText={
                      formView.form.receiverInfo?.name
                        ? `${formView.form.receiverInfo.name} (${formView.form.receiverInfo.phone})`
                        : null
                    }
                    error={formView.form.fieldErrors.dropoff}
                    label="Điểm giao hàng"
                    mapActionLabel="Xác nhận người nhận & vị trí giao"
                    onChangeText={
                      onFieldChange ? (value) => onFieldChange('dropoff', value) : () => {}
                    }
                    onOpenMapModal={() => handleOpenMap('dropoff')}
                    onSelect={
                      onAddressSelect
                        ? (candidate) => onAddressSelect('dropoff', candidate)
                        : () => {}
                    }
                    pinColor="#DC2626"
                    placeholder="Bạn muốn giao hàng đến đâu?..."
                    search={searchAddress ?? (async () => [])}
                    testID="create-order-dropoff-field"
                    value={formView.form.dropoff}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* BƯỚC 2: HÀNG HÓA & PHƯƠNG TIỆN */}
          {/* ========================================================= */}
          {currentStep === 2 ? (
            <View style={styles.stepContainer}>
              {/* Thẻ tóm tắt lộ trình nhanh */}
              <View style={styles.routeSummaryStrip}>
                <View style={styles.routeSummaryContent}>
                  <View style={styles.routeSummaryRow}>
                    <Text style={styles.routeSummaryDotOrigin}>●</Text>
                    <Text numberOfLines={1} style={styles.routeSummaryText}>
                      {formView.form.pickup || 'Chưa chọn điểm lấy'}
                    </Text>
                  </View>
                  <View style={styles.routeSummaryRow}>
                    <View style={styles.routeSummarySquareDest} />
                    <Text numberOfLines={1} style={styles.routeSummaryText}>
                      {formView.form.dropoff || 'Chưa chọn điểm giao'}
                    </Text>
                    {formView.form.stops.length > 0 ? (
                      <Text style={styles.routeSummaryStopBadge}>
                        +{formView.form.stops.length} điểm dừng
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Chỉnh sửa lộ trình"
                  accessibilityRole="button"
                  onPress={() => setStep(1)}
                  style={styles.routeSummaryEditBtn}
                >
                  <Text style={styles.routeSummaryEditText}>Sửa</Text>
                </Pressable>
              </View>

              {/* Card 1: Thông tin hàng hóa */}
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.sectionIndex}>02A</Text>
                  </View>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionLabel}>THÔNG TIN HÀNG HÓA</Text>
                    <Text style={styles.sectionSublabel}>
                      Tên hàng, loại hàng, kích thước, ảnh chụp và yêu cầu bốc xếp
                    </Text>
                  </View>
                </View>

                {/* Tên hàng hóa */}
                <View style={styles.blueFieldContainer}>
                  <Text style={styles.blueFieldLabel}>Tên hàng hóa</Text>
                  <TextInput
                    accessibilityLabel="Tên hàng hóa"
                    onChangeText={
                      onFieldChange ? (val) => onFieldChange('cargoName', val) : undefined
                    }
                    placeholder="Ví dụ: 40 bao xi măng INSEE, thiết bị máy hàn..."
                    placeholderTextColor="#94A3B8"
                    style={styles.blueTextInput}
                    value={formView.form.cargoName || ''}
                  />
                </View>

                {/* Phân loại hàng nhanh (Chips) */}
                <View style={styles.categorySection}>
                  <Text style={styles.blueFieldLabel}>Phân loại hàng hóa</Text>
                  <View style={styles.categoryChipGroup}>
                    {CARGO_CATEGORIES.map((cat) => {
                      const isSelected =
                        cat === 'Khác'
                          ? isOtherCategory
                          : formView.form.cargoCategory === cat;
                      return (
                        <Pressable
                          accessibilityLabel={`Chọn phân loại ${cat}`}
                          key={cat}
                          onPress={() => {
                            if (cat === 'Khác') {
                              onSelectCategory?.(
                                customCategoryText.trim()
                                  ? `Khác: ${customCategoryText.trim()}`
                                  : 'Khác',
                              );
                            } else {
                              onSelectCategory?.(cat);
                            }
                          }}
                          style={[
                            styles.categoryChip,
                            isSelected && styles.categoryChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              isSelected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Khi nhấn Khác ở phân loại thì thêm khung nhập */}
                  {isOtherCategory ? (
                    <View style={styles.customCategoryWrap}>
                      <Text style={styles.customCategoryLabel}>Chi tiết loại hàng hóa khác:</Text>
                      <TextInput
                        accessibilityLabel="Chi tiết loại hàng khác"
                        onChangeText={(val) => {
                          setCustomCategoryText(val);
                          onSelectCategory?.(val.trim() ? `Khác: ${val.trim()}` : 'Khác');
                        }}
                        placeholder="Nhập cụ thể loại hàng của bạn (ví dụ: Cây cảnh, gốm sứ...)"
                        placeholderTextColor="#94A3B8"
                        style={styles.blueTextInput}
                        value={customCategoryText}
                      />
                    </View>
                  ) : null}
                </View>

                {/* Khối lượng hàng */}
                <View style={styles.blueFieldContainer}>
                  <Text style={styles.blueFieldLabel}>
                    Khối lượng dự kiến (kg)
                    {formView.form.vehicleType === 'TRUCK' ? (
                      <Text style={styles.requiredStar}> * (Bắt buộc với xe tải nặng)</Text>
                    ) : null}
                  </Text>
                  <TextInput
                    accessibilityHint={formView.form.fieldErrors.cargoWeight}
                    accessibilityLabel="Khối lượng dự kiến (kg)"
                    keyboardType="decimal-pad"
                    onChangeText={
                      onFieldChange ? (value) => onFieldChange('cargoWeight', value) : undefined
                    }
                    placeholder={
                      formView.form.vehicleType === 'TRUCK'
                        ? 'Bắt buộc khi chọn xe tải nặng (ví dụ: 1500)'
                        : 'Tùy chọn (ví dụ: 25)'
                    }
                    placeholderTextColor="#94A3B8"
                    style={[
                      styles.blueTextInput,
                      formView.form.fieldErrors.cargoWeight ? styles.blueTextInputError : null,
                    ]}
                    value={formView.form.cargoWeight}
                  />
                  {formView.form.fieldErrors.cargoWeight ? (
                    <Text accessibilityRole="alert" style={styles.fieldErrorText}>
                      {formView.form.fieldErrors.cargoWeight}
                    </Text>
                  ) : null}
                </View>

                {/* Kích thước Dài x Rộng x Cao */}
                <View style={styles.dimensionsSection}>
                  <View style={styles.dimHeaderRow}>
                    <Text style={styles.blueFieldLabel}>Kích thước kiện hàng (cm)</Text>
                    {calculatedVolume ? (
                      <View style={styles.volumeBadge}>
                        <Text style={styles.volumeBadgeText}>Thể tích: ~{calculatedVolume} m³</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Gợi ý quy cách nhanh dạng chip pill thanh lịch */}
                  <View style={styles.dimPresetGroup}>
                    {DIMENSION_PRESETS.map((preset) => {
                      const isActive =
                        formView.form.cargoDimensions?.length === preset.l &&
                        formView.form.cargoDimensions?.width === preset.w &&
                        formView.form.cargoDimensions?.height === preset.h;
                      return (
                        <Pressable
                          accessibilityLabel={`Chọn quy cách ${preset.label}`}
                          key={preset.label}
                          onPress={() => handleSelectDimPreset(preset)}
                          style={[
                            styles.dimPresetChip,
                            isActive && styles.dimPresetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dimPresetChipTitle,
                              isActive && styles.dimPresetChipTitleActive,
                            ]}
                          >
                            {preset.chipTitle}
                          </Text>
                          <Text
                            style={[
                              styles.dimPresetChipDesc,
                              isActive && styles.dimPresetChipDescActive,
                            ]}
                          >
                            {preset.chipDesc}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.dimensionsRow}>
                    <View style={styles.dimInputWrap}>
                      <Text style={styles.dimInputSublabel}>Dài (cm)</Text>
                      <TextInput
                        accessibilityLabel="Chiều dài (cm)"
                        keyboardType="numeric"
                        onChangeText={(val) => onFieldChange?.('dimLength', val)}
                        placeholder="40"
                        placeholderTextColor="#94A3B8"
                        style={styles.dimInput}
                        value={formView.form.cargoDimensions?.length || ''}
                      />
                    </View>
                    <Text style={styles.dimMultiply}>×</Text>
                    <View style={styles.dimInputWrap}>
                      <Text style={styles.dimInputSublabel}>Rộng (cm)</Text>
                      <TextInput
                        accessibilityLabel="Chiều rộng (cm)"
                        keyboardType="numeric"
                        onChangeText={(val) => onFieldChange?.('dimWidth', val)}
                        placeholder="30"
                        placeholderTextColor="#94A3B8"
                        style={styles.dimInput}
                        value={formView.form.cargoDimensions?.width || ''}
                      />
                    </View>
                    <Text style={styles.dimMultiply}>×</Text>
                    <View style={styles.dimInputWrap}>
                      <Text style={styles.dimInputSublabel}>Cao (cm)</Text>
                      <TextInput
                        accessibilityLabel="Chiều cao (cm)"
                        keyboardType="numeric"
                        onChangeText={(val) => onFieldChange?.('dimHeight', val)}
                        placeholder="30"
                        placeholderTextColor="#94A3B8"
                        style={styles.dimInput}
                        value={formView.form.cargoDimensions?.height || ''}
                      />
                    </View>
                  </View>
                </View>

                {/* Khung chụp / chọn ảnh hàng hóa (không bắt buộc) */}
                <View style={styles.photoUploadSection}>
                  <Text style={styles.blueFieldLabel}>Ảnh hàng hóa (không bắt buộc)</Text>
                  {formView.form.cargoImageUri ? (
                    <View style={styles.photoPreviewRow}>
                      <Image
                        accessibilityLabel="Ảnh hàng hóa đã chụp"
                        source={{ uri: formView.form.cargoImageUri }}
                        style={styles.photoThumbnail}
                      />
                      <View style={styles.photoMetaCol}>
                        <Text style={styles.photoSuccessText}>✓ Đã chọn ảnh</Text>
                        <Pressable
                          accessibilityLabel="Xóa ảnh hàng hóa"
                          onPress={onRemoveCargoImage}
                          style={styles.photoRemoveBtn}
                        >
                          <Text style={styles.photoRemoveBtnText}>✕ Xóa ảnh</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityLabel="Chụp hoặc tải ảnh hàng hóa"
                      accessibilityRole="button"
                      onPress={onPickCargoImage}
                      style={({ pressed }) => [
                        styles.photoUploadBox,
                        pressed && styles.pressed,
                      ]}
                    >
                      <IconCamera color="#0B1E42" size={28} />
                      <Text style={styles.photoUploadTitle}>Chụp ảnh hoặc chọn ảnh hàng</Text>
                      <Text style={styles.photoUploadSubtitle}>
                        Giúp tài xế chuẩn bị thùng xe và dây chằng phù hợp
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Toggle Hỗ trợ bốc xếp */}
                <View style={styles.loadingSupportRow}>
                  <View style={styles.loadingSupportInfo}>
                    <Text style={styles.loadingSupportTitle}>Yêu cầu tài xế hỗ trợ bốc xếp</Text>
                    <Text style={styles.loadingSupportDesc}>
                      Tài xế hỗ trợ bốc dỡ hàng lên xuống xe (+20.000 ₫)
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Yêu cầu tài xế hỗ trợ bốc xếp"
                    onValueChange={(val) => onToggleLoadingSupport?.(val)}
                    thumbColor={formView.form.requiresLoadingSupport ? '#0B1E42' : '#CBD5E1'}
                    trackColor={{ false: '#E2E8F0', true: '#CBD5E1' }}
                    value={Boolean(formView.form.requiresLoadingSupport)}
                  />
                </View>

                {/* Ghi chú hàng hóa */}
                <View style={styles.blueFieldContainer}>
                  <Text style={styles.blueFieldLabel}>Ghi chú hàng hóa</Text>
                  <TextInput
                    accessibilityLabel="Ghi chú hàng hóa"
                    multiline
                    numberOfLines={3}
                    onChangeText={
                      onFieldChange ? (value) => onFieldChange('cargoNote', value) : undefined
                    }
                    placeholder="Mô tả loại hàng, yêu cầu bảo quản, người liên hệ..."
                    placeholderTextColor="#94A3B8"
                    style={[styles.blueTextInput, styles.blueTextArea]}
                    value={formView.form.cargoNote}
                  />
                </View>
              </View>

              {/* Card 2: Chọn loại phương tiện */}
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.sectionIndex}>02B</Text>
                  </View>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionLabel}>CHỌN LOẠI XE</Text>
                    <Text style={styles.sectionSublabel}>
                      Chọn phương tiện phù hợp với khối lượng & quy cách
                    </Text>
                  </View>
                </View>

                {/* Danh sách thẻ phương tiện */}
                <View accessibilityRole="radiogroup" style={styles.vehicleGroup}>
                  {vehicleOptions.map((option) => {
                    const selected = formView.form.vehicleType === option.value;
                    return (
                      <Pressable
                        accessibilityLabel={option.label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={option.value}
                        onPress={
                          onSelectVehicle ? () => onSelectVehicle(option.value) : undefined
                        }
                        style={({ pressed }) => [
                          styles.vehicleCard,
                          selected ? styles.vehicleCardSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.vehicleIconBox,
                            selected ? styles.vehicleIconBoxSelected : null,
                          ]}
                        >
                          {option.renderIcon(selected)}
                        </View>

                        <View style={styles.vehicleInfo}>
                          <View style={styles.vehicleHeader}>
                            <Text
                              style={[
                                styles.vehicleTitle,
                                selected ? styles.vehicleTitleSelected : null,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text style={styles.vehicleCapacityBadge}>{option.maxWeight}</Text>
                          </View>
                          <Text style={styles.vehicleDesc}>{option.desc}</Text>
                        </View>

                        <View
                          style={[
                            styles.radioIndicator,
                            selected ? styles.radioIndicatorSelected : null,
                          ]}
                        >
                          {selected ? <View style={styles.radioDot} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* 💰 BƯỚC 3: BÁO GIÁ & TUYẾN ĐƯỜNG */}
          {/* ========================================================= */}
          {currentStep === 3 ? (
            <View style={styles.stepContainer}>
              {/* Thẻ tóm tắt đơn */}
              <View style={styles.orderOverviewStrip}>
                <View style={styles.orderOverviewRow}>
                  <IconLocationPin color="#0B1E42" size={16} />
                  <Text numberOfLines={1} style={styles.orderOverviewText}>
                    {formView.form.pickup || 'Điểm lấy'} → {formView.form.dropoff || 'Điểm giao'}
                    {formView.form.stops.length > 0
                      ? ` (+${formView.form.stops.length} điểm dừng)`
                      : ''}
                  </Text>
                  <Pressable
                    accessibilityLabel="Sửa lộ trình"
                    accessibilityRole="button"
                    onPress={() => setStep(1)}
                  >
                    <Text style={styles.orderOverviewEditLink}>Sửa</Text>
                  </Pressable>
                </View>
                <View style={styles.orderOverviewDivider} />
                <View style={styles.orderOverviewRow}>
                  <IconVehicleVan color="#0B1E42" size={16} />
                  <Text style={styles.orderOverviewText}>
                    {selectedVehicle?.label || 'Chưa chọn xe'}
                    {formView.form.cargoWeight ? ` · ${formView.form.cargoWeight} kg` : ''}
                  </Text>
                  <Pressable
                    accessibilityLabel="Sửa phương tiện"
                    accessibilityRole="button"
                    onPress={() => setStep(2)}
                  >
                    <Text style={styles.orderOverviewEditLink}>Đổi xe</Text>
                  </Pressable>
                </View>
              </View>

              {/* Card Báo Giá */}
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.sectionIndex}>03</Text>
                  </View>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionLabel}>BÁO GIÁ & LỘ TRÌNH</Text>
                    <Text style={styles.sectionSublabel}>
                      Tuyến ngắn nhất từ Vietmap và bảng phân tích cước phí
                    </Text>
                  </View>
                  {formView.estimate.kind === 'ready' && formView.estimate.source === 'DEMO' ? (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>Ước tính tiêu chuẩn</Text>
                    </View>
                  ) : null}
                </View>

                {/* Estimate Loading State */}
                {formView.estimate.kind === 'loading' ? (
                  <View style={styles.estimateBoxLoading}>
                    <SkeletonBar height={16} width="40%" />
                    <SkeletonBar height={34} width="65%" />
                    <SkeletonBar height={16} width="50%" />
                  </View>
                ) : null}

                {/* Estimate Error State */}
                {formView.estimate.kind === 'error' ? (
                  <View style={[styles.estimateBox, styles.estimateBoxError]}>
                    <Text style={styles.estimateErrorTitle}>Không thể tính cước phí</Text>
                    <Text style={styles.estimateErrorMessage}>{formView.estimate.message}</Text>
                    {onRetry ? (
                      <Button label="Thử lại" onPress={onRetry} variant="secondary" />
                    ) : null}
                  </View>
                ) : null}

                {/* Ready State */}
                {formView.estimate.kind === 'ready' ? (
                  <View style={styles.estimateContentReady}>
                    {/* Badge Tuyến tối ưu & ETA nhận hàng */}
                    <View style={styles.optimalBannerRow}>
                      <Text style={styles.etaNoticeText}>Tài xế đến lấy dự kiến: ~10–15 phút</Text>
                      {formView.form.stops.length > 0 ? (
                        <View style={styles.stopsBadge}>
                          <Text style={styles.stopsBadgeText}>
                            +{formView.form.stops.length} điểm dừng
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Thẻ lộ trình duy nhất (chỉ hiển thị 1 tuyến tối ưu từ Vietmap) */}
                    {recommendedRoute ? (
                      <View style={styles.routeList}>
                        <RouteOptionCard
                          dropoff={formView.form.dropoff}
                          key={recommendedRoute.routeId}
                          onPress={
                            onSelectRoute
                              ? () => onSelectRoute(recommendedRoute.routeId)
                              : undefined
                          }
                          option={recommendedRoute}
                          pickup={formView.form.pickup}
                          selected
                          stops={formView.form.stops}
                        />
                      </View>
                    ) : null}

                    {/* Bảng phân tích cước phí chi tiết (Price Breakdown) */}
                    <View style={styles.breakdownCard}>
                      <Text style={styles.breakdownTitle}>CHI TIẾT GIÁ CƯỚC</Text>
                      
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Cước vận chuyển cơ bản:</Text>
                        <Text style={styles.breakdownVal}>
                          {formatVndPriceNumber(priceBreakdown.baseFareVnd)}
                        </Text>
                      </View>

                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          Cước quãng đường ({recommendedRoute ? recommendedRoute.distanceLabel : '15 km'}):
                        </Text>
                        <Text style={styles.breakdownVal}>
                          {formatVndPriceNumber(priceBreakdown.distanceFareVnd)}
                        </Text>
                      </View>

                      {priceBreakdown.stopSurchargeVnd > 0 ? (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>
                            Phụ phí điểm dừng ({formView.form.stops.length} điểm):
                          </Text>
                          <Text style={styles.breakdownVal}>
                            {formatVndPriceNumber(priceBreakdown.stopSurchargeVnd)}
                          </Text>
                        </View>
                      ) : null}

                      {priceBreakdown.loadingFeeVnd > 0 ? (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Phí hỗ trợ bốc xếp:</Text>
                          <Text style={styles.breakdownVal}>
                            {formatVndPriceNumber(priceBreakdown.loadingFeeVnd)}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.breakdownDivider} />

                      <View style={styles.breakdownTotalRow}>
                        <Text style={styles.breakdownTotalLabel}>TỔNG CỘNG:</Text>
                        <Text style={styles.breakdownTotalVal}>
                          Tổng: {recommendedRoute ? recommendedRoute.priceLabel : formatVndPriceNumber(priceBreakdown.totalVnd)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.estimateCalcTime}>
                      Tính lúc {formView.estimate.calculatedAtLabel}
                    </Text>
                  </View>
                ) : null}

                {/* Estimate outdated / expired / none */}
                {formView.estimate.kind !== 'ready' &&
                formView.estimate.kind !== 'loading' &&
                formView.estimate.kind !== 'error' ? (
                  <View style={styles.estimateBoxEmpty}>
                    <Text style={styles.estimateEmptyMessage}>
                      {formView.estimate.kind === 'expired'
                        ? 'Estimate đã hết hiệu lực; hãy tính lại giá và thời gian dự kiến.'
                        : formView.estimate.kind === 'outdated'
                          ? 'Lộ trình đã thay đổi; estimate cũ không còn dùng được.'
                          : 'Hoàn tất thông tin để tính giá và thời gian giao dự kiến.'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* 📋 BƯỚC 4: XÁC NHẬN ĐƠN & PHƯƠNG THỨC THANH TOÁN */}
          {/* ========================================================= */}
          {currentStep === 4 ? (
            <View style={styles.stepContainer}>
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.sectionIndex}>04</Text>
                  </View>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={styles.sectionLabel}>KIỂM TRA & XÁC NHẬN</Text>
                    <Text style={styles.sectionSublabel}>
                      Kiểm tra kỹ thông tin đơn hàng và chọn phương thức thanh toán
                    </Text>
                  </View>
                </View>

                {/* Thẻ 1: LỘ TRÌNH VẬN CHUYỂN */}
                <View style={styles.summarySectionCard}>
                  <View style={styles.summarySectionHeader}>
                    <View style={styles.summarySectionTitleRow}>
                      <IconRoute color="#0B1E42" size={16} />
                      <Text style={styles.summarySectionTitle}>LỘ TRÌNH VẬN CHUYỂN</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Sửa thông tin lộ trình"
                      onPress={() => setStep(1)}
                      style={styles.summaryEditPressable}
                    >
                      <Text style={styles.summaryEditLink}>Sửa</Text>
                    </Pressable>
                  </View>

                  {recommendedRoute ? (
                    <View style={styles.confirmRoutePill}>
                      <Text style={styles.confirmRoutePillText}>
                        Quãng đường: <Text style={styles.confirmRoutePillBold}>{recommendedRoute.distanceLabel}</Text> · Thời gian dự kiến: ~<Text style={styles.confirmRoutePillBold}>{Math.round(recommendedRoute.durationSeconds / 60)} phút</Text>
                      </Text>
                    </View>
                  ) : null}

                  {/* Vertical Timeline */}
                  <View style={styles.confirmTimelineBox}>
                    {/* Điểm lấy hàng */}
                    <View style={styles.confirmTimelineRow}>
                      <View style={styles.confirmTimelineColLeft}>
                        <View style={styles.confirmDotPickup}>
                          <View style={styles.confirmDotInnerPickup} />
                        </View>
                        <View style={styles.confirmTimelineLine} />
                      </View>
                      <View style={styles.confirmTimelineColRight}>
                        <Text style={styles.confirmStopRoleText}>Lấy hàng tại:</Text>
                        <Text style={styles.confirmAddressText}>{formView.form.pickup || '—'}</Text>
                        {formView.form.senderInfo ? (
                          <View style={styles.confirmContactBox}>
                            <Text style={styles.confirmContactText}>
                              Người gửi: {formView.form.senderInfo.name} ({formView.form.senderInfo.phone})
                            </Text>
                            {formView.form.senderInfo.note ? (
                              <Text style={styles.confirmNoteSubtext}>
                                Ghi chú: {formView.form.senderInfo.note}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Điểm dừng trung gian (nếu có) */}
                    {formView.form.stops
                      .filter((s) => s.value && s.value.trim().length > 0 && s.value !== 'Chưa chọn')
                      .map((stop, sIdx) => (
                        <View key={stop.id} style={styles.confirmTimelineRow}>
                          <View style={styles.confirmTimelineColLeft}>
                            <View style={styles.confirmDotStop}>
                              <Text style={styles.confirmDotStopText}>{sIdx + 1}</Text>
                            </View>
                            <View style={styles.confirmTimelineLine} />
                          </View>
                          <View style={styles.confirmTimelineColRight}>
                            <Text style={styles.confirmStopRoleTextStop}>Điểm dừng {sIdx + 1}:</Text>
                            <Text style={styles.confirmAddressText}>{stop.value}</Text>
                          </View>
                        </View>
                      ))}

                    {/* Điểm giao hàng */}
                    <View style={styles.confirmTimelineRow}>
                      <View style={styles.confirmTimelineColLeft}>
                        <View style={styles.confirmDotDropoff}>
                          <View style={styles.confirmDotInnerDropoff} />
                        </View>
                      </View>
                      <View style={styles.confirmTimelineColRight}>
                        <Text style={styles.confirmStopRoleTextDropoff}>Giao hàng đến:</Text>
                        <Text style={styles.confirmAddressText}>{formView.form.dropoff || '—'}</Text>
                        {formView.form.receiverInfo ? (
                          <View style={styles.confirmContactBox}>
                            <Text style={styles.confirmContactText}>
                              Người nhận: {formView.form.receiverInfo.name} ({formView.form.receiverInfo.phone})
                            </Text>
                            {formView.form.receiverInfo.note ? (
                              <Text style={styles.confirmNoteSubtext}>
                                Ghi chú: {formView.form.receiverInfo.note}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Thẻ 2: HÀNG HÓA & PHƯƠNG TIỆN */}
                <View style={styles.summarySectionCard}>
                  <View style={styles.summarySectionHeader}>
                    <View style={styles.summarySectionTitleRow}>
                      <IconOrders color="#0B1E42" size={16} />
                      <Text style={styles.summarySectionTitle}>HÀNG HÓA & PHƯƠNG TIỆN</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Sửa hàng hóa và phương tiện"
                      onPress={() => setStep(2)}
                      style={styles.summaryEditPressable}
                    >
                      <Text style={styles.summaryEditLink}>Sửa</Text>
                    </Pressable>
                  </View>

                  {/* Thẻ xe đã chọn */}
                  <View style={styles.confirmVehicleCard}>
                    <View style={styles.confirmVehicleIconBox}>
                      {selectedVehicle?.renderIcon?.(true)}
                    </View>
                    <View style={styles.confirmVehicleInfoCol}>
                      <View style={styles.confirmVehicleHeaderRow}>
                        <Text style={styles.confirmVehicleName}>{selectedVehicle?.label}</Text>
                        <View style={styles.confirmVehicleBadge}>
                          <Text style={styles.confirmVehicleBadgeText}>{selectedVehicle?.maxWeight}</Text>
                        </View>
                      </View>
                      <Text style={styles.confirmVehicleDesc}>{selectedVehicle?.desc}</Text>
                    </View>
                  </View>

                  {/* Thông tin chi tiết kiện hàng */}
                  <View style={styles.confirmCargoDetailsBox}>
                    <View style={styles.confirmCargoNameRow}>
                      <Text style={styles.confirmCargoName}>
                        {formView.form.cargoName || 'Hàng tiêu chuẩn'}
                      </Text>
                      {formView.form.cargoCategory ? (
                        <View style={styles.confirmCategoryPill}>
                          <Text style={styles.confirmCategoryPillText}>{formView.form.cargoCategory}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Grid 3 thông số: Khối lượng, Kích thước, Thể tích */}
                    <View style={styles.confirmSpecsGrid}>
                      <View style={styles.confirmSpecItem}>
                        <Text style={styles.confirmSpecLabel}>Khối lượng</Text>
                        <Text style={styles.confirmSpecValue}>
                          {formView.form.cargoWeight ? `${formView.form.cargoWeight} kg` : '—'}
                        </Text>
                      </View>

                      <View style={styles.confirmSpecItemDivider} />

                      <View style={styles.confirmSpecItem}>
                        <Text style={styles.confirmSpecLabel}>Kích thước</Text>
                        <Text style={styles.confirmSpecValue}>
                          {formView.form.cargoDimensions?.length
                            ? `${formView.form.cargoDimensions.length}×${formView.form.cargoDimensions.width}×${formView.form.cargoDimensions.height} cm`
                            : 'Tiêu chuẩn'}
                        </Text>
                      </View>

                      <View style={styles.confirmSpecItemDivider} />

                      <View style={styles.confirmSpecItem}>
                        <Text style={styles.confirmSpecLabel}>Thể tích</Text>
                        <Text style={styles.confirmSpecValue}>
                          {calculatedVolume ? `~${calculatedVolume} m³` : 'Tiêu chuẩn'}
                        </Text>
                      </View>
                    </View>

                    {/* Dịch vụ bốc xếp */}
                    <View style={styles.confirmExtraRow}>
                      <Text style={styles.confirmExtraLabel}>Bốc xếp hai đầu:</Text>
                      <Text
                        style={[
                          styles.confirmExtraValue,
                          formView.form.requiresLoadingSupport ? styles.confirmExtraValueHighlight : null,
                        ]}
                      >
                        {formView.form.requiresLoadingSupport ? 'Có hỗ trợ (+20.000 ₫)' : 'Không yêu cầu'}
                      </Text>
                    </View>

                    {/* Ghi chú hàng hóa */}
                    {formView.form.cargoNote ? (
                      <View style={styles.confirmExtraRow}>
                        <Text style={styles.confirmExtraLabel}>Ghi chú hàng hóa:</Text>
                        <Text style={styles.confirmExtraValue}>{formView.form.cargoNote}</Text>
                      </View>
                    ) : null}

                    {/* Ảnh hàng hóa đính kèm (nếu có) */}
                    {formView.form.cargoImageUri ? (
                      <View style={styles.confirmPhotoBox}>
                        <Image
                          accessibilityLabel="Ảnh hàng hóa đã chụp"
                          source={{ uri: formView.form.cargoImageUri }}
                          style={styles.confirmPhotoThumbnail}
                        />
                        <View style={styles.confirmPhotoInfoCol}>
                          <View style={styles.confirmPhotoBadgeRow}>
                            <IconCamera color="#0B1E42" size={14} />
                            <Text style={styles.confirmPhotoBadgeText}>Ảnh chụp thực tế</Text>
                          </View>
                          <Text style={styles.confirmPhotoSubtext}>
                            Đã đính kèm ảnh kiện hàng để tài xế dễ dàng nhận diện khi lấy hàng
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Thẻ 3: CƯỚC PHÍ THANH TOÁN */}
                <View style={styles.summarySectionCard}>
                  <View style={styles.summarySectionHeader}>
                    <View style={styles.summarySectionTitleRow}>
                      <IconPaymentConvenient color="#0B1E42" size={16} />
                      <Text style={styles.summarySectionTitle}>CƯỚC PHÍ THANH TOÁN</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Xem chi tiết giá"
                      onPress={() => setStep(3)}
                      style={styles.summaryEditPressable}
                    >
                      <Text style={styles.summaryEditLink}>Chi tiết</Text>
                    </Pressable>
                  </View>

                  <View style={styles.confirmInvoiceTable}>
                    <View style={styles.confirmInvoiceRow}>
                      <Text style={styles.confirmInvoiceItemLabel}>Cước vận chuyển cơ bản</Text>
                      <Text style={styles.confirmInvoiceItemVal}>
                        {formatVndPriceNumber(priceBreakdown.baseFareVnd)}
                      </Text>
                    </View>

                    <View style={styles.confirmInvoiceRow}>
                      <Text style={styles.confirmInvoiceItemLabel}>
                        Cước quãng đường ({recommendedRoute?.distanceLabel || 'Thực tế'})
                      </Text>
                      <Text style={styles.confirmInvoiceItemVal}>
                        {formatVndPriceNumber(priceBreakdown.distanceFareVnd)}
                      </Text>
                    </View>

                    {priceBreakdown.stopSurchargeVnd > 0 ? (
                      <View style={styles.confirmInvoiceRow}>
                        <Text style={styles.confirmInvoiceItemLabel}>
                          Phụ phí {formView.form.stops.length} điểm dừng (+25.000 ₫/điểm)
                        </Text>
                        <Text style={styles.confirmInvoiceItemVal}>
                          {formatVndPriceNumber(priceBreakdown.stopSurchargeVnd)}
                        </Text>
                      </View>
                    ) : null}

                    {priceBreakdown.loadingFeeVnd > 0 ? (
                      <View style={styles.confirmInvoiceRow}>
                        <Text style={styles.confirmInvoiceItemLabel}>Phí bốc xếp hai đầu</Text>
                        <Text style={styles.confirmInvoiceItemVal}>
                          {formatVndPriceNumber(priceBreakdown.loadingFeeVnd)}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.summaryDividerDashed} />

                    <View style={styles.confirmTotalRow}>
                      <View>
                        <Text style={styles.confirmTotalLabel}>Tổng thanh toán:</Text>
                        <Text style={styles.confirmTotalSubtext}>Đã bao gồm thuế GTGT & bảo hiểm</Text>
                      </View>
                      <Text style={styles.confirmTotalBigPrice}>
                        {recommendedRoute ? recommendedRoute.priceLabel : formatVndPriceNumber(priceBreakdown.totalVnd)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Thẻ 4: PHƯƠNG THỨC THANH TOÁN */}
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentSectionTitle}>PHƯƠNG THỨC THANH TOÁN</Text>
                  <View style={styles.paymentOptionsGroup}>
                    <Pressable
                      accessibilityLabel="Thanh toán qua VietQR"
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: formView.form.paymentMethod !== 'CASH',
                      }}
                      onPress={() => onSelectPaymentMethod?.('VIETQR')}
                      style={[
                        styles.paymentOptionCard,
                        formView.form.paymentMethod !== 'CASH' && styles.paymentOptionSelected,
                      ]}
                    >
                      <View style={styles.paymentRadioDotWrap}>
                        {formView.form.paymentMethod !== 'CASH' ? (
                          <View style={styles.radioDot} />
                        ) : null}
                      </View>
                      <View style={styles.paymentIconBox}>
                        <IconQrPayment color="#0B1E42" size={20} />
                      </View>
                      <View style={styles.paymentTextCol}>
                        <View style={styles.paymentTitleRow}>
                          <Text style={styles.paymentOptionTitle}>VietQR / Chuyển khoản ngân hàng</Text>
                          <View style={styles.paymentRecommendBadge}>
                            <Text style={styles.paymentRecommendBadgeText}>Khuyên dùng</Text>
                          </View>
                        </View>
                        <Text style={styles.paymentOptionSubtitle}>
                          Quét mã QR thanh toán nhanh chóng, an toàn qua app ngân hàng
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Thanh toán Tiền mặt"
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: formView.form.paymentMethod === 'CASH',
                      }}
                      onPress={() => onSelectPaymentMethod?.('CASH')}
                      style={[
                        styles.paymentOptionCard,
                        formView.form.paymentMethod === 'CASH' && styles.paymentOptionSelected,
                      ]}
                    >
                      <View style={styles.paymentRadioDotWrap}>
                        {formView.form.paymentMethod === 'CASH' ? (
                          <View style={styles.radioDot} />
                        ) : null}
                      </View>
                      <View style={styles.paymentIconBox}>
                        <IconWallet color="#64748B" size={20} />
                      </View>
                      <View style={styles.paymentTextCol}>
                        <Text style={styles.paymentOptionTitle}>Tiền mặt (COD)</Text>
                        <Text style={styles.paymentOptionSubtitle}>
                          Thanh toán trực tiếp cho tài xế khi giao nhận hàng thành công
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                {/* Huy hiệu bảo hiểm LEOPARD */}
                <View style={styles.confirmTrustCard}>
                  <View style={styles.confirmTrustIconBox}>
                    <IconSecurityShield color="#16A34A" size={20} />
                  </View>
                  <View style={styles.confirmTrustTextCol}>
                    <Text style={styles.confirmTrustTitle}>Bảo hiểm vận chuyển LEOPARD</Text>
                    <Text style={styles.confirmTrustDesc}>
                      Kiện hàng được bảo hiểm toàn diện, cam kết đền bù 100% giá trị nếu xảy ra sự cố trong quá trình giao nhận.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* 🚀 BƯỚC 5 / MÀN HÌNH CHỜ TÀI XẾ NHẬN ĐƠN (RADAR MATCHING) */}
          {/* ========================================================= */}
          {currentStep === 5 ? (
            <View style={styles.findingDriverScreenCard}>
              {driverMatched ? (
                /* 🎉 Khi tài xế đã nhận đơn */
                <View style={styles.driverMatchedCard}>
                  <View style={styles.driverMatchedBadgeRow}>
                    <View style={styles.matchedPulseDot} />
                    <Text style={styles.driverMatchedBadgeText}>TÀI XẾ ĐÃ NHẬN CHUYẾN</Text>
                  </View>

                  <View style={styles.driverMatchedProfileRow}>
                    <View style={styles.driverMatchedAvatarBox}>
                      <Text style={styles.driverMatchedAvatarText}>
                        {driverMatched.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.driverMatchedInfoCol}>
                      <Text style={styles.driverMatchedName}>{driverMatched.name}</Text>
                      <Text style={styles.driverMatchedVehicle}>
                        Biển số: <Text style={styles.driverPlateText}>{driverMatched.vehiclePlate}</Text> · ★ 4.9
                      </Text>
                      <Text style={styles.driverMatchedEta}>
                        Cách bạn {driverMatched.distanceLabel} · Đến trong ~{driverMatched.etaMinutes} phút
                      </Text>
                    </View>
                  </View>

                  <Button
                    label="Theo dõi hành trình tài xế ➔"
                    onPress={onViewCreatedOrder || onBack}
                    size="driver-primary"
                    variant="primary"
                  />
                </View>
              ) : (
                /* 📡 Radar tìm kiếm tài xế */
                <View style={styles.radarSectionWrapper}>
                  {/* Payment Status Pill */}
                  <View
                    style={[
                      styles.matchingPaymentBadge,
                      formView.form.paymentMethod === 'CASH'
                        ? styles.matchingPaymentBadgeCash
                        : styles.matchingPaymentBadgeVietQR,
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchingPaymentBadgeText,
                        formView.form.paymentMethod === 'CASH'
                          ? styles.matchingPaymentBadgeTextCash
                          : styles.matchingPaymentBadgeTextVietQR,
                      ]}
                    >
                      {formView.form.paymentMethod === 'CASH'
                        ? '💵 Thanh toán tiền mặt khi giao (COD)'
                        : '✓ Đã xác nhận thanh toán qua VietQR'}
                    </Text>
                  </View>

                  <Text style={styles.findingDriverTitle}>Đang tìm tài xế gần bạn nhất...</Text>
                  <Text style={styles.findingDriverSubtitle}>
                    Hệ thống LEOPARD đang phát tín hiệu điều phối tới các tài xế trong khu vực lân cận
                  </Text>

                  {/* Animated Radar Container */}
                  <View style={styles.radarContainer}>
                    <Animated.View
                      style={[
                        styles.radarPulseWave,
                        {
                          transform: [{ scale: radarScale }],
                          opacity: radarOpacity,
                        },
                      ]}
                    />
                    <View style={styles.radarOuterRing}>
                      <View style={styles.radarMidRing}>
                        <View style={styles.radarCenterDot}>
                          <IconSpeedTruck color="#FFFFFF" size={24} />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Active driver counter & Search timer */}
                  <View style={styles.matchingInfoPillRow}>
                    <View style={styles.activeDriverPill}>
                      <View style={styles.greenPulseDot} />
                      <Text style={styles.activeDriverPillText}>
                        3 tài xế đang hoạt động gần bạn (≤ 2.5 km)
                      </Text>
                    </View>

                    <View style={styles.searchTimerBox}>
                      <Text style={styles.searchTimerLabel}>Thời gian tìm kiếm:</Text>
                      <Text style={styles.searchTimerValue}>{searchTimeFormatted}</Text>
                      <Text style={styles.searchTimerEta}>· Dự kiến nhận đơn ~1 phút</Text>
                    </View>
                  </View>

                  {/* Order Mini-Manifest Summary */}
                  <View style={styles.matchingManifestCard}>
                    <View style={styles.matchingOrderCodeRow}>
                      <Text style={styles.matchingOrderCodeLabel}>MÃ ĐƠN HÀNG</Text>
                      <Text style={styles.matchingOrderCodeVal}>
                        {formView.form.createdOrderReference || '#LP-2026-00123'}
                      </Text>
                    </View>

                    <View style={styles.matchingManifestDivider} />

                    <View style={styles.matchingManifestRouteCol}>
                      <View style={styles.matchingManifestStopRow}>
                        <View style={styles.pickupDotSmall} />
                        <Text numberOfLines={1} style={styles.matchingManifestStopText}>
                          {formView.form.pickup || 'Điểm lấy hàng'}
                        </Text>
                      </View>
                      <View style={styles.matchingManifestLineVertical} />
                      <View style={styles.matchingManifestStopRow}>
                        <View style={styles.dropoffDotSmall} />
                        <Text numberOfLines={1} style={styles.matchingManifestStopText}>
                          {formView.form.dropoff || 'Điểm giao hàng'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.matchingManifestDivider} />

                    <View style={styles.matchingManifestBottomRow}>
                      <Text style={styles.matchingManifestCargo}>
                        {selectedVehicle?.label} · {formView.form.cargoWeight ? `${formView.form.cargoWeight} kg` : 'Hàng tiêu chuẩn'}
                      </Text>
                      <Text style={styles.matchingManifestPrice}>
                        {recommendedRoute ? recommendedRoute.priceLabel : formatVndPriceNumber(priceBreakdown.totalVnd)}
                      </Text>
                    </View>
                  </View>

                  {/* Demo/Pilot simulation button to simulate instant driver match */}
                  <Pressable
                    accessibilityLabel="Mô phỏng tài xế nhận chuyến"
                    accessibilityRole="button"
                    onPress={handleSimulateDriverMatch}
                    style={styles.demoSimulateMatchBtn}
                  >
                    <Text style={styles.demoSimulateMatchText}>
                      ⚡ [Demo/Pilot] Mô phỏng tài xế nhận chuyến ngay
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal MapAddressPickerModal xác nhận người gửi / người nhận */}
      <MapAddressPickerModal
        defaultFallbackAddress="Kho VLXD Minh Khang, Tân Phú, TP. Hồ Chí Minh"
        initialAddress={
          mapPickerTarget === 'pickup'
            ? formView.form.pickup
            : formView.form.dropoff
        }
        loggedInCustomer={currentCustomer}
        onClose={handleCloseMapModal}
        onConfirm={handleConfirmModal}
        target={mapPickerTarget || 'pickup'}
        userName={
          mapPickerTarget === 'pickup'
            ? formView.form.senderInfo?.name || currentCustomer?.name
            : formView.form.receiverInfo?.name
        }
        userPhone={
          mapPickerTarget === 'pickup'
            ? formView.form.senderInfo?.phone || currentCustomer?.phone
            : formView.form.receiverInfo?.phone
        }
        vietmapApiKey={process.env.EXPO_PUBLIC_VIETMAP_API_KEY}
        visible={mapPickerTarget !== null}
      />

      {/* ⚠️ Cảnh báo rời trang khi đang tạo đơn */}
      <Modal animationType="fade" transparent visible={showLeaveModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveIconBox}>
              <IconWarningShield color="#D97706" size={32} />
            </View>
            <Text style={styles.leaveModalTitle}>Rời khỏi trang tạo đơn?</Text>
            <Text style={styles.leaveModalDesc}>
              Thông tin lộ trình và hàng hóa bạn đã nhập sẽ không được lưu lại.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                accessibilityLabel="Ở lại tiếp tục tạo đơn"
                accessibilityRole="button"
                onPress={() => setShowLeaveModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnStay,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.modalBtnStayText}>Ở lại</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Xác nhận rời khỏi trang"
                accessibilityRole="button"
                onPress={() => {
                  setShowLeaveModal(false);
                  onBack?.();
                }}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnLeave,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.modalBtnLeaveText}>Rời đi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Thanh toán VietQR */}
      <VietQRPaymentModal
        amount={priceBreakdown.totalVnd}
        amountLabel={
          recommendedRoute
            ? recommendedRoute.priceLabel
            : formatVndPriceNumber(priceBreakdown.totalVnd)
        }
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          setStep(5);
        }}
        orderReference={formView.form.createdOrderReference || 'LP260905001'}
        qrPayload={createdPayment?.qrPayload}
        visible={showPaymentModal}
      />

      {/* Modal Xác nhận hủy tìm kiếm */}
      <Modal animationType="fade" transparent visible={showCancelSearchModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveIconBox}>
              <IconWarningShield color="#DC2626" size={32} />
            </View>
            <Text style={styles.leaveModalTitle}>Hủy tìm kiếm tài xế?</Text>
            <Text style={styles.leaveModalDesc}>
              Bạn có chắc chắn muốn hủy yêu cầu đặt xe này không? Yêu cầu sẽ ngừng phát tín hiệu tới các tài xế lân cận.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                accessibilityLabel="Tiếp tục tìm xe"
                accessibilityRole="button"
                onPress={() => setShowCancelSearchModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnStay,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.modalBtnStayText}>Tiếp tục tìm</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Xác nhận hủy tìm kiếm"
                accessibilityRole="button"
                onPress={() => {
                  setShowCancelSearchModal(false);
                  onCancelOrder?.();
                  setStep(4);
                }}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnLeave,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.modalBtnLeaveText}>Xác nhận hủy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance,
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 56,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepCircleActive: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  stepCircleCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepCircleInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  stepCircleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },
  stepCircleTextCompleted: {
    color: '#FFFFFF',
  },
  stepCircleTextInactive: {
    color: '#64748B',
  },
  stepTitle: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  stepTitleActive: {
    color: '#0B1E42',
    fontWeight: '700',
  },
  stepTitleCompleted: {
    color: '#16A34A',
    fontWeight: '600',
  },
  stepTitleInactive: {
    color: '#94A3B8',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    marginHorizontal: 2,
  },
  stepConnectorFilled: {
    backgroundColor: '#16A34A',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0B1E42',
    borderRadius: 2,
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.xxs,
  },
  stepBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  stepBarActive: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
    borderWidth: 1.5,
  },
  stepBarCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stepDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B1E42',
  },
  stepDotCompleted: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepBarText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  stepBarTextActive: {
    color: '#061226',
    fontWeight: '800',
  },
  stepBarTextCompleted: {
    color: '#15803D',
    fontWeight: '600',
  },
  routeSummaryStrip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeSummaryContent: {
    flex: 1,
    gap: 4,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeSummaryDotOrigin: {
    color: '#0B1E42',
    fontSize: 12,
  },
  routeSummaryDotDest: {
    fontSize: 12,
  },
  routeSummarySquareDest: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    backgroundColor: '#EF4444',
  },
  routeSummaryText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  routeSummaryStopBadge: {
    backgroundColor: '#F0F4F9',
    color: '#061226',
    fontSize: 10.5,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  routeSummaryEditBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  routeSummaryEditText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  orderOverviewStrip: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  orderOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  orderOverviewIcon: {
    fontSize: 14,
  },
  orderOverviewText: {
    color: '#0C4A6E',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  orderOverviewEditLink: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  orderOverviewDivider: {
    height: 1,
    backgroundColor: '#F0F4F9',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionHeaderCol: {
    flex: 1,
    gap: 2,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 6,
  },
  sectionIndex: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionSublabel: {
    color: '#64748B',
    fontSize: 11.5,
  },
  interactiveMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  /* Unified Route Box y hệt Home */
  routeBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 10,
  },
  spineColumn: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pickupPinCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickupPinInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  spineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  stopPinCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPinText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
  },
  dropoffPinSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  inputsColumn: {
    flex: 1,
    gap: 8,
  },
  addStopInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 8,
    gap: 6,
    marginVertical: 2,
  },
  addStopInlinePlus: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
  },
  addStopInlineText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  inputsBlock: {
    gap: spacing.sm,
  },
  stopField: {
    gap: spacing.xs,
    backgroundColor: '#F8FAFC',
    padding: spacing.xs,
    borderRadius: 8,
  },
  removeStopBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeStopBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addStopPlus: {
    color: '#0B1E42',
    fontSize: 16,
    fontWeight: '700',
  },
  addStopBtnText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
    marginBottom: 4,
  },
  blueFieldContainer: {
    gap: 6,
  },
  blueFieldLabel: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  blueTextInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1.5,
    color: '#0F172A',
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  blueTextInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  blueTextArea: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  fieldErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  categorySection: {
    gap: 6,
  },
  categoryChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  categoryChipSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  categoryChipText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#0B1E42',
    fontWeight: '700',
  },
  customCategoryWrap: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    marginTop: 8,
    padding: 12,
  },
  customCategoryLabel: {
    color: '#061226',
    fontSize: 12.5,
    fontWeight: '600',
  },
  dimensionsSection: {
    gap: 6,
  },
  dimHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  volumeBadge: {
    backgroundColor: '#F0F4F9',
    borderColor: '#7DD3FC',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  volumeBadgeText: {
    color: '#061226',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dimHintText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dimPresetGroup: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dimPresetChip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  dimPresetChipActive: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  dimPresetChipTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  dimPresetChipTitleActive: {
    color: '#0B1E42',
  },
  dimPresetChipDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  dimPresetChipDescActive: {
    color: '#061226',
    fontWeight: '600',
  },
  dimensionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dimInputWrap: {
    flex: 1,
  },
  dimInputSublabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  dimInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  dimMultiply: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 11,
  },
  photoUploadSection: {
    gap: 6,
  },
  photoUploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    padding: 16,
    gap: 4,
  },
  photoCameraIcon: {
    fontSize: 26,
  },
  photoUploadTitle: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  photoUploadSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  photoMetaCol: {
    flex: 1,
    gap: 4,
  },
  photoSuccessText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '700',
  },
  photoRemoveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoRemoveBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingSupportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  loadingSupportInfo: {
    flex: 1,
    gap: 2,
  },
  loadingSupportTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingSupportDesc: {
    color: '#64748B',
    fontSize: 11.5,
  },
  vehicleGroup: {
    gap: spacing.sm,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  vehicleCardSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  vehicleIconBox: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  vehicleIconBoxSelected: {
    backgroundColor: '#F0F4F9',
  },
  vehicleInfo: {
    flex: 1,
    gap: 2,
  },
  vehicleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleTitleSelected: {
    color: '#0B1E42',
  },
  vehicleCapacityBadge: {
    color: '#061226',
    backgroundColor: '#F0F4F9',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleDesc: {
    color: '#64748B',
    fontSize: 12,
  },
  radioIndicator: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioIndicatorSelected: {
    borderColor: '#0B1E42',
  },
  radioDot: {
    backgroundColor: '#0B1E42',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optimalBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  optimalBadge: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optimalBadgeText: {
    color: '#854D0E',
    fontSize: 11.5,
    fontWeight: '700',
  },
  etaNoticeText: {
    color: '#061226',
    fontSize: 12,
    fontWeight: '600',
  },
  routeList: {
    gap: spacing.sm,
  },
  routeCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    padding: 16,
  },
  routeCardSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeSourcePill: {
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeSourcePillText: {
    color: '#061226',
    fontSize: 11,
    fontWeight: '700',
  },
  routeCardStopsBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  routeCardStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeCardStopDotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  routeCardStopDotStop: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCardStopDotNum: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
  },
  routeCardStopDotDropoff: {
    width: 10,
    height: 10,
    backgroundColor: '#DC2626',
    borderRadius: 2,
  },
  routeCardStopText: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  stopsBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stopsBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  recommendedTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recommendedTagText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '700',
  },
  congestionBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  congestionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  congestionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  estimateRowLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  estimatePrice: {
    color: '#0B1E42',
    fontSize: 26,
    fontWeight: '800',
  },
  metricsBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  estimateCalcTime: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  estimateContentReady: {
    gap: spacing.sm,
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  breakdownTitle: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  breakdownVal: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  breakdownTotalLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownTotalVal: {
    color: '#0B1E42',
    fontSize: 22,
    fontWeight: '900',
  },
  estimateBox: {
    borderRadius: radius.control,
    gap: spacing.xs,
    padding: 16,
  },
  estimateBoxLoading: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    gap: spacing.sm,
    padding: 16,
  },
  estimateBoxEmpty: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    padding: 16,
  },
  estimateEmptyMessage: {
    color: '#64748B',
    fontSize: 13.5,
    lineHeight: 19,
  },
  estimateBoxError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  estimateErrorTitle: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  estimateErrorMessage: {
    color: '#DC2626',
    fontSize: 13,
  },
  summarySectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  summarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summarySectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summarySectionTitle: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryEditPressable: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  summaryEditLink: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  summaryContentBlock: {
    gap: 4,
  },
  summaryAddressLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryAddressText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryContactSubtext: {
    color: '#061226',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryDividerDashed: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  summaryStopNote: {
    color: '#64748B',
    fontSize: 11.5,
    fontStyle: 'italic',
    marginTop: 2,
  },
  summaryLine: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryLineBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryTotalBigVal: {
    color: '#0B1E42',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryPriceNote: {
    color: '#94A3B8',
    fontSize: 11,
  },

  // --- Step 4 Timeline Styles ---
  confirmRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmRoutePillText: {
    color: '#061226',
    fontSize: 12,
  },
  confirmRoutePillBold: {
    fontWeight: '700',
    color: '#0C4A6E',
  },
  confirmTimelineBox: {
    marginTop: 4,
  },
  confirmTimelineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmTimelineColLeft: {
    alignItems: 'center',
    width: 20,
  },
  confirmDotPickup: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  confirmDotInnerPickup: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  confirmTimelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    minHeight: 32,
    marginVertical: 2,
  },
  confirmDotStop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  confirmDotStopText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  confirmDotDropoff: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  confirmDotInnerDropoff: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  confirmTimelineColRight: {
    flex: 1,
    paddingBottom: 14,
    gap: 2,
  },
  confirmStopRoleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.2,
  },
  confirmStopRoleTextStop: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.2,
  },
  confirmStopRoleTextDropoff: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  confirmAddressText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 19,
  },
  confirmContactBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 2,
  },
  confirmContactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#061226',
  },
  confirmNoteSubtext: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#64748B',
  },

  // --- Step 4 Vehicle & Cargo Styles ---
  confirmVehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  confirmVehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmVehicleInfoCol: {
    flex: 1,
    gap: 2,
  },
  confirmVehicleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmVehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmVehicleBadge: {
    backgroundColor: '#F0F4F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmVehicleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1E42',
  },
  confirmVehicleDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  confirmCargoDetailsBox: {
    gap: 8,
    marginTop: 4,
  },
  confirmCargoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  confirmCargoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmCategoryPill: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  confirmCategoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  confirmSpecsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  confirmSpecItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  confirmSpecLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  confirmSpecValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  confirmSpecItemDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  confirmExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  confirmExtraLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  confirmExtraValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  confirmExtraValueHighlight: {
    color: '#0B1E42',
    fontWeight: '700',
  },
  confirmPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
  },
  confirmPhotoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  confirmPhotoInfoCol: {
    flex: 1,
    gap: 2,
  },
  confirmPhotoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmPhotoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1E42',
  },
  confirmPhotoSubtext: {
    fontSize: 11,
    color: '#64748B',
  },

  // --- Step 4 Invoice & Price Styles ---
  confirmInvoiceTable: {
    gap: 6,
    marginTop: 4,
  },
  confirmInvoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmInvoiceItemLabel: {
    fontSize: 12.5,
    color: '#475569',
  },
  confirmInvoiceItemVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  confirmTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  confirmTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmTotalSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  confirmTotalBigPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1E42',
  },

  // --- Step 4 Payment Styles ---
  paymentSection: {
    gap: 8,
    marginTop: 4,
  },
  paymentSectionTitle: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentOptionsGroup: {
    gap: 8,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  paymentOptionSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  paymentRadioDotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextCol: {
    flex: 1,
    gap: 2,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  paymentRecommendBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  paymentRecommendBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  paymentOptionTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  paymentOptionSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
  },

  // --- Step 4 Trust Shield Card ---
  confirmTrustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  confirmTrustIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  confirmTrustTextCol: {
    flex: 1,
    gap: 2,
  },
  confirmTrustTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#166534',
  },
  confirmTrustDesc: {
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
  },
  findingDriverScreenCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    marginVertical: spacing.md,
  },
  radarSectionWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  matchingPaymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  matchingPaymentBadgeVietQR: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  matchingPaymentBadgeCash: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  matchingPaymentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchingPaymentBadgeTextVietQR: {
    color: '#15803D',
  },
  matchingPaymentBadgeTextCash: {
    color: '#B45309',
  },
  findingDriverTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  findingDriverSubtitle: {
    color: '#64748B',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    height: 140,
    width: 140,
  },
  radarPulseWave: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#0B1E42',
  },
  radarOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarMidRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenterDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B1E42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  matchingInfoPillRow: {
    alignItems: 'center',
    gap: 6,
  },
  activeDriverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeDriverPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  searchTimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchTimerLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  searchTimerValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0B1E42',
  },
  searchTimerEta: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  matchingManifestCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: '100%',
    gap: 8,
  },
  matchingOrderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchingOrderCodeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  matchingOrderCodeVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#061226',
  },
  matchingManifestDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  matchingManifestRouteCol: {
    gap: 2,
  },
  matchingManifestStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickupDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  dropoffDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  matchingManifestLineVertical: {
    width: 1.5,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginLeft: 3.25,
  },
  matchingManifestStopText: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  matchingManifestBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchingManifestCargo: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  matchingManifestPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1E42',
  },
  demoSimulateMatchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
  },
  demoSimulateMatchText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  driverMatchedCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  driverMatchedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchedPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  driverMatchedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  driverMatchedProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverMatchedAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMatchedAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  driverMatchedInfoCol: {
    flex: 1,
    gap: 2,
  },
  driverMatchedName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverMatchedVehicle: {
    fontSize: 12,
    color: '#475569',
  },
  driverPlateText: {
    fontWeight: '700',
    color: '#0B1E42',
  },
  driverMatchedEta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  notice: {
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeInfo: {
    backgroundColor: colors.info.background,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
  },
  noticeText: {
    ...typography.caption,
    color: colors.neutral.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
  },
  footerSingleBtn: {
    width: '100%',
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  footerBtnHalf: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  leaveModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  leaveIconBox: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  leaveModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  leaveModalDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnStay: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnStayText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnLeave: {
    backgroundColor: '#DC2626',
  },
  modalBtnLeaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
