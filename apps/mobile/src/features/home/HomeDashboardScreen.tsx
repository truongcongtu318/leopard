import type { OrderStatus } from '@leopard/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  BrandLoginLogo,
  FloatingNavBar,
  GestureBottomSheet,
  IconBell,
  IconBike,
  IconChevron,
  IconClock,
  IconClose,
  IconMessage,
  IconPin,
  IconRoleDriver,
  IconSearch,
  IconTruck,
  IconVan,
  IconWarehouse,
  OrderSummary,
  RealInteractiveMap,
  RouteSpine,
  StatusBadge,
  httpClient,
  sessionStore,
  type TabKey,
  type VehicleCategory,
} from '@leopard/mobile-core';

import { addressStore, type SavedAddress } from '../customer/addresses/address-store';
import {
  MapAddressPickerModal,
  reverseGeocodeCoords,
  SavedAddressPickerModal,
} from './components';
import { HomePromoArtwork, type HomePromoSlide } from './HomePromoArtwork';
import { HomeServiceIllustration, type HomeServiceKind } from './HomeServiceIllustrations';

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

export type FleetVehicleCategory = 'VAN_500KG' | 'TRUCK_125T' | 'TRUCK_25T' | 'BIKE_3W';

export type FleetVehicleItem = Readonly<{
  id: FleetVehicleCategory;
  name: string;
  subName: string;
  weightCapacity: string;
  dimensions: string;
  dimensionLabel: string;
  estimatedPrice: string;
  vehicleCategory: VehicleCategory;
  accentColor: string;
  badge?: string;
}>;

export const FLEET_VEHICLES: readonly FleetVehicleItem[] = [
  {
    id: 'VAN_500KG', name: 'Van 500kg', subName: 'Chở hàng phố cấm',
    weightCapacity: '500 kg', dimensions: '2.1 x 1.3 x 1.2m', dimensionLabel: '2.1 x 1.3 x 1.2m',
    estimatedPrice: '160.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: '#0284C7', badge: 'Đô thị',
  },
  {
    id: 'TRUCK_125T', name: 'Xe Tải 1.25T', subName: 'Chuyển nhà & xưởng',
    weightCapacity: '1.250 kg', dimensions: '3.2 x 1.6 x 1.7m', dimensionLabel: '3.2 x 1.6 x 1.7m',
    estimatedPrice: '280.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: '#0B1E42', badge: 'Phổ biến',
  },
  {
    id: 'TRUCK_25T', name: 'Xe Tải 2.5T', subName: 'Hàng nặng liên tỉnh',
    weightCapacity: '2.500 kg', dimensions: '4.3 x 1.8 x 1.9m', dimensionLabel: '4.3 x 1.8 x 1.9m',
    estimatedPrice: '450.000 ₫', vehicleCategory: 'HEAVY_TRUCK', accentColor: '#0B1E42', badge: 'Tải lớn',
  },
  {
    id: 'BIKE_3W', name: 'Xe Ba Gác', subName: 'Ngõ nhỏ linh hoạt',
    weightCapacity: '400 kg', dimensions: '1.8 x 1.1m', dimensionLabel: '1.8 x 1.1m',
    estimatedPrice: '120.000 ₫', vehicleCategory: '3_WHEEL_BIKE', accentColor: '#F59E0B', badge: 'Tiết kiệm',
  },
];

const DEFAULT_ACTIVE_SHIPMENT: ActiveShipment = {
  orderId: 'active-demo-1', status: 'IN_TRANSIT', origin: 'Kho Tân Bình',
  destination: 'KCN Tân Tạo', cargoNote: '2.5 tấn thép cây Hòa Phát',
  driverName: 'Trần Văn Mạnh', plate: '59C-912.45', etaMinutes: 24,
};

const DEFAULT_RECENT_ORDERS: readonly RecentOrder[] = [
  {
    id: 'demo-order-1', reference: 'LP-883912', status: 'DELIVERED',
    origin: 'Kho Tân Bình, Q. Tân Bình', destination: 'Công trình Metro Bến Thành, Q.1',
    price: '380.000 ₫', updated: 'Hôm nay, 10:45',
  },
  {
    id: 'demo-order-2', reference: 'LP-883804', status: 'DELIVERED',
    origin: 'Cảng Cát Lái, TP. Thủ Đức', destination: 'KCN Sóng Thần, Dĩ An, Bình Dương',
    price: '720.000 ₫', updated: 'Hôm qua, 16:20',
  },
];

const PROMO_SLIDES: readonly HomePromoSlide[] = [
  { id: 'promo-1', kind: 'vehicle', eyebrow: 'XE CHO MỖI NHU CẦU', title: 'Đặt xe phù hợp với hàng', subtitle: 'Chọn phương tiện theo loại hàng và tải trọng.', action: 'Chọn xe' },
  { id: 'promo-2', kind: 'address', eyebrow: 'ĐẶT HÀNG THUẬN TIỆN', title: 'Lên đơn từ địa chỉ đã lưu', subtitle: 'Dùng lại điểm lấy và giao quen thuộc khi tạo đơn.', action: 'Tạo đơn mới' },
  { id: 'promo-3', kind: 'tracking', eyebrow: 'CHỦ ĐỘNG THEO DÕI', title: 'Theo dõi từng chặng giao', subtitle: 'Xem trạng thái và ETA dự kiến trong hành trình.', action: 'Bắt đầu gửi hàng' },
];

type QuickService = Readonly<{
  id: string; vehicleId?: VehicleCategory; name: string; label: string; tag: string;
  iconType: HomeServiceKind; accentColor: string; borderColor: string; surfaceColor: string; tagSurfaceColor: string;
}>;

