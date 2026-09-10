import type { OrderStatus } from '@leopard/shared';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, leopardElevation, leopardPalette, leopardRadius, spacing, typography, Button, FloatingNavBar, type TabKey, BrandLoginLogo, IconBell, IconLocationPin, IconMessage, IconOrders, IconQrPayment, IconRoleDriver, IconSecurityShield, IconSpeedTruck, IconVehicle3Wheel, IconVehicleHeavyTruck, IconVehicleLightTruck, IconWallet, OrderSummary, RouteSpine, StatusBadge } from '@leopard/mobile-core';
import type { VehicleCategory } from '@leopard/mobile-core';
import { addressStore, type SavedAddress } from '../customer/addresses/address-store';
import { httpClient, sessionStore } from '@leopard/mobile-core';
import {
  MapAddressPickerModal,
  reverseGeocodeCoords,
  SavedAddressPickerModal,
} from './components';

import { HomePromoArtwork, type HomePromoSlide } from './HomePromoArtwork';
import { HomeServiceIllustration } from './HomeServiceIllustrations';

function formatVietnamesePhone(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+84')) {
    return '0' + trimmed.slice(3);
  }
  if (trimmed.startsWith('84') && trimmed.length > 9) {
    return '0' + trimmed.slice(2);
  }
  return trimmed;
}

export type ActiveShipment = Readonly<{
  orderId: string;
  status: OrderStatus;
  origin: string;
  destination: string;
  cargoNote?: string;
  driverName?: string;
  plate?: string;
  etaMinutes?: number;
}>;

export type RecentOrder = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  origin: string;
  destination: string;
  price?: string;
  updated?: string;
}>;

export type HomeDashboardScreenProps = Readonly<{
  userName?: string;
  userPhone?: string;
  smeName?: string;
  walletBalance?: string;
  unreadNotifications?: number;
  unreadMessages?: number;
  activeShipment?: ActiveShipment | null;
  recentOrders?: readonly RecentOrder[];
  defaultPickupLocation?: string;
  defaultPickupLabel?: string;
  savedAddresses?: readonly SavedAddress[];
  onSelectSavedAddress?: (address: SavedAddress) => void;
  onCreateOrder?: () => void;
  onOpenActiveOrder?: (orderId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onViewAllOrders?: () => void;
  onOpenNotifications?: () => void;
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onSwitchRole?: (role: 'CUSTOMER' | 'DRIVER') => void;
  onRegisterDriver?: () => void;
  onQuickBook?: (
    origin?: string,
    destination?: string,
    dropoffCoords?: { lat: number; lng: number },
  ) => void;
  onOpenSavedAddresses?: () => void;
  onNavigateTab?: (tab: TabKey) => void;
  onSelectVehicleAndBook?: (vehicleId: VehicleCategory) => void;
  onTopUpWallet?: () => void;
  onOpenQrScan?: () => void;
  showFloatingNavBar?: boolean;
}>;

/**
 * Resolves time-of-day classification based on local hour.
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'morning';
  }
  if (hours >= 12 && hours < 18) {
    return 'afternoon';
  }
  return 'evening';
}

/**
 * Clean textual greeting based on time of day (no emojis).
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const time = getTimeOfDay(date);
  if (time === 'morning') {
    return 'Chào buổi sáng';
  }
  if (time === 'afternoon') {
    return 'Chào buổi chiều';
  }
  return 'Chào buổi tối';
}

/**
 * Animated vector weather icon with rotating rays and breathing glow.
 */
export function AnimatedGreetingIcon({
  size = 20,
  timeOfDay,
}: {
  timeOfDay: TimeOfDay;
  size?: number;
}) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        duration: 14000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          toValue: 1.15,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          toValue: 1.0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinAnim, pulseAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (timeOfDay === 'morning') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Rotating sun rays */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: spinInterpolate }],
          }}
        >
          {Platform.OS === 'web' ? (
            <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
              <path
                d="M12 2v2.5M12 19.5v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
                stroke="#F59E0B"
                strokeLinecap="round"
                strokeWidth="2.2"
              />
            </svg>
          ) : (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.5,
                borderColor: '#FDE68A',
                borderStyle: 'dashed',
              }}
            />
          )}
        </Animated.View>
        {/* Breathing Center Sun with warm amber core */}
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: (size * 0.52) / 2,
            backgroundColor: '#F59E0B',
            borderWidth: 1.5,
            borderColor: '#FEF3C7',
          }}
        />
      </View>
    );
  }

  if (timeOfDay === 'afternoon') {
    return (
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulseAnim }],
        }}
      >
        {Platform.OS === 'web' ? (
          <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
            <circle cx="12" cy="8.5" fill="#F59E0B" r="4.5" />
            <path
              d="M6.5 17.5a4 4 0 0 1 7.8-1.2A3 3 0 0 1 19 18.5H6.5z"
              fill="#F0F4F9"
              stroke="#0B1E42"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        ) : (
          <View
            style={{
              width: size * 0.7,
              height: size * 0.7,
              borderRadius: (size * 0.7) / 2,
              backgroundColor: '#F59E0B',
            }}
          />
        )}
      </Animated.View>
    );
  }

  // Evening / Night
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pulseAnim }],
      }}
    >
      {Platform.OS === 'web' ? (
        <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="#0B1E42"
            stroke="#061226"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M16.5 4l.6 1.2 1.3.2-1 .9.3 1.3-1.2-.6-1.2.6.3-1.3-1-.9 1.3-.2L16.5 4z"
            fill="#FBBF24"
          />
        </svg>
      ) : (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: '#0B1E42',
          }}
        />
      )}
    </Animated.View>
  );
}

