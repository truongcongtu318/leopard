import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SearchAddressScreen } from '../../src/features/customer/booking/SearchAddressScreen';

export default function SearchAddressPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();

  return (
    <SearchAddressScreen
      initialQuery={params.query}
      onBack={() => router.back()}
      onSelectAddress={(address, coords) => {
        router.push({
          pathname: '/customer/booking',
          params: {
            dropoff: address,
            ...(coords
              ? {
                  dropoffLat: String(coords.lat),
                  dropoffLng: String(coords.lng),
                }
              : {}),
          },
        });
      }}
    />
  );
}
