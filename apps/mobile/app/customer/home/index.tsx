import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { sessionStore, httpClient, appendFileToFormData } from '@leopard/mobile-core';
import { addressStore, type SavedAddress } from '../../../src/features/customer/addresses/address-store';
import { createCustomerHttpAdapter } from '../../../src/features/customer/orders/adapter';
import {
  HomeDashboardScreen,
  type RecentOrder,
} from '../../../src/features/home/HomeDashboardScreen';
import type { VehicleCategory } from '@leopard/mobile-core';

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
  const [recentOrders, setRecentOrders] = useState<readonly RecentOrder[]>([]);

  // Load the customer's own recent orders
  useEffect(() => {
    let mounted = true;
    const port = createCustomerHttpAdapter();

    async function loadOrders() {
      try {
        const view = await port.getOrdersView('ALL');
        if (!mounted || view.kind !== 'content') return;

        setRecentOrders(
          view.orders
            .filter((order) => order.status === 'DELIVERED' || order.status === 'CANCELLED')
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
      } catch {
        // Silently ignore — Home falls back to empty recent list
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
      activeShipment={null}
      defaultPickupLabel={defaultAddress?.label}
      defaultPickupLocation={defaultAddress?.address}
      recentOrders={recentOrders}
      userName={customerUser?.name}
      userPhone={customerUser?.phone}
      onConfirmBooking={async (booking) => {
        let orderId: string | null = null;
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
              : undefined);
          const dropoffCoords = booking.dropoffCoords || undefined;

          const formPayload = {
            pickup: booking.pickup,
            pickupCoords,
            stops: (booking.stops || [])
              .filter((s) => s.address.trim().length > 0)
              .map((s) => ({
                id: s.id,
                value: s.address,
                coords: s.coords || undefined,
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

          if (!estimateToken) {
            throw new Error('Chưa thể lấy báo giá chính xác. Vui lòng kiểm tra lại địa chỉ giao nhận.');
          }

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
          } else {
            const errDetail =
              created.kind === 'error'
                ? created.message
                : 'Hệ thống không thể tạo đơn lúc này.';
            throw new Error(errDetail || 'Không thể tạo đơn hàng.');
          }
        } catch (err: any) {
          console.error('[CustomerBooking] Order creation failed:', err);
          const errorMsg =
            err?.message ||
            'Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng và thử lại.';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(errorMsg);
          } else {
            Alert.alert('Lỗi tạo đơn', errorMsg);
          }
          return;
        }

        if (!orderId) {
          return;
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
        router.push('/customer/booking');
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
      onOpenSavedAddresses={() => router.push('/customer/addresses')}
      onPressSearchAddress={(fleetVehicleId, pickup, pickupCoords) => {
        const isMockPickup = !pickupCoords && (!defaultAddress || !defaultAddress.address);
        const resolvedPickup = isMockPickup ? undefined : pickup;
        router.push({
          pathname: '/customer/booking',
          params: {
            focus: 'dropoff',
            ...(fleetVehicleId ? { vehicleId: fleetVehicleId } : {}),
            ...(resolvedPickup ? { pickup: resolvedPickup } : {}),
            ...(pickupCoords
              ? {
                  pickupLat: String(pickupCoords.lat),
                  pickupLng: String(pickupCoords.lng),
                }
              : {}),
          },
        });
      }}
      onQuickBook={(pickup, dropoff, dropoffCoords, pickupCoords, fleetVehicleId) => {
        router.push({
          pathname: '/customer/booking',
          params: {
            pickup,
            dropoff,
            ...(fleetVehicleId ? { vehicleId: fleetVehicleId } : {}),
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
      onSelectVehicleAndBook={(vehicleCategory, fleetVehicleId) => {
        setSelectedVehicleCategory(vehicleCategory);
      }}
      onSwitchRole={handleSwitchRole}
      onTopUpWallet={() => router.push('/customer/wallet')}
      onViewAllOrders={() => router.push('/customer/orders')}
    />
  );
}
