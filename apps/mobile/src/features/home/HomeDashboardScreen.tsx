import type { OrderStatus } from '@leopard/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  IconPlus,
  IconRoleDriver,
  IconSearch,
  IconTruck,
  IconVan,
  IconWarehouse,
  RealInteractiveMap,
  RouteSpine,
  StatusBadge,
  describeGeolocationFailure,
  haptic,
  httpClient,
  iosContinuousCurve,
  layout,
  sessionStore,
  type TabKey,
  type VehicleCategory,
} from '@leopard/mobile-core';

import { addressStore, type SavedAddress } from '../customer/addresses/address-store';
import { tabBarVisibilityStore } from '../../navigation/tabBarVisibilityStore';
import { searchVietmapWithCoords } from './services/vietmap-search';
import {
  BookingDetailsModal,
  reverseGeocodeCoords,
  SavedAddressPickerModal,
  type BookingDetails,
  type BookingPaymentMethod,
} from './components';

export type ActiveShipment = Readonly<{
  orderId: string;
  status: OrderStatus;
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
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

export type StopItem = Readonly<{
  id: string;
  address: string;
  coords?: { lat: number; lng: number };
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

export const FLEET_LOADING_FEES: Record<FleetVehicleCategory, number> = {
  BIKE_3W: 60000,
  VAN_500KG: 100000,
  TRUCK_125T: 150000,
  TRUCK_25T: 250000,
};

// Giá mở cửa chuẩn — khớp PR business model (Task 4):
// Ba gác 70k · Van 500kg 130k · Tải 1.25T 200k · Tải 2.5T 320k.
export const FLEET_VEHICLES: readonly FleetVehicleItem[] = [
  {
    id: 'VAN_500KG', name: 'Van 500kg', subName: 'Chở hàng phố cấm',
    weightCapacity: '500 kg', dimensions: '2.1 x 1.3 x 1.2m', dimensionLabel: '2.1 x 1.3 x 1.2m',
    estimatedPrice: '130.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: '#0284C7', badge: 'Đô thị',
  },
  {
    id: 'TRUCK_125T', name: 'Xe Tải 1.25T', subName: 'Chuyển nhà & xưởng',
    weightCapacity: '1.250 kg', dimensions: '3.2 x 1.6 x 1.7m', dimensionLabel: '3.2 x 1.6 x 1.7m',
    estimatedPrice: '200.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: '#0B1E42', badge: 'Phổ biến',
  },
  {
    id: 'TRUCK_25T', name: 'Xe Tải 2.5T', subName: 'Hàng nặng liên tỉnh',
    weightCapacity: '2.500 kg', dimensions: '4.3 x 1.8 x 1.9m', dimensionLabel: '4.3 x 1.8 x 1.9m',
    estimatedPrice: '320.000 ₫', vehicleCategory: 'HEAVY_TRUCK', accentColor: '#0B1E42', badge: 'Tải lớn',
  },
  {
    id: 'BIKE_3W', name: 'Xe Ba Gác', subName: 'Ngõ nhỏ linh hoạt',
    weightCapacity: '400 kg', dimensions: '1.8 x 1.1m', dimensionLabel: '1.8 x 1.1m',
    estimatedPrice: '70.000 ₫', vehicleCategory: '3_WHEEL_BIKE', accentColor: '#F59E0B', badge: 'Tiết kiệm',
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

export interface LocationSuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  coords?: { lat: number; lng: number };
}

export function stripVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function searchPlacesDirect(query: string): readonly LocationSuggestionItem[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }
  const cleanQ = stripVietnameseAccents(trimmed);
  const REAL_VIETNAM_PLACES: readonly LocationSuggestionItem[] = [
    {
      id: 'pl-1',
      title: '120 Trường Chinh',
      subtitle: 'Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
      address: '120 Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
    },
    {
      id: 'pl-2',
      title: 'Đường Cộng Hòa',
      subtitle: 'Phường 13, Quận Tân Bình, TP. Hồ Chí Minh',
      address: 'Đường Cộng Hòa, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh',
    },
    {
      id: 'pl-3',
      title: 'Cảng Cát Lái',
      subtitle: 'Đường Nguyễn Thị Định, TP. Thủ Đức, TP. Hồ Chí Minh',
      address: 'Cảng Cát Lái, Đường Nguyễn Thị Định, TP. Thủ Đức, TP. Hồ Chí Minh',
    },
    {
      id: 'pl-4',
      title: 'Sân bay Tân Sơn Nhất',
      subtitle: 'Đường Trường Sơn, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
      address: 'Sân bay Tân Sơn Nhất, Đường Trường Sơn, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
    },
    {
      id: 'pl-5',
      title: 'Chợ Bến Thành',
      subtitle: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      address: 'Chợ Bến Thành, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    },
  ];

  const matched = REAL_VIETNAM_PLACES.filter(
    (p) =>
      stripVietnameseAccents(p.title).includes(cleanQ) ||
      stripVietnameseAccents(p.subtitle).includes(cleanQ) ||
      stripVietnameseAccents(p.address).includes(cleanQ),
  );

  return matched.length > 0
    ? matched
    : [
        {
          id: `typed-${cleanQ}`,
          title: trimmed,
          subtitle: 'Địa chỉ tìm kiếm theo từ khóa',
          address: trimmed,
        },
      ];
}

export async function searchPlacesLive(
  query: string,
  apiKey?: string,
): Promise<readonly LocationSuggestionItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];
  const liveResults = await searchVietmapWithCoords(trimmed, apiKey);
  if (liveResults.length > 0) return liveResults;
  return searchPlacesDirect(trimmed);
}

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
  defaultDropoffLocation?: string;
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
  onQuickBook?: (origin?: string, destination?: string, dropoffCoords?: { lat: number; lng: number }, pickupCoords?: { lat: number; lng: number }) => void;
  onConfirmBooking?: (details: BookingDetails & {
    pickup: string;
    dropoff: string;
    pickupCoords?: { lat: number; lng: number };
    dropoffCoords?: { lat: number; lng: number };
    stops?: readonly StopItem[];
    vehicleCategory: VehicleCategory;
    vehicleName: string;
    fleetVehicleId?: FleetVehicleCategory;
  }) => void;
  onOpenSavedAddresses?: () => void;
  onNavigateTab?: (tab: TabKey) => void;
  onSelectVehicleAndBook?: (vehicleId: VehicleCategory) => void;
  onTopUpWallet?: () => void;
  onOpenQrScan?: () => void;
  hasFloatingNavBar?: boolean;
  showFloatingNavBar?: boolean;
  initialCargoImageUri?: string;
}>;

