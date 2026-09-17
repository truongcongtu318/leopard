import type { OrderStatus } from '@leopard/shared';
import * as Location from 'expo-location';
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
  IconHome,
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
  colors,
  customerPalette,
  haptic,
  httpClient,
  iosContinuousCurve,
  layout,
  leopardPalette,
  pastelTheme,
  radius,
  resolveLocationCoords,
  sessionStore,
  spacing,
  type NearbyDriver,
  type TabKey,
  type VehicleCategory,
  typeScale,
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
    estimatedPrice: '130.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: colors.brand.blue, badge: 'Đô thị',
  },
  {
    id: 'TRUCK_125T', name: 'Xe Tải 1.25T', subName: 'Chuyển nhà & xưởng',
    weightCapacity: '1.250 kg', dimensions: '3.2 x 1.6 x 1.7m', dimensionLabel: '3.2 x 1.6 x 1.7m',
    estimatedPrice: '200.000 ₫', vehicleCategory: 'LIGHT_TRUCK', accentColor: customerPalette.primary, badge: 'Phổ biến',
  },
  {
    id: 'TRUCK_25T', name: 'Xe Tải 2.5T', subName: 'Hàng nặng liên tỉnh',
    weightCapacity: '2.500 kg', dimensions: '4.3 x 1.8 x 1.9m', dimensionLabel: '4.3 x 1.8 x 1.9m',
    estimatedPrice: '320.000 ₫', vehicleCategory: 'HEAVY_TRUCK', accentColor: customerPalette.primary, badge: 'Tải lớn',
  },
  {
    id: 'BIKE_3W', name: 'Xe Ba Gác', subName: 'Ngõ nhỏ linh hoạt',
    weightCapacity: '400 kg', dimensions: '1.8 x 1.1m', dimensionLabel: '1.8 x 1.1m',
    estimatedPrice: '70.000 ₫', vehicleCategory: '3_WHEEL_BIKE', accentColor: leopardPalette.accentYellow, badge: 'Tiết kiệm',
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
  return <IconClock color={leopardPalette.accentYellow} size={size} />;
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
  nearbyDrivers?: readonly NearbyDriver[];
}>;

function mapFleetToVehicleType(fleetId: FleetVehicleCategory): 'MOTORBIKE' | 'VAN' | 'TRUCK' {
  if (fleetId === 'BIKE_3W') return 'MOTORBIKE';
  if (fleetId === 'VAN_500KG') return 'VAN';
  return 'TRUCK';
}

