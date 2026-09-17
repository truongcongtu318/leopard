import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BookingScreen } from '../../src/features/customer/booking/BookingScreen';
import { addressStore } from '../../src/features/customer/addresses/address-store';

export default function CustomerBookingPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pickup?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropoff?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    distanceKm?: string;
    focus?: 'pickup' | 'dropoff';
  }>();

  const defaultAddr = addressStore.getDefaultAddress();
  const pickup = params.pickup || defaultAddr?.address || 'Kho Tổng Đại Phát - 120 Song Hành, Q.12';
  const dropoff = params.dropoff || 'Công trình Jamona City - Đào Trí, P. Phú Thuận, Q.7';
  const distanceKm = params.distanceKm ? parseFloat(params.distanceKm) : 12.5;

  return (
    <BookingScreen
      distanceKm={distanceKm}
      initialDropoff={dropoff}
      initialDropoffLat={params.dropoffLat ? parseFloat(params.dropoffLat) : 10.7325}
      initialDropoffLng={params.dropoffLng ? parseFloat(params.dropoffLng) : 106.7351}
      initialPickup={pickup}
      initialPickupLat={params.pickupLat ? parseFloat(params.pickupLat) : 10.8421}
      initialPickupLng={params.pickupLng ? parseFloat(params.pickupLng) : 106.6192}
      initialFocusTarget={params.focus}
      onBack={() => router.back()}
      onOpenSearchAddress={() => router.push('/customer/search-address')}
      onOrderCreated={(orderId, totalFare) => {
        router.push({
          pathname: `/customer/orders/searching/${orderId}`,
          params: {
            amount: String(totalFare),
            pickup,
            dropoff,
            origin: pickup,
            destination: dropoff,
            paymentMethod: 'VIETQR',
          },
        });
      }}
    />
  );
}
