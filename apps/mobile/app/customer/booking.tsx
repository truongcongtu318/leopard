import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BookingScreen } from '../../src/features/customer/booking/BookingScreen';
import { addressStore } from '../../src/features/customer/addresses/address-store';
import type { VehicleTypeId } from '../../src/features/customer/booking/booking-pricing';

export default function CustomerBookingPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pickup?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropoff?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    focus?: 'pickup' | 'dropoff';
    vehicleId?: VehicleTypeId;
  }>();

  const defaultAddr = addressStore.getDefaultAddress();
  const defaultCoords =
    typeof defaultAddr?.latitude === 'number' && typeof defaultAddr?.longitude === 'number'
      ? { lat: defaultAddr.latitude, lng: defaultAddr.longitude }
      : undefined;

  // No fallback address: only use pickup/dropoff if explicitly passed in params.
  // Never auto-populate defaultAddr so entering booking always starts blank.
  const pickup = params.pickup || '';
  const pickupCoords =
    params.pickupLat && params.pickupLng
      ? { lat: parseFloat(params.pickupLat), lng: parseFloat(params.pickupLng) }
      : undefined;

  const dropoff = params.dropoff || '';
  const dropoffCoords =
    params.dropoffLat && params.dropoffLng
      ? { lat: parseFloat(params.dropoffLat), lng: parseFloat(params.dropoffLng) }
      : undefined;

  return (
    <BookingScreen
      initialDropoff={dropoff}
      {...(dropoffCoords ? { initialDropoffLat: dropoffCoords.lat, initialDropoffLng: dropoffCoords.lng } : {})}
      initialFocusTarget={params.focus}
      initialPickup={pickup}
      {...(pickupCoords ? { initialPickupLat: pickupCoords.lat, initialPickupLng: pickupCoords.lng } : {})}
      initialVehicleId={params.vehicleId}
      onBack={() => {
        if (typeof router.canGoBack === 'function' && router.canGoBack()) {
          router.back();
        } else {
          router.replace('/customer/home');
        }
      }}
      onOrderCreated={(orderId, totalFare, paymentMethod, vehicleType, vehicleName) => {
        const shared = {
          amount: String(totalFare),
          pickup,
          dropoff,
          origin: pickup,
          destination: dropoff,
          ...(vehicleType ? { vehicleType } : {}),
          ...(vehicleName ? { vehicleName } : {}),
        };
        if (paymentMethod === 'CASH') {
          router.push({
            pathname: `/customer/orders/searching/${orderId}`,
            params: { ...shared, paymentMethod: 'CASH' },
          });
        } else {
          router.push({
            pathname: `/customer/orders/checkout/${orderId}`,
            params: { ...shared, paymentMethod: 'VIETQR' },
          });
        }
      }}
    />
  );
}
