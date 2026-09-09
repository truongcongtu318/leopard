import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { sessionStore } from '../../../src/auth/session-store';
import { addressStore, type SavedAddress } from '../../../src/features/customer/addresses/address-store';
import { createCustomerHttpAdapter } from '../../../src/features/customer/orders/adapter';
import {
  HomeDashboardScreen,
  type ActiveShipment,
  type RecentOrder,
} from '../../../src/features/home/HomeDashboardScreen';
import type { VehicleCategory } from '../../../src/ui/VehicleSelectCard';

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
              .filter((order) => order.status === 'DELIVERED' && order.id !== activeOrder?.id)
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
          const { httpClient } = require('../../../src/api/http-client');
          const user = await httpClient.get('/me');
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
    await sessionStore.setSession('preview-acc-token', 'preview-ref-token', targetRole);
    if (targetRole === 'DRIVER') {
      router.replace('/driver/orders');
    } else {
      router.replace('/customer/home');
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
      onCreateOrder={() =>
        router.push({
          pathname: '/customer/orders/new',
          params: buildPickupParams(),
        })
      }
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
      onQuickBook={(pickup, dropoff, dropoffCoords) =>
        router.push({
          pathname: '/customer/orders/new',
          params: {
            ...buildPickupParams(pickup),
            dropoff,
            ...(dropoffCoords
              ? {
                  dropoffLat: String(dropoffCoords.lat),
                  dropoffLng: String(dropoffCoords.lng),
                }
              : {}),
          },
        })
      }
      onRegisterDriver={() => router.push('/(public)/driver-register')}
      onSelectVehicleAndBook={(vehicleId) =>
        router.push({
          pathname: '/customer/orders/new',
          params: {
            ...buildPickupParams(),
            vehicleType: vehicleCategoryToOrderType(vehicleId),
          },
        })
      }
      onSwitchRole={handleSwitchRole}
      onTopUpWallet={() => router.push('/customer/wallet')}
      onViewAllOrders={() => router.push('/customer/orders')}
    />
  );
}