const PROMO_SLIDES: readonly HomePromoSlide[] = [
  { id: 'promo-1', kind: 'vehicle', eyebrow: 'XE CHO MỖI NHU CẦU', title: 'Đặt xe phù hợp với hàng', subtitle: 'Chọn phương tiện theo loại hàng và tải trọng.', action: 'Chọn xe' },
  { id: 'promo-2', kind: 'address', eyebrow: 'ĐẶT HÀNG THUẬN TIỆN', title: 'Lên đơn từ địa chỉ đã lưu', subtitle: 'Dùng lại điểm lấy và giao quen thuộc khi tạo đơn.', action: 'Tạo đơn mới' },
  { id: 'promo-3', kind: 'tracking', eyebrow: 'CHỦ ĐỘNG THEO DÕI', title: 'Theo dõi từng chặng giao', subtitle: 'Xem trạng thái và ETA dự kiến trong hành trình.', action: 'Bắt đầu gửi hàng' },
];

type QuickService = Readonly<{
  id: string;
  vehicleId?: VehicleCategory;
  name: string;
  label: string;
  tag: string;
  iconType: '3wheel' | 'light' | 'heavy' | 'express' | 'loading' | 'cod';
  accentColor: string;
  borderColor: string;
  surfaceColor: string;
  tagSurfaceColor: string;
}>;

const quickServices: readonly QuickService[] = [
  {
    id: '3_WHEEL_BIKE',
    vehicleId: '3_WHEEL_BIKE',
    label: 'Xe Ba Gác',
    name: 'Ba gác',
    tag: '< 500kg',
    iconType: '3wheel',
    accentColor: '#1D4ED8',
    borderColor: '#B9D5FF',
    surfaceColor: '#EAF3FF',
    tagSurfaceColor: '#DCEBFF',
  },
  {
    id: 'LIGHT_TRUCK',
    vehicleId: 'LIGHT_TRUCK',
    label: 'Xe Tải Nhẹ',
    name: 'Tải nhẹ',
    tag: '≤ 1.5 tấn',
    iconType: 'light',
    accentColor: '#047D95',
    borderColor: '#A8DFEA',
    surfaceColor: '#E8FAFD',
    tagSurfaceColor: '#D4F3F8',
  },
  {
    id: 'HEAVY_TRUCK',
    vehicleId: 'HEAVY_TRUCK',
    label: 'Xe Tải Nặng',
    name: 'Tải nặng',
    tag: '5–10 tấn',
    iconType: 'heavy',
    accentColor: '#334155',
    borderColor: '#C3CDDB',
    surfaceColor: '#EEF2F7',
    tagSurfaceColor: '#E1E8F0',
  },
  {
    id: 'EXPRESS',
    label: 'Giao Hỏa Tốc',
    name: 'Hỏa tốc',
    tag: 'Giao ưu tiên',
    iconType: 'express',
    accentColor: '#D97706',
    borderColor: '#F6C76D',
    surfaceColor: '#FFF5D8',
    tagSurfaceColor: '#FFE7A3',
  },
  {
    id: 'LOADING',
    label: 'Dịch Vụ Bốc Xếp',
    name: 'Bốc xếp',
    tag: 'Kèm phụ xe',
    iconType: 'loading',
    accentColor: '#C2410C',
    borderColor: '#FDBA8C',
    surfaceColor: '#FFF0E6',
    tagSurfaceColor: '#FED7BA',
  },
  {
    id: 'COD',
    label: 'Thu Hộ COD',
    name: 'Thu COD',
    tag: 'Thu hộ tiền hàng',
    iconType: 'cod',
    accentColor: '#13855F',
    borderColor: '#A7DCC8',
    surfaceColor: '#EAF8F1',
    tagSurfaceColor: '#D2F2E2',
  },
];

const DEFAULT_ACTIVE_SHIPMENT: ActiveShipment = {
  orderId: 'active-demo-1',
  status: 'IN_TRANSIT',
  origin: 'Kho Tân Bình',
  destination: 'KCN Tân Tạo',
  cargoNote: '1.2 tấn xi măng',
  driverName: 'Nguyễn Văn Hùng',
  plate: '59C-882.14',
  etaMinutes: 18,
};

const DEFAULT_RECENT_ORDERS: readonly RecentOrder[] = [
  {
    id: 'demo-2',
    reference: 'LP-240902',
    status: 'DELIVERED',
    origin: 'Quận 7',
    destination: 'Thủ Đức',
    price: '420.000 ₫',
    updated: 'Hôm qua',
  },
  {
    id: 'demo-3',
    reference: 'LP-240831',
    status: 'DELIVERED',
    origin: 'Bình Tân',
    destination: 'Long An',
    price: '650.000 ₫',
    updated: '31/08',
  },
];

function renderServiceIcon(type: QuickService['iconType']) {
  switch (type) {
    case '3wheel':
      return <IconVehicle3Wheel color="#0B1E42" size={44} />;
    case 'light':
      return <IconVehicleLightTruck color="#0B1E42" size={44} />;
    case 'heavy':
      return <IconVehicleHeavyTruck color="#0B1E42" size={44} />;
    case 'express':
      return <IconSpeedTruck color="#0B1E42" secondaryColor="#F0F4F9" size={44} strokeWidth={1.75} />;
    case 'loading':
      return <IconOrders color="#0B1E42" size={44} strokeWidth={1.75} />;
    case 'cod':
      return <IconSecurityShield color="#0B1E42" secondaryColor="#F0F4F9" size={44} strokeWidth={1.75} />;
    default:
      return <IconSpeedTruck color="#0B1E42" size={44} />;
  }
}

