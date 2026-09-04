import type { OrderStatus } from '@leopard/shared';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  leopardElevation,
  leopardPalette,
  leopardRadius,
  spacing,
  typography,
} from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { FloatingNavBar, type TabKey } from '../../ui/FloatingNavBar';
import {
  IconBell,
  IconLocationPin,
  IconMessage,
  IconOrders,
  IconQrPayment,
  IconRoleDriver,
  IconSecurityShield,
  IconSpeedTruck,
  IconVehicle3Wheel,
  IconVehicleHeavyTruck,
  IconVehicleLightTruck,
  IconWallet,
} from '../../ui/icons/CoreIcons';
import { OrderSummary } from '../../ui/OrderSummary';
import { RealInteractiveMap, resolveLocationCoords } from '../../ui/RealInteractiveMap';
import { RouteSpine } from '../../ui/RouteSpine';
import { StatusBadge } from '../../ui/StatusBadge';
import type { VehicleCategory } from '../../ui/VehicleSelectCard';
import { addressStore, type SavedAddress } from '../customer/addresses/address-store';
import { httpClient } from '../../api/http-client';
import { sessionStore } from '../../auth/session-store';

const customerHeroBgSource = require('../../../assets/brand/customer-hero-bg.jpg');

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
  onQuickBook?: (origin?: string, destination?: string) => void;
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
              fill="#E0F2FE"
              stroke="#0284C7"
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
            fill="#0284C7"
            stroke="#0369A1"
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
            backgroundColor: '#0284C7',
          }}
        />
      )}
    </Animated.View>
  );
}

type PromoBanner = Readonly<{
  id: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  title: string;
  desc: string;
  ctaText: string;
  accentBorder: string;
  cardBg: string;
}>;

const PROMO_BANNERS: readonly PromoBanner[] = [
  {
    id: 'promo-1',
    badge: 'ƯU ĐÃI THÁNG 9',
    badgeColor: '#16A34A',
    badgeBg: '#DCFCE7',
    title: 'Giảm 50.000₫ chuyến đầu tiên',
    desc: 'Nhập mã LEOPARD50 khi tạo đơn giao hàng mới',
    ctaText: 'Dùng mã ngay',
    accentBorder: '#BFDBFE',
    cardBg: '#EFF6FF',
  },
  {
    id: 'promo-2',
    badge: 'HỎA TỐC NỘI THÀNH',
    badgeColor: '#EA580C',
    badgeBg: '#FFEDD5',
    title: 'Cam kết có xe trong 15 phút',
    desc: 'Mạng lưới xe ba gác & tải nhẹ phủ sóng toàn thành phố',
    ctaText: 'Đặt hỏa tốc',
    accentBorder: '#BAE6FD',
    cardBg: '#F0F9FF',
  },
  {
    id: 'promo-3',
    badge: 'BẢO HIỂM TOÀN DIỆN',
    badgeColor: '#2563EB',
    badgeBg: '#DBEAFE',
    title: 'Bảo hiểm 100% giá trị hàng',
    desc: 'An tâm tuyệt đối cho vật liệu công trình & đồ dọn nhà',
    ctaText: 'Xem chính sách',
    accentBorder: '#BBF7D0',
    cardBg: '#F0FDF4',
  },
];

type QuickService = Readonly<{
  id: string;
  vehicleId?: VehicleCategory;
  name: string;
  label: string;
  tag: string;
  iconType: '3wheel' | 'light' | 'heavy' | 'express' | 'loading' | 'cod';
}>;