export function HomeDashboardScreen({
  activeShipment = null, defaultDropoffLocation, defaultPickupLabel, defaultPickupLocation,
  initialCargoImageUri, nearbyDrivers: nearbyDriversProp,
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
  const [fetchedNearbyDrivers, setFetchedNearbyDrivers] = useState<readonly NearbyDriver[]>([]);
  const effectiveNearbyDrivers = nearbyDriversProp ?? fetchedNearbyDrivers;

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

  useEffect(() => {
    let isMounted = true;

    async function fetchNearbyDrivers() {
      const targetCoords =
        activeShipment?.originCoords ||
        pickupCoords ||
        (pickupText ? resolveLocationCoords(pickupText) : { lat: 10.7769, lng: 106.7009 });

      if (!targetCoords || typeof targetCoords.lat !== 'number' || typeof targetCoords.lng !== 'number') {
        return;
      }

      const vehicleType = mapFleetToVehicleType(selectedFleetId);

      try {
        const queryParams = `lat=${targetCoords.lat}&lng=${targetCoords.lng}&radiusM=15000&vehicleType=${vehicleType}&limit=20`;
        const res = await httpClient.get<{
          source: string;
          drivers: Array<{
            id: string;
            lat: number;
            lng: number;
            vehicleType?: string;
            distanceM?: number;
            licensePlate?: string;
          }>;
        }>(`/maps/nearby-drivers?${queryParams}`);

        if (isMounted && res && Array.isArray(res.drivers)) {
          setFetchedNearbyDrivers(res.drivers);
        }
      } catch {
        // Silently ignore if unauthenticated or network unavailable
      }
    }

    void fetchNearbyDrivers();

    const intervalTimer = setInterval(() => {
      void fetchNearbyDrivers();
    }, 20_000);

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
    };
  }, [activeShipment?.originCoords, pickupCoords, pickupText, selectedFleetId]);

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
    const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setLocationNotice('Chưa cấp quyền vị trí — vui lòng nhập điểm lấy hàng thủ công.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
        if (resolved && resolved.trim().length > 0) {
          setPickupText(resolved);
          setPickupLabel('Vị trí hiện tại');
          setLocationNotice(null);
          addressStore.saveAddress({ label: 'Vị trí hiện tại', address: resolved, category: 'OTHER', latitude: lat, longitude: lng, isDefault: true });
          setAddressStoreVersion((v) => v + 1);
        }
      } catch {
        setLocationNotice('Không lấy được vị trí hiện tại. Vui lòng nhập điểm lấy hàng thủ công.');
      }
    })();
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
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    if (!focusedField) return;
    const q = activeSearchQuery.trim();
    if (q.length < 2) {
      searchRequestIdRef.current += 1;
      setLiveSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    setLiveSuggestions(searchPlacesDirect(q));
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    const reqId = ++searchRequestIdRef.current;
    searchDebounceTimerRef.current = setTimeout(async () => {
      try {
        const liveResults = await searchPlacesLive(q);
        if (searchRequestIdRef.current === reqId) {
          setLiveSuggestions(liveResults);
        }
      } catch {
        if (searchRequestIdRef.current === reqId) {
          setLiveSuggestions([]);
        }
      } finally {
        if (searchRequestIdRef.current === reqId) {
          setIsSearchingLocation(false);
        }
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
          nearbyDrivers={effectiveNearbyDrivers}
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
              <IconBell color={customerPalette.primary} size={18} />
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
              <IconMessage color={customerPalette.primary} size={18} />
              {unreadMessages > 0 ? (
                <View style={styles.badgePill}><Text style={styles.badgePillText}>{unreadMessages}</Text></View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Floating Nearby Driver Pill on Map */}
      {effectiveNearbyDrivers.length > 0 && !activeShipment ? (
        <View
          pointerEvents="none"
          style={[styles.nearbyDriverPill, { top: Math.max(topInset, 12) + 58 }]}
          testID="nearby-driver-counter"
        >
          <View style={styles.nearbyDriverPulseDot} />
          <Text style={styles.nearbyDriverPillText}>
            {effectiveNearbyDrivers.length} {selectedFleetId === 'VAN_500KG' ? 'xe van' : selectedFleetId === 'BIKE_3W' ? 'xe ba gác' : 'xe tải'} gần bạn
          </Text>
        </View>
      ) : null}

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
                        <IconWarehouse color={colors.success.text} size={12} />
                        <Text style={styles.pickupLabelBadgeText} testID="pickup-label-badge-text">{pickupLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TextInput
                    accessibilityLabel="Địa điểm lấy hàng" autoCapitalize="none" autoCorrect={false}
                    onChangeText={(t) => { setPickupText(t); if (pickupLabel) setPickupLabel(null); }}
                    onFocus={() => setFocusedField('pickup')} placeholder="Nhập địa chỉ lấy hàng..."
                    placeholderTextColor={leopardPalette.inputPlaceholder} style={styles.locationTextInput} testID="cr-pickup-input" value={pickupText}
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
                    <IconClose color={leopardPalette.inputPlaceholder} size={14} />
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
                      placeholderTextColor={leopardPalette.inputPlaceholder} style={styles.locationTextInput} testID={`cr-stop-input-${idx}`} value={stop.address}
                    />
                  </View>
                  <Pressable accessibilityLabel={`Xóa điểm dừng ${idx + 1}`} accessibilityRole="button" hitSlop={8} onPress={() => handleRemoveStop(stop.id)} style={styles.inputActionBtn} testID={`cr-stop-remove-${idx}`}>
                    <IconClose color={colors.danger.text} size={14} />
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
                    placeholder="Bạn muốn giao hàng đến đâu?..." placeholderTextColor={leopardPalette.inputPlaceholder}
                    style={styles.locationTextInput} testID="cr-dropoff-input" value={dropoffText}
                  />
                </View>
                {dropoffText.length > 0 ? (
                  <Pressable accessibilityLabel="Xóa điểm giao hàng" accessibilityRole="button" hitSlop={8} onPress={() => { setDropoffText(''); setDropoffCoords(null); }} style={styles.inputActionBtn}>
                    <IconClose color={leopardPalette.inputPlaceholder} size={14} />
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
                <IconPlus color={customerPalette.primary} size={16} />
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
                      <ActivityIndicator color={customerPalette.primary} size="small" style={{ marginLeft: 6 }} />
                    ) : null}
                  </View>
                  <Pressable accessibilityLabel="Đóng gợi ý" hitSlop={8} onPress={() => setFocusedField(null)} style={styles.dropdownCloseBtn}>
                    <IconClose color={customerPalette.textSubtle} size={14} />
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
                          <IconPin color={customerPalette.primary} size={16} />
                        </View>
                        <View style={styles.dropdownItemTextWrap}>
                          <Text numberOfLines={1} style={styles.dropdownItemTitle}>{item.title}</Text>
                          <Text numberOfLines={1} style={styles.dropdownItemSub}>{item.subtitle}</Text>
                        </View>
                        <IconChevron color={leopardPalette.inputBorder} direction="right" size={14} />
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
                  <View style={styles.dropdownIconCircle}><IconWarehouse color={customerPalette.primary} size={16} /></View>
                  <View style={styles.dropdownItemTextWrap}>
                    <Text style={styles.dropdownItemTitle}>Chọn từ sổ địa chỉ</Text>
                    <Text style={styles.dropdownItemSub}>Kho hàng, nhà riêng & điểm giao đã lưu</Text>
                  </View>
                  <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size={16} />
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
                <Text style={styles.guidingPromptHidden}>Nhập địa chỉ giao hàng để tính giá cước và gọi xe</Text>
                <View style={styles.savedAddressesHeader}>
                  <Text style={styles.savedAddressesSectionTitle}>GỢI Ý ĐỊA CHỈ NHANH</Text>
                  <Pressable
                    accessibilityLabel="Mở sổ địa chỉ"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      setSavedAddressModalTarget('dropoff');
                      setShowSavedAddressModal(true);
                    }}
                    style={({ pressed }) => [styles.manageAddressesBtn, pressed && styles.manageAddressesBtnPressed]}
                  >
                    <Text style={styles.manageAddressesBtnText}>Sổ địa chỉ</Text>
                    <IconChevron color={customerPalette.primary} direction="right" size={12} />
                  </Pressable>
                </View>
                {addressList.length > 0 ? (
                  <ScrollView
                    contentContainerStyle={styles.quickHubsScrollContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    testID="quick-hubs-row"
                  >
                    {addressList.map((addr) => {
                      const isWarehouse = addr.label?.toLowerCase().includes('kho') || addr.address?.toLowerCase().includes('kho');
                      const isHome = addr.label?.toLowerCase().includes('nhà') || addr.address?.toLowerCase().includes('nhà');
                      const displayName = addr.label || addr.address;
                      return (
                        <Pressable
                          accessibilityLabel={`Giao đến ${displayName}`}
                          accessibilityRole="button"
                          key={addr.id}
                          onPress={() => {
                            haptic.selection();
                            setDropoffText(addr.address);
                            if (addr.latitude && addr.longitude) {
                              setDropoffCoords({ lat: addr.latitude, lng: addr.longitude });
                            }
                          }}
                          style={({ pressed }) => [styles.hubChip, pressed && styles.hubChipPressed]}
                          testID={`hub-chip-${addr.label || addr.id}`}
                        >
                          <View style={styles.hubChipIconWrap}>
                            {isHome ? (
                              <IconHome color={customerPalette.primary} size={14} />
                            ) : isWarehouse ? (
                              <IconWarehouse color={customerPalette.primary} size={14} />
                            ) : (
                              <IconPin color={customerPalette.primary} size={14} />
                            )}
                          </View>
                          <Text numberOfLines={1} style={styles.hubChipText}>
                            {displayName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Pressable
                    accessibilityLabel="Thêm địa chỉ giao hàng thường dùng"
                    accessibilityRole="button"
                    onPress={() => {
                      setSavedAddressModalTarget('dropoff');
                      setShowSavedAddressModal(true);
                    }}
                    style={({ pressed }) => [styles.emptyHubPrompt, pressed && styles.emptyHubPromptPressed]}
                  >
                    <IconPlus color={customerPalette.primary} size={14} />
                    <Text style={styles.emptyHubPromptText}>Thêm địa chỉ kho / nhà riêng thường dùng</Text>
                  </Pressable>
                )}
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
                          {vehicle.id === 'BIKE_3W' && <IconBike color={isSelected ? leopardPalette.accentYellow : customerPalette.textSubtle} size={28} />}
                          {vehicle.id === 'VAN_500KG' && <IconVan color={isSelected ? colors.brand.blue : customerPalette.textSubtle} size={28} />}
                          {vehicle.id === 'TRUCK_125T' && <IconTruck color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={28} />}
                          {vehicle.id === 'TRUCK_25T' && <IconTruck color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={30} />}
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
                      <IconClock color={customerPalette.primary} size={14} />
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
                    <IconRoleDriver color={customerPalette.primary} size={16} />
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
  root: { flex: 1, backgroundColor: customerPalette.canvas, position: 'relative', overflow: 'hidden' },

  /* Layer 0: Full-bleed Map */
  layer0Map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },

  /* Layer 1: Floating Glass TopBar */
  layer1TopBar: {
    position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: customerPalette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    ...Platform.select({ web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any }),
  },
  nearbyDriverPill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: leopardPalette.accentYellow,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  nearbyDriverPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: leopardPalette.accentYellow,
  },
  nearbyDriverPillText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.surfaceWhite,
  },
  topBarIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  topBarLogoPill: { paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: 'rgba(11, 30, 66, 0.08)', marginRight: spacing.sm },
  topBarTextWrap: { flex: 1 },
  topBarGreeting: { ...typeScale.caption1, fontWeight: '700', color: customerPalette.primary },
  topBarSmeName: { ...typeScale.caption2, fontWeight: '500', color: customerPalette.textSubtle, marginTop: 1 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roleSwitchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, backgroundColor: colors.neutral.surfaceMuted, borderRadius: radius.card, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: spacing.xxs },
  roleSwitchText: { ...typeScale.caption1, fontWeight: '700', color: customerPalette.primary },
  iconBtn: { width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.neutral.surfaceMuted, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badgePill: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger.text, minWidth: 16, height: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxs },
  badgePillText: { color: customerPalette.surfaceWhite, fontSize: typeScale.caption2.fontSize, fontWeight: '800' },

  /* Layer 2: Gesture Bottom Sheet & Scroll Content */
  layer2BottomSheet: { zIndex: 40 },
  sheetScrollView: { flex: 1, width: '100%' },
  sheetScrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  /* Route Booking Card */
  routeBookingCard: {
    backgroundColor: customerPalette.surfaceWhite, borderRadius: radius.cardXl, ...iosContinuousCurve, padding: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: customerPalette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, marginBottom: spacing.sm,
  },
  routeBox: { backgroundColor: customerPalette.canvas, borderRadius: radius.card, ...iosContinuousCurve, padding: spacing.sm, borderWidth: 1, borderColor: customerPalette.cardBorder },
  unifiedRouteRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingVertical: spacing.xxs, borderBottomWidth: 1, borderBottomColor: customerPalette.cardBorder },
  lastRouteRow: { borderBottomWidth: 0 },
  nodeRail: { width: 24, alignItems: 'center', alignSelf: 'stretch', marginRight: spacing.sm },
  nodeConnectorTop: { width: 2, height: 6, backgroundColor: leopardPalette.inputBorder },
  nodeConnector: { flex: 1, width: 2, backgroundColor: leopardPalette.inputBorder, marginTop: 2 },
  pickupPinCircle: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  pickupPinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.green },
  dropoffPinSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.danger.text, marginTop: 2 },
  stopPinCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.info.background, borderWidth: 1.5, borderColor: colors.brand.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  stopPinText: { fontSize: typeScale.caption2.fontSize, fontWeight: '700', color: colors.brand.blue, lineHeight: 11 },
  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginTop: spacing.xs,
    backgroundColor: customerPalette.canvas, borderRadius: radius.control, ...iosContinuousCurve,
    borderWidth: 1, borderColor: customerPalette.cardBorder,
  },
  addStopBtnPressed: { backgroundColor: colors.neutral.surfaceMuted, opacity: 0.8 },
  addStopBtnText: { ...typeScale.footnote, fontWeight: '700', color: customerPalette.primary },
  maxStopHint: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, paddingHorizontal: spacing.sm, marginTop: spacing.xs,
    backgroundColor: colors.neutral.surfaceMuted, borderRadius: radius.cardSm,
  },
  maxStopHintText: { ...typeScale.caption1, fontWeight: '600', color: customerPalette.textSubtle },
  routeInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  inputInnerWrap: { flex: 1, paddingRight: spacing.xs },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  inputMicroLabel: { fontSize: typeScale.caption2.fontSize, fontWeight: '800', color: customerPalette.textSubtle, letterSpacing: 0.5 },
  pickupLabelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: leopardPalette.ecoGreenBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, gap: 3 },
  pickupLabelBadgeText: { fontSize: typeScale.caption2.fontSize, fontWeight: '700', color: colors.success.text },
  locationNoticeText: { ...typeScale.caption2, lineHeight: 16, color: pastelTheme.yellowCard.text, marginTop: spacing.xxs },
  locationTextInput: { fontSize: typeScale.subheadline.fontSize, fontWeight: '600', color: customerPalette.textSlateDark, padding: 0, minHeight: 22 },
  inputDivider: { height: 1, backgroundColor: customerPalette.cardBorder, marginVertical: spacing.xxs },
  inputActionBtn: { width: 32, height: 32, borderRadius: radius.cardSm, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xxs },

  /* Progressive Disclosure Prompt & Quick Destination Hubs */
  progressivePromptSection: { marginTop: spacing.md },
  guidingPromptHidden: { height: 0, width: 0, opacity: 0, position: 'absolute' },
  savedAddressesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs, paddingHorizontal: 2 },
  savedAddressesSectionTitle: { ...typeScale.caption2, fontWeight: '800', color: customerPalette.textSubtle, letterSpacing: 0.8 },
  manageAddressesBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2 },
  manageAddressesBtnPressed: { opacity: 0.6 },
  manageAddressesBtnText: { ...typeScale.caption2, fontWeight: '700', color: customerPalette.primary },
  quickHubsScrollContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 2 },
  hubChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    height: 38, paddingHorizontal: spacing.sm,
    backgroundColor: customerPalette.canvas, borderRadius: radius.pill, ...iosContinuousCurve,
    borderWidth: 1, borderColor: customerPalette.cardBorder,
  },
  hubChipPressed: { backgroundColor: customerPalette.primaryBg, borderColor: customerPalette.primaryBorder, opacity: 0.85 },
  hubChipIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: customerPalette.surfaceWhite, alignItems: 'center', justifyContent: 'center' },
  hubChipText: { ...typeScale.caption1, fontWeight: '600', color: customerPalette.textSlateDark, maxWidth: 140 },
  emptyHubPrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: customerPalette.canvas,
    borderRadius: radius.control, ...iosContinuousCurve, borderWidth: 1, borderColor: customerPalette.cardBorder, borderStyle: 'dashed',
  },
  emptyHubPromptPressed: { opacity: 0.7 },
  emptyHubPromptText: { ...typeScale.caption2, fontWeight: '600', color: customerPalette.primary },

  /* Dropdown Suggestions */
  addressDropdown: {
    backgroundColor: customerPalette.surfaceWhite, borderRadius: radius.cardLg, ...iosContinuousCurve, borderWidth: 1, borderColor: customerPalette.cardBorder, padding: spacing.sm, marginTop: spacing.xs,
    shadowColor: customerPalette.textSlateDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  dropdownHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  dropdownHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownHeaderTitle: { ...typeScale.caption2, fontWeight: '800', color: customerPalette.textSubtle, letterSpacing: 0.5 },
  dropdownCloseBtn: { padding: spacing.xxs },
  suggestionsList: { gap: 2, marginBottom: spacing.xxs },
  emptySearchHintBox: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
  emptySearchHintText: { ...typeScale.caption1, color: leopardPalette.inputPlaceholder, fontWeight: '600' },
  suggestionRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: spacing.xxs, borderRadius: radius.cardSm },
  suggestionIconBox: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.neutral.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  dropdownItemPressed: { opacity: 0.7 },
  dropdownIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutral.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dropdownItemTextWrap: { flex: 1 },
  dropdownItemTitle: { ...typeScale.footnote, fontWeight: '700', color: customerPalette.textSlateDark },
  dropdownItemSub: { ...typeScale.caption2, color: customerPalette.textSubtle, marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: colors.neutral.surfaceMuted, marginVertical: 4 },
  autoNavigatingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success.background, borderRadius: 10, padding: 8, marginTop: 8, gap: 8 },
  autoNavigatingText: { ...typeScale.caption1, fontWeight: '700', color: colors.success.text },

  /* Fleet Matrix Section: iOS 18 Inset Grouped vertical list + unified action bar */
  fleetMatrixSection: { marginTop: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { ...typeScale.caption1, fontWeight: '800', color: customerPalette.primary, letterSpacing: 0.5 },
  sectionSubLabel: { ...typeScale.caption2, fontWeight: '600', color: customerPalette.textSubtle },
  vehicleList: { backgroundColor: customerPalette.surfaceWhite, borderRadius: 16, ...iosContinuousCurve, borderWidth: 1, borderColor: customerPalette.cardBorder, overflow: 'hidden' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral.surfaceMuted, minHeight: 60 },
  vehicleRowSelected: { backgroundColor: customerPalette.primaryBg },
  vehicleRowPressed: { opacity: 0.85 },
  vehicleIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: customerPalette.canvas, alignItems: 'center', justifyContent: 'center' },
  vehicleIconBoxSelected: { backgroundColor: customerPalette.primaryBorder },
  vehicleMeta: { flex: 1, minWidth: 0 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vehicleName: { ...typeScale.subheadline, fontWeight: '700', color: customerPalette.textSlateDark },
  vehicleNameSelected: { color: customerPalette.primary },
  vehicleBadge: { backgroundColor: colors.neutral.surfaceMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vehicleBadgeSelected: { backgroundColor: customerPalette.primary },
  vehicleBadgeText: { fontSize: typeScale.caption2.fontSize, fontWeight: '800', color: customerPalette.textSubtle },
  vehicleBadgeTextSelected: { color: customerPalette.surfaceWhite },
  vehicleSpecRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  dimensionBadge: { backgroundColor: colors.neutral.surfaceMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  dimensionBadgeSelected: { backgroundColor: customerPalette.cardBorder },
  dimensionText: { ...typeScale.caption2, fontWeight: '700', color: colors.neutral.mutedText, fontVariant: ['tabular-nums'] },
  dimensionTextSelected: { color: customerPalette.primary },
  fleetCapacityText: { ...typeScale.caption2, color: customerPalette.textSubtle },
  vehiclePriceCol: { alignItems: 'flex-end', gap: 4 },
  vehiclePrice: { ...typeScale.subheadline, fontWeight: '800', color: customerPalette.textSlateDark, fontVariant: ['tabular-nums'], marginLeft: 8 },
  vehiclePriceSelected: { color: customerPalette.primary },
  selectionDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: leopardPalette.inputBorder, backgroundColor: customerPalette.surfaceWhite },
  selectionDotSelected: { borderColor: customerPalette.primary, backgroundColor: customerPalette.primary },

  /* Fare Estimation Card & Big CTA Button */
  fareCtaCard: { backgroundColor: customerPalette.canvas, borderRadius: 16, ...iosContinuousCurve, padding: 10, marginTop: 8, borderWidth: 1, borderColor: customerPalette.cardBorder },
  fareInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fareLeftCol: { flex: 1 },
  fareLabel: { fontSize: typeScale.caption2.fontSize, fontWeight: '800', color: customerPalette.textSubtle, letterSpacing: 0.5 },
  fareVehicleTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  fareVehicleName: { fontSize: typeScale.subheadline.fontSize, fontWeight: '800', color: customerPalette.textSlateDark },
  fareDimensionChip: { backgroundColor: customerPalette.cardBorder, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  fareDimensionChipText: { fontSize: typeScale.caption2.fontSize, fontWeight: '600', color: colors.neutral.mutedText },
  fareRightCol: { alignItems: 'flex-end' },
  fareAmount: { ...typeScale.callout, fontWeight: '800', color: customerPalette.primary, fontVariant: ['tabular-nums'] },
  fareNote: { fontSize: typeScale.caption2.fontSize, color: customerPalette.textSubtle },
  bigCtaBtn: {
    minHeight: 52,
    height: 52,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bigCtaBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  bigCtaBtnText: {
    fontSize: typeScale.headline.fontSize,
    fontWeight: '800',
    color: customerPalette.surfaceWhite,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },

  /* Section Containers */
  section: { marginBottom: 10 },
  sectionTitleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveIndicatorDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success.text },
  liveTagBadge: { backgroundColor: colors.success.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveTagText: { fontSize: typeScale.caption2.fontSize, fontWeight: '800', color: colors.success.text },

  /* Active Shipment Card */
  activeCard: {
    backgroundColor: customerPalette.surfaceWhite, borderRadius: 18, ...iosContinuousCurve, padding: 12, borderWidth: 1, borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: customerPalette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  activeCardPressed: { opacity: 0.85 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  etaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.surfaceMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  etaText: { ...typeScale.caption2, fontWeight: '700', color: customerPalette.primary, fontVariant: ['tabular-nums'] },
  activeRouteContainer: { marginVertical: 2 },
  activeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.neutral.surfaceMuted },
  activeDriverBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 },
  driverText: { ...typeScale.caption1, fontWeight: '600', color: colors.neutral.mutedText, flex: 1 },
  plateText: { fontWeight: '700', color: customerPalette.primary, fontVariant: ['tabular-nums'] },
  activeTrackPill: { backgroundColor: colors.neutral.surfaceMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  trackText: { ...typeScale.caption2, fontWeight: '700', color: customerPalette.primary },

  /* Layer 3: Floating Navigation Dock */
  layer3FloatingNav: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60 },
});