const quickServices: readonly QuickService[] = [
  { id: '3_WHEEL_BIKE', vehicleId: '3_WHEEL_BIKE', label: 'Xe Ba Gác', name: 'Ba gác', tag: '< 500kg', iconType: '3wheel', accentColor: '#1D4ED8', borderColor: '#B9D5FF', surfaceColor: '#EAF3FF', tagSurfaceColor: '#DCEBFF' },
  { id: 'LIGHT_TRUCK', vehicleId: 'LIGHT_TRUCK', label: 'Xe Tải Nhẹ', name: 'Tải nhẹ', tag: '≤ 1.5 tấn', iconType: 'light', accentColor: '#047D95', borderColor: '#A8DFEA', surfaceColor: '#E8FAFD', tagSurfaceColor: '#D4F3F8' },
  { id: 'HEAVY_TRUCK', vehicleId: 'HEAVY_TRUCK', label: 'Xe Tải Nặng', name: 'Tải nặng', tag: '5–10 tấn', iconType: 'heavy', accentColor: '#334155', borderColor: '#C3CDDB', surfaceColor: '#EEF2F7', tagSurfaceColor: '#E1E8F0' },
  { id: 'EXPRESS', label: 'Giao Hỏa Tốc', name: 'Hỏa tốc', tag: 'Giao ưu tiên', iconType: 'express', accentColor: '#D97706', borderColor: '#F6C76D', surfaceColor: '#FFF5D8', tagSurfaceColor: '#FFE7A3' },
  { id: 'LOADING', label: 'Dịch Vụ Bốc Xếp', name: 'Bốc xếp', tag: 'Kèm phụ xe', iconType: 'loading', accentColor: '#C2410C', borderColor: '#FDBA8C', surfaceColor: '#FFF0E6', tagSurfaceColor: '#FED7BA' },
  { id: 'COD', label: 'Thu Hộ COD', name: 'Thu COD', tag: 'Thu hộ tiền hàng', iconType: 'cod', accentColor: '#13855F', borderColor: '#A7DCC8', surfaceColor: '#EAF8F1', tagSurfaceColor: '#D2F2E2' },
];

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'evening';
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const time = getTimeOfDay(date);
  if (time === 'morning') return 'Chào buổi sáng';
  if (time === 'afternoon') return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function AnimatedGreetingIcon({ size = 20 }: { timeOfDay?: TimeOfDay; size?: number }) {
  return <IconClock color="#F59E0B" size={size} />;
}

export type HomeDashboardScreenProps = Readonly<{
  userName?: string; userPhone?: string; smeName?: string; walletBalance?: string;
  unreadNotifications?: number; unreadMessages?: number;
  activeShipment?: ActiveShipment | null; recentOrders?: readonly RecentOrder[];
  defaultPickupLocation?: string; defaultPickupLabel?: string;
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
  onQuickBook?: (origin?: string, destination?: string, dropoffCoords?: { lat: number; lng: number }) => void;
  onOpenSavedAddresses?: () => void;
  onNavigateTab?: (tab: TabKey) => void;
  onSelectVehicleAndBook?: (vehicleId: VehicleCategory) => void;
  onTopUpWallet?: () => void;
  onOpenQrScan?: () => void;
  showFloatingNavBar?: boolean;
}>;