export function HomeDashboardScreen({
  activeShipment = DEFAULT_ACTIVE_SHIPMENT,
  defaultPickupLabel,
  defaultPickupLocation,
  onCreateOrder,
  onNavigateTab,
  onOpenActiveOrder,
  onOpenChat,
  onOpenNotifications,
  onOpenOrder,
  onOpenQrScan,
  onOpenSavedAddresses,
  onQuickBook,
  onRegisterDriver,
  onSelectSavedAddress,
  onSelectVehicleAndBook,
  onSwitchRole,
  onTopUpWallet,
  onViewAllOrders,
  recentOrders = DEFAULT_RECENT_ORDERS,
  savedAddresses,
  showFloatingNavBar = false,
  smeName = 'Cửa hàng VLXD Đại Phát',
  unreadMessages = 0,
  unreadNotifications = 3,
  userName = 'Anh Hoàng',
  userPhone,
  walletBalance = '1.850.000 ₫',
}: HomeDashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  const deliveredRecentOrders = useMemo(
    () => recentOrders.filter((order) => order.status === 'DELIVERED'),
    [recentOrders],
  );

  // Address initialization: prioritize prop -> addressStore.getDefaultAddress() -> fallback
  const initialSaved = addressStore.getDefaultAddress();
  const initialAddress =
    defaultPickupLocation ??
    initialSaved?.address ??
    'Kho Tân Bình, TP. Hồ Chí Minh';
  const initialLabel = defaultPickupLabel ?? initialSaved?.label ?? null;

  const [pickupText, setPickupText] = useState(initialAddress);
  const [pickupLabel, setPickupLabel] = useState<string | null>(initialLabel);
  const [dropoffText, setDropoffText] = useState('');
  const [focusedField, setFocusedField] = useState<'pickup' | 'dropoff' | null>(null);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [savedAddressModalTarget, setSavedAddressModalTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ name?: string; phone?: string } | null>(null);

  // Sync authenticated customer profile from /me
  useEffect(() => {
    let isMounted = true;
    async function loadCurrentCustomer() {
      try {
        if (sessionStore.isAuthenticated()) {
          const user = await httpClient.get<{ id: string; phone?: string | null; name?: string | null }>('/me');
          if (isMounted && user) {
            setLoggedInCustomer({
              name: user.name || undefined,
              phone: user.phone || undefined,
            });
          }
        }
      } catch {
        // Silently ignore if unauthenticated or network unavailable
      }
    }
    void loadCurrentCustomer();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenMapPicker = (target: 'pickup' | 'dropoff') => {
    setMapTarget(target);
    setShowMapPickerModal(true);
  };

  const handleConfirmMapLocation = (
    finalAddress: string,
    extra?: { coords?: { lat: number; lng: number } },
  ) => {
    if (mapTarget === 'pickup') {
      setPickupText(finalAddress);
      setPickupLabel(null);
      if (dropoffText.trim().length >= 3) {
        triggerNavigation(finalAddress, dropoffText);
      }
    } else {
      setDropoffText(finalAddress);
      if (pickupText.trim().length >= 3) {
        triggerNavigation(pickupText, finalAddress, extra?.coords);
      }
    }
    setShowMapPickerModal(false);
    setFocusedField(null);
  };

  // Keep pickup location synchronized if prop changes or addressStore updates
  useEffect(() => {
    if (defaultPickupLocation) {
      setPickupText(defaultPickupLocation);
      setPickupLabel(defaultPickupLabel ?? null);
    } else {
      const saved = addressStore.getDefaultAddress();
      if (saved?.address) {
        setPickupText(saved.address);
        setPickupLabel(saved.label || null);
      }
    }
  }, [defaultPickupLocation, defaultPickupLabel]);

  // Auto-detect current GPS location for pickup address if customer has no saved default address
  useEffect(() => {
    const saved = addressStore.getDefaultAddress();
    if (defaultPickupLocation || saved?.address) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
            if (resolved && resolved.trim().length > 0) {
              setPickupText(resolved);
              setPickupLabel('Vị trí hiện tại');
              addressStore.saveAddress({
                label: 'Vị trí hiện tại',
                address: resolved,
                category: 'OTHER',
                latitude: lat,
                longitude: lng,
                isDefault: true,
              });
              setAddressStoreVersion((v) => v + 1);
            }
          } catch {
            // Keep default fallback
          }
        },
        () => {
          // Permission denied or unavailable - keep fallback
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, [defaultPickupLocation]);

  // Dismiss dropdown when clicking or tapping outside on Web
  useEffect(() => {
    if (Platform.OS === 'web' && focusedField) {
      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (
          target.closest?.('[data-testid="cr-pickup-input"]') ||
          target.closest?.('[data-testid="cr-dropoff-input"]') ||
          target.closest?.('[data-testid="address-dropdown"]')
        ) {
          return;
        }
        setFocusedField(null);
      };
      const timer = setTimeout(() => {
        window.addEventListener('click', handleGlobalClick);
      }, 150);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('click', handleGlobalClick);
      };
    }
  }, [focusedField]);

  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedRef = React.useRef(false);
  const [quickTrackCode, setQuickTrackCode] = useState('');

  const triggerNavigation = (
    pickup: string,
    dropoff: string,
    dropoffCoords?: { lat: number; lng: number },
  ) => {
    if (hasNavigatedRef.current) return;
    if (!pickup.trim() || !dropoff.trim()) return;
    hasNavigatedRef.current = true;
    setIsAutoNavigating(true);
    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    navigationTimeoutRef.current = setTimeout(() => {
      if (onQuickBook) {
        if (dropoffCoords) {
          onQuickBook(pickup, dropoff, dropoffCoords);
        } else {
          onQuickBook(pickup, dropoff);
        }
      } else {
        onCreateOrder?.();
      }
      setTimeout(() => {
        setIsAutoNavigating(false);
        hasNavigatedRef.current = false;
      }, 1500);
    }, 400);
  };

  // Auto-navigate debounce when user types dropoff address
  useEffect(() => {
    if (
      focusedField === 'dropoff' &&
      pickupText.trim().length >= 3 &&
      dropoffText.trim().length >= 5 &&
      !hasNavigatedRef.current
    ) {
      const timer = setTimeout(() => {
        triggerNavigation(pickupText, dropoffText);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [dropoffText, pickupText, focusedField]);

  const [addressStoreVersion, setAddressStoreVersion] = useState(0);

  // List of saved addresses for quick switching
  const addressList = React.useMemo(
    () => savedAddresses ?? addressStore.getAddresses(),
    [savedAddresses, addressStoreVersion],
  );

  const [bannerWidth, setBannerWidth] = useState(() => {
    const windowWidth = Dimensions.get('window').width;
    return Math.max(280, windowWidth - 32);
  });
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const currentSlideIdxRef = React.useRef(activeBannerIdx);
  currentSlideIdxRef.current = activeBannerIdx;

  const goToSlide = React.useCallback(
    (targetIdx: number) => {
      const currentIdx = currentSlideIdxRef.current;
      if (currentIdx === targetIdx) return;

      slideAnim.stopAnimation();
      setActiveBannerIdx(targetIdx);

      // Khi lướt vòng tròn từ slide cuối sang slide đầu, trượt tiếp về phía trước qua clone rồi âm thầm reset về 0
      if (currentIdx === PROMO_SLIDES.length - 1 && targetIdx === 0) {
        Animated.timing(slideAnim, {
          duration: 750,
          easing: Easing.out(Easing.cubic),
          toValue: -PROMO_SLIDES.length * bannerWidth,
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (finished) {
            slideAnim.setValue(0);
          }
        });
      } else {
        Animated.timing(slideAnim, {
          duration: 750,
          easing: Easing.out(Easing.cubic),
          toValue: -targetIdx * bannerWidth,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      }
    },
    [bannerWidth, slideAnim],
  );

  // Auto-advance banner every 5 seconds forward in a loop (không lướt ngược lại)
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentSlideIdxRef.current + 1) % PROMO_SLIDES.length;
      goToSlide(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [goToSlide]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    onNavigateTab?.(key);
  };

  const handleDriverButtonPress = () => {
    if (onRegisterDriver) {
      onRegisterDriver();
    } else if (onSwitchRole) {
      onSwitchRole('DRIVER');
    }
  };

  const handleBookPress = () => {
    if (onQuickBook) {
      onQuickBook(pickupText, dropoffText);
    } else {
      onCreateOrder?.();
    }
  };

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const greeting = useMemo(() => getTimeOfDayGreeting(), []);
  const currentSlide = PROMO_SLIDES[activeBannerIdx];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brandPlate}><BrandLoginLogo height={28} /></View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={
                unreadMessages > 0
                  ? `Tin nhắn (${unreadMessages} chưa đọc)`
                  : 'Tin nhắn'
              }
              accessibilityRole="button"
              onPress={onOpenChat}
              style={styles.headerIconBtn}
            >
              <IconMessage color="#FFFFFF" size={18} />
              {unreadMessages > 0 ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{unreadMessages}</Text>
                </View>
              ) : null}
            </Pressable>

            {onOpenNotifications ? (
              <Pressable
                accessibilityLabel={`Thông báo (${unreadNotifications} chưa đọc)`}
                accessibilityRole="button"
                onPress={onOpenNotifications}
                style={styles.headerIconBtn}
              >
                <IconBell color="#FFFFFF" size={18} />
                {unreadNotifications > 0 ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{unreadNotifications}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.homeIntro}>
            <View pointerEvents="none" style={styles.homeIntroGlow} />
            <View pointerEvents="none" style={styles.homeIntroAccent} />
            <Text style={styles.homeGreeting}>{greeting}{userName ? ', ' + userName : ''}</Text>
            <Text accessibilityRole="header" style={styles.homeTitle}>Bạn muốn giao hàng đi đâu?</Text>
          </View>

          <View style={styles.mainSheet}>
            {/* Thẻ ẩn dữ liệu danh tính người dùng phục vụ accessibility và test suite */}
            <View pointerEvents="none" style={styles.srOnly}>
              {smeName ? <Text>{smeName}</Text> : null}
            </View>

            {/* 2. Quick Route Booking Card (Phần vị trí: Dispatch Dock) */}
            <View style={styles.routeBookingCard} testID="home-booking">
              <View style={styles.routeBookingHeader}>
                <View style={styles.routeBadgeRow}>
                  <View style={styles.liveIndicatorDot} />
                  <Text style={styles.routeBookingTitle}>ĐẶT XE GIAO HÀNG NHANH</Text>
                </View>
              </View>

              {/* Unified Route Box: Trục hành trình thẳng đứng liền mạch */}
              <View style={styles.routeBox}>
                <View style={styles.spineColumn}>
                  <View style={styles.pickupPinCircle}>
                    <View style={styles.pickupPinInner} />
                  </View>
                  <View style={styles.spineLine} />
                  <View style={styles.dropoffPinSquare} />
                </View>

                <View style={styles.inputsColumn}>
                  {/* Điểm lấy hàng */}
                  <View
                    style={[
                      styles.routeInputWrapper,
                      focusedField === 'pickup' && styles.routeInputWrapperFocused,
                    ]}
                  >
                    <View style={styles.inputInnerColumn}>
                      <View style={styles.locationFieldHeader}>
                        <Text style={styles.locationFieldLabel}>ĐIỂM LẤY HÀNG</Text>
                        {pickupLabel ? (
                          <View style={styles.pickupLabelBadge}>
                            <Text style={styles.pickupLabelBadgeText}>{pickupLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                      <TextInput
                        accessibilityLabel="Địa điểm lấy hàng"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(t) => {
                          setPickupText(t);
                          if (pickupLabel) setPickupLabel(null);
                        }}
                        onFocus={() => setFocusedField('pickup')}
                        placeholder="Nhập địa chỉ lấy hàng..."
                        placeholderTextColor="#94A3B8"
                        style={styles.locationTextInput}
                        testID="cr-pickup-input"
                        value={pickupText}
                      />
                    </View>
                    {pickupText.length > 0 ? (
                      <Pressable
                        accessibilityLabel="Xóa điểm lấy hàng"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => {
                          setPickupText('');
                          setPickupLabel(null);
                        }}
                        style={styles.clearBtn}
                      >
                        <Text style={styles.clearBtnText}>✕</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityLabel="Mở bản đồ chọn điểm lấy"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => handleOpenMapPicker('pickup')}
                      style={styles.inputMapPinBtn}
                    >
                      <IconLocationPin color="#0B1E42" size={16} />
                    </Pressable>
                  </View>

                  <View style={styles.inputDivider} />

                  {/* Điểm giao hàng */}
                  <View
                    style={[
                      styles.routeInputWrapper,
                      focusedField === 'dropoff' && styles.routeInputWrapperFocused,
                    ]}
                  >
                    <View style={styles.inputInnerColumn}>
                      <Text style={styles.locationFieldLabel}>ĐIỂM GIAO HÀNG</Text>
                      <TextInput
                        accessibilityLabel="Địa điểm giao hàng"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setDropoffText}
                        onFocus={() => setFocusedField('dropoff')}
                        onSubmitEditing={() => {
                          if (pickupText.trim().length >= 3 && dropoffText.trim().length >= 3) {
                            triggerNavigation(pickupText, dropoffText);
                          }
                        }}
                        placeholder="Bạn muốn giao hàng đến đâu?..."
                        placeholderTextColor="#94A3B8"
                        style={styles.locationTextInput}
                        testID="cr-dropoff-input"
                        value={dropoffText}
                      />
                    </View>
                    {dropoffText.length > 0 ? (
                      <Pressable
                        accessibilityLabel="Xóa điểm giao hàng"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => setDropoffText('')}
                        style={styles.clearBtn}
                      >
                        <Text style={styles.clearBtnText}>✕</Text>
                      </Pressable>
                    ) : null}

                    {pickupText.trim().length >= 3 && dropoffText.trim().length >= 3 ? (
                      <Pressable
                        accessibilityLabel="Chuyển sang tạo đơn ngay"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => triggerNavigation(pickupText, dropoffText)}
                        style={styles.fastForwardBtn}
                        testID="quick-book-submit-btn"
                      >
                        <Text style={styles.fastForwardBtnText}>→</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityLabel="Mở bản đồ chọn điểm giao"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => handleOpenMapPicker('dropoff')}
                      style={styles.inputMapPinBtn}
                    >
                      <IconLocationPin color="#DC2626" size={16} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Dropdown Gợi ý & Xác nhận vị trí khi đang focus vào ô nhập */}
              {focusedField ? (
                <View style={styles.addressDropdownWrap} testID="address-dropdown">
                  <View style={styles.dropdownHeaderRow}>
                    <Text style={styles.dropdownHeaderTitle}>
                      {focusedField === 'pickup' ? 'ĐIỂM LẤY HÀNG' : 'ĐIỂM GIAO HÀNG'} · GỢI Ý
                    </Text>
                    <Pressable
                      accessibilityLabel="Đóng gợi ý"
                      hitSlop={8}
                      onPress={() => setFocusedField(null)}
                      style={styles.dropdownCloseBtn}
                    >
                      <Text style={styles.dropdownCloseBtnText}>✕</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    accessibilityLabel="Xác nhận vị trí trên bản đồ"
                    accessibilityRole="button"
                    onPress={() => {
                      const target = focusedField || 'pickup';
                      setFocusedField(null);
                      handleOpenMapPicker(target);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownActionItem,
                      pressed && styles.dropdownActionItemPressed,
                    ]}
                  >
                    <View style={styles.dropdownMapIconBg}>
                      <IconLocationPin color="#0B1E42" size={16} />
                    </View>
                    <View style={styles.dropdownActionContent}>
                      <Text style={styles.dropdownActionTitle}>
                        Xác nhận vị trí trên bản đồ
                      </Text>
                      <Text style={styles.dropdownActionDesc}>
                        Ghim vị trí chính xác trực quan trên bản đồ
                      </Text>
                    </View>
                    <Text style={styles.dropdownChevron}>›</Text>
                  </Pressable>

                  <View style={styles.dropdownDivider} />

                  <Pressable
                    accessibilityLabel="Chọn từ sổ địa chỉ"
                    accessibilityRole="button"
                    onPress={() => {
                      const target = focusedField || 'pickup';
                      setSavedAddressModalTarget(target);
                      setFocusedField(null);
                      setShowSavedAddressModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownActionItem,
                      pressed && styles.dropdownActionItemPressed,
                    ]}
                  >
                    <View style={styles.dropdownSavedIconBg}>
                      <IconLocationPin color="#0B1E42" size={16} />
                    </View>
                    <View style={styles.dropdownActionContent}>
                      <Text style={styles.dropdownActionTitle}>
                        Chọn từ sổ địa chỉ
                      </Text>
                      <Text style={styles.dropdownActionDesc}>
                        Kho hàng, nhà riêng & điểm giao đã lưu
                      </Text>
                    </View>
                    <Text style={styles.dropdownChevron}>›</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Status banner when auto-navigating */}
              {isAutoNavigating ? (
                <View style={styles.autoNavigatingBanner}>
                  <View style={styles.liveIndicatorDotActive} />
                  <Text style={styles.autoNavigatingText}>
                    Đã xác định lộ trình · Đang chuyển tiếp...
                  </Text>
                </View>
              ) : null}
            </View>

          {/* 7. Live Tracking Activity Capsule (Active Shipment / Quick Tracking) */}
          <View style={styles.section} testID="home-active-shipments">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithBadge}>
                {activeShipment ? <View style={styles.liveIndicatorDotActive} /> : null}
                <Text style={styles.sectionLabel}>ĐANG VẬN CHUYỂN</Text>
              </View>
              {activeShipment ? (
                <View style={styles.liveTagBadge}>
                  <Text style={styles.liveTagText}>Trực tiếp</Text>
                </View>
              ) : null}
            </View>

            {activeShipment ? (
              <Pressable
                accessibilityHint="Mở theo dõi lộ trình"
                accessibilityLabel={`Chuyến đang vận chuyển từ ${activeShipment.origin} đến ${activeShipment.destination}`}
                accessibilityRole="button"
                onPress={() => onOpenActiveOrder?.(activeShipment.orderId)}
                style={({ pressed }) => [styles.activeCard, pressed ? styles.pressed : null]}
              >
                <View style={styles.activeTop}>
                  <StatusBadge domain="order" status={activeShipment.status} />
                  {activeShipment.etaMinutes !== undefined ? (
                    <View style={styles.etaPill}>
                      <Text style={styles.etaText}>ETA dự kiến {activeShipment.etaMinutes} phút</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.activeRouteContainer}>
                  <View style={styles.activeRouteWell}>
                    <RouteSpine
                      destination={{ id: 'active-dest', label: activeShipment.destination }}
                      origin={{ id: 'active-origin', label: activeShipment.origin }}
                      stops={[]}
                    />
                  </View>

                </View>

                <View style={styles.activeMeta}>
                  <View style={styles.activeDriverBox}>
                    <View style={styles.activeDriverIconBox}>
                      <IconRoleDriver color="#0B1E42" secondaryColor="#F0F4F9" size={18} />
                    </View>
                    <Text numberOfLines={1} style={styles.driverText}>
                      {activeShipment.cargoNote ? `${activeShipment.cargoNote} · ` : ''}
                      {activeShipment.driverName ?? 'Chưa có tài xế'}
                      {activeShipment.plate ? (
                        <Text style={styles.plateText}> · {activeShipment.plate}</Text>
                      ) : null}
                    </Text>
                  </View>
                  <View style={styles.activeTrackPill}>
                    <Text style={styles.trackText}>Theo dõi →</Text>
                  </View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyTitle}>Chưa có chuyến nào đang chạy</Text>
                <Text style={styles.emptyBody}>
                  Tạo đơn vận chuyển để bắt đầu theo dõi lộ trình theo thời gian thực.
                </Text>
                {/* Thanh tra cứu nhanh mã vận đơn */}
                <View style={styles.quickTrackingBar}>
                  <View style={styles.trackingInputWrap}>
                    <IconLocationPin color="#0B1E42" size={16} />
                    <TextInput
                      accessibilityLabel="Tra cứu mã vận đơn"
                      autoCapitalize="characters"
                      onChangeText={setQuickTrackCode}
                      placeholder="Tra cứu nhanh mã vận đơn..."
                      placeholderTextColor="#94A3B8"
                      style={styles.trackingInput}
                      value={quickTrackCode}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Tra cứu đơn hàng"
                    accessibilityRole="button"
                    onPress={() => {
                      if (quickTrackCode.trim()) {
                        onOpenOrder?.(quickTrackCode.trim());
                      } else {
                        onViewAllOrders?.();
                      }
                    }}
                    style={styles.trackingSearchBtn}
                  >
                    <Text style={styles.trackingSearchBtnText}>Tra cứu</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Six service shortcuts: two columns, three rows. */}
          <View style={styles.section} testID="home-services">
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>DỊCH VỤ VẬN TẢI & ĐỘI XE</Text>
            </View>
            <View style={styles.serviceGrid}>
              {quickServices.map((service) => (
                <Pressable
                  accessibilityHint="Mở màn hình tạo đơn với dịch vụ đã chọn"
                  accessibilityLabel={`Đặt nhanh ${service.label}`}
                  accessibilityRole="button"
                  key={service.id}
                  onPress={() => {
                    if (service.vehicleId && onSelectVehicleAndBook) {
                      onSelectVehicleAndBook(service.vehicleId);
                    } else {
                      onCreateOrder?.();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.serviceCard,
                    { borderColor: service.borderColor },
                    pressed ? styles.serviceCardPressed : null,
                  ]}
                >
                  <View
                    accessible={false}
                    style={[
                      styles.serviceImageContainer,
                      { backgroundColor: service.surfaceColor, borderColor: service.borderColor },
                    ]}
                  >
                    <HomeServiceIllustration kind={service.iconType} />
                  </View>
                  <Text numberOfLines={1} style={styles.serviceName}>
                    {service.name}
                  </Text>
                  <View style={[styles.serviceTagBadge, { backgroundColor: service.tagSurfaceColor, borderColor: service.borderColor }]}>
                    <Text numberOfLines={1} style={[styles.serviceTagText, { color: service.accentColor }]}>
                      {service.tag}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 5. Driver Partner Partnership Card */}
          <View style={styles.driverPartnerCard}>
            <View style={styles.driverPartnerLeft}>
              <View style={styles.driverPartnerIconBox}>
                <IconRoleDriver color="#1D4ED8" secondaryColor="#DBEAFE" size={22} />
              </View>
              <View style={styles.driverPartnerTextWrap}>
                <Text style={styles.driverPartnerTitle}>Gia nhập tài xế LEOPARD</Text>
                <Text style={styles.driverPartnerSubtitle}>Tăng thu nhập với các cuốc xe linh hoạt</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Chuyển vai trò"
              accessibilityRole="button"
              onPress={handleDriverButtonPress}
              style={styles.driverRegisterBtn}
              testID="home-driver-btn"
            >
              <Text style={styles.driverRegisterText}>Đăng ký tài xế</Text>
            </Pressable>
          </View>

          {/* 6. Operational Signal Banner Carousel (Hình ảnh banner thực tế) */}
          <View
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && Math.abs(w - bannerWidth) > 2) {
                slideAnim.stopAnimation();
                slideAnim.setValue(-currentSlideIdxRef.current * w);
                setBannerWidth(w);
              }
            }}
            style={styles.promoContainer}
          >
            <View style={styles.promoTrackWindow}>
              <Animated.View
                style={[
                  styles.promoTrack,
                  {
                    width: bannerWidth * (PROMO_SLIDES.length + 1),
                    transform: [{ translateX: slideAnim }],
                  },
                ]}
              >
                {PROMO_SLIDES.map((slide) => (
                  <Pressable
                    accessibilityLabel={`Ưu đãi: ${slide.title}`}
                    accessibilityRole="button"
                    key={slide.id}
                    onPress={() => onCreateOrder?.()}
                    style={[styles.promoSlideItem, { width: bannerWidth }]}
                  >
                    <HomePromoArtwork slide={slide} />
                  </Pressable>
                ))}

                {/* Clone của slide đầu tiên để trượt vòng tròn mượt mà, không bao giờ lướt ngược lại */}
                <Pressable
                  accessibilityElementsHidden
                  accessibilityRole="button"
                  importantForAccessibility="no"
                  key="promo-slide-clone"
                  onPress={() => onCreateOrder?.()}
                  style={[styles.promoSlideItem, { width: bannerWidth }]}
                >
                  <HomePromoArtwork slide={PROMO_SLIDES[0]} />
                </Pressable>
              </Animated.View>
            </View>

            {/* Carousel Dots */}
            <View style={styles.dotsRow}>
              {PROMO_SLIDES.map((slide, idx) => (
                <Pressable
                  accessibilityLabel={`Chuyển đến ưu đãi ${idx + 1}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  key={slide.id}
                  onPress={() => goToSlide(idx)}
                  style={[
                    styles.dot,
                    activeBannerIdx === idx ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* 8. Recent Orders Ledger with 1-Tap Reorder */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ĐƠN GẦN ĐÂY</Text>
              <Pressable
                accessibilityLabel="Xem tất cả đơn hàng"
                accessibilityRole="button"
                onPress={onViewAllOrders}
              >
                <Text style={styles.linkText}>Xem tất cả</Text>
              </Pressable>
            </View>

            {deliveredRecentOrders.length > 0 ? (
              <View style={styles.orderList}>
                {deliveredRecentOrders.map((order) => (
                  <View key={order.id} style={styles.recentOrderItemWrap}>
                    <OrderSummary
                      accessibilityLabel={`Đơn ${order.reference}, từ ${order.origin} đến ${order.destination}`}
                      actionButton={
                        <Pressable
                          accessibilityLabel={`Đặt lại chuyến ${order.reference}`}
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={(e) => {
                            if (Platform.OS === 'web') {
                              (e as any).stopPropagation?.();
                            }
                            setPickupText(order.origin);
                            setDropoffText(order.destination);
                            triggerNavigation(order.origin, order.destination);
                          }}
                          style={({ pressed }) => [
                            styles.reorderInlineBtn,
                            pressed && styles.reorderInlineBtnPressed,
                          ]}
                        >
                          <Text style={styles.reorderInlineBtnText}>Đặt lại chuyến này →</Text>
                        </Pressable>
                      }
                      destination={{ id: `${order.id}-dest`, label: order.destination }}
                      metadata={[
                        ...(order.price ? [{ id: 'price', label: 'Giá', value: order.price }] : []),
                        ...(order.updated
                          ? [{ id: 'updated', label: 'Cập nhật', value: order.updated }]
                          : []),
                      ]}
                      onPress={() => onOpenOrder?.(order.id)}
                      orderReference={order.reference}
                      origin={{ id: `${order.id}-origin`, label: order.origin }}
                      status={order.status}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Bạn chưa có đơn hàng nào.</Text>
                <Text style={styles.emptyBody}>
                  Đơn đã giao thành công sẽ hiển thị tại đây để bạn có thể đặt lại nhanh chóng.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={showFloatingNavBar ? styles.bottomSpacerFloating : styles.bottomSpacer} />
      </ScrollView>

        {showFloatingNavBar ? (
          <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        ) : null}
      </View>

      {/* ================= MODAL SỔ ĐỊA CHỈ (SLIDE UP BOTTOM SHEET) ================= */}
      <SavedAddressPickerModal
        addressList={addressList}
        currentAddress={
          savedAddressModalTarget === 'pickup' ? pickupText : dropoffText
        }
        onClose={() => setShowSavedAddressModal(false)}
        onOpenMapPicker={(target) => {
          setShowSavedAddressModal(false);
          handleOpenMapPicker(target);
        }}
        onOpenSavedAddresses={
          onOpenSavedAddresses
            ? () => {
                setShowSavedAddressModal(false);
                onOpenSavedAddresses();
              }
            : undefined
        }
        onSelectAddress={(addr) => {
          if (savedAddressModalTarget === 'pickup') {
            setPickupText(addr.address);
            setPickupLabel(addr.label);
            addressStore.setDefaultAddress(addr.id);
            if (dropoffText.trim().length >= 3) {
              triggerNavigation(addr.address, dropoffText);
            }
          } else {
            setDropoffText(addr.address);
            if (pickupText.trim().length >= 3) {
              const coords =
                typeof addr.latitude === 'number' && typeof addr.longitude === 'number'
                  ? { lat: addr.latitude, lng: addr.longitude }
                  : undefined;
              triggerNavigation(pickupText, addr.address, coords);
            }
          }
          onSelectSavedAddress?.(addr);
          setShowSavedAddressModal(false);
        }}
        onDeleteAddress={(id) => {
          addressStore.deleteAddress(id);
          setAddressStoreVersion((v) => v + 1);
        }}
        target={savedAddressModalTarget}
        visible={showSavedAddressModal}
      />

      {/* ================= MODAL XÁC NHẬN BẢN ĐỒ & THÔNG TIN NGƯỜI GỬI ================= */}
      <MapAddressPickerModal
        defaultFallbackAddress={initialAddress}
        initialAddress={mapTarget === 'pickup' ? pickupText : dropoffText}
        loggedInCustomer={loggedInCustomer}
        onClose={() => setShowMapPickerModal(false)}
        onConfirm={handleConfirmMapLocation}
        target={mapTarget}
        userName={userName}
        userPhone={userPhone}
        visible={showMapPickerModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#0B2347' },
  brandPlate: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  homeIntro: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 38, gap: 8, backgroundColor: '#0B2347', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, position: 'relative', overflow: 'hidden' },
  homeIntroGlow: { position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  homeIntroAccent: { position: 'absolute', bottom: 0, left: 24, right: 24, height: 2, backgroundColor: 'rgba(245, 158, 11, 0.25)', borderRadius: 1 },
  homeGreeting: { fontSize: 13, fontWeight: '600', color: '#FFD18A' },
  homeTitle: { fontSize: 25, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, maxWidth: 360 },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: leopardPalette.canvas,
  },

  /* 1. Hero Artwork Background & Header */
  heroBackground: {
    width: '100%',
    height: 250,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  heroBackgroundImage: {
    resizeMode: 'cover',
    transform: [{ translateY: -28 }, { scale: 1.08 }],
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
    }),
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingPill: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: '72%',
  },
  greetingTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0C4A6E',
    letterSpacing: -0.2,
  },
  greetingNameText: {
    fontWeight: '800',
    color: '#0B1E42',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 19,
    backgroundColor: '#19385F',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#345075',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  badgePill: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger.border,
    borderRadius: leopardRadius.pill,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },

  /* Scroll Content & Main Sheet */
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  mainSheet: {
    marginTop: -18,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  srOnly: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },

  /* 2. Quick Route Booking Card (Phần vị trí: Dispatch Dock) */
  routeBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  routeBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  routeBookingTitle: {
    ...typography.caption,
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  savedAddressesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedAddressesText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Unified Route Box: Trục hành trình liền mạch */
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
  routeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 52,
  },
  routeInputWrapperFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputInnerColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  inputDivider: {
    display: 'none',
  },
  locationFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  locationFieldLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pickupLabelBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pickupLabelBadgeText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '700',
  },
  locationTextInput: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '600',
    padding: 0,
    marginTop: 2,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 13,
  },
  inputMapPinBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F4F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  fastForwardBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  fastForwardBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  autoNavigatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 6,
  },
  autoNavigatingText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  liveIndicatorDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },

  /* Dropdown Gợi ý & Xác nhận vị trí khi đang focus */
  addressDropdownWrap: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B1E42',
    letterSpacing: 0.5,
  },
  dropdownCloseBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownCloseBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  dropdownActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 12,
  },
  dropdownActionItemPressed: {
    backgroundColor: '#F0F4F9',
  },
  dropdownMapIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dropdownSavedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dropdownActionContent: {
    flex: 1,
  },
  dropdownActionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownActionDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  dropdownChevron: {
    fontSize: 18,
    color: '#0B1E42',
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  bookingActionWrap: {
    marginTop: spacing.xxs,
  },

  /* 4. Services Grid: Modern Illustrated Tiles */
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DFE7F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: '#F8FAFC',
  },
  serviceImageContainer: {
    width: '100%', height: 90, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, overflow: 'hidden', marginBottom: 10,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  serviceTagBadge: {
    backgroundColor: '#F0F4F9',
    borderColor: '#F0F4F9',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginTop: 3,
  },
  serviceTagText: {
    color: '#0B1E42',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* 5. Driver Partner Card */
  driverPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  driverPartnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverPartnerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  driverPartnerTextWrap: {
    flex: 1,
    gap: 2,
  },
  driverPartnerTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  driverPartnerSubtitle: {
    color: '#64748B',
    fontSize: 10.5,
  },
  driverRegisterBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  driverRegisterText: {
    color: '#1D4ED8',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* 6. Operational Signal Banner Carousel (Hình ảnh) */
  promoContainer: {
    gap: 8,
  },
  promoTrackWindow: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  promoTrack: {
    flexDirection: 'row',
    height: '100%',
  },
  promoSlideItem: {
    height: '100%',
    overflow: 'hidden',
  },
  promoBannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#2563EB',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },

  /* Sections Common */
  section: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveTagBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveTagText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '700',
  },
  sectionLabel: {
    ...typography.caption,
    color: '#526176',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  linkText: {
    color: leopardPalette.primary,
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* 7. Active Shipment Card */
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  activeRouteContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  activeRouteWell: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 12,
  },
  activeTruckPopWrap: {
    position: 'absolute',
    right: -4,
    top: -16,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0px 8px 12px rgba(15, 23, 42, 0.16))',
      } as any,
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  activeTruckImage: {
    width: '100%',
    height: '100%',
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  etaPill: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etaText: {
    color: '#061226',
    fontSize: 12,
    fontWeight: '700',
  },
  activeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  activeDriverBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  activeDriverIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  plateText: {
    color: '#0F172A',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeTrackPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trackText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  orderList: {
    gap: spacing.sm,
  },
  emptyBox: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  emptyActivityBox: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 14,
  },
  emptyBody: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Quick Tracking Bar */
  quickTrackingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  trackingInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  trackingInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  trackingSearchBtn: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 8. Recent Orders & 1-Tap Reorder */
  recentOrderItemWrap: {
    gap: 4,
  },
  reorderInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reorderInlineBtnPressed: {
    backgroundColor: '#DBEAFE',
  },
  reorderInlineBtnText: {
    color: '#2563EB',
    fontSize: 11.5,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: layout.bottomNavClearance,
  },
  bottomSpacerFloating: {
    height: layout.bottomNavClearance,
  },
  pressed: {
    opacity: 0.85,
  },
});