const quickServices: readonly QuickService[] = [
  { id: '3_WHEEL_BIKE', vehicleId: '3_WHEEL_BIKE', label: 'Xe Ba Gác', name: 'Ba gác', tag: '< 500kg', iconType: '3wheel' },
  { id: 'LIGHT_TRUCK', vehicleId: 'LIGHT_TRUCK', label: 'Xe Tải Nhẹ', name: 'Tải nhẹ', tag: '≤ 1.5 tấn', iconType: 'light' },
  { id: 'HEAVY_TRUCK', vehicleId: 'HEAVY_TRUCK', label: 'Xe Tải Nặng', name: 'Tải nặng', tag: '5–10 tấn', iconType: 'heavy' },
  { id: 'EXPRESS', label: 'Giao Hỏa Tốc', name: 'Hỏa tốc', tag: 'Dưới 1h', iconType: 'express' },
  { id: 'LOADING', label: 'Dịch Vụ Bốc Xếp', name: 'Bốc xếp', tag: 'Kèm phụ xe', iconType: 'loading' },
  { id: 'COD', label: 'Thu Hộ COD', name: 'Thu COD', tag: 'Đối soát 24h', iconType: 'cod' },
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
    status: 'REQUESTED',
    origin: 'Bình Tân',
    destination: 'Long An',
    price: '650.000 ₫',
    updated: '31/08',
  },
];