export function HomeDashboardScreen({
  activeShipment = null, defaultDropoffLocation, defaultPickupLabel, defaultPickupLocation,
  initialCargoImageUri,
  onConfirmBooking, onCreateOrder, onNavigateTab, onOpenActiveOrder, onOpenChat, onOpenNotifications,
  onOpenOrder, onOpenSavedAddresses, onQuickBook, onRegisterDriver, onSelectSavedAddress,
  onSelectVehicleAndBook, onSwitchRole, onViewAllOrders, recentOrders = [],
  savedAddresses, hasFloatingNavBar = true, showFloatingNavBar = false, smeName = 'Cửa hàng VLXD Đại Phát',
  unreadMessages = 0, unreadNotifications = 3, userName = 'Anh Hoàng', userPhone,
}: HomeDashboardScreenProps) {
  const insets = React.useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;
  const bottomInset = insets?.bottom ?? 0;
  const bottomNavPadding = hasFloatingNavBar || showFloatingNavBar
    ? layout.bottomNavClearance + bottomInset
    : 24;
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const initialSaved = addressStore.getDefaultAddress();
  const initialAddress = defaultPickupLocation ?? initialSaved?.address ?? 'Kho Tân Bình, TP. Hồ Chí Minh';
  const initialLabel = defaultPickupLabel ?? initialSaved?.label ?? null;
  const initialPickupCoords =
    initialSaved?.latitude && initialSaved?.longitude
      ? { lat: initialSaved.latitude, lng: initialSaved.longitude }
      : null;

  const [pickupText, setPickupText] = useState(initialAddress);
  const [pickupLabel, setPickupLabel] = useState<string | null>(initialLabel);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(initialPickupCoords);
  const [dropoffText, setDropoffText] = useState(defaultDropoffLocation ?? '');
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stops, setStops] = useState<readonly StopItem[]>([]);
  const [selectedFleetId, setSelectedFleetId] = useState<FleetVehicleCategory>('TRUCK_125T');
  const [focusedField, setFocusedField] = useState<'pickup' | 'dropoff' | `stop:${string}` | null>(null);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [savedAddressModalTarget, setSavedAddressModalTarget] = useState<'pickup' | 'dropoff' | `stop:${string}`>('pickup');
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ name?: string; phone?: string } | null>(null);
  const [addressStoreVersion, setAddressStoreVersion] = useState(0);
  // Geolocation is unavailable on an insecure origin, and browsers refuse it
  // silently. Without surfacing that, the pickup field just stays empty and the
  // customer has no idea why "vị trí hiện tại" did nothing.
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);

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
          onQuickBook(
            pickup,
            dropoff,
            dropoffCoords || undefined,
            pickupCoords || undefined,
          );
        } else {
          onCreateOrder?.();
        }
        setTimeout(() => { setIsAutoNavigating(false); hasNavigatedRef.current = false; }, 1500);
      }, 400);
    },
    [onQuickBook, onCreateOrder, pickupCoords],
  );

  useEffect(() => {
    if (defaultPickupLocation) {
      setPickupText(defaultPickupLocation);
      setPickupLabel(defaultPickupLabel ?? null);
    } else {
      const saved = addressStore.getDefaultAddress();
      if (saved?.address) {
        setPickupText(saved.address);
        setPickupLabel(saved.label || null);
        if (saved.latitude && saved.longitude) {
          setPickupCoords({ lat: saved.latitude, lng: saved.longitude });
        }
      }
    }
  }, [defaultPickupLocation, defaultPickupLabel]);

  useEffect(() => {
    if (defaultDropoffLocation !== undefined) {
      setDropoffText(defaultDropoffLocation);
    }
  }, [defaultDropoffLocation]);

  useEffect(() => {
    const saved = addressStore.getDefaultAddress();
    if (defaultPickupLocation || saved?.address) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNotice('Thiết bị không hỗ trợ định vị — vui lòng nhập điểm lấy hàng thủ công.');
      return;
    }
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
            setLocationNotice(null);
            addressStore.saveAddress({ label: 'Vị trí hiện tại', address: resolved, category: 'OTHER', latitude: lat, longitude: lng, isDefault: true });
            setAddressStoreVersion((v) => v + 1);
          }
        } catch {
          // Keep default
        }
      },
      (error) => {
        // PositionUnavailable (2) and Timeout (3) are ordinary outdoors, so the
        // wording stays about what to do next rather than blaming the device.
        setLocationNotice(describeGeolocationFailure(error));
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [defaultPickupLocation]);

  const addressList = useMemo(() => savedAddresses ?? addressStore.getAddresses(), [savedAddresses, addressStoreVersion]);

  const filledStops = useMemo(
    () => stops.filter((s) => s.address.trim().length > 0),
    [stops],
  );
  const mapStops = useMemo(
    () =>
      filledStops.map((s) => ({
        id: s.id,
        label: s.address,
        coords: s.coords,
      })),
    [filledStops],
  );

  const handleTabChange = (key: TabKey) => { setActiveTab(key); onNavigateTab?.(key); };

  const greeting = useMemo(() => getTimeOfDayGreeting(), []);
  const hasSelectedDropoff = dropoffText.trim().length >= 3;
  const currentFleetVehicle = useMemo(
    () => FLEET_VEHICLES.find((v) => v.id === selectedFleetId) || FLEET_VEHICLES[1],
    [selectedFleetId],
  );
  const currentBasePrice = Number(currentFleetVehicle.estimatedPrice.replace(/[^0-9]/g, '')) || 200000;

  // Hide the home tab bar while the booking flow is active (dropoff picked).
  // Single bottom action (action bar CTA) owns the thumb zone per iOS HIG.
  useEffect(() => {
    tabBarVisibilityStore.setHidden(hasSelectedDropoff && !activeShipment);
    return () => {
      tabBarVisibilityStore.setHidden(false);
    };
  }, [hasSelectedDropoff, activeShipment]);

  const handleAddStop = useCallback(() => {
    if (stops.length >= 3) return;
    haptic.light();
    const newId = `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newStop: StopItem = {
      id: newId,
      address: '',
    };
    setStops((prev) => [...prev, newStop]);
    setFocusedField(`stop:${newId}`);
  }, [stops.length]);

  const handleRemoveStop = useCallback((stopId: string) => {
    haptic.light();
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    setFocusedField((current) => (current === `stop:${stopId}` ? null : current));
  }, []);

  const handleUpdateStop = useCallback(
    (stopId: string, address: string, coords?: { lat: number; lng: number }) => {
      setStops((prev) =>
        prev.map((s) =>
          s.id === stopId ? { ...s, address, ...(coords ? { coords } : {}) } : s,
        ),
      );
    },
    [],
  );

  const activeSearchQuery =
    focusedField === 'pickup'
      ? pickupText
      : focusedField === 'dropoff'
      ? dropoffText
      : focusedField?.startsWith('stop:')
      ? stops.find((s) => `stop:${s.id}` === focusedField)?.address ?? ''
      : '';
  const [liveSuggestions, setLiveSuggestions] = useState<readonly LocationSuggestionItem[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focusedField) return;
    const q = activeSearchQuery.trim();
    if (q.length < 2) {
      setLiveSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    setLiveSuggestions(searchPlacesDirect(q));
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    searchDebounceTimerRef.current = setTimeout(async () => {
      try {
        const liveResults = await searchPlacesLive(q);
        setLiveSuggestions(liveResults);
      } catch {
        setLiveSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 200);

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [activeSearchQuery, focusedField]);

  const handleFleetSelectAndBook = (vehicle: FleetVehicleItem) => {
    haptic.selection();
    setSelectedFleetId(vehicle.id);
    onSelectVehicleAndBook?.(vehicle.vehicleCategory);
  };

  const handleConfirmBooking = (details: BookingDetails) => {
    setShowBookingDetailsModal(false);
    if (onConfirmBooking) {
      onConfirmBooking({
        ...details,
        pickup: pickupText,
        dropoff: dropoffText,
        pickupCoords: pickupCoords || undefined,
        dropoffCoords: dropoffCoords || undefined,
        stops,
        vehicleCategory: currentFleetVehicle.vehicleCategory,
        vehicleName: currentFleetVehicle.name,
        fleetVehicleId: currentFleetVehicle.id,
      });
    } else if (onQuickBook) {
      onQuickBook(
        pickupText,
        dropoffText,
        dropoffCoords || undefined,
        pickupCoords || undefined,
      );
    } else {
      onCreateOrder?.();
    }
  };

  const handleMainCtaBook = () => {
    haptic.light();
    onSelectVehicleAndBook?.(currentFleetVehicle.vehicleCategory);
    if (hasSelectedDropoff) {
      setShowBookingDetailsModal(true);
    } else {
      setFocusedField('dropoff');
    }
  };

  return (
    <View style={styles.root}>
      {/* ================= LAYER 0 (z-index 0): 100% FULL-BLEED MAP ================= */}
      <View pointerEvents="box-none" style={styles.layer0Map} testID="home-map-layer">
        <RealInteractiveMap
          destination={
            activeShipment
              ? {
                  label: activeShipment.destination,
                  coords: activeShipment.destinationCoords,
                }
              : hasSelectedDropoff
                ? { label: dropoffText, coords: dropoffCoords || undefined }
                : undefined
          }
          height="100%" interactive
          mode={activeShipment ? 'tracking' : hasSelectedDropoff ? 'route' : 'preview'}
          origin={
            activeShipment
              ? {
                  label: activeShipment.origin,
                  coords: activeShipment.originCoords,
                }
              : pickupText
                ? { label: pickupText, coords: pickupCoords || undefined }
                : undefined
          }
          stops={activeShipment ? [] : mapStops}
          truckEtaMinutes={activeShipment?.etaMinutes}
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
        <ScrollView
          style={styles.sheetScrollView}
          contentContainerStyle={styles.sheetScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Route Booking Card (testID="home-booking") */}
          <View style={styles.routeBookingCard} testID="home-booking">
            <View style={styles.routeBox}>
              {/* Điểm lấy hàng */}
              <View style={styles.unifiedRouteRow}>
                <View style={styles.nodeRail}>
                  <View style={styles.pickupPinCircle}><View style={styles.pickupPinInner} /></View>
                  <View style={styles.nodeConnector} />
                </View>
                <View style={styles.inputInnerWrap}>
                  <View style={styles.locationHeaderRow}>
                    <Text style={styles.inputMicroLabel}>ĐIỂM LẤY HÀNG</Text>
                    {pickupLabel ? (
                      <View style={styles.pickupLabelBadge} testID="pickup-label-badge">
                        <IconWarehouse color="#166534" size={12} />
                        <Text style={styles.pickupLabelBadgeText} testID="pickup-label-badge-text">{pickupLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TextInput
                    accessibilityLabel="Địa điểm lấy hàng" autoCapitalize="none" autoCorrect={false}
                    onChangeText={(t) => { setPickupText(t); if (pickupLabel) setPickupLabel(null); }}
                    onFocus={() => setFocusedField('pickup')} placeholder="Nhập địa chỉ lấy hàng..."
                    placeholderTextColor="#94A3B8" style={styles.locationTextInput} testID="cr-pickup-input" value={pickupText}
                  />
                  {locationNotice ? (
                    <Text
                      accessibilityRole="alert"
                      style={styles.locationNoticeText}
                      testID="pickup-location-notice"
                    >
                      {locationNotice}
                    </Text>
                  ) : null}
                </View>
                {pickupText.length > 0 ? (
                  <Pressable accessibilityLabel="Xóa điểm lấy hàng" accessibilityRole="button" hitSlop={8} onPress={() => { setPickupText(''); setPickupLabel(null); setPickupCoords(null); }} style={styles.inputActionBtn}>
                    <IconClose color="#94A3B8" size={14} />
                  </Pressable>
                ) : null}
              </View>

              {/* Điểm dừng trung gian */}
              {stops.map((stop, idx) => (
                <View key={stop.id} style={styles.unifiedRouteRow}>
                  <View style={styles.nodeRail}>
                    <View style={styles.nodeConnectorTop} />
                    <View style={styles.stopPinCircle}><Text style={styles.stopPinText}>{idx + 1}</Text></View>
                    <View style={styles.nodeConnector} />
                  </View>
                  <View style={styles.inputInnerWrap}>
                    <View style={styles.locationHeaderRow}>
                      <Text style={styles.inputMicroLabel}>ĐIỂM DỪNG {idx + 1}</Text>
                    </View>
                    <TextInput
                      accessibilityLabel={`Địa điểm dừng ${idx + 1}`} autoCapitalize="none" autoCorrect={false}
                      onChangeText={(t) => handleUpdateStop(stop.id, t)}
                      onFocus={() => setFocusedField(`stop:${stop.id}`)}
                      placeholder="Nhập địa chỉ điểm dừng..."
                      placeholderTextColor="#94A3B8" style={styles.locationTextInput} testID={`cr-stop-input-${idx}`} value={stop.address}
                    />
                  </View>
                  <Pressable accessibilityLabel={`Xóa điểm dừng ${idx + 1}`} accessibilityRole="button" hitSlop={8} onPress={() => handleRemoveStop(stop.id)} style={styles.inputActionBtn} testID={`cr-stop-remove-${idx}`}>
                    <IconClose color="#DC2626" size={14} />
                  </Pressable>
                </View>
              ))}

              {/* Điểm giao hàng */}
              <View style={[styles.unifiedRouteRow, styles.lastRouteRow]}>
                <View style={styles.nodeRail}>
                  <View style={styles.nodeConnectorTop} />
                  <View style={styles.dropoffPinSquare} />
                </View>
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
                  <Pressable accessibilityLabel="Xóa điểm giao hàng" accessibilityRole="button" hitSlop={8} onPress={() => { setDropoffText(''); setDropoffCoords(null); }} style={styles.inputActionBtn}>
                    <IconClose color="#94A3B8" size={14} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Add stop button */}
            {stops.length < 3 ? (
              <Pressable
                accessibilityLabel={stops.length === 0 ? 'Thêm điểm dừng' : `Thêm điểm dừng (${stops.length}/3)`}
                accessibilityRole="button"
                onPress={handleAddStop}
                style={({ pressed }) => [styles.addStopBtn, pressed && styles.addStopBtnPressed]}
                testID="cr-add-stop"
              >
                <IconPlus color="#0B1E42" size={16} />
                <Text style={styles.addStopBtnText}>
                  {stops.length === 0 ? 'Thêm điểm dừng' : `Thêm điểm dừng (${stops.length}/3)`}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.maxStopHint} testID="cr-max-stop-hint">
                <Text style={styles.maxStopHintText}>Tối đa 3 điểm dừng</Text>
              </View>
            )}

            {/* Dropdown Gợi ý & Xác nhận vị trí khi focus */}
            {focusedField ? (
              <View style={styles.addressDropdown} testID="address-dropdown">
                <View style={styles.dropdownHeaderRow}>
                  <View style={styles.dropdownHeaderLeft}>
                    <Text style={styles.dropdownHeaderTitle}>
                      {focusedField === 'pickup'
                        ? 'ĐIỂM LẤY HÀNG'
                        : focusedField === 'dropoff'
                        ? 'ĐIỂM GIAO HÀNG'
                        : `ĐIỂM DỪNG ${stops.findIndex((s) => `stop:${s.id}` === focusedField) + 1}`}{' '}
                      · GỢI Ý VỊ TRÍ
                    </Text>
                    {isSearchingLocation ? (
                      <ActivityIndicator color="#0B1E42" size="small" style={{ marginLeft: 6 }} />
                    ) : null}
                  </View>
                  <Pressable accessibilityLabel="Đóng gợi ý" hitSlop={8} onPress={() => setFocusedField(null)} style={styles.dropdownCloseBtn}>
                    <IconClose color="#64748B" size={14} />
                  </Pressable>
                </View>

                {/* Danh sách địa điểm gợi ý theo từ khóa */}
                {liveSuggestions.length > 0 ? (
                  <View style={styles.suggestionsList}>
                    {liveSuggestions.map((item) => (
                      <Pressable
                        accessibilityLabel={`Chọn gợi ý ${item.title}`}
                        accessibilityRole="button"
                        key={item.id}
                        onPress={() => {
                          haptic.selection();
                          if (focusedField === 'pickup') {
                            setPickupText(item.address);
                            setPickupLabel(item.title);
                            setPickupCoords(item.coords || null);
                          } else if (focusedField === 'dropoff') {
                            setDropoffText(item.address);
                            setDropoffCoords(item.coords || null);
                          } else if (focusedField?.startsWith('stop:')) {
                            const stopId = focusedField.slice('stop:'.length);
                            handleUpdateStop(stopId, item.address, item.coords);
                          }
                          setFocusedField(null);
                        }}
                        style={({ pressed }) => [styles.suggestionRowItem, pressed && styles.dropdownItemPressed]}
                      >
                        <View style={styles.suggestionIconBox}>
                          <IconPin color="#0B1E42" size={16} />
                        </View>
                        <View style={styles.dropdownItemTextWrap}>
                          <Text numberOfLines={1} style={styles.dropdownItemTitle}>{item.title}</Text>
                          <Text numberOfLines={1} style={styles.dropdownItemSub}>{item.subtitle}</Text>
                        </View>
                        <IconChevron color="#CBD5E1" direction="right" size={14} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptySearchHintBox}>
                    <Text style={styles.emptySearchHintText}>
                      {activeSearchQuery.trim().length >= 2
                        ? (isSearchingLocation ? 'Đang tìm kiếm...' : 'Không tìm thấy địa điểm phù hợp')
                        : 'Nhập địa chỉ hoặc tên đường để tìm kiếm...'}
                    </Text>
                  </View>
                )}

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

            {/* Progressive Disclosure: Guiding Prompt & User's Saved Addresses OR Fleet Matrix */}
            {!hasSelectedDropoff ? (
              <View style={styles.progressivePromptSection} testID="home-unselected-dropoff">
                <Text style={styles.guidingPromptText}>Nhập địa chỉ giao hàng để tính giá cước và gọi xe</Text>
                {addressList.length > 0 ? (
                  <ScrollView
                    contentContainerStyle={styles.quickHubsScrollContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    testID="quick-hubs-row"
                  >
                    {addressList.map((addr) => (
                      <Pressable
                        accessibilityLabel={`Giao đến ${addr.label || addr.address}`}
                        accessibilityRole="button"
                        key={addr.id}
                        onPress={() => setDropoffText(addr.address)}
                        style={({ pressed }) => [styles.hubChip, pressed && styles.hubChipPressed]}
                        testID={`hub-chip-${addr.label || addr.id}`}
                      >
                        <IconWarehouse color="#0B1E42" size={16} />
                        <Text style={styles.hubChipText}>{addr.label || addr.address}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ) : (
              <View style={styles.fleetMatrixSection} testID="home-fleet-matrix">
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>CHỌN LOẠI XE PHÙ HỢP</Text>
                  <Text style={styles.sectionSubLabel}>Kích thước thùng chuẩn xác</Text>
                </View>

                {/* iOS 18 Inset Grouped vertical vehicle list — full row, no truncation */}
                <View style={styles.vehicleList}>
                  {FLEET_VEHICLES.map((vehicle) => {
                    const isSelected = vehicle.id === selectedFleetId;
                    return (
                      <Pressable
                        accessibilityLabel={`Chọn xe ${vehicle.name}, kích thước ${vehicle.dimensions}, giá dự kiến ${vehicle.estimatedPrice}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={vehicle.id}
                        onPress={() => handleFleetSelectAndBook(vehicle)}
                        style={({ pressed }) => [
                          styles.vehicleRow,
                          isSelected && styles.vehicleRowSelected,
                          pressed && styles.vehicleRowPressed,
                        ]}
                        testID={`vehicle-row-${vehicle.id}`}
                      >
                        <View style={[styles.vehicleIconBox, isSelected && styles.vehicleIconBoxSelected]}>
                          {vehicle.id === 'BIKE_3W' && <IconBike color={isSelected ? '#F59E0B' : '#64748B'} size={28} />}
                          {vehicle.id === 'VAN_500KG' && <IconVan color={isSelected ? '#0284C7' : '#64748B'} size={28} />}
                          {vehicle.id === 'TRUCK_125T' && <IconTruck color={isSelected ? '#0B1E42' : '#64748B'} size={28} />}
                          {vehicle.id === 'TRUCK_25T' && <IconTruck color={isSelected ? '#0B1E42' : '#64748B'} size={30} />}
                        </View>
                        <View style={styles.vehicleMeta}>
                          <View style={styles.vehicleNameRow}>
                            <Text numberOfLines={1} style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                              {vehicle.name}
                            </Text>
                            {vehicle.badge ? (
                              <View style={[styles.vehicleBadge, isSelected && styles.vehicleBadgeSelected]}>
                                <Text style={[styles.vehicleBadgeText, isSelected && styles.vehicleBadgeTextSelected]}>
                                  {vehicle.badge}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.vehicleSpecRow}>
                            <View style={[styles.dimensionBadge, isSelected && styles.dimensionBadgeSelected]}>
                              <Text style={[styles.dimensionText, isSelected && styles.dimensionTextSelected]}>
                                {vehicle.dimensions}
                              </Text>
                            </View>
                            <Text style={styles.fleetCapacityText}> · Tải trọng: {vehicle.weightCapacity}</Text>
                          </View>
                        </View>
                        <View style={styles.vehiclePriceCol}>
                          <Text numberOfLines={1} style={[styles.vehiclePrice, isSelected && styles.vehiclePriceSelected]}>
                            {vehicle.estimatedPrice}
                          </Text>
                          <View style={[styles.selectionDot, isSelected && styles.selectionDotSelected]} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Unified iOS 18 sticky bottom action bar: Fare estimation + Primary CTA */}
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
                    accessibilityLabel={`Tiếp tục đặt xe ${currentFleetVehicle.name}, giá ${currentFleetVehicle.estimatedPrice}`}
                    accessibilityRole="button"
                    onPress={handleMainCtaBook}
                    style={({ pressed }) => [styles.bigCtaBtn, pressed && styles.bigCtaBtnPressed]}
                    testID="home-main-cta-btn"
                  >
                    <Text style={styles.bigCtaBtnText}>TIẾP TỤC ĐẶT XE · {currentFleetVehicle.estimatedPrice} ➔</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* 2. Active Shipment / Tracking Capsule (testID="home-active-shipments") */}
          {activeShipment ? (
            <View style={styles.section} testID="home-active-shipments">
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithBadge}>
                  <View style={styles.liveIndicatorDotActive} />
                  <Text style={styles.sectionLabel}>ĐANG VẬN CHUYỂN</Text>
                </View>
                <View style={styles.liveTagBadge}><Text style={styles.liveTagText}>Trực tiếp</Text></View>
              </View>

              <Pressable
                accessibilityHint="Mở theo dõi lộ trình"
                accessibilityLabel={`Chuyến đang vận chuyển từ ${activeShipment.origin} đến ${activeShipment.destination}`}
                accessibilityRole="button" onPress={() => onOpenActiveOrder?.(activeShipment.orderId)}
                style={({ pressed }) => [styles.activeCard, pressed && styles.activeCardPressed]}
              >
                <View style={styles.activeTop}>
                  <StatusBadge domain="order" status={activeShipment.status} />
                  {activeShipment.etaMinutes !== undefined ? (
                    <View style={styles.etaPill} testID="active-shipment-eta-pill">
                      <IconClock color="#0B1E42" size={14} />
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
            </View>
          ) : null}

          <View style={{ height: bottomNavPadding }} testID="home-sheet-bottom-spacer" />
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
        addressList={addressList}
        currentAddress={
          savedAddressModalTarget === 'pickup'
            ? pickupText
            : savedAddressModalTarget === 'dropoff'
            ? dropoffText
            : stops.find((s) => `stop:${s.id}` === savedAddressModalTarget)?.address || ''
        }
        onClose={() => setShowSavedAddressModal(false)}
        onOpenMapPicker={() => {}}
        onDeleteAddress={(id) => { addressStore.deleteAddress(id); setAddressStoreVersion((v) => v + 1); }}
        onOpenSavedAddresses={onOpenSavedAddresses ? () => { setShowSavedAddressModal(false); onOpenSavedAddresses(); } : undefined}
        onSelectAddress={(addr) => {
          if (savedAddressModalTarget === 'pickup') {
            setPickupText(addr.address);
            setPickupLabel(addr.label);
            if (addr.latitude && addr.longitude) {
              setPickupCoords({ lat: addr.latitude, lng: addr.longitude });
            } else {
              setPickupCoords(null);
            }
            addressStore.setDefaultAddress(addr.id);
          } else if (savedAddressModalTarget === 'dropoff') {
            setDropoffText(addr.address);
            if (addr.latitude && addr.longitude) {
              setDropoffCoords({ lat: addr.latitude, lng: addr.longitude });
            } else {
              setDropoffCoords(null);
            }
          } else if (savedAddressModalTarget.startsWith('stop:')) {
            const stopId = savedAddressModalTarget.slice('stop:'.length);
            handleUpdateStop(
              stopId,
              addr.address,
              addr.latitude && addr.longitude ? { lat: addr.latitude, lng: addr.longitude } : undefined,
            );
          }
          onSelectSavedAddress?.(addr);
          setShowSavedAddressModal(false);
          setFocusedField(null);
        }}
        target={savedAddressModalTarget === 'pickup' ? 'pickup' : 'dropoff'}
        visible={showSavedAddressModal}
      />

      {/* ================= MODAL CHI TIẾT ĐẶT XE ================= */}
      <BookingDetailsModal
        basePrice={currentBasePrice}
        dropoffAddress={dropoffText}
        initialCargoImageUri={initialCargoImageUri}
        initialReceiverName={loggedInCustomer?.name || userName}
        initialReceiverPhone={loggedInCustomer?.phone || userPhone}
        loadingFee={FLEET_LOADING_FEES[currentFleetVehicle.id]}
        onClose={() => setShowBookingDetailsModal(false)}
        onConfirm={handleConfirmBooking}
        pickupAddress={pickupText}
        stops={filledStops}
        vehicleDimensions={currentFleetVehicle.dimensions}
        vehicleName={currentFleetVehicle.name}
        visible={showBookingDetailsModal}
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
  sheetScrollView: { flex: 1, width: '100%' },
  sheetScrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  /* Route Booking Card */
  routeBookingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, ...iosContinuousCurve, padding: 12,
    borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, marginBottom: 10,
  },
  routeBox: { backgroundColor: '#F8FAFC', borderRadius: 14, ...iosContinuousCurve, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  unifiedRouteRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  lastRouteRow: { borderBottomWidth: 0 },
  nodeRail: { width: 24, alignItems: 'center', alignSelf: 'stretch', marginRight: 10 },
  nodeConnectorTop: { width: 2, height: 6, backgroundColor: '#CBD5E1' },
  nodeConnector: { flex: 1, width: 2, backgroundColor: '#CBD5E1', marginTop: 2 },
  pickupPinCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  pickupPinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  dropoffPinSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: '#DC2626', marginTop: 2 },
  stopPinCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E0F2FE', borderWidth: 1.5, borderColor: '#0284C7',
    alignItems: 'center', justifyContent: 'center',
  },
  stopPinText: { fontSize: 9, fontWeight: '700', color: '#0284C7', lineHeight: 11 },
  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, marginTop: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12, ...iosContinuousCurve,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  addStopBtnPressed: { backgroundColor: '#F1F5F9', opacity: 0.8 },
  addStopBtnText: { fontSize: 13, fontWeight: '700', color: '#0B1E42' },
  maxStopHint: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, paddingHorizontal: 12, marginTop: 8,
    backgroundColor: '#F1F5F9', borderRadius: 10,
  },
  maxStopHintText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  routeInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  inputInnerWrap: { flex: 1 },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  inputMicroLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  pickupLabelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, gap: 3 },
  pickupLabelBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  locationNoticeText: { fontSize: 11, lineHeight: 16, color: '#92400E', marginTop: 4 },
  locationTextInput: { fontSize: 14, fontWeight: '600', color: '#0F172A', padding: 0, minHeight: 22 },
  inputDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  inputActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  /* Progressive Disclosure Prompt & Quick Destination Hubs */
  progressivePromptSection: { marginTop: 12 },
  guidingPromptText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  quickHubsScrollContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  hubChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 44, minWidth: 44, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, ...iosContinuousCurve,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  hubChipPressed: { backgroundColor: '#E2E8F0', opacity: 0.85 },
  hubChipText: { fontSize: 12, fontWeight: '700', color: '#0B1E42' },

  /* Dropdown Suggestions */
  addressDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 16, ...iosContinuousCurve, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, marginTop: 8,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  dropdownHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dropdownHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  dropdownCloseBtn: { padding: 4 },
  suggestionsList: { gap: 2, marginBottom: 4 },
  emptySearchHintBox: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  emptySearchHintText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  suggestionRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 10 },
  suggestionIconBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dropdownItemPressed: { opacity: 0.7 },
  dropdownIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dropdownItemTextWrap: { flex: 1 },
  dropdownItemTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  dropdownItemSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  autoNavigatingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 10, padding: 8, marginTop: 8, gap: 8 },
  autoNavigatingText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  /* Fleet Matrix Section: iOS 18 Inset Grouped vertical list + unified action bar */
  fleetMatrixSection: { marginTop: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#0B1E42', letterSpacing: 0.5 },
  sectionSubLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  vehicleList: { backgroundColor: '#FFFFFF', borderRadius: 16, ...iosContinuousCurve, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 60 },
  vehicleRowSelected: { backgroundColor: '#F2F6FC' },
  vehicleRowPressed: { opacity: 0.85 },
  vehicleIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  vehicleIconBoxSelected: { backgroundColor: '#EAF0FA' },
  vehicleMeta: { flex: 1, minWidth: 0 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  vehicleNameSelected: { color: '#0B1E42' },
  vehicleBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vehicleBadgeSelected: { backgroundColor: '#0B1E42' },
  vehicleBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  vehicleBadgeTextSelected: { color: '#FFFFFF' },
  vehicleSpecRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  dimensionBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  dimensionBadgeSelected: { backgroundColor: '#E2E8F0' },
  dimensionText: { fontSize: 11, fontWeight: '700', color: '#334155', fontVariant: ['tabular-nums'] },
  dimensionTextSelected: { color: '#0B1E42' },
  fleetCapacityText: { fontSize: 11, color: '#64748B' },
  vehiclePriceCol: { alignItems: 'flex-end', gap: 4 },
  vehiclePrice: { fontSize: 15, fontWeight: '800', color: '#0F172A', fontVariant: ['tabular-nums'], marginLeft: 8 },
  vehiclePriceSelected: { color: '#0B1E42' },
  selectionDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  selectionDotSelected: { borderColor: '#0B1E42', backgroundColor: '#0B1E42' },

  /* Fare Estimation Card & Big CTA Button */
  fareCtaCard: { backgroundColor: '#F8FAFC', borderRadius: 16, ...iosContinuousCurve, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  fareInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
    minHeight: 44, height: 46, borderRadius: 14, ...iosContinuousCurve, backgroundColor: '#0B1E42',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3,
  },
  bigCtaBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  bigCtaBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4, fontVariant: ['tabular-nums'] },

  /* Section Containers */
  section: { marginBottom: 10 },
  sectionTitleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveIndicatorDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveTagBadge: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveTagText: { fontSize: 10, fontWeight: '800', color: '#059669' },

  /* Active Shipment Card */
  activeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, ...iosContinuousCurve, padding: 12, borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  activeCardPressed: { opacity: 0.85 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  etaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  etaText: { fontSize: 11, fontWeight: '700', color: '#0B1E42', fontVariant: ['tabular-nums'] },
  activeRouteContainer: { marginVertical: 2 },
  activeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  activeDriverBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 },
  driverText: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  plateText: { fontWeight: '700', color: '#0B1E42', fontVariant: ['tabular-nums'] },
  activeTrackPill: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  trackText: { fontSize: 11, fontWeight: '700', color: '#0B1E42' },

  /* Layer 3: Floating Navigation Dock */
  layer3FloatingNav: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60 },
});