export function HomeDashboardScreen({
  activeShipment = DEFAULT_ACTIVE_SHIPMENT, defaultPickupLabel, defaultPickupLocation,
  onCreateOrder, onNavigateTab, onOpenActiveOrder, onOpenChat, onOpenNotifications,
  onOpenOrder, onOpenSavedAddresses, onQuickBook, onRegisterDriver, onSelectSavedAddress,
  onSelectVehicleAndBook, onSwitchRole, onViewAllOrders, recentOrders = DEFAULT_RECENT_ORDERS,
  savedAddresses, showFloatingNavBar = false, smeName = 'Cửa hàng VLXD Đại Phát',
  unreadMessages = 0, unreadNotifications = 3, userName = 'Anh Hoàng', userPhone,
}: HomeDashboardScreenProps) {
  const insets = React.useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  const deliveredRecentOrders = useMemo(
    () => recentOrders.filter((order) => order.status === 'DELIVERED'),
    [recentOrders],
  );

  const initialSaved = addressStore.getDefaultAddress();
  const initialAddress = defaultPickupLocation ?? initialSaved?.address ?? 'Kho Tân Bình, TP. Hồ Chí Minh';
  const initialLabel = defaultPickupLabel ?? initialSaved?.label ?? null;

  const [pickupText, setPickupText] = useState(initialAddress);
  const [pickupLabel, setPickupLabel] = useState<string | null>(initialLabel);
  const [dropoffText, setDropoffText] = useState('');
  const [selectedFleetId, setSelectedFleetId] = useState<FleetVehicleCategory>('TRUCK_125T');
  const [focusedField, setFocusedField] = useState<'pickup' | 'dropoff' | null>(null);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [savedAddressModalTarget, setSavedAddressModalTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<'pickup' | 'dropoff'>('pickup');
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ name?: string; phone?: string } | null>(null);
  const [addressStoreVersion, setAddressStoreVersion] = useState(0);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [quickTrackCode, setQuickTrackCode] = useState('');

  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCurrentCustomer() {
      try {
        if (sessionStore.isAuthenticated()) {
          const user = await httpClient.get<{ id: string; phone?: string | null; name?: string | null }>('/me');
          if (isMounted && user) {
            setLoggedInCustomer({ name: user.name || undefined, phone: user.phone || undefined });
          }
        }
      } catch {
        // Silently ignore if unauthenticated or network unavailable
      }
    }
    void loadCurrentCustomer();
    return () => { isMounted = false; };
  }, []);

  const triggerNavigation = useCallback(
    (pickup: string, dropoff: string, dropoffCoords?: { lat: number; lng: number }) => {
      if (hasNavigatedRef.current || !pickup.trim() || !dropoff.trim()) return;
      hasNavigatedRef.current = true;
      setIsAutoNavigating(true);
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = setTimeout(() => {
        if (onQuickBook) {
          dropoffCoords ? onQuickBook(pickup, dropoff, dropoffCoords) : onQuickBook(pickup, dropoff);
        } else {
          onCreateOrder?.();
        }
        setTimeout(() => { setIsAutoNavigating(false); hasNavigatedRef.current = false; }, 1500);
      }, 400);
    },
    [onQuickBook, onCreateOrder],
  );

  useEffect(() => {
    if (focusedField === 'dropoff' && pickupText.trim().length >= 3 && dropoffText.trim().length >= 5 && !hasNavigatedRef.current) {
      const timer = setTimeout(() => { triggerNavigation(pickupText, dropoffText); }, 900);
      return () => clearTimeout(timer);
    }
  }, [dropoffText, pickupText, focusedField, triggerNavigation]);

  const handleOpenMapPicker = (target: 'pickup' | 'dropoff') => {
    setMapTarget(target);
    setShowMapPickerModal(true);
  };

  const handleConfirmMapLocation = (finalAddress: string, extra?: { coords?: { lat: number; lng: number } }) => {
    if (mapTarget === 'pickup') {
      setPickupText(finalAddress);
      setPickupLabel(null);
      if (dropoffText.trim().length >= 3) triggerNavigation(finalAddress, dropoffText);
    } else {
      setDropoffText(finalAddress);
      if (pickupText.trim().length >= 3) triggerNavigation(pickupText, finalAddress, extra?.coords);
    }
    setShowMapPickerModal(false);
    setFocusedField(null);
  };

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

  useEffect(() => {
    const saved = addressStore.getDefaultAddress();
    if (defaultPickupLocation || saved?.address) return;
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
              addressStore.saveAddress({ label: 'Vị trí hiện tại', address: resolved, category: 'OTHER', latitude: lat, longitude: lng, isDefault: true });
              setAddressStoreVersion((v) => v + 1);
            }
          } catch {
            // Keep default
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, [defaultPickupLocation]);

  const addressList = useMemo(() => savedAddresses ?? addressStore.getAddresses(), [savedAddresses, addressStoreVersion]);

  const [bannerWidth, setBannerWidth] = useState(() => Math.max(280, Dimensions.get('window').width - 32));
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentSlideIdxRef = useRef(activeBannerIdx);
  currentSlideIdxRef.current = activeBannerIdx;

  const goToSlide = useCallback((targetIdx: number) => {
    const currentIdx = currentSlideIdxRef.current;
    if (currentIdx === targetIdx) return;
    slideAnim.stopAnimation();
    setActiveBannerIdx(targetIdx);

    if (currentIdx === PROMO_SLIDES.length - 1 && targetIdx === 0) {
      Animated.timing(slideAnim, {
        duration: 750, easing: Easing.out(Easing.cubic),
        toValue: -PROMO_SLIDES.length * bannerWidth, useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => { if (finished) slideAnim.setValue(0); });
    } else {
      Animated.timing(slideAnim, {
        duration: 750, easing: Easing.out(Easing.cubic),
        toValue: -targetIdx * bannerWidth, useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [bannerWidth, slideAnim]);

  useEffect(() => {
    const timer = setInterval(() => { goToSlide((currentSlideIdxRef.current + 1) % PROMO_SLIDES.length); }, 5000);
    return () => clearInterval(timer);
  }, [goToSlide]);

  const handleTabChange = (key: TabKey) => { setActiveTab(key); onNavigateTab?.(key); };
  const handleDriverButtonPress = () => { onRegisterDriver ? onRegisterDriver() : onSwitchRole?.('DRIVER'); };

  const greeting = useMemo(() => getTimeOfDayGreeting(), []);
  const currentFleetVehicle = useMemo(
    () => FLEET_VEHICLES.find((v) => v.id === selectedFleetId) || FLEET_VEHICLES[1],
    [selectedFleetId],
  );

  const handleFleetSelectAndBook = (vehicle: FleetVehicleItem) => {
    setSelectedFleetId(vehicle.id);
    onSelectVehicleAndBook ? onSelectVehicleAndBook(vehicle.vehicleCategory) : onCreateOrder?.();
  };

  const handleMainCtaBook = () => {
    if (dropoffText.trim().length >= 3) {
      triggerNavigation(pickupText, dropoffText);
    } else if (onSelectVehicleAndBook) {
      onSelectVehicleAndBook(currentFleetVehicle.vehicleCategory);
    } else {
      onCreateOrder?.();
    }
  };

  return (
    <View style={styles.root}>
      {/* ================= LAYER 0 (z-index 0): 100% FULL-BLEED MAP ================= */}
      <View pointerEvents="box-none" style={styles.layer0Map} testID="home-map-layer">
        <RealInteractiveMap
          destination={dropoffText ? { label: dropoffText } : undefined}
          height="100%" interactive
          mode={activeShipment ? 'tracking' : dropoffText ? 'route' : 'preview'}
          origin={pickupText ? { label: pickupText } : undefined}
          testID="home-interactive-map"
        />
      </View>

      {/* ================= LAYER 1 (z-index 20): FLOATING GLASS TOPBAR ================= */}
      <View style={[styles.layer1TopBar, { top: Math.max(topInset, 12) }]} testID="home-top-bar">
        <View style={styles.topBarIdentity}>
          <View style={styles.topBarLogoPill}><BrandLoginLogo height={20} /></View>
          <View style={styles.topBarTextWrap}>
            <Text numberOfLines={1} style={styles.topBarGreeting}>{greeting}{userName ? `, ${userName}` : ''}</Text>
            {smeName ? <Text numberOfLines={1} style={styles.topBarSmeName}>{smeName}</Text> : null}
          </View>
        </View>

        <View style={styles.topBarActions}>
          <Pressable
            accessibilityLabel="Chuyển vai trò" accessibilityRole="button"
            onPress={() => { onSwitchRole ? onSwitchRole('DRIVER') : onRegisterDriver?.(); }}
            style={styles.roleSwitchBtn}
          >
            <IconRoleDriver color="#0B1E42" size={16} />
            <Text style={styles.roleSwitchText}>Tài xế</Text>
          </Pressable>

          {onOpenNotifications ? (
            <Pressable
              accessibilityLabel={`Thông báo (${unreadNotifications} chưa đọc)`} accessibilityRole="button"
              onPress={onOpenNotifications} style={styles.iconBtn}
            >
              <IconBell color="#0B1E42" size={18} />
              {unreadNotifications > 0 ? (
                <View style={styles.badgePill}><Text style={styles.badgePillText}>{unreadNotifications}</Text></View>
              ) : null}
            </Pressable>
          ) : null}

          {onOpenChat ? (
            <Pressable
              accessibilityLabel={unreadMessages > 0 ? `Tin nhắn (${unreadMessages} chưa đọc)` : 'Tin nhắn'} accessibilityRole="button"
              onPress={onOpenChat} style={styles.iconBtn}
            >
              <IconMessage color="#0B1E42" size={18} />
              {unreadMessages > 0 ? (
                <View style={styles.badgePill}><Text style={styles.badgePillText}>{unreadMessages}</Text></View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ================= LAYER 2 (z-index 40): 3-SNAP GESTURE BOTTOM SHEET ================= */}
      <GestureBottomSheet
        initialSnapIndex={1}
        snapPoints={[0.18, 0.52, 0.92]}
        style={styles.layer2BottomSheet}
        testID="home-bottom-sheet"
      >
        <ScrollView contentContainerStyle={styles.sheetScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* 1. Route Booking Card (testID="home-booking") */}
          <View style={styles.routeBookingCard} testID="home-booking">
            <View style={styles.routeBox}>
              <View style={styles.spineColumn}>
                <View style={styles.pickupPinCircle}><View style={styles.pickupPinInner} /></View>
                <View style={styles.spineLine} />
                <View style={styles.dropoffPinSquare} />
              </View>

              <View style={styles.inputsColumn}>
                {/* Điểm lấy hàng */}
                <View style={styles.routeInputRow}>
                  <View style={styles.inputInnerWrap}>
                    <View style={styles.locationHeaderRow}>
                      <Text style={styles.inputMicroLabel}>ĐIỂM LẤY HÀNG</Text>
                      {pickupLabel ? (
                        <View style={styles.pickupLabelBadge}>
                          <IconWarehouse color="#0284C7" size={12} />
                          <Text style={styles.pickupLabelBadgeText}>{pickupLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                    <TextInput
                      accessibilityLabel="Địa điểm lấy hàng" autoCapitalize="none" autoCorrect={false}
                      onChangeText={(t) => { setPickupText(t); if (pickupLabel) setPickupLabel(null); }}
                      onFocus={() => setFocusedField('pickup')} placeholder="Nhập địa chỉ lấy hàng..."
                      placeholderTextColor="#94A3B8" style={styles.locationTextInput} testID="cr-pickup-input" value={pickupText}
                    />
                  </View>
                  {pickupText.length > 0 ? (
                    <Pressable accessibilityLabel="Xóa điểm lấy hàng" accessibilityRole="button" hitSlop={8} onPress={() => { setPickupText(''); setPickupLabel(null); }} style={styles.inputActionBtn}>
                      <IconClose color="#94A3B8" size={14} />
                    </Pressable>
                  ) : null}
                  <Pressable accessibilityLabel="Mở bản đồ chọn điểm lấy" accessibilityRole="button" hitSlop={8} onPress={() => handleOpenMapPicker('pickup')} style={styles.inputActionBtn}>
                    <IconPin color="#0B1E42" size={16} />
                  </Pressable>
                </View>

                <View style={styles.inputDivider} />

                {/* Điểm giao hàng */}
                <View style={styles.routeInputRow}>
                  <View style={styles.inputInnerWrap}>
                    <Text style={styles.inputMicroLabel}>ĐIỂM GIAO HÀNG</Text>
                    <TextInput
                      accessibilityLabel="Địa điểm giao hàng" autoCapitalize="none" autoCorrect={false}
                      onChangeText={setDropoffText} onFocus={() => setFocusedField('dropoff')}
                      onSubmitEditing={() => { if (pickupText.trim().length >= 3 && dropoffText.trim().length >= 3) triggerNavigation(pickupText, dropoffText); }}
                      placeholder="Bạn muốn giao hàng đến đâu?..." placeholderTextColor="#94A3B8"
                      style={styles.locationTextInput} testID="cr-dropoff-input" value={dropoffText}
                    />
                  </View>
                  {dropoffText.length > 0 ? (
                    <Pressable accessibilityLabel="Xóa điểm giao hàng" accessibilityRole="button" hitSlop={8} onPress={() => setDropoffText('')} style={styles.inputActionBtn}>
                      <IconClose color="#94A3B8" size={14} />
                    </Pressable>
                  ) : null}
                  {pickupText.trim().length >= 3 && dropoffText.trim().length >= 3 ? (
                    <Pressable accessibilityLabel="Chuyển sang tạo đơn ngay" accessibilityRole="button" hitSlop={8} onPress={() => triggerNavigation(pickupText, dropoffText)} style={styles.fastForwardBtn} testID="quick-book-submit-btn">
                      <IconChevron color="#FFFFFF" direction="right" size={16} />
                    </Pressable>
                  ) : null}
                  <Pressable accessibilityLabel="Mở bản đồ chọn điểm giao" accessibilityRole="button" hitSlop={8} onPress={() => handleOpenMapPicker('dropoff')} style={styles.inputActionBtn}>
                    <IconPin color="#DC2626" size={16} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Dropdown Gợi ý & Xác nhận vị trí khi focus */}
            {focusedField ? (
              <View style={styles.addressDropdown} testID="address-dropdown">
                <View style={styles.dropdownHeaderRow}>
                  <Text style={styles.dropdownHeaderTitle}>{focusedField === 'pickup' ? 'ĐIỂM LẤY HÀNG' : 'ĐIỂM GIAO HÀNG'} · GỢI Ý</Text>
                  <Pressable accessibilityLabel="Đóng gợi ý" hitSlop={8} onPress={() => setFocusedField(null)} style={styles.dropdownCloseBtn}>
                    <IconClose color="#64748B" size={14} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityLabel="Xác nhận vị trí trên bản đồ" accessibilityRole="button"
                  onPress={() => { const t = focusedField || 'pickup'; setFocusedField(null); handleOpenMapPicker(t); }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                >
                  <View style={styles.dropdownIconCircle}><IconPin color="#0B1E42" size={16} /></View>
                  <View style={styles.dropdownItemTextWrap}>
                    <Text style={styles.dropdownItemTitle}>Xác nhận vị trí trên bản đồ</Text>
                    <Text style={styles.dropdownItemSub}>Ghim vị trí chính xác trực quan trên bản đồ</Text>
                  </View>
                  <IconChevron color="#94A3B8" direction="right" size={16} />
                </Pressable>
                <View style={styles.dropdownDivider} />
                <Pressable
                  accessibilityLabel="Chọn từ sổ địa chỉ" accessibilityRole="button"
                  onPress={() => { const t = focusedField || 'pickup'; setSavedAddressModalTarget(t); setFocusedField(null); setShowSavedAddressModal(true); }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                >
                  <View style={styles.dropdownIconCircle}><IconWarehouse color="#0B1E42" size={16} /></View>
                  <View style={styles.dropdownItemTextWrap}>
                    <Text style={styles.dropdownItemTitle}>Chọn từ sổ địa chỉ</Text>
                    <Text style={styles.dropdownItemSub}>Kho hàng, nhà riêng & điểm giao đã lưu</Text>
                  </View>
                  <IconChevron color="#94A3B8" direction="right" size={16} />
                </Pressable>
              </View>
            ) : null}

            {isAutoNavigating ? (
              <View style={styles.autoNavigatingBanner}>
                <View style={styles.liveIndicatorDotActive} />
                <Text style={styles.autoNavigatingText}>Đã xác định lộ trình · Đang chuyển tiếp...</Text>
              </View>
            ) : null}

            {/* Fleet Matrix Carousel */}
            <View style={styles.fleetMatrixSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>CHỌN LOẠI XE PHÙ HỢP</Text>
                <Text style={styles.sectionSubLabel}>Kích thước thùng chuẩn xác</Text>
              </View>

              <ScrollView contentContainerStyle={styles.fleetScrollContent} horizontal showsHorizontalScrollIndicator={false}>
                {FLEET_VEHICLES.map((vehicle) => {
                  const isSelected = vehicle.id === selectedFleetId;
                  return (
                    <Pressable
                      accessibilityLabel={`Chọn xe ${vehicle.name}, kích thước ${vehicle.dimensions}, giá dự kiến ${vehicle.estimatedPrice}`}
                      accessibilityRole="button" key={vehicle.id} onPress={() => handleFleetSelectAndBook(vehicle)}
                      style={[styles.fleetCard, isSelected && styles.fleetCardSelected]}
                    >
                      {vehicle.badge ? (
                        <View style={[styles.fleetBadge, isSelected && styles.fleetBadgeSelected]}>
                          <Text style={[styles.fleetBadgeText, isSelected && styles.fleetBadgeTextSelected]}>{vehicle.badge}</Text>
                        </View>
                      ) : null}
                      <View style={styles.fleetIconContainer}>
                        {vehicle.id === 'BIKE_3W' && <IconBike color={isSelected ? '#F59E0B' : '#64748B'} size={32} />}
                        {vehicle.id === 'VAN_500KG' && <IconVan color={isSelected ? '#0284C7' : '#64748B'} size={34} />}
                        {vehicle.id === 'TRUCK_125T' && <IconTruck color={isSelected ? '#0B1E42' : '#64748B'} size={34} />}
                        {vehicle.id === 'TRUCK_25T' && <IconTruck color={isSelected ? '#0B1E42' : '#64748B'} size={36} />}
                      </View>
                      <Text numberOfLines={1} style={[styles.fleetVehicleName, isSelected && styles.fleetVehicleNameSelected]}>{vehicle.name}</Text>
                      <View style={[styles.dimensionBadge, isSelected && styles.dimensionBadgeSelected]}>
                        <Text style={[styles.dimensionText, isSelected && styles.dimensionTextSelected]}>{vehicle.dimensions}</Text>
                      </View>
                      <Text style={styles.fleetCapacityText}>Tải trọng: {vehicle.weightCapacity}</Text>
                      <Text style={[styles.fleetPriceText, isSelected && styles.fleetPriceTextSelected]}>{vehicle.estimatedPrice}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Fare Estimation & Big Sticky Bottom CTA */}
              <View style={styles.fareCtaCard}>
                <View style={styles.fareInfoRow}>
                  <View style={styles.fareLeftCol}>
                    <Text style={styles.fareLabel}>ƯỚC TÍNH CƯỚC CHUYẾN</Text>
                    <View style={styles.fareVehicleTypeRow}>
                      <Text style={styles.fareVehicleName}>{currentFleetVehicle.name}</Text>
                      <View style={styles.fareDimensionChip}>
                        <Text style={styles.fareDimensionChipText}>Thùng: {currentFleetVehicle.dimensionLabel}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.fareRightCol}>
                    <Text style={styles.fareAmount}>{currentFleetVehicle.estimatedPrice}</Text>
                    <Text style={styles.fareNote}>Giá mở cửa chuẩn</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityLabel={`Đặt xe ngay ${currentFleetVehicle.name}, giá ${currentFleetVehicle.estimatedPrice}`}
                  accessibilityRole="button" onPress={handleMainCtaBook}
                  style={({ pressed }) => [styles.bigCtaBtn, pressed && styles.bigCtaBtnPressed]}
                >
                  <Text style={styles.bigCtaBtnText}>ĐẶT XE NGAY · {currentFleetVehicle.estimatedPrice}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 2. Active Shipment / Tracking Capsule (testID="home-active-shipments") */}
          <View style={styles.section} testID="home-active-shipments">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithBadge}>
                {activeShipment ? <View style={styles.liveIndicatorDotActive} /> : null}
                <Text style={styles.sectionLabel}>ĐANG VẬN CHUYỂN</Text>
              </View>
              {activeShipment ? (
                <View style={styles.liveTagBadge}><Text style={styles.liveTagText}>Trực tiếp</Text></View>
              ) : null}
            </View>

            {activeShipment ? (
              <Pressable
                accessibilityHint="Mở theo dõi lộ trình"
                accessibilityLabel={`Chuyến đang vận chuyển từ ${activeShipment.origin} đến ${activeShipment.destination}`}
                accessibilityRole="button" onPress={() => onOpenActiveOrder?.(activeShipment.orderId)}
                style={({ pressed }) => [styles.activeCard, pressed && styles.activeCardPressed]}
              >
                <View style={styles.activeTop}>
                  <StatusBadge domain="order" status={activeShipment.status} />
                  {activeShipment.etaMinutes !== undefined ? (
                    <View style={styles.etaPill}>
                      <IconClock color="#0284C7" size={14} />
                      <Text style={styles.etaText}>ETA dự kiến {activeShipment.etaMinutes} phút</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.activeRouteContainer}>
                  <RouteSpine
                    destination={{ id: 'active-dest', label: activeShipment.destination }}
                    origin={{ id: 'active-origin', label: activeShipment.origin }} stops={[]}
                  />
                </View>
                <View style={styles.activeMeta}>
                  <View style={styles.activeDriverBox}>
                    <IconRoleDriver color="#0B1E42" size={16} />
                    <Text numberOfLines={1} style={styles.driverText}>
                      {activeShipment.cargoNote ? `${activeShipment.cargoNote} · ` : ''}
                      {activeShipment.driverName ?? 'Chưa có tài xế'}
                      {activeShipment.plate ? <Text style={styles.plateText}> · {activeShipment.plate}</Text> : null}
                    </Text>
                  </View>
                  <View style={styles.activeTrackPill}><Text style={styles.trackText}>Theo dõi →</Text></View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyTitle}>Chưa có chuyến nào đang chạy</Text>
                <Text style={styles.emptyBody}>Tạo đơn vận chuyển để bắt đầu theo dõi lộ trình theo thời gian thực.</Text>
                <View style={styles.quickTrackingBar}>
                  <View style={styles.trackingInputWrap}>
                    <IconSearch color="#0B1E42" size={16} />
                    <TextInput
                      accessibilityLabel="Tra cứu mã vận đơn" autoCapitalize="characters"
                      onChangeText={setQuickTrackCode} placeholder="Tra cứu nhanh mã vận đơn..."
                      placeholderTextColor="#94A3B8" style={styles.trackingInput} value={quickTrackCode}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Tra cứu đơn hàng" accessibilityRole="button"
                    onPress={() => { quickTrackCode.trim() ? onOpenOrder?.(quickTrackCode.trim()) : onViewAllOrders?.(); }}
                    style={styles.trackingSearchBtn}
                  >
                    <Text style={styles.trackingSearchBtnText}>Tra cứu</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* 3. Transport Services & Fleet (testID="home-services") */}
          <View style={styles.section} testID="home-services">
            <View style={styles.sectionHeaderRow}><Text style={styles.sectionLabel}>DỊCH VỤ VẬN TẢI & ĐỘI XE</Text></View>
            <View style={styles.serviceGrid}>
              {quickServices.map((service) => (
                <Pressable
                  accessibilityHint="Mở màn hình tạo đơn với dịch vụ đã chọn"
                  accessibilityLabel={`Đặt nhanh ${service.label}`} accessibilityRole="button" key={service.id}
                  onPress={() => { service.vehicleId && onSelectVehicleAndBook ? onSelectVehicleAndBook(service.vehicleId) : onCreateOrder?.(); }}
                  style={({ pressed }) => [styles.serviceCard, { borderColor: service.borderColor }, pressed && styles.serviceCardPressed]}
                >
                  <View accessible={false} style={[styles.serviceImageContainer, { backgroundColor: service.surfaceColor, borderColor: service.borderColor }]}>
                    <HomeServiceIllustration kind={service.iconType} />
                  </View>
                  <Text numberOfLines={1} style={styles.serviceName}>{service.name}</Text>
                  <View style={[styles.serviceTagBadge, { backgroundColor: service.tagSurfaceColor, borderColor: service.borderColor }]}>
                    <Text numberOfLines={1} style={[styles.serviceTagText, { color: service.accentColor }]}>{service.tag}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 4. Driver Partner Partnership Card */}
          <View style={styles.driverPartnerCard}>
            <View style={styles.driverPartnerLeft}>
              <View style={styles.driverPartnerIconBox}><IconRoleDriver color="#1D4ED8" size={20} /></View>
              <View style={styles.driverPartnerTextWrap}>
                <Text style={styles.driverPartnerTitle}>Gia nhập tài xế LEOPARD</Text>
                <Text style={styles.driverPartnerSubtitle}>Tăng thu nhập với các cuốc xe linh hoạt</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Đăng ký tài xế" accessibilityRole="button"
              onPress={handleDriverButtonPress} style={styles.driverRegisterBtn} testID="home-driver-btn"
            >
              <Text style={styles.driverRegisterText}>Đăng ký tài xế</Text>
            </Pressable>
          </View>

          {/* 5. Operational Signal Promo Carousel */}
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
              <Animated.View style={[styles.promoTrack, { width: bannerWidth * (PROMO_SLIDES.length + 1), transform: [{ translateX: slideAnim }] }]}>
                {PROMO_SLIDES.map((slide) => (
                  <Pressable accessibilityLabel={`Ưu đãi: ${slide.title}`} accessibilityRole="button" key={slide.id} onPress={() => onCreateOrder?.()} style={[styles.promoSlideItem, { width: bannerWidth }]}>
                    <HomePromoArtwork slide={slide} />
                  </Pressable>
                ))}
                <Pressable accessibilityElementsHidden accessibilityRole="button" importantForAccessibility="no" key="promo-slide-clone" onPress={() => onCreateOrder?.()} style={[styles.promoSlideItem, { width: bannerWidth }]}>
                  <HomePromoArtwork slide={PROMO_SLIDES[0]} />
                </Pressable>
              </Animated.View>
            </View>
            <View style={styles.dotsRow}>
              {PROMO_SLIDES.map((slide, idx) => (
                <Pressable
                  accessibilityLabel={`Chuyển đến ưu đãi ${idx + 1}`} accessibilityRole="button" hitSlop={6}
                  key={slide.id} onPress={() => goToSlide(idx)}
                  style={[styles.dot, activeBannerIdx === idx ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          </View>

          {/* 6. Recent Delivered Orders Ledger */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ĐƠN GẦN ĐÂY</Text>
              <Pressable accessibilityLabel="Xem tất cả đơn hàng" accessibilityRole="button" onPress={onViewAllOrders}>
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
                          accessibilityLabel={`Đặt lại chuyến ${order.reference}`} accessibilityRole="button" hitSlop={6}
                          onPress={(e) => {
                            if (Platform.OS === 'web') (e as any).stopPropagation?.();
                            setPickupText(order.origin);
                            setDropoffText(order.destination);
                            triggerNavigation(order.origin, order.destination);
                          }}
                          style={({ pressed }) => [styles.reorderInlineBtn, pressed && styles.reorderInlineBtnPressed]}
                        >
                          <Text style={styles.reorderInlineBtnText}>Đặt lại chuyến này →</Text>
                        </Pressable>
                      }
                      destination={{ id: `${order.id}-dest`, label: order.destination }}
                      metadata={[
                        ...(order.price ? [{ id: 'price', label: 'Giá', value: order.price }] : []),
                        ...(order.updated ? [{ id: 'updated', label: 'Cập nhật', value: order.updated }] : []),
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
                <Text style={styles.emptyBody}>Đơn đã giao thành công sẽ hiển thị tại đây để bạn có thể đặt lại nhanh chóng.</Text>
              </View>
            )}
          </View>

          <View style={{ height: showFloatingNavBar ? 100 : 40 }} />
        </ScrollView>
      </GestureBottomSheet>

      {/* ================= LAYER 3 (z-index 60): 2026 LIQUID GLASS FLOATING DOCK ================= */}
      {showFloatingNavBar ? (
        <View pointerEvents="box-none" style={styles.layer3FloatingNav} testID="home-nav-dock">
          <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        </View>
      ) : null}

      {/* ================= MODAL SỔ ĐỊA CHỈ ================= */}
      <SavedAddressPickerModal
        addressList={addressList} currentAddress={savedAddressModalTarget === 'pickup' ? pickupText : dropoffText}
        onClose={() => setShowSavedAddressModal(false)}
        onDeleteAddress={(id) => { addressStore.deleteAddress(id); setAddressStoreVersion((v) => v + 1); }}
        onOpenMapPicker={(target) => { setShowSavedAddressModal(false); handleOpenMapPicker(target); }}
        onOpenSavedAddresses={onOpenSavedAddresses ? () => { setShowSavedAddressModal(false); onOpenSavedAddresses(); } : undefined}
        onSelectAddress={(addr) => {
          if (savedAddressModalTarget === 'pickup') {
            setPickupText(addr.address); setPickupLabel(addr.label); addressStore.setDefaultAddress(addr.id);
            if (dropoffText.trim().length >= 3) triggerNavigation(addr.address, dropoffText);
          } else {
            setDropoffText(addr.address);
            if (pickupText.trim().length >= 3) {
              const coords = typeof addr.latitude === 'number' && typeof addr.longitude === 'number' ? { lat: addr.latitude, lng: addr.longitude } : undefined;
              triggerNavigation(pickupText, addr.address, coords);
            }
          }
          onSelectSavedAddress?.(addr); setShowSavedAddressModal(false);
        }}
        target={savedAddressModalTarget} visible={showSavedAddressModal}
      />

      {/* ================= MODAL XÁC NHẬN BẢN ĐỒ ================= */}
      <MapAddressPickerModal
        defaultFallbackAddress={initialAddress} initialAddress={mapTarget === 'pickup' ? pickupText : dropoffText}
        loggedInCustomer={loggedInCustomer} onClose={() => setShowMapPickerModal(false)}
        onConfirm={handleConfirmMapLocation} target={mapTarget} userName={userName} userPhone={userPhone} visible={showMapPickerModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', position: 'relative', overflow: 'hidden' },

  /* Layer 0: Full-bleed Map */
  layer0Map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },

  /* Layer 1: Floating Glass TopBar */
  layer1TopBar: {
    position: 'absolute', left: 16, right: 16, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    ...Platform.select({ web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any }),
  },
  topBarIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  topBarLogoPill: { paddingRight: 10, borderRightWidth: 1, borderRightColor: 'rgba(11, 30, 66, 0.08)', marginRight: 10 },
  topBarTextWrap: { flex: 1 },
  topBarGreeting: { fontSize: 12, fontWeight: '700', color: '#0B1E42' },
  topBarSmeName: { fontSize: 11, fontWeight: '500', color: '#64748B', marginTop: 1 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleSwitchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  roleSwitchText: { fontSize: 12, fontWeight: '700', color: '#0B1E42' },
  iconBtn: { width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badgePill: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgePillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  /* Layer 2: Gesture Bottom Sheet & Scroll Content */
  layer2BottomSheet: { zIndex: 40 },
  sheetScrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  /* Route Booking Card */
  routeBookingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
    borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, marginBottom: 16,
  },
  routeBox: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  spineColumn: { width: 24, alignItems: 'center', paddingVertical: 10 },
  pickupPinCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(2, 132, 199, 0.2)', alignItems: 'center', justifyContent: 'center' },
  pickupPinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0284C7' },
  spineLine: { flex: 1, width: 2, backgroundColor: '#CBD5E1', marginVertical: 4 },
  dropoffPinSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: '#DC2626' },
  inputsColumn: { flex: 1, marginLeft: 10 },
  routeInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  inputInnerWrap: { flex: 1 },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  inputMicroLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  pickupLabelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, gap: 3 },
  pickupLabelBadgeText: { fontSize: 10, fontWeight: '700', color: '#0284C7' },
  locationTextInput: { fontSize: 14, fontWeight: '600', color: '#0F172A', padding: 0, minHeight: 22 },
  inputDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 },
  inputActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  fastForwardBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0B1E42', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  /* Dropdown Suggestions */
  addressDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginTop: 10,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  dropdownHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dropdownHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  dropdownCloseBtn: { padding: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dropdownItemPressed: { opacity: 0.7 },
  dropdownIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dropdownItemTextWrap: { flex: 1 },
  dropdownItemTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  dropdownItemSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  autoNavigatingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 10, padding: 8, marginTop: 8, gap: 8 },
  autoNavigatingText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  /* Fleet Matrix Section */
  fleetMatrixSection: { marginTop: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#0B1E42', letterSpacing: 0.5 },
  sectionSubLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  fleetScrollContent: { paddingVertical: 4 },
  fleetCard: { width: 144, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, marginRight: 10, borderWidth: 1.5, borderColor: '#E2E8F0', position: 'relative' },
  fleetCardSelected: { borderColor: '#0B1E42', backgroundColor: '#F8FAFC' },
  fleetBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fleetBadgeSelected: { backgroundColor: '#0B1E42' },
  fleetBadgeText: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  fleetBadgeTextSelected: { color: '#FFFFFF' },
  fleetIconContainer: { height: 44, justifyContent: 'center', marginBottom: 4 },
  fleetVehicleName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  fleetVehicleNameSelected: { color: '#0B1E42' },
  dimensionBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginVertical: 4 },
  dimensionBadgeSelected: { backgroundColor: '#E2E8F0' },
  dimensionText: { fontSize: 11, fontWeight: '700', color: '#334155', fontVariant: ['tabular-nums'] },
  dimensionTextSelected: { color: '#0B1E42' },
  fleetCapacityText: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  fleetPriceText: { fontSize: 13, fontWeight: '800', color: '#0F172A', fontVariant: ['tabular-nums'] },
  fleetPriceTextSelected: { color: '#0B1E42' },

  /* Fare Estimation Card & Big CTA Button */
  fareCtaCard: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  fareInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fareLeftCol: { flex: 1 },
  fareLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  fareVehicleTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  fareVehicleName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  fareDimensionChip: { backgroundColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  fareDimensionChipText: { fontSize: 10, fontWeight: '600', color: '#334155' },
  fareRightCol: { alignItems: 'flex-end' },
  fareAmount: { fontSize: 16, fontWeight: '800', color: '#0B1E42', fontVariant: ['tabular-nums'] },
  fareNote: { fontSize: 10, color: '#64748B' },
  bigCtaBtn: {
    minHeight: 48, height: 52, borderRadius: 16, backgroundColor: '#0B1E42',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
  },
  bigCtaBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  bigCtaBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4, fontVariant: ['tabular-nums'] },

  /* Section Containers */
  section: { marginBottom: 16 },
  sectionTitleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveIndicatorDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveTagBadge: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveTagText: { fontSize: 10, fontWeight: '800', color: '#059669' },

  /* Active Shipment Card */
  activeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  activeCardPressed: { opacity: 0.85 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  etaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  etaText: { fontSize: 11, fontWeight: '700', color: '#0284C7', fontVariant: ['tabular-nums'] },
  activeRouteContainer: { marginVertical: 4 },
  activeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  activeDriverBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 },
  driverText: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  plateText: { fontWeight: '700', color: '#0B1E42', fontVariant: ['tabular-nums'] },
  activeTrackPill: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  trackText: { fontSize: 11, fontWeight: '700', color: '#0B1E42' },

  /* Empty Activity Box & Quick Tracking */
  emptyActivityBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  emptyBody: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 10 },
  quickTrackingBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackingInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  trackingInput: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0F172A', padding: 0 },
  trackingSearchBtn: { backgroundColor: '#0B1E42', borderRadius: 12, paddingHorizontal: 14, height: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  trackingSearchBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  /* Service Shortcuts Grid */
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: { width: '48%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, borderWidth: 1 },
  serviceCardPressed: { opacity: 0.85 },
  serviceImageContainer: { height: 80, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  serviceTagBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1 },
  serviceTagText: { fontSize: 10, fontWeight: '700' },

  /* Driver Partner Card */
  driverPartnerCard: {
    backgroundColor: '#EFF6FF', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16,
  },
  driverPartnerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 10 },
  driverPartnerIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  driverPartnerTextWrap: { flex: 1 },
  driverPartnerTitle: { fontSize: 13, fontWeight: '800', color: '#1E3A8A' },
  driverPartnerSubtitle: { fontSize: 11, color: '#3B82F6', marginTop: 1 },
  driverRegisterBtn: { backgroundColor: '#1D4ED8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  driverRegisterText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  /* Promo Banner Carousel */
  promoContainer: { marginBottom: 16 },
  promoTrackWindow: { overflow: 'hidden', borderRadius: 20 },
  promoTrack: { flexDirection: 'row' },
  promoSlideItem: { borderRadius: 20, overflow: 'hidden' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { height: 5, borderRadius: 2.5 },
  dotActive: { width: 20, backgroundColor: '#0B1E42' },
  dotInactive: { width: 6, backgroundColor: '#CBD5E1' },

  /* Recent Orders Ledger */
  linkText: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  orderList: { gap: 10 },
  recentOrderItemWrap: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  reorderInlineBtn: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reorderInlineBtnPressed: { opacity: 0.7 },
  reorderInlineBtnText: { fontSize: 11, fontWeight: '700', color: '#0B1E42' },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },

  /* Layer 3: Floating Navigation Dock */
  layer3FloatingNav: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60 },
});