function renderServiceIcon(type: QuickService['iconType']) {
  switch (type) {
    case '3wheel':
      return <IconVehicle3Wheel color="#0284C7" size={24} />;
    case 'light':
      return <IconVehicleLightTruck color="#0284C7" size={24} />;
    case 'heavy':
      return <IconVehicleHeavyTruck color="#0284C7" size={24} />;
    case 'express':
      return <IconSpeedTruck color="#0284C7" secondaryColor="#E0F2FE" size={24} strokeWidth={1.75} />;
    case 'loading':
      return <IconOrders color="#0284C7" size={24} strokeWidth={1.75} />;
    case 'cod':
      return <IconSecurityShield color="#0284C7" secondaryColor="#E0F2FE" size={24} strokeWidth={1.75} />;
    default:
      return <IconSpeedTruck color="#0284C7" size={24} />;
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
  const [modalAddress, setModalAddress] = useState(initialAddress);
  const [customPinCoords, setCustomPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [mapAddressNote, setMapAddressNote] = useState('');
  const [senderName, setSenderName] = useState(userName || 'Anh Hoàng');
  const [senderPhone, setSenderPhone] = useState(userPhone || '0901234567');
  const [isSenderMe, setIsSenderMe] = useState(false);
  const [focusedModalInput, setFocusedModalInput] = useState<'address' | 'note' | 'name' | 'phone' | null>(null);
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ name?: string; phone?: string } | null>(null);
  const modalAddressInputRef = React.useRef<TextInput>(null);

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
            if (user.name) {
              setSenderName(user.name);
            }
            if (user.phone) {
              setSenderPhone(formatVietnamesePhone(user.phone));
            }
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

  const mapCoords = useMemo(() => {
    if (customPinCoords) return customPinCoords;
    if (modalAddress && modalAddress.trim()) {
      return resolveLocationCoords(modalAddress);
    }
    const defaultReference = mapTarget === 'pickup' ? pickupText : dropoffText;
    if (defaultReference && defaultReference.trim()) {
      return resolveLocationCoords(defaultReference);
    }
    return resolveLocationCoords(initialAddress);
  }, [customPinCoords, modalAddress, mapTarget, pickupText, dropoffText, initialAddress]);

  const handleOpenMapPicker = (target: 'pickup' | 'dropoff') => {
    setMapTarget(target);
    const current = target === 'pickup' ? pickupText : dropoffText;
    if (current && current.trim()) {
      setModalAddress(current.trim());
    } else {
      setModalAddress(target === 'pickup' ? initialAddress : '');
    }
    setCustomPinCoords(null);
    setShowMapPickerModal(true);
  };

  const handleChangeAddress = () => {
    setModalAddress('');
    setCustomPinCoords(null);
    setTimeout(() => {
      modalAddressInputRef.current?.focus();
    }, 60);
  };

  const handleGetCurrentGpsLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingGps(false);
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setCustomPinCoords({ lat, lng });
          setModalAddress(`Vị trí GPS (${lat}, ${lng})`);
        },
        (err) => {
          setIsLocatingGps(false);
          console.warn('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  };

  const handleConfirmMapLocation = () => {
    const finalAddress =
      modalAddress.trim() ||
      (customPinCoords
        ? `Tọa độ (${customPinCoords.lat.toFixed(4)}, ${customPinCoords.lng.toFixed(4)})`
        : initialAddress);
    if (mapTarget === 'pickup') {
      setPickupText(finalAddress);
      setPickupLabel(null);
    } else {
      setDropoffText(finalAddress);
    }
    setShowMapPickerModal(false);
    setFocusedField(null);
  };

  const handleFillMySenderInfo = () => {
    const resolvedName = loggedInCustomer?.name || userName || 'Anh Hoàng';
    const rawPhone = loggedInCustomer?.phone || userPhone;
    const resolvedPhone = formatVietnamesePhone(rawPhone) || rawPhone || '0901234567';
    setSenderName(resolvedName);
    setSenderPhone(resolvedPhone);
    setIsSenderMe(true);
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

  // List of saved addresses for quick switching
  const addressList = savedAddresses ?? addressStore.getAddresses();

  // Auto-advance banner every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
  const currentBanner = PROMO_BANNERS[activeBannerIdx];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Hero Artwork Background + Integrated Header */}
          <ImageBackground
            accessibilityLabel="Hình ảnh thương hiệu LEOPARD"
            imageStyle={styles.heroBackgroundImage}
            resizeMode="cover"
            source={customerHeroBgSource}
            style={styles.heroBackground}
          >
            {/* Header: Đặt trực tiếp trên nền ảnh hero, thanh pill sang trọng đồng bộ nút icon */}
            <View style={styles.topHeader}>
              <View style={styles.greetingPill}>
                <AnimatedGreetingIcon size={20} timeOfDay={timeOfDay} />
                <Text numberOfLines={1} style={styles.greetingTitleText}>
                  {greeting}
                  {userName ? (
                    <Text style={styles.greetingNameText}>, {userName}</Text>
                  ) : null}
                </Text>
              </View>

              {/* Action Icons: Tin nhắn & Thông báo (nằm trên vùng trời cao, không đè nhân vật) */}
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
                  <IconMessage color="#0F172A" size={18} />
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
                    <IconBell color="#0F172A" size={18} />
                    {unreadNotifications > 0 ? (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{unreadNotifications}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ImageBackground>

          {/* Main Content: Thân trang xếp lớp phủ nhẹ lên chân ảnh hero */}
          <View style={styles.mainSheet}>
            {/* Thẻ ẩn dữ liệu danh tính người dùng phục vụ accessibility và test suite */}
            <View pointerEvents="none" style={styles.srOnly}>
              {smeName ? <Text>{smeName}</Text> : null}
            </View>

            {/* 2. Quick Route Booking Card (Phần vị trí: Dispatch Dock) */}
            <View style={styles.routeBookingCard}>
              <View style={styles.routeBookingHeader}>
                <View style={styles.routeBadgeRow}>
                  <View style={styles.liveIndicatorDot} />
                  <Text style={styles.routeBookingTitle}>ĐẶT XE GIAO HÀNG NHANH</Text>
                </View>
                <Pressable
                  accessibilityLabel="Mở sổ địa chỉ"
                  accessibilityRole="button"
                  onPress={() => {
                    setSavedAddressModalTarget('pickup');
                    setShowSavedAddressModal(true);
                  }}
                  style={({ pressed }) => [
                    styles.savedAddressesLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <IconLocationPin color="#2563EB" size={13} />
                  <Text style={styles.savedAddressesText}>Sổ địa chỉ</Text>
                </Pressable>
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
                      <IconLocationPin color="#0284C7" size={16} />
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
                      <IconLocationPin color="#0284C7" size={16} />
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
                      <IconLocationPin color="#0284C7" size={16} />
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

              {/* CTA: Create order / Quote */}
              <View style={styles.bookingActionWrap}>
                <Button
                  label="Tạo đơn vận chuyển"
                  onPress={handleBookPress}
                  size="driver-primary"
                  variant="primary"
                />
              </View>
            </View>

          {/* 4. Grid: Services & Fleet Squircle Tiles (6 items) */}
          <View style={styles.section}>
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
                    pressed ? styles.serviceCardPressed : null,
                  ]}
                >
                  <View style={styles.serviceIconSquircle}>
                    {renderServiceIcon(service.iconType)}
                  </View>
                  <Text numberOfLines={1} style={styles.serviceName}>
                    {service.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.serviceTagText}>
                    {service.tag}
                  </Text>
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

          {/* 6. Operational Signal Banner Carousel */}
          <View style={styles.promoContainer}>
            <View
              style={[
                styles.promoCard,
                { backgroundColor: currentBanner.cardBg, borderColor: currentBanner.accentBorder },
              ]}
            >
              <View style={styles.promoContent}>
                <View
                  style={[
                    styles.promoBadge,
                    { backgroundColor: currentBanner.badgeBg },
                  ]}
                >
                  <Text style={[styles.promoBadgeText, { color: currentBanner.badgeColor }]}>
                    {currentBanner.badge}
                  </Text>
                </View>

                <Text numberOfLines={1} style={styles.promoTitle}>
                  {currentBanner.title}
                </Text>
                <Text numberOfLines={2} style={styles.promoDesc}>
                  {currentBanner.desc}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => onCreateOrder?.()}
                  style={styles.promoCtaLink}
                >
                  <Text style={[styles.promoCtaText, { color: currentBanner.badgeColor }]}>
                    {currentBanner.ctaText} →
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Carousel Dots */}
            <View style={styles.dotsRow}>
              {PROMO_BANNERS.map((banner, idx) => (
                <Pressable
                  accessibilityLabel={`Chuyển đến ưu đãi ${idx + 1}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  key={banner.id}
                  onPress={() => setActiveBannerIdx(idx)}
                  style={[
                    styles.dot,
                    activeBannerIdx === idx ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* 7. Live Tracking Activity Capsule (Active Shipment) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ĐANG VẬN CHUYỂN</Text>
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
                    <Text style={styles.etaText}>ETA dự kiến {activeShipment.etaMinutes} phút</Text>
                  ) : null}
                </View>

                <RouteSpine
                  destination={{ id: 'active-dest', label: activeShipment.destination }}
                  origin={{ id: 'active-origin', label: activeShipment.origin }}
                  stops={[]}
                />

                <View style={styles.activeMeta}>
                  <Text numberOfLines={1} style={styles.driverText}>
                    {activeShipment.cargoNote ? `${activeShipment.cargoNote} · ` : ''}
                    {activeShipment.driverName ?? 'Chưa có tài xế'}
                    {activeShipment.plate ? (
                      <Text style={styles.plateText}> · {activeShipment.plate}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.trackText}>Theo dõi →</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Chưa có chuyến nào đang chạy</Text>
                <Text style={styles.emptyBody}>
                  Tạo đơn vận chuyển để bắt đầu theo dõi lộ trình theo thời gian thực.
                </Text>
              </View>
            )}
          </View>

          {/* 8. VietQR Wallet & Financial Utilities */}
          <View style={styles.walletStrip}>
            <View style={styles.walletInfo}>
              <View style={styles.walletIconBox}>
                <IconWallet color={leopardPalette.primary} size={18} />
              </View>
              <View>
                <Text style={styles.walletLabel}>Ví VietQR</Text>
                <Text style={styles.walletBalance}>{walletBalance}</Text>
              </View>
            </View>
            <View style={styles.walletActions}>
              <Pressable
                accessibilityLabel="Nạp tiền vào ví"
                accessibilityRole="button"
                onPress={onTopUpWallet}
                style={({ pressed }) => [styles.walletBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.walletBtnText}>Nạp tiền</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Quét mã QR thanh toán"
                accessibilityRole="button"
                onPress={onOpenQrScan}
                style={({ pressed }) => [styles.walletBtn, pressed ? styles.pressed : null]}
              >
                <IconQrPayment color={leopardPalette.primaryDark} size={15} />
                <Text style={styles.walletBtnText}>Quét QR</Text>
              </Pressable>
            </View>
          </View>

          {/* 9. Recent Orders Ledger */}
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

            {recentOrders.length > 0 ? (
              <View style={styles.orderList}>
                {recentOrders.map((order) => (
                  <OrderSummary
                    accessibilityLabel={`Đơn ${order.reference}, từ ${order.origin} đến ${order.destination}`}
                    destination={{ id: `${order.id}-dest`, label: order.destination }}
                    key={order.id}
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
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Bạn chưa có đơn hàng nào.</Text>
                <Text style={styles.emptyBody}>
                  Đơn bạn tạo sẽ hiển thị tại đây để theo dõi nhanh.
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
      <Modal
        animationType="slide"
        onRequestClose={() => setShowSavedAddressModal(false)}
        transparent
        visible={showSavedAddressModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Đóng sổ địa chỉ"
            onPress={() => setShowSavedAddressModal(false)}
            style={styles.modalBackdrop}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Sổ địa chỉ đã lưu</Text>
                <Text style={styles.bottomSheetSub}>
                  Chọn địa chỉ cho {savedAddressModalTarget === 'pickup' ? 'điểm lấy hàng' : 'điểm giao hàng'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng modal sổ địa chỉ"
                hitSlop={8}
                onPress={() => setShowSavedAddressModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.savedAddressListScroll}
              keyboardShouldPersistTaps="handled"
              style={styles.savedAddressScrollArea}
            >
              {addressList.map((addr) => {
                const isSelected =
                  savedAddressModalTarget === 'pickup'
                    ? pickupText === addr.address
                    : dropoffText === addr.address;
                return (
                  <Pressable
                    accessibilityLabel={`Chọn ${addr.label}: ${addr.address}`}
                    accessibilityRole="button"
                    key={addr.id}
                    onPress={() => {
                      if (savedAddressModalTarget === 'pickup') {
                        setPickupText(addr.address);
                        setPickupLabel(addr.label);
                        addressStore.setDefaultAddress(addr.id);
                      } else {
                        setDropoffText(addr.address);
                      }
                      onSelectSavedAddress?.(addr);
                      setShowSavedAddressModal(false);
                    }}
                    style={({ pressed }) => [
                      styles.savedAddressItemRow,
                      isSelected ? styles.savedAddressItemRowActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                    testID={`pickup-chip-${addr.id}`}
                  >
                    <View
                      style={[
                        styles.savedAddrIconSquircle,
                        isSelected ? styles.savedAddrIconSquircleActive : null,
                      ]}
                    >
                      <IconLocationPin
                        color={isSelected ? '#2563EB' : '#64748B'}
                        size={18}
                      />
                    </View>
                    <View style={styles.savedAddrTextCol}>
                      <View style={styles.savedAddrLabelRow}>
                        <Text style={styles.savedAddrLabelTitle}>{addr.label}</Text>
                        {addr.isDefault ? (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={2} style={styles.savedAddrFullText}>
                        {addr.address}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkCircleText}>✓</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable
                accessibilityLabel="Ghim vị trí trên bản đồ"
                accessibilityRole="button"
                onPress={() => {
                  setShowSavedAddressModal(false);
                  handleOpenMapPicker(savedAddressModalTarget);
                }}
                style={styles.bottomSheetMapBtn}
              >
                <IconLocationPin color="#EA580C" size={15} />
                <Text style={styles.bottomSheetMapBtnText}>Ghim vị trí trên bản đồ</Text>
              </Pressable>

              {onOpenSavedAddresses ? (
                <Pressable
                  accessibilityLabel="Thêm địa chỉ mới"
                  accessibilityRole="button"
                  onPress={() => {
                    setShowSavedAddressModal(false);
                    onOpenSavedAddresses();
                  }}
                  style={styles.bottomSheetManageBtn}
                >
                  <Text style={styles.bottomSheetManageBtnText}>+ Thêm địa chỉ mới</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL XÁC NHẬN BẢN ĐỒ & THÔNG TIN NGƯỜI GỬI (THEO MOCKUP ẢNH 2) ================= */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowMapPickerModal(false)}
        transparent
        visible={showMapPickerModal}
      >
        <View style={styles.mapModalOverlay}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.mapModalSafeArea}>
          {/* Top Bar with Close X and Title */}
          <View style={styles.mapModalTopBar}>
            <Pressable
              accessibilityLabel="Đóng màn hình bản đồ"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowMapPickerModal(false)}
              style={styles.mapModalCloseBtn}
            >
              <Text style={styles.mapModalCloseBtnText}>✕</Text>
            </Pressable>
            <Text style={styles.mapModalTopBarTitle}>
              {mapTarget === 'pickup' ? 'Thông tin người gửi' : 'Thông tin người nhận'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.mapModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Real Interactive Map Stage */}
            <View style={styles.mapStageContainer}>
              <RealInteractiveMap
                height={260}
                initialPinCoords={mapCoords}
                interactive={true}
                mode="pin"
                onLocationChange={(coords) => {
                  setCustomPinCoords(coords);
                }}
                origin={{ label: modalAddress || 'Vị trí đã chọn', coords: mapCoords }}
                title="Xác nhận vị trí giao nhận"
              />

              {/* Top-Left Close overlay pill */}
              <Pressable
                accessibilityLabel="Đóng bản đồ"
                onPress={() => setShowMapPickerModal(false)}
                style={styles.mapOverlayCloseBtn}
              >
                <Text style={styles.mapOverlayCloseBtnText}>‹ Đóng</Text>
              </Pressable>
            </View>

            {/* Detail Address Card */}
            <View style={styles.mapAddressCard}>
              <View style={styles.mapAddressHeaderRow}>
                <View style={styles.mapAddressHeaderLabelRow}>
                  <View
                    style={[
                      styles.mapAddressTypeDot,
                      mapTarget === 'pickup'
                        ? styles.mapAddressTypeDotPickup
                        : styles.mapAddressTypeDotDropoff,
                    ]}
                  />
                  <Text style={styles.mapAddressSectionTitle}>
                    {mapTarget === 'pickup' ? 'Lấy hàng tại' : 'Giao hàng đến'}
                  </Text>
                </View>

                <Pressable
                  accessibilityLabel="Thay đổi địa chỉ"
                  accessibilityRole="button"
                  onPress={handleChangeAddress}
                  style={styles.mapChangeAddrBtn}
                >
                  <Text style={styles.mapChangeAddrBtnText}>Thay đổi</Text>
                </Pressable>
              </View>

              {/* Address Input Field (Real editable address, no mock text!) */}
              <View
                style={[
                  styles.mapInputWrapper,
                  styles.mapAddressInputWrapper,
                  focusedModalInput === 'address' && styles.mapInputWrapperFocused,
                ]}
              >
                <View style={styles.mapInputLeadingIcon}>
                  <IconLocationPin
                    color={mapTarget === 'pickup' ? '#16A34A' : '#0284C7'}
                    size={20}
                  />
                </View>
                <TextInput
                  accessibilityLabel={mapTarget === 'pickup' ? 'Địa chỉ lấy hàng' : 'Địa chỉ giao hàng'}
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={(val) => {
                    setModalAddress(val);
                    setCustomPinCoords(null);
                  }}
                  onFocus={() => setFocusedModalInput('address')}
                  placeholder={
                    mapTarget === 'pickup'
                      ? 'Nhập địa chỉ lấy hàng (số nhà, đường, quận...)'
                      : 'Nhập địa chỉ giao hàng (số nhà, đường, quận...)'
                  }
                  placeholderTextColor="#94A3B8"
                  ref={modalAddressInputRef}
                  style={styles.mapTextInput}
                  value={modalAddress}
                />
                {modalAddress.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa địa chỉ"
                    hitSlop={8}
                    onPress={() => {
                      setModalAddress('');
                      setCustomPinCoords(null);
                      modalAddressInputRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel="Lấy vị trí hiện tại"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleGetCurrentGpsLocation}
                  style={styles.gpsPillBtn}
                >
                  <Text style={styles.gpsPillBtnText}>
                    {isLocatingGps ? 'Đang định vị…' : '📍 GPS'}
                  </Text>
                </Pressable>
              </View>

              {/* Address Note Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'note' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel="Thêm ghi chú địa chỉ"
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setMapAddressNote}
                  onFocus={() => setFocusedModalInput('note')}
                  placeholder="Thêm ghi chú địa chỉ (tòa nhà, số tầng, chỉ dẫn...)"
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={mapAddressNote}
                />
                {mapAddressNote.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa ghi chú"
                    hitSlop={8}
                    onPress={() => setMapAddressNote('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.mapSectionSeparator} />

            {/* Sender / Contact Information Section */}
            <View style={styles.mapSenderSection}>
              <View style={styles.mapSenderHeaderRow}>
                <Text style={styles.mapSenderSectionTitle}>
                  {mapTarget === 'pickup' ? 'THÔNG TIN NGƯỜI GỬI' : 'THÔNG TIN NGƯỜI NHẬN'}
                </Text>
                <Pressable
                  accessibilityLabel={mapTarget === 'pickup' ? 'Tôi là người gửi' : 'Tôi là người nhận'}
                  onPress={handleFillMySenderInfo}
                  style={styles.mapSenderMeBtn}
                >
                  <Text style={styles.mapSenderMeBtnText}>
                    {mapTarget === 'pickup' ? 'Tôi là người gửi' : 'Tôi là người nhận'}
                  </Text>
                </Pressable>
              </View>

              {/* Name Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'name' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel={mapTarget === 'pickup' ? 'Tên người gửi' : 'Tên người nhận'}
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setSenderName}
                  onFocus={() => setFocusedModalInput('name')}
                  placeholder={mapTarget === 'pickup' ? 'Tên người gửi' : 'Tên người nhận'}
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={senderName}
                />
                {senderName.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa tên người gửi"
                    hitSlop={8}
                    onPress={() => setSenderName('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Phone Input */}
              <View
                style={[
                  styles.mapInputWrapper,
                  focusedModalInput === 'phone' && styles.mapInputWrapperFocused,
                ]}
              >
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  keyboardType="phone-pad"
                  onBlur={() => setFocusedModalInput(null)}
                  onChangeText={setSenderPhone}
                  onFocus={() => setFocusedModalInput('phone')}
                  placeholder="Số điện thoại liên hệ"
                  placeholderTextColor="#94A3B8"
                  style={styles.mapTextInput}
                  value={senderPhone}
                />
                {senderPhone.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Xóa số điện thoại"
                    hitSlop={8}
                    onPress={() => setSenderPhone('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Action Bar (Hủy / Lưu) */}
          <View style={styles.mapModalBottomBar}>
            <Pressable
              accessibilityLabel="Hủy xác nhận địa chỉ"
              accessibilityRole="button"
              onPress={() => setShowMapPickerModal(false)}
              style={({ pressed }) => [
                styles.mapCancelBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.mapCancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Lưu thông tin vị trí"
              accessibilityRole="button"
              onPress={handleConfirmMapLocation}
              style={({ pressed }) => [
                styles.mapSaveBtn,
                pressed && styles.mapSaveBtnPressed,
              ]}
            >
              <Text style={styles.mapSaveBtnText}>Lưu</Text>
            </Pressable>
          </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#38BDF8',
  },
  container: {
    flex: 1,
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
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  greetingPill: {
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
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
    color: '#0284C7',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
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
    marginTop: -42,
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  /* Dropdown Gợi ý & Xác nhận vị trí khi đang focus */
  addressDropdownWrap: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderColor: '#BAE6FD',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    shadowColor: '#0284C7',
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
    color: '#0284C7',
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
    backgroundColor: '#F0F9FF',
  },
  dropdownMapIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    color: '#0284C7',
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  /* Modal Sổ địa chỉ (Bottom Sheet) */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
      } as any,
    }),
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  bottomSheetCard: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '80%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomSheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  savedAddressListScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  savedAddressScrollArea: {
    maxHeight: 320,
  },
  savedAddressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  savedAddressItemRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  savedAddrIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAddrIconSquircleActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  savedAddrTextCol: {
    flex: 1,
  },
  savedAddrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  savedAddrLabelTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  savedAddrFullText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomSheetMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    height: 44,
  },
  bottomSheetMapBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  bottomSheetManageBtn: {
    paddingHorizontal: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  bottomSheetManageBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },

  /* Modal Xác nhận Bản đồ & Thông tin người gửi */
  mapModalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      } as any,
    }),
  },
  mapModalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  mapModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  mapModalCloseBtnText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
  mapModalTopBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  mapModalScrollContent: {
    paddingBottom: 24,
  },
  mapStageContainer: {
    height: 260,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlayCloseBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  mapOverlayCloseBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Card chi tiết địa chỉ */
  mapAddressCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  mapAddressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapAddressHeaderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapAddressSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapAddressTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapAddressTypeDotPickup: {
    backgroundColor: '#16A34A',
  },
  mapAddressTypeDotDropoff: {
    backgroundColor: '#DC2626',
  },
  mapChangeAddrBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mapChangeAddrBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  mapAddressInputWrapper: {
    borderColor: '#94A3B8',
  },
  mapInputLeadingIcon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsPillBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 6,
  },
  gpsPillBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },

  /* Khung nhập liệu chuẩn hệ thống (Luxury design giống Login) */
  mapInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    minHeight: 50,
  },
  mapInputWrapperFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  mapTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },

  mapSectionSeparator: {
    height: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },

  /* Phần thông tin người gửi / người nhận */
  mapSenderSection: {
    padding: 16,
    gap: 12,
  },
  mapSenderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapSenderSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapSenderMeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  mapSenderMeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },

  /* Thanh nút thao tác dính đáy (Sticky bottom) */
  mapModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  mapCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#475569',
  },
  mapSaveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  mapSaveBtnPressed: {
    backgroundColor: '#0369A1',
    transform: [{ scale: 0.98 }],
  },
  mapSaveBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bookingActionWrap: {
    marginTop: spacing.xxs,
  },

  /* 4. Services Grid: Modern Squircle Tiles */
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceCard: {
    width: '31.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceCardPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: '#F8FAFC',
  },
  serviceIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  serviceName: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  serviceTagText: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '600',
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

  /* 6. Operational Signal Banner Carousel */
  promoContainer: {
    gap: 6,
  },
  promoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    ...leopardElevation.subtle,
  },
  promoContent: {
    gap: 4,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  promoDesc: {
    color: '#475569',
    fontSize: 11.5,
    lineHeight: 15,
  },
  promoCtaLink: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  promoCtaText: {
    fontSize: 12,
    fontWeight: '700',
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
  sectionLabel: {
    ...typography.caption,
    color: leopardPalette.textSubtle,
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
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: colors.active.border,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...leopardElevation.subtle,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  etaText: {
    color: leopardPalette.primaryDark,
    fontSize: 12.5,
    fontWeight: '600',
  },
  activeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: leopardPalette.subtleDivider,
  },
  driverText: {
    flex: 1,
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
  },
  plateText: {
    color: leopardPalette.textSlateDark,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  trackText: {
    color: leopardPalette.primary,
    fontSize: 12.5,
    fontWeight: '600',
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

  /* 8. Wallet Strip */
  walletStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    borderRadius: leopardRadius.lg,
    padding: spacing.sm,
    ...leopardElevation.subtle,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  walletIconBox: {
    width: 34,
    height: 34,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.primaryBorder,
  },
  walletLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  walletBalance: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  walletActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primaryBorder,
    borderWidth: 1,
    borderRadius: leopardRadius.md,
    paddingHorizontal: 11,
    paddingVertical: 8,
    minHeight: 40,
  },
  walletBtnText: {
    color: leopardPalette.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: spacing.md,
  },
  bottomSpacerFloating: {
    height: 88,
  },
  pressed: {
    opacity: 0.85,
  },
});
