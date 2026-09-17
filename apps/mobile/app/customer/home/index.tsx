import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { sessionStore, httpClient, appendFileToFormData, resolveLocationCoords } from '@leopard/mobile-core';
import { addressStore, type SavedAddress } from '../../../src/features/customer/addresses/address-store';
import { createCustomerHttpAdapter } from '../../../src/features/customer/orders/adapter';
import {
  HomeDashboardScreen,
  type ActiveShipment,
  type RecentOrder,
} from '../../../src/features/home/HomeDashboardScreen';
import type { VehicleCategory } from '@leopard/mobile-core';

const ACTIVE_ORDER_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
] as const;

function resolveVehicleOrderType(
  fleetVehicleId?: string,
  vehicleName?: string,
  vehicleCategory?: VehicleCategory,
): {
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  cargoWeight: string;
} {
  if (fleetVehicleId === 'TRUCK_25T' || vehicleName?.includes('2.5') || vehicleCategory === 'HEAVY_TRUCK') {
    return { vehicleType: 'TRUCK', cargoWeight: '2500' };
  }
  if (
    fleetVehicleId === 'TRUCK_125T' ||
    vehicleName?.includes('1.25') ||
    vehicleName?.toLowerCase().includes('tải')
  ) {
    return { vehicleType: 'TRUCK', cargoWeight: '1250' };
  }
  if (fleetVehicleId === 'VAN_500KG' || vehicleName?.toLowerCase().includes('van')) {
    return { vehicleType: 'VAN', cargoWeight: '500' };
  }
  if (fleetVehicleId === 'BIKE_3W' || vehicleName?.toLowerCase().includes('gác') || vehicleCategory === '3_WHEEL_BIKE') {
    return { vehicleType: 'MOTORBIKE', cargoWeight: '300' };
  }
  return { vehicleType: 'TRUCK', cargoWeight: '1250' };
}

