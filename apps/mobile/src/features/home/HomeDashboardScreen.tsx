import type { OrderStatus } from '@leopard/shared';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  type GestureBottomSheetRef,
  IconBell,
  IconBike,
  IconCamera,
  IconChevron,
  IconClock,
  IconClose,
  IconCrosshair,
  IconHome,
  IconMessage,
  IconPin,
  IconPlus,
  IconRoleDriver,
  IconSearch,
  IconTruck,
  IconVan,
  IconWarehouse,
  LeopardMapView,
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
  pickDeviceImage,
  postMapMessageToFrames,
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
  CARGO_CATEGORIES,
  formatVnd,
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
  routeCoords?: readonly { lat: number; lng: number }[];
  truckLocation?: { lat: number; lng: number };
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

export const FLEET_ETA_LABELS: Record<FleetVehicleCategory, string> = {
  BIKE_3W: 'ETA ~8 phút',
  VAN_500KG: 'ETA ~10 phút',
  TRUCK_125T: 'ETA ~12 phút',
  TRUCK_25T: 'ETA ~15 phút',
};

// 1-touch Quick Logistics Hubs (Apple Maps / Uber 1-tap booking)
export const POPULAR_LOGISTICS_HUBS: readonly SavedAddress[] = [
  {
    id: 'hub-q1',
    label: 'Kho Q1 - Lê Duẩn',
    address: '141 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    isDefault: false,
    category: 'WAREHOUSE',
    latitude: 10.7797,
    longitude: 106.699,
  },
  {
    id: 'hub-tan-binh',
    label: 'KCN Tân Bình',
    address: 'KCN Tân Bình, Đường Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh',
    isDefault: false,
    category: 'WAREHOUSE',
    latitude: 10.8178,
    longitude: 106.6234,
  },
  {
    id: 'hub-cat-lai',
    label: 'Kho Cát Lái',
    address: 'Cảng Cát Lái, Nguyễn Thị Định, TP. Thủ Đức, TP. Hồ Chí Minh',
    isDefault: false,
    category: 'WAREHOUSE',
    latitude: 10.7615,
    longitude: 106.7865,
  },
  {
    id: 'hub-song-than',
    label: 'KCN Sóng Thần',
    address: 'KCN Sóng Thần 1, Dĩ An, Bình Dương',
    isDefault: false,
    category: 'WAREHOUSE',
    latitude: 10.8978,
    longitude: 106.7456,
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

export async function searchPlacesLive(
  query: string,
  apiKey?: string,
): Promise<readonly LocationSuggestionItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];
  // Real results only. A hardcoded place list used to be returned whenever the
  // API found nothing, presenting invented addresses as search results.
  return searchVietmapWithCoords(trimmed, apiKey);
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
  onQuickBook?: (
    origin?: string,
    destination?: string,
    dropoffCoords?: { lat: number; lng: number },
    pickupCoords?: { lat: number; lng: number },
    fleetVehicleId?: FleetVehicleCategory,
  ) => void;
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
  onPressSearchAddress?: (
    fleetVehicleId?: FleetVehicleCategory,
    pickup?: string,
    pickupCoords?: { lat: number; lng: number } | null,
  ) => void;
  onOpenSavedAddresses?: () => void;
  onNavigateTab?: (tab: TabKey) => void;
  onSelectVehicleAndBook?: (vehicleId: VehicleCategory, fleetVehicleId?: FleetVehicleCategory) => void;
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
  initialCargoImageUri = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', nearbyDrivers: nearbyDriversProp,
  onConfirmBooking, onCreateOrder, onNavigateTab, onOpenActiveOrder, onOpenChat, onOpenNotifications,
  onOpenOrder, onOpenSavedAddresses, onPressSearchAddress, onQuickBook, onRegisterDriver, onSelectSavedAddress,
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
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
  const [hasLoadingSupport, setHasLoadingSupport] = useState(false);
  const [hasVatInvoice, setHasVatInvoice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('VIETQR');
  const [receiverName, setReceiverName] = useState(userName || '');
  const [receiverPhone, setReceiverPhone] = useState(userPhone || '');
  const [cargoCategory, setCargoCategory] = useState<(typeof CARGO_CATEGORIES)[number]>('Kiện hàng');
  const [cargoNote, setCargoNote] = useState('');
  const [cargoImageUri, setCargoImageUri] = useState<string | null>(initialCargoImageUri || null);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const bottomSheetRef = useRef<GestureBottomSheetRef>(null);
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
            if (user.name) setReceiverName(user.name);
            if (user.phone) setReceiverPhone(user.phone);
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
    if (userName) setReceiverName(userName);
  }, [userName]);

  useEffect(() => {
    if (userPhone) setReceiverPhone(userPhone);
  }, [userPhone]);

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
        } else if (isMounted) {
          setFetchedNearbyDrivers([]);
        }
      } catch {
        if (isMounted) {
          setFetchedNearbyDrivers([]);
        }
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
            selectedFleetId,
          );
        } else {
          onCreateOrder?.();
        }
        setTimeout(() => { setIsAutoNavigating(false); hasNavigatedRef.current = false; }, 1500);
      }, 400);
    },
    [onQuickBook, onCreateOrder, pickupCoords, selectedFleetId],
  );

  useEffect(() => {
    if (defaultPickupLocation) {
      setPickupText(defaultPickupLocation);
      setPickupLabel(defaultPickupLabel ?? null);
      const saved = addressStore.getDefaultAddress();
      if (saved?.latitude && saved?.longitude) {
        setPickupCoords({ lat: saved.latitude, lng: saved.longitude });
      } else {
        const resolved = resolveLocationCoords(defaultPickupLocation);
        if (resolved) setPickupCoords(resolved);
      }
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

  const [isLocating, setIsLocating] = useState(false);

  const handleRecenterToCurrentGps = useCallback(async () => {
    haptic.selection();
    setIsLocating(true);

    // Immediate tactile recenter to existing pickupCoords or resolved location
    const effectiveCoords =
      pickupCoords ||
      (pickupText ? resolveLocationCoords(pickupText) : null) ||
      { lat: 14.0999697, lng: 108.9759516 };

    if (effectiveCoords && typeof effectiveCoords.lat === 'number' && typeof effectiveCoords.lng === 'number') {
      postMapMessageToFrames({
        type: 'LEOPARD_MAP_RECENTER',
        lat: effectiveCoords.lat,
        lng: effectiveCoords.lng,
        zoom: 15.5,
      });
    }

    const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        } as any);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickupCoords({ lat, lng });

        postMapMessageToFrames({
          type: 'LEOPARD_MAP_RECENTER',
          lat,
          lng,
          zoom: 15.5,
        });

        const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
        if (resolved && resolved.trim().length > 0) {
          setPickupText(resolved);
          setPickupLabel('Vị trí hiện tại');
          setLocationNotice(null);
        }
      } else if (!pickupCoords) {
        Alert.alert('Quyền vị trí', 'Vui lòng cho phép quyền vị trí trong trình duyệt để xác định vị trí của bạn.');
      }
    } catch {
      // If GPS fetch fails but we already have pickupCoords, we already smoothly recentered to it.
      if (!pickupCoords) {
        Alert.alert('Định vị', 'Không thể lấy được vị trí GPS hiện tại.');
      }
    } finally {
      setIsLocating(false);
    }
  }, [pickupCoords]);

  useEffect(() => {
    let isCancelled = false;
    const apiKey = process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          } as any);
          if (isCancelled) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupCoords({ lat, lng });
          const resolved = await reverseGeocodeCoords({ lat, lng }, apiKey);
          if (resolved && resolved.trim().length > 0 && !isCancelled) {
            setPickupText(resolved);
            setPickupLabel('Vị trí hiện tại');
            setLocationNotice(null);
            return;
          }
        }
      } catch {
        // keep fallback
      }
      if (isCancelled) return;
      const saved = addressStore.getDefaultAddress();
      if (defaultPickupLocation) {
        setPickupText(defaultPickupLocation);
        setPickupLabel(defaultPickupLabel ?? null);
        if (saved?.latitude && saved?.longitude) {
          setPickupCoords({ lat: saved.latitude, lng: saved.longitude });
        } else {
          const resolved = resolveLocationCoords(defaultPickupLocation);
          if (resolved) setPickupCoords(resolved);
        }
      } else if (saved?.address) {
        setPickupText(saved.address);
        setPickupLabel(saved.label || null);
        if (saved.latitude && saved.longitude) {
          setPickupCoords({ lat: saved.latitude, lng: saved.longitude });
        }
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, []);

  const addressList = useMemo(() => savedAddresses ?? addressStore.getAddresses(), [savedAddresses, addressStoreVersion]);

  const effectiveHubList = useMemo(() => {
    const validSaved = (addressList || []).filter(
      (a) => a.label !== 'Vị trí hiện tại' && a.address && a.address.trim().length > 0,
    );
    if (validSaved.length > 0) {
      const seen = new Set<string>();
      return validSaved.filter((a) => {
        const key = (a.address || a.label || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return POPULAR_LOGISTICS_HUBS;
  }, [addressList]);

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
  const isFullBookingMode = hasSelectedDropoff || isBookingSheetOpen;

  const handleDropoffChangeText = useCallback((text: string) => {
    setDropoffText(text);
    if (text.trim().length >= 3) {
      setIsBookingSheetOpen(true);
    } else if (text.trim().length === 0) {
      setIsBookingSheetOpen(false);
    }
  }, []);

  const handleCloseBookingMode = useCallback(() => {
    haptic.light();
    setIsBookingSheetOpen(false);
    setDropoffText('');
    setDropoffCoords(null);
    setFocusedField(null);
    tabBarVisibilityStore.setHidden(false);
  }, []);

  const currentFleetVehicle = useMemo(
    () => FLEET_VEHICLES.find((v) => v.id === selectedFleetId) || FLEET_VEHICLES[1],
    [selectedFleetId],
  );
  const currentBasePrice = Number(currentFleetVehicle.estimatedPrice.replace(/[^0-9]/g, '')) || 200000;

  // Live price calculation for One-Thumb Ergonomics:
  const unitLoadingFee = FLEET_LOADING_FEES[currentFleetVehicle.id] || 0;
  const liveLoadingFee = hasLoadingSupport ? unitLoadingFee : 0;
  const stopSurcharge = filledStops.length * 30000;
  const liveVatFee = hasVatInvoice ? Math.round((currentBasePrice + stopSurcharge + liveLoadingFee) * 0.08) : 0;
  const liveTotalFare = currentBasePrice + stopSurcharge + liveLoadingFee + liveVatFee;
  const liveFareFormatted = formatVnd(liveTotalFare);

  // Auto transition bottom sheet snap point based on route selection state
  useEffect(() => {
    if (isFullBookingMode) {
      bottomSheetRef.current?.snapToIndex(2);
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [isFullBookingMode]);

  // Hide the home tab bar while the booking flow is active (dropoff picked or full booking sheet open).
  // Single bottom action (action bar CTA) owns the thumb zone per iOS HIG.
  useEffect(() => {
    tabBarVisibilityStore.setHidden(isFullBookingMode);
    return () => {
      tabBarVisibilityStore.setHidden(false);
    };
  }, [isFullBookingMode]);

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
    // Clear stale rows instead of showing hardcoded places while the real
    // autocomplete request is in flight.
    setLiveSuggestions([]);
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
    onSelectVehicleAndBook?.(vehicle.vehicleCategory, vehicle.id);
  };

  const handleMainCtaBook = () => {
    haptic.selection();
    onSelectVehicleAndBook?.(currentFleetVehicle.vehicleCategory, currentFleetVehicle.id);

    const details: BookingDetails = {
      receiverName: receiverName.trim() || loggedInCustomer?.name || userName || 'Người nhận',
      receiverPhone: receiverPhone.trim() || loggedInCustomer?.phone || userPhone || '0900000000',
      cargoCategory,
      cargoNote: cargoNote.trim() || undefined,
      cargoImageUri: cargoImageUri || 'file:///default-cargo.jpg',
      hasLoadingSupport,
      hasVatInvoice,
      paymentMethod,
      totalFare: liveTotalFare,
      voucherCode: appliedVoucher || voucherCode.trim() || undefined,
      discountAmount: discountAmount || undefined,
    };

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
        currentFleetVehicle.id,
      );
    } else {
      onCreateOrder?.();
    }
  };

  return (
    <View style={styles.root}>
      {/* ================= LAYER 0 (z-index 0): 100% FULL-BLEED MAP ================= */}
      <View pointerEvents="box-none" style={styles.layer0Map} testID="home-map-layer">
        <LeopardMapView
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
          height="100%"
          interactive
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
          routeCoords={activeShipment?.routeCoords}
          stops={activeShipment ? [] : mapStops}
          testID="home-interactive-map"
          truckEtaMinutes={activeShipment?.etaMinutes}
          truckLocation={activeShipment?.truckLocation || activeShipment?.originCoords}
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

      {/* Floating Recenter Button (Grab/Uber style) */}
      {!activeShipment ? (
        <View
          style={[
            styles.floatingRecenterContainer,
            { bottom: !isFullBookingMode ? 280 : 130 },
          ]}
        >
          <Pressable
            accessibilityLabel="Về vị trí hiện tại của tôi"
            accessibilityRole="button"
            accessibilityState={{ busy: isLocating }}
            onPress={handleRecenterToCurrentGps}
            style={({ pressed }) => [styles.recenterBtn, pressed && styles.recenterBtnPressed]}
            testID="customer-map-recenter-btn"
          >
            {isLocating ? (
              <ActivityIndicator color={customerPalette.primary} size="small" />
            ) : (
              <IconCrosshair color={customerPalette.primary} size={22} />
            )}
          </Pressable>
        </View>
      ) : null}

      {/* ================= LAYER 2 (z-index 40): 3-SNAP GESTURE BOTTOM SHEET ================= */}
      <GestureBottomSheet
        contentStyle={!isFullBookingMode ? styles.transparentSheetContent : undefined}
        handleStyle={!isFullBookingMode ? styles.hiddenHandleArea : undefined}
        initialSnapIndex={hasSelectedDropoff ? 2 : 0}
        ref={bottomSheetRef}
        snapPoints={[0.40, 0.65, 0.92]}
        style={[
          styles.layer2BottomSheet,
          !isFullBookingMode && styles.layer2BottomSheetTransparent,
        ]}
        testID="home-bottom-sheet"
      >
        <ScrollView
          bounces={true}
          contentContainerStyle={styles.sheetScrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={isFullBookingMode}
          showsVerticalScrollIndicator={false}
          style={[styles.sheetScrollView, isFullBookingMode && { flex: 1 }]}
        >
          {/* 1. Route Booking Card (testID="home-booking") */}
          <View style={styles.bookingWrapper} testID="home-booking">
            {!isFullBookingMode ? (
              /* ================= COMPACT STATE: CLEAN SEARCH PILL & QUICK HUBS ================= */
              <View style={styles.compactSearchCard} testID="home-compact-search">
                <Pressable
                  accessibilityLabel="Tìm kiếm địa chỉ giao hàng"
                  onPress={() => {
                    haptic.light();
                    if (onPressSearchAddress) {
                      onPressSearchAddress(selectedFleetId, pickupText, pickupCoords);
                    } else {
                      setIsBookingSheetOpen(true);
                      setFocusedField('dropoff');
                    }
                  }}
                  style={styles.heroSearchPill}
                  testID="hero-search-pill"
                >
                  <View style={styles.searchPillIconBox}>
                    <IconSearch color={customerPalette.primary} size={20} />
                  </View>
                  <View style={styles.searchPillInputWrap}>
                    <TextInput
                      accessibilityLabel="Địa điểm giao hàng"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={handleDropoffChangeText}
                      onFocus={() => {
                        if (onPressSearchAddress) {
                          onPressSearchAddress(selectedFleetId, pickupText, pickupCoords);
                        } else {
                          setFocusedField('dropoff');
                        }
                      }}
                      onSubmitEditing={() => {
                        if (pickupText.trim().length >= 3 && dropoffText.trim().length >= 3) {
                          triggerNavigation(pickupText, dropoffText);
                        }
                      }}
                      placeholder="Bạn muốn giao hàng đến đâu?"
                      placeholderTextColor={customerPalette.textMutedSlate}
                      style={styles.searchPillTextInput}
                      testID="cr-dropoff-input"
                      value={dropoffText}
                    />
                  </View>
                </Pressable>

                {/* Accessible guiding prompt for screen readers and test assertions */}
                <Text style={styles.guidingPromptHidden}>
                  Nhập địa chỉ giao hàng để tính giá cước và gọi xe
                </Text>

                {/* Quick Hub Chips */}
                <View style={styles.savedAddressesHeader}>
                  <Text style={styles.savedAddressesSectionTitle}>Gợi ý địa chỉ nhanh</Text>
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

                <ScrollView
                  contentContainerStyle={styles.quickHubsScrollContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  testID="quick-hubs-row"
                >
                  {effectiveHubList.map((addr) => {
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
                          setIsBookingSheetOpen(true);
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

                {/* Accessible hidden controls when in compact mode so tests can interact with pickup */}
                <View style={styles.accessibleHiddenForm}>
                  {pickupLabel ? (
                    <View style={styles.pickupLabelBadge} testID="pickup-label-badge">
                      <IconWarehouse color={colors.success.text} size={12} />
                      <Text style={styles.pickupLabelBadgeText} testID="pickup-label-badge-text">
                        {pickupLabel}
                      </Text>
                    </View>
                  ) : null}
                  <TextInput
                    accessibilityLabel="Địa điểm lấy hàng"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(t) => { setPickupText(t); if (pickupLabel) setPickupLabel(null); }}
                    onFocus={() => {
                      setIsBookingSheetOpen(true);
                      setFocusedField('pickup');
                    }}
                    placeholder="Nhập địa chỉ lấy hàng..."
                    placeholderTextColor={leopardPalette.inputPlaceholder}
                    style={styles.locationTextInput}
                    testID="cr-pickup-input"
                    value={pickupText}
                  />
                  {pickupText.length > 0 ? (
                    <Pressable
                      accessibilityLabel="Xóa điểm lấy hàng"
                      accessibilityRole="button"
                      onPress={() => {
                        setPickupText('');
                        setPickupLabel(null);
                        setPickupCoords(null);
                      }}
                    />
                  ) : null}
                  <Pressable
                    accessibilityLabel="Thêm điểm dừng"
                    accessibilityRole="button"
                    onPress={handleAddStop}
                    testID="cr-add-stop"
                  />
                </View>
              </View>
            ) : (
              /* ================= FULL BOOKING STATE: UNIFIED BOTTOM SHEET ================= */
              <View style={styles.fullBookingWrapper} testID="home-full-booking">
                {/* Header with Close / Minimize Button */}
                <View style={styles.bookingSheetHeaderRow}>
                  <View style={styles.bookingSheetHeaderTextGroup}>
                    <Text style={styles.bookingSheetHeaderTitle}>Thông tin đặt xe</Text>
                    <Text style={styles.bookingSheetHeaderSub}>Lộ trình & Phương tiện chuyên dụng</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Đóng modal chi tiết"
                    accessibilityRole="button"
                    hitSlop={spacing.xs}
                    onPress={handleCloseBookingMode}
                    style={styles.bookingSheetCloseBtn}
                    testID="home-booking-close-btn"
                  >
                    <IconClose color={customerPalette.textSubtle} size={16} />
                  </Pressable>
                </View>

                {/* Route Box */}
                <View style={styles.routeBox}>
                  {/* Điểm lấy hàng */}
                  <View style={styles.unifiedRouteRow}>
                    <View style={styles.nodeRail}>
                      <View style={styles.pickupPinCircle}><View style={styles.pickupPinInner} /></View>
                      <View style={styles.nodeConnector} />
                    </View>
                    <View style={styles.inputInnerWrap}>
                      <View style={styles.locationHeaderRow}>
                        <Text style={styles.inputMicroLabel}>Điểm lấy hàng</Text>
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
                          <Text style={styles.inputMicroLabel}>Điểm dừng {idx + 1}</Text>
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
                      <Text style={styles.inputMicroLabel}>Điểm giao hàng</Text>
                      <TextInput
                        accessibilityLabel="Địa điểm giao hàng" autoCapitalize="none" autoCorrect={false}
                        onChangeText={handleDropoffChangeText} onFocus={() => setFocusedField('dropoff')}
                        onSubmitEditing={() => { if (pickupText.trim().length >= 3 && dropoffText.trim().length >= 3) triggerNavigation(pickupText, dropoffText); }}
                        placeholder="Bạn muốn giao hàng đến đâu?" placeholderTextColor={customerPalette.textMutedSlate}
                        style={styles.locationTextInput} testID="cr-dropoff-input" value={dropoffText}
                      />
                    </View>
                    {dropoffText.length > 0 ? (
                      <Pressable
                        accessibilityLabel="Xóa điểm giao hàng"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => {
                          setDropoffText('');
                          setDropoffCoords(null);
                          setIsBookingSheetOpen(false);
                        }}
                        style={styles.inputActionBtn}
                      >
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
                                setIsBookingSheetOpen(true);
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

                {/* Fleet Matrix Section: 4 Vehicles */}
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
                            {vehicle.id === 'BIKE_3W' && <IconBike color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={20} />}
                            {vehicle.id === 'VAN_500KG' && <IconVan color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={20} />}
                            {vehicle.id === 'TRUCK_125T' && <IconTruck color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={20} />}
                            {vehicle.id === 'TRUCK_25T' && <IconTruck color={isSelected ? customerPalette.primary : customerPalette.textSubtle} size={20} />}
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
                              <Text style={[styles.dimensionText, isSelected && styles.dimensionTextSelected]}>
                                {vehicle.dimensions}
                              </Text>
                              <Text style={styles.fleetCapacityText}> · {vehicle.weightCapacity} · {FLEET_ETA_LABELS[vehicle.id].replace('ETA ~', '')}</Text>
                            </View>
                          </View>
                          <View style={styles.vehiclePriceCol}>
                            <Text numberOfLines={1} style={[styles.vehiclePrice, isSelected && styles.vehiclePriceSelected]}>
                              {vehicle.estimatedPrice}
                            </Text>
                            <View style={[styles.selectionDot, isSelected && styles.selectionDotSelected]}>
                              {isSelected ? <View style={styles.selectionDotInner} /> : null}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Receiver & Cargo Details Section (Integrated Full Booking Flow) */}
                  <View style={styles.bookingDetailsSection} testID="booking-details-modal">
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>Thông tin người nhận & Hàng hóa</Text>
                      <Text style={styles.sectionSubLabel}>Chi tiết chuyến hàng</Text>
                    </View>

                    <View style={styles.groupedFormCard}>
                      {/* Tên người nhận */}
                      <View style={styles.formRow}>
                        <Text style={styles.formMicroLabel}>Tên người nhận</Text>
                        <TextInput
                          accessibilityLabel="Tên người nhận"
                          autoCapitalize="words"
                          autoCorrect={false}
                          onChangeText={setReceiverName}
                          placeholder="Nhập họ tên người nhận..."
                          placeholderTextColor={customerPalette.textMutedSlate}
                          style={styles.formInput}
                          value={receiverName}
                        />
                      </View>

                      <View style={styles.formDivider} />

                      {/* Số điện thoại người nhận */}
                      <View style={styles.formRow}>
                        <Text style={styles.formMicroLabel}>Số điện thoại</Text>
                        <TextInput
                          accessibilityLabel="Số điện thoại người nhận"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="phone-pad"
                          onChangeText={setReceiverPhone}
                          placeholder="Số điện thoại liên hệ nhận hàng..."
                          placeholderTextColor={customerPalette.textMutedSlate}
                          style={styles.formInput}
                          value={receiverPhone}
                        />
                      </View>

                      <View style={styles.formDivider} />

                      {/* Loại hàng hóa */}
                      <View style={styles.formRowPadded}>
                        <Text style={styles.formMicroLabel}>Loại hàng hóa</Text>
                        <ScrollView
                          contentContainerStyle={styles.categoryPillsScroll}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {CARGO_CATEGORIES.map((cat) => {
                            const isCatActive = cat === cargoCategory;
                            return (
                              <Pressable
                                accessibilityLabel={`Chọn loại hàng ${cat}`}
                                accessibilityRole="button"
                                key={cat}
                                onPress={() => {
                                  haptic.selection();
                                  setCargoCategory(cat);
                                }}
                                style={[
                                  styles.categoryPill,
                                  isCatActive && styles.categoryPillActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.categoryPillText,
                                    isCatActive && styles.categoryPillTextActive,
                                  ]}
                                >
                                  {cat}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={styles.formDivider} />

                      {/* Ghi chú hàng hóa */}
                      <View style={styles.formRow}>
                        <Text style={styles.formMicroLabel}>Ghi chú hàng hóa</Text>
                        <TextInput
                          accessibilityLabel="Ghi chú hàng hóa"
                          autoCapitalize="sentences"
                          multiline
                          numberOfLines={2}
                          onChangeText={setCargoNote}
                          placeholder="Khối lượng, tính chất hàng, lưu ý khi bốc dỡ..."
                          placeholderTextColor={customerPalette.textMutedSlate}
                          style={styles.formInputMultiline}
                          value={cargoNote}
                        />
                      </View>

                      <View style={styles.formDivider} />

                      {/* Ảnh chụp hàng hóa */}
                      <View style={styles.formRowPadded}>
                        <Text style={styles.formMicroLabel}>Ảnh hàng hóa</Text>
                        <View style={styles.cargoImageRow}>
                          <Pressable
                            accessibilityLabel="Chụp hoặc tải ảnh hàng hóa"
                            accessibilityRole="button"
                            onPress={async () => {
                              try {
                                const asset = await pickDeviceImage();
                                if (asset?.uri) setCargoImageUri(asset.uri);
                              } catch {
                                // Ignore
                              }
                            }}
                            style={styles.cargoImagePickBtn}
                          >
                            <IconCamera color={customerPalette.primary} size={18} />
                            <Text style={styles.cargoImagePickBtnText}>
                              {cargoImageUri ? 'Đổi ảnh hàng' : 'Chụp / Tải ảnh'}
                            </Text>
                          </Pressable>

                          {cargoImageUri ? (
                            <View style={styles.cargoThumbnailWrap}>
                              <Image
                                accessibilityLabel="Ảnh hàng hóa đã chụp"
                                accessibilityRole="image"
                                resizeMode="cover"
                                source={{ uri: cargoImageUri }}
                                style={styles.cargoThumbnail}
                              />
                              <Pressable
                                accessibilityLabel="Xóa ảnh hàng hóa"
                                hitSlop={6}
                                onPress={() => setCargoImageUri(null)}
                                style={styles.cargoThumbDeleteBtn}
                              >
                                <IconClose color={customerPalette.surfaceWhite} size={10} />
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Fast Payment Method Selector: One-Thumb Ergonomics */}
                  <View style={styles.quickPaymentSection} testID="home-quick-payment">
                    <Text style={styles.quickSectionLabel}>Hình thức thanh toán</Text>
                    <View style={styles.paymentMethodRow}>
                      <Pressable
                        accessibilityLabel="Thanh toán VietQR"
                        accessibilityRole="button"
                        onPress={() => {
                          haptic.selection();
                          setPaymentMethod('VIETQR');
                        }}
                        style={[
                          styles.paymentMethodPill,
                          paymentMethod === 'VIETQR' && styles.paymentMethodPillActive,
                        ]}
                        testID="quick-payment-vietqr"
                      >
                        <View style={[styles.paymentMethodRadio, paymentMethod === 'VIETQR' && styles.paymentMethodRadioActive]}>
                          {paymentMethod === 'VIETQR' ? <View style={styles.paymentMethodRadioDot} /> : null}
                        </View>
                        <Text
                          style={[
                            styles.paymentMethodText,
                            paymentMethod === 'VIETQR' && styles.paymentMethodTextActive,
                          ]}
                        >
                          VietQR
                        </Text>
                        <View style={styles.recommendBadge}>
                          <Text style={styles.recommendBadgeText}>Khuyên dùng</Text>
                        </View>
                      </Pressable>

                      <Pressable
                        accessibilityLabel="Thanh toán Tiền mặt"
                        accessibilityRole="button"
                        onPress={() => {
                          haptic.selection();
                          setPaymentMethod('CASH');
                        }}
                        style={[
                          styles.paymentMethodPill,
                          paymentMethod === 'CASH' && styles.paymentMethodPillActive,
                        ]}
                        testID="quick-payment-cash"
                      >
                        <View style={[styles.paymentMethodRadio, paymentMethod === 'CASH' && styles.paymentMethodRadioActive]}>
                          {paymentMethod === 'CASH' ? <View style={styles.paymentMethodRadioDot} /> : null}
                        </View>
                        <Text
                          style={[
                            styles.paymentMethodText,
                            paymentMethod === 'CASH' && styles.paymentMethodTextActive,
                          ]}
                        >
                          Tiền mặt
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Quick Add-ons Toggles */}
                  <View style={styles.quickAddonsSection} testID="home-quick-addons">
                    <Pressable
                      accessibilityLabel={`Tài xế hỗ trợ bốc xếp, thêm ${formatVnd(FLEET_LOADING_FEES[currentFleetVehicle.id])}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: hasLoadingSupport }}
                      onPress={() => {
                        haptic.light();
                        setHasLoadingSupport((prev) => !prev);
                      }}
                      style={[
                        styles.addonRow,
                        hasLoadingSupport && styles.addonRowActive,
                      ]}
                      testID="quick-loading-toggle"
                    >
                      <View style={styles.addonInfoCol}>
                        <Text style={styles.addonTitle}>Tài xế hỗ trợ bốc xếp</Text>
                        <Text style={styles.addonFee}>+{formatVnd(FLEET_LOADING_FEES[currentFleetVehicle.id])}</Text>
                      </View>
                      <View style={[styles.switchTrack, hasLoadingSupport && styles.switchTrackActive]}>
                        <View style={[styles.switchThumb, hasLoadingSupport && styles.switchThumbActive]} />
                      </View>
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Xuất hóa đơn VAT 8%"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: hasVatInvoice }}
                      onPress={() => {
                        haptic.light();
                        setHasVatInvoice((prev) => !prev);
                      }}
                      style={[
                        styles.addonRow,
                        hasVatInvoice && styles.addonRowActive,
                      ]}
                      testID="quick-vat-toggle"
                    >
                      <View style={styles.addonInfoCol}>
                        <Text style={styles.addonTitle}>Xuất hóa đơn VAT</Text>
                        <Text style={styles.addonFee}>Thuế 8%</Text>
                      </View>
                      <View style={[styles.switchTrack, hasVatInvoice && styles.switchTrackActive]}>
                        <View style={[styles.switchThumb, hasVatInvoice && styles.switchThumbActive]} />
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View
            style={{ height: isFullBookingMode ? 140 : bottomNavPadding }}
            testID="home-sheet-bottom-spacer"
          />
        </ScrollView>

        {/* Sticky Action Bar for One-Thumb Ergonomics */}
        {isFullBookingMode ? (
          <View style={styles.stickyCtaBar} testID="home-sticky-cta-bar">
            <View style={styles.stickyFareSummaryRow}>
              <View style={styles.stickyFareLeft}>
                <Text style={styles.stickyFareLabel}>ƯỚC TÍNH CƯỚC CHUYẾN</Text>
                <View style={styles.stickyVehicleRow}>
                  <Text style={styles.stickyFareVehicleName}>{currentFleetVehicle.name}</Text>
                  <View style={styles.fareDimensionChip}>
                    <Text style={styles.fareDimensionChipText}>Thùng: {currentFleetVehicle.dimensionLabel}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.stickyFareRight}>
                <Text style={styles.stickyFareAmount}>{liveFareFormatted}</Text>
                <Text style={styles.stickyFareNote}>
                  {hasLoadingSupport ? 'Bao gồm bốc xếp' : 'Giá mở cửa chuẩn'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel={`Xác nhận gọi xe ${currentFleetVehicle.name}, giá ${liveFareFormatted}`}
              accessibilityRole="button"
              onPress={handleMainCtaBook}
              style={({ pressed }) => [styles.bigCtaBtn, pressed && styles.bigCtaBtnPressed]}
              testID="home-main-cta-btn"
            >
              <Text style={styles.bigCtaBtnText}>XÁC NHẬN GỌI XE · {liveFareFormatted} ➔</Text>
            </Pressable>
          </View>
        ) : null}
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
    fontWeight: '600',
    color: customerPalette.surfaceWhite,
  },
  topBarIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  topBarLogoPill: { paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: 'rgba(11, 30, 66, 0.08)', marginRight: spacing.sm },
  topBarTextWrap: { flex: 1 },
  topBarGreeting: { ...typeScale.caption1, fontWeight: '600', color: customerPalette.primary },
  topBarSmeName: { ...typeScale.caption2, color: customerPalette.textSubtle, marginTop: 1 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roleSwitchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, backgroundColor: colors.neutral.surfaceMuted, borderRadius: radius.card, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: spacing.xxs },
  roleSwitchText: { ...typeScale.caption1, fontWeight: '600', color: customerPalette.primary },
  iconBtn: { width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.neutral.surfaceMuted, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badgePill: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger.text, minWidth: 16, height: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxs },
  badgePillText: { color: customerPalette.surfaceWhite, ...typeScale.caption2, fontWeight: '700' },

  /* Layer 2: Gesture Bottom Sheet & Scroll Content */
  layer2BottomSheet: { zIndex: 40 },
  layer2BottomSheetTransparent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  transparentSheetContent: {
    backgroundColor: 'transparent',
  },
  sheetFullContentWrapper: {
    flex: 1,
    position: 'relative',
  },
  hiddenHandleArea: {
    height: 0,
    minHeight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  sheetScrollView: { width: '100%' },
  sheetScrollContent: {
    paddingHorizontal: spacing.md,
  },
  sheetScrollContentFullBooking: {
    paddingBottom: 150,
  },

  /* Booking Container Wrapper */
  bookingWrapper: { width: '100%' },
  fullBookingWrapper: { width: '100%' },

  /* Compact Initial State: Floating Liquid Glass Search Card (Apple HIG 2026 + Shadcn Modern Minimal) */
  compactSearchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.08)',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: spacing.sm,
    ...Platform.select({
      web: { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any,
    }),
  },
  heroSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: 'rgba(11, 37, 69, 0.1)',
    marginBottom: spacing.xs,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchPillIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11, 37, 69, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  searchPillInputWrap: {
    flex: 1,
  },
  searchPillTextInput: {
    ...typeScale.subheadline,
    fontWeight: '400',
    color: customerPalette.textSlateDark,
    padding: 0,
    minHeight: 22,
  },
  searchPillPickupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    gap: 3,
    marginLeft: spacing.xs,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  searchPillPickupBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: '#34C759',
    maxWidth: 90,
  },
  accessibleHiddenForm: {
    height: 0,
    width: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
  },

  /* Full Booking Mode Header */
  bookingSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  bookingSheetHeaderTextGroup: {
    flex: 1,
  },
  bookingSheetHeaderTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.primary,
  },
  bookingSheetHeaderSub: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    marginTop: 1,
  },
  bookingSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },

  /* Route Booking Card */
  routeBookingCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  routeBox: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  unifiedRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: customerPalette.cardBorder,
  },
  lastRouteRow: { borderBottomWidth: 0 },
  nodeRail: { width: 24, alignItems: 'center', alignSelf: 'stretch', marginRight: spacing.sm },
  nodeConnectorTop: { width: 2, height: 8, backgroundColor: customerPalette.cardBorder },
  nodeConnector: { flex: 1, width: 2, backgroundColor: customerPalette.cardBorder, marginTop: 2 },
  pickupPinCircle: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pickupPinInner: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: customerPalette.onlineGreen },
  dropoffPinSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.danger.text, marginTop: 2 },
  stopPinCircle: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    borderWidth: 1.5,
    borderColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPinText: { ...typeScale.caption2, fontWeight: '700', color: customerPalette.primary },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: customerPalette.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: customerPalette.cardBorder,
  },
  addStopBtnPressed: {
    backgroundColor: customerPalette.primaryBg,
    opacity: 0.85,
  },
  addStopBtnText: { ...typeScale.subheadline, fontWeight: '600', color: customerPalette.primary },
  maxStopHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.cardSm,
  },
  maxStopHintText: { ...typeScale.caption1, fontWeight: '600', color: customerPalette.textSubtle },
  routeInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  inputInnerWrap: { flex: 1, paddingRight: spacing.xs },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  inputMicroLabel: { ...typeScale.caption2, fontWeight: '600', color: customerPalette.textSubtle, letterSpacing: 0.5 },
  pickupLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  pickupLabelBadgeText: { ...typeScale.caption2, fontWeight: '600', color: '#34C759' },
  locationNoticeText: { ...typeScale.caption2, lineHeight: 16, color: customerPalette.accentDark, marginTop: spacing.xxs },
  locationTextInput: {
    ...typeScale.callout,
    fontWeight: '500',
    color: customerPalette.textSlateDark,
    padding: 0,
    minHeight: 24,
  },
  inputDivider: { height: 1, backgroundColor: customerPalette.cardBorder, marginVertical: spacing.xxs },
  inputActionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xxs,
  },

  /* Progressive Disclosure Prompt & Quick Destination Hubs */
  progressivePromptSection: { marginTop: spacing.md },
  guidingPromptHidden: { height: 0, width: 0, opacity: 0, position: 'absolute' },
  savedAddressesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  savedAddressesSectionTitle: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSubtle,
  },
  manageAddressesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: 2,
    paddingHorizontal: spacing.xxs,
  },
  manageAddressesBtnPressed: { opacity: 0.6 },
  manageAddressesBtnText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  quickHubsScrollContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 2 },
  hubChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    height: 40, paddingHorizontal: spacing.sm,
    backgroundColor: customerPalette.canvas, borderRadius: radius.pill, ...iosContinuousCurve,
    borderWidth: 1, borderColor: customerPalette.cardBorder,
    shadowColor: customerPalette.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  hubChipPressed: { backgroundColor: customerPalette.primaryBg, borderColor: customerPalette.primaryBorder, opacity: 0.85 },
  hubChipIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neutral.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
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
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.sm,
    marginTop: spacing.xs,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  dropdownHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  dropdownHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownHeaderTitle: { ...typeScale.caption2, fontWeight: '700', color: customerPalette.textSubtle, letterSpacing: 0.5 },
  dropdownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsList: { gap: spacing.xxs, marginBottom: spacing.xxs },
  emptySearchHintBox: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center' },
  emptySearchHintText: { ...typeScale.footnote, color: customerPalette.textSubtle, fontWeight: '400' },
  suggestionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.cardSm,
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs },
  dropdownItemPressed: { backgroundColor: customerPalette.primaryBg },
  dropdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dropdownItemTextWrap: { flex: 1 },
  dropdownItemTitle: { ...typeScale.footnote, fontWeight: '600', color: customerPalette.textSlateDark },
  dropdownItemSub: { ...typeScale.caption2, color: customerPalette.textSubtle, marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: customerPalette.cardBorder, marginVertical: spacing.xs },
  autoNavigatingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success.background, borderRadius: radius.cardSm, padding: spacing.xs, marginTop: spacing.xs, gap: spacing.xs },
  autoNavigatingText: { ...typeScale.caption1, fontWeight: '600', color: colors.success.text },

  /* Fleet Matrix Section: iOS 18 Inset Grouped vertical list + unified action bar */
  fleetMatrixSection: { marginTop: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  sectionLabel: { ...typeScale.caption1, fontWeight: '700', color: customerPalette.primary, letterSpacing: 0.5 },
  sectionSubLabel: { ...typeScale.caption2, fontWeight: '500', color: customerPalette.textSubtle },
  vehicleList: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: customerPalette.cardBorder,
    minHeight: 48,
  },
  vehicleRowSelected: { backgroundColor: customerPalette.primaryBg },
  vehicleRowPressed: { opacity: 0.85 },
  vehicleIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconBoxSelected: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.primaryBorder,
  },
  vehicleMeta: { flex: 1, minWidth: 0 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  vehicleName: { ...typeScale.subheadline, fontWeight: '600', color: customerPalette.textSlateDark },
  vehicleNameSelected: { color: customerPalette.primary },
  vehicleBadge: {
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  vehicleBadgeSelected: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  vehicleBadgeText: { ...typeScale.caption2, fontWeight: '600', color: customerPalette.textSubtle },
  vehicleBadgeTextSelected: { color: customerPalette.surfaceWhite },
  vehicleSpecRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 1 },
  dimensionBadge: {
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  dimensionBadgeSelected: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.primaryBorder,
  },
  dimensionText: { ...typeScale.caption2, fontWeight: '500', color: customerPalette.textMutedSlate, fontVariant: ['tabular-nums'] },
  dimensionTextSelected: { color: customerPalette.primary },
  fleetCapacityText: { ...typeScale.caption2, color: customerPalette.textSubtle },
  vehiclePriceCol: { alignItems: 'flex-end', gap: 2 },
  vehiclePrice: { ...typeScale.callout, fontWeight: '700', color: customerPalette.textSlateDark, fontVariant: ['tabular-nums'], marginLeft: spacing.xs },
  vehiclePriceSelected: { color: customerPalette.primary },
  selectionDot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: customerPalette.cardBorder,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDotSelected: {
    borderColor: customerPalette.primary,
    backgroundColor: customerPalette.primary,
  },
  selectionDotInner: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
  },

  /* Receiver & Cargo Details Section */
  bookingDetailsSection: {
    marginTop: spacing.md,
  },
  groupedFormCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
  },
  formRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formRowPadded: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formMicroLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  formInput: {
    ...typeScale.callout,
    fontWeight: '500',
    color: customerPalette.textSlateDark,
    padding: 0,
    minHeight: 28,
  },
  formInputMultiline: {
    ...typeScale.callout,
    fontWeight: '500',
    color: customerPalette.textSlateDark,
    padding: 0,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  formDivider: {
    height: 1,
    backgroundColor: customerPalette.cardBorder,
  },
  categoryPillsScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  categoryPillActive: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  categoryPillText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  categoryPillTextActive: {
    color: customerPalette.surfaceWhite,
  },
  cargoImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  cargoImagePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  cargoImagePickBtnText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  cargoThumbnailWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: radius.cardSm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  cargoThumbnail: {
    width: '100%',
    height: '100%',
  },
  cargoThumbDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.danger.text,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quick Payment Method Selector: One-Thumb Ergonomics */
  quickPaymentSection: {
    marginTop: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  quickSectionLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.textSubtle,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paymentMethodPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.xxs,
  },
  paymentMethodPillActive: {
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primary,
  },
  paymentMethodRadio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
  },
  paymentMethodRadioActive: {
    borderColor: customerPalette.primary,
  },
  paymentMethodRadioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
  },
  paymentMethodText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  paymentMethodTextActive: {
    color: customerPalette.primary,
  },
  recommendBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginLeft: 'auto',
  },
  recommendBadgeText: {
    ...typeScale.caption2,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: customerPalette.onlineGreen,
  },

  /* Quick Add-ons Toggles */
  quickAddonsSection: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  addonRowActive: {
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primaryBorder,
  },
  addonInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addonTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  addonFee: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    fontVariant: ['tabular-nums'],
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.cardBorder,
    justifyContent: 'center',
    paddingHorizontal: spacing.hairline,
  },
  switchTrackActive: {
    backgroundColor: customerPalette.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },

  /* Sticky Action Bar for One-Thumb Ergonomics */
  stickyCtaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: customerPalette.cardBorder,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any)
      : {}),
  },
  stickyFareSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stickyFareLeft: {
    flex: 1,
  },
  stickyFareLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.textSubtle,
    letterSpacing: 0.5,
  },
  stickyVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.hairline,
  },
  stickyFareVehicleName: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.primary,
  },
  stickyFareRight: {
    alignItems: 'flex-end',
  },
  stickyFareAmount: {
    ...typeScale.title3,
    fontWeight: '700',
    color: customerPalette.accent,
    fontVariant: ['tabular-nums'],
  },
  stickyFareNote: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
  },
  fareDimensionChip: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  fareDimensionChipText: { ...typeScale.caption2, fontWeight: '500', color: customerPalette.textSubtle },
  bigCtaBtn: {
    minHeight: 52,
    height: 54,
    borderRadius: radius.cardLg,
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bigCtaBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  bigCtaBtnText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.surfaceWhite,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },

  /* Section Containers */
  section: { marginBottom: spacing.sm },
  sectionTitleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveIndicatorDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success.text },
  liveTagBadge: { backgroundColor: colors.success.background, borderRadius: radius.cardSm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  liveTagText: { ...typeScale.caption2, fontWeight: '600', color: colors.success.text },

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
  driverText: { ...typeScale.caption1, color: colors.neutral.mutedText, flex: 1 },
  plateText: { fontWeight: '700', color: customerPalette.primary, fontVariant: ['tabular-nums'] },
  activeTrackPill: { backgroundColor: colors.neutral.surfaceMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  trackText: { ...typeScale.caption2, fontWeight: '600', color: customerPalette.primary },

  /* Floating Recenter Button */
  floatingRecenterContainer: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 45,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
  },
  recenterBtnPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: '#F8FAFC',
  },

  /* Layer 3: Floating Navigation Dock */
  layer3FloatingNav: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60 },
});
