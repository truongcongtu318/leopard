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

function vehicleCategoryToOrderType(vehicleId: VehicleCategory): 'MOTORBIKE' | 'VAN' | 'TRUCK' {
  switch (vehicleId) {
    case '3_WHEEL_BIKE':
      return 'MOTORBIKE';
    case 'LIGHT_TRUCK':
      return 'VAN';
    case 'HEAVY_TRUCK':
    default:
      return 'TRUCK';
  }
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
              destination: detail.order.route.destination.label,
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
        return '120000';
      case 'HEAVY_TRUCK':
        return '450000';
      case 'LIGHT_TRUCK':
      default:
        return '280000';
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
        try {
          const port = createCustomerHttpAdapter();
          const pickupCoords =
            defaultAddress?.latitude && defaultAddress?.longitude
              ? { lat: defaultAddress.latitude, lng: defaultAddress.longitude }
              : resolveLocationCoords(booking.pickup);
          const dropoffCoords = resolveLocationCoords(booking.dropoff, pickupCoords);
          const vehicleType = vehicleCategoryToOrderType(booking.vehicleCategory);

          const formPayload = {
            pickup: booking.pickup,
            pickupCoords,
            stops: (booking.stops || [])
              .filter((s) => s.address.trim().length > 0)
              .map((s) => ({ id: s.id, value: s.address, coords: s.coords })),
            dropoff: booking.dropoff,
            dropoffCoords,
            vehicleType,
            cargoNote: [booking.cargoCategory, booking.cargoNote].filter(Boolean).join(' · '),
            cargoWeight: vehicleType === 'TRUCK' ? '1250' : '300',
            requiresLoadingSupport: booking.hasLoadingSupport,
            paymentMethod: booking.paymentMethod,
            fieldErrors: {},
          };

          const estimateView = await port.estimateOrder(formPayload);
          const estimateToken =
            estimateView.kind === 'form' && estimateView.estimate.kind === 'ready'
              ? estimateView.estimate.routes[0]?.estimateToken
              : undefined;

          if (estimateToken) {
            const created = await port.createOrder(formPayload, estimateToken);
            if (created.kind === 'content') {
              orderId = created.order.id;

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
        } catch {
          // Keep offline fallback orderId if network unavailable
        }

        if (booking.paymentMethod === 'CASH') {
          router.push({
            pathname: `/customer/orders/searching/${orderId}`,
            params: {
              amount: String(booking.totalFare),
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              origin: booking.pickup,
              destination: booking.dropoff,
              vehicleName: booking.vehicleName,
              paymentMethod: 'CASH',
            },
          });
        } else {
          router.push({
            pathname: `/customer/orders/checkout/${orderId}`,
            params: {
              amount: String(booking.totalFare),
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              origin: booking.pickup,
              destination: booking.dropoff,
              vehicleName: booking.vehicleName,
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
      onQuickBook={(pickup, dropoff, dropoffCoords) => {
        router.push({
          pathname: '/customer/orders/new',
          params: {
            pickup,
            dropoff,
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