export default function CustomerHomePage() {
  const router = useRouter();
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(() =>
    addressStore.getDefaultAddress(),
  );

  const [customerUser, setCustomerUser] = useState<{ name?: string; phone?: string } | null>(null);
  const [activeShipment, setActiveShipment] = useState<ActiveShipment | null>(null);
  const [recentOrders, setRecentOrders] = useState<readonly RecentOrder[]>([]);

  // Load the customer's own orders to drive the "active shipment" and
  // "recent orders" cards instead of showing fixed sample data.
  useEffect(() => {
    let mounted = true;
    const port = createCustomerHttpAdapter();

    async function loadOrders() {
      try {
        const view = await port.getOrdersView('ALL');
        if (!mounted || view.kind !== 'content') return;

        const activeOrder = view.orders.find((order) =>
          (ACTIVE_ORDER_STATUSES as readonly string[]).includes(order.status),
        );

        if (activeOrder) {
          const detail = await port.getOrderDetailView(activeOrder.id);
          if (mounted && detail.kind === 'content') {
            const isFinished =
              detail.order.status === 'DELIVERED' || detail.order.status === 'CANCELLED';
            setActiveShipment({
              orderId: detail.order.id,
              status: detail.order.status,
              origin: detail.order.route.origin.label,
              originCoords: detail.order.route.origin.coords
                ? { lat: detail.order.route.origin.coords.lat, lng: detail.order.route.origin.coords.lng }
                : undefined,
              destination: detail.order.route.destination.label,
              destinationCoords: detail.order.route.destination.coords
                ? { lat: detail.order.route.destination.coords.lat, lng: detail.order.route.destination.coords.lng }
                : undefined,
              cargoNote: detail.order.cargo.note ?? undefined,
              etaMinutes: isFinished
                ? undefined
                : Math.max(1, Math.round(detail.order.etaDurationSeconds / 60)),
            });
          }
        } else if (mounted) {
          setActiveShipment(null);
        }

        if (mounted) {
          setRecentOrders(
            view.orders
              .filter((order) => (order.status === 'DELIVERED' || order.status === 'CANCELLED') && order.id !== activeOrder?.id)
              .slice(0, 5)
              .map((order) => ({
                id: order.id,
                reference: order.reference,
                status: order.status,
                origin: order.route.origin.label,
                destination: order.route.destination.label,
                price: order.priceLabel,
                updated: order.updatedAtLabel,
              })),
          );
        }
      } catch {
        // Silently ignore — Home falls back to no active shipment / empty recent list
      }
    }

    void loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync address when screen is active
  useEffect(() => {
    const addr = addressStore.getDefaultAddress();
    if (addr) {
      setDefaultAddress(addr);
    }
  }, []);

  // Sync authenticated user info from /me
  useEffect(() => {
    let mounted = true;
    async function loadCustomerUser() {
      try {
        if (sessionStore.isAuthenticated()) {
          const user = await httpClient.get<{ id: string; name?: string | null; phone?: string | null }>('/me');
          if (mounted && user) {
            setCustomerUser({
              name: user.name || undefined,
              phone: user.phone || undefined,
            });
          }
        }
      } catch {
        // Silently ignore if unauthenticated or network unavailable
      }
    }
    void loadCustomerUser();
    return () => {
      mounted = false;
    };
  }, []);

  function buildPickupParams(pickupText?: string): Readonly<{
    pickup?: string;
    pickupLat?: string;
    pickupLng?: string;
  }> {
    const pickup = pickupText ?? defaultAddress?.address ?? undefined;
    const matchesKnownAddress = !pickupText || pickupText === defaultAddress?.address;
    const hasCoords =
      matchesKnownAddress &&
      typeof defaultAddress?.latitude === 'number' &&
      typeof defaultAddress?.longitude === 'number';

    return {
      pickup,
      ...(hasCoords
        ? {
            pickupLat: String(defaultAddress!.latitude),
            pickupLng: String(defaultAddress!.longitude),
          }
        : {}),
    };
  }

  const handleSwitchRole = async (targetRole: 'CUSTOMER' | 'DRIVER') => {
    try {
      const accountId = targetRole === 'DRIVER' ? 'driver' : 'customer';
      const auth = await httpClient.post<{
        session: { accessToken: string; refreshToken: string };
        user: { role: 'CUSTOMER' | 'DRIVER' };
      }>('/auth/login/demo', { accountId });
      if (auth?.session) {
        await sessionStore.setSession(
          auth.session.accessToken,
          auth.session.refreshToken,
          targetRole,
        );
      }
    } catch {
      await sessionStore.setSession('preview-acc-token', 'preview-ref-token', targetRole);
    }
    if (targetRole === 'DRIVER') {
      router.replace('/(public)/login');
    } else {
      router.replace('/customer/home');
    }
  };

  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState<VehicleCategory>('LIGHT_TRUCK');

  const getAmountForVehicle = (cat: VehicleCategory) => {
    switch (cat) {
      case '3_WHEEL_BIKE':
        return '70000';
      case 'HEAVY_TRUCK':
        return '320000';
      case 'LIGHT_TRUCK':
      default:
        return '200000';
    }
  };

  return (
    <HomeDashboardScreen
      activeShipment={activeShipment}
      defaultPickupLabel={defaultAddress?.label}
      defaultPickupLocation={defaultAddress?.address}
      recentOrders={recentOrders}
      userName={customerUser?.name}
      userPhone={customerUser?.phone}
      onConfirmBooking={async (booking) => {
        let orderId = `11111111-1111-4111-8111-${Date.now().toString().slice(-12)}`;
        let finalAmount = booking.totalFare;
        const { vehicleType, cargoWeight } = resolveVehicleOrderType(
          booking.fleetVehicleId,
          booking.vehicleName,
          booking.vehicleCategory,
        );
        try {
          const port = createCustomerHttpAdapter();
          const pickupCoords =
            booking.pickupCoords ||
            (defaultAddress?.latitude && defaultAddress?.longitude
              ? { lat: defaultAddress.latitude, lng: defaultAddress.longitude }
              : resolveLocationCoords(booking.pickup));
          const dropoffCoords =
            booking.dropoffCoords || resolveLocationCoords(booking.dropoff, pickupCoords);

          const formPayload = {
            pickup: booking.pickup,
            pickupCoords,
            stops: (booking.stops || [])
              .filter((s) => s.address.trim().length > 0)
              .map((s) => ({
                id: s.id,
                value: s.address,
                coords: s.coords || resolveLocationCoords(s.address, pickupCoords),
              })),
            dropoff: booking.dropoff,
            dropoffCoords,
            vehicleType,
            cargoNote: [
              booking.vehicleName ? `Loại xe: ${booking.vehicleName}` : null,
              booking.hasLoadingSupport ? 'Bốc xếp: Có' : null,
              booking.cargoCategory,
              booking.cargoNote,
            ].filter(Boolean).join(' · '),
            cargoWeight,
            requiresLoadingSupport: booking.hasLoadingSupport,
            hasLoadingSupport: booking.hasLoadingSupport,
            hasVatInvoice: booking.hasVatInvoice,
            paymentMethod: booking.paymentMethod,
            fieldErrors: {},
          };

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

          if (estimateToken) {
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

              if (booking.cargoImageUri) {
                try {
                  const form = new FormData();
                  await appendFileToFormData(form, 'file', {
                    uri: booking.cargoImageUri,
                    name: 'cargo.jpg',
                    mimeType: 'image/jpeg',
                  });
                  form.append('clientRequestId', `req-${Date.now()}`);
                  await httpClient.postForm(`/orders/${orderId}/media/cargo`, form);
                } catch {
                  // Non-blocking upload fallback
                }
              }
            }
          }
        } catch (err) {
          console.warn('[CustomerBooking] Order creation failed, falling back to mock:', err);
        }

        if (booking.paymentMethod === 'CASH') {
          router.push({
            pathname: `/customer/orders/searching/${orderId}`,
            params: {
              amount: String(finalAmount),
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              origin: booking.pickup,
              destination: booking.dropoff,
              vehicleName: booking.vehicleName,
              vehicleType,
              paymentMethod: 'CASH',
            },
          });
        } else {
          router.push({
            pathname: `/customer/orders/checkout/${orderId}`,
            params: {
              amount: String(finalAmount),
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              origin: booking.pickup,
              destination: booking.dropoff,
              vehicleName: booking.vehicleName,
              vehicleType,
              paymentMethod: 'VIETQR',
            },
          });
        }
      }}
      onCreateOrder={() => {
        // Quick-create is intentionally disabled: all orders must go through
        // onConfirmBooking with a real estimateToken + createOrder API call.
        // Redirect user into the standard booking entry point.
        router.push('/customer/orders/new');
      }}
      onNavigateTab={(tab) => {
        switch (tab) {
          case 'orders':
            router.push('/customer/orders');
            break;
          case 'wallet':
            router.push('/customer/wallet');
            break;
          case 'account':
            router.push('/customer/profile');
            break;
          default:
            break;
        }
      }}
      onOpenActiveOrder={(orderId) =>
        router.push({
          pathname: '/customer/tracking',
          params: { orderId },
        })
      }
      onOpenNotifications={() => router.push('/customer/notifications')}
      onOpenOrder={(orderId) => router.push(`/customer/orders/${orderId}`)}
      onOpenProfile={() => router.push('/customer/profile')}
      onOpenQrScan={() => router.push('/customer/wallet')}
      onOpenSavedAddresses={() => router.push('/(public)/customer-address')}
      onPressSearchAddress={() => router.push('/customer/search-address')}
      onQuickBook={(pickup, dropoff, dropoffCoords, pickupCoords) => {
        router.push({
          pathname: '/customer/booking',
          params: {
            pickup,
            dropoff,
            ...(pickupCoords
              ? {
                  pickupLat: String(pickupCoords.lat),
                  pickupLng: String(pickupCoords.lng),
                }
              : {}),
            ...(dropoffCoords
              ? {
                  dropoffLat: String(dropoffCoords.lat),
                  dropoffLng: String(dropoffCoords.lng),
                }
              : {}),
          },
        });
      }}
      onRegisterDriver={() => router.push('/(public)/driver-register')}
      onSelectVehicleAndBook={(vehicleId) => {
        setSelectedVehicleCategory(vehicleId);
      }}
      onSwitchRole={handleSwitchRole}
      onTopUpWallet={() => router.push('/customer/wallet')}
      onViewAllOrders={() => router.push('/customer/orders')}
    />
  );
}
