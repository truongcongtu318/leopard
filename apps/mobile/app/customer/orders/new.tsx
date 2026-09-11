import { useLocalSearchParams, useRouter } from 'expo-router';

import { CustomerCreateOrderRuntime } from '../../../src/features/customer/orders/CustomerCreateOrderRuntime';

const VEHICLE_TYPES = ['MOTORBIKE', 'VAN', 'TRUCK'] as const;

function parseCoord(value: string | string[] | undefined): number | undefined {
  const raw = typeof value === 'string' ? value : undefined;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseVehicleType(
  value: string | string[] | undefined,
): 'MOTORBIKE' | 'VAN' | 'TRUCK' | undefined {
  const raw = typeof value === 'string' ? value : undefined;
  return (VEHICLE_TYPES as readonly string[]).includes(raw ?? '')
    ? (raw as (typeof VEHICLE_TYPES)[number])
    : undefined;
}

export default function CustomerCreateOrderPage() {
  const router = useRouter();
  const {
    dropoff,
    dropoffLat,
    dropoffLng,
    pickup,
    pickupLat,
    pickupLng,
    vehicleType,
  } = useLocalSearchParams<{
    dropoff?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    pickup?: string;
    pickupLat?: string;
    pickupLng?: string;
    vehicleType?: string;
  }>();

  const pickupLatValue = parseCoord(pickupLat);
  const pickupLngValue = parseCoord(pickupLng);
  const dropoffLatValue = parseCoord(dropoffLat);
  const dropoffLngValue = parseCoord(dropoffLng);

  return (
    <CustomerCreateOrderRuntime
      initialDropoff={typeof dropoff === 'string' ? dropoff : undefined}
      initialDropoffCoords={
        dropoffLatValue !== undefined && dropoffLngValue !== undefined
          ? { lat: dropoffLatValue, lng: dropoffLngValue }
          : undefined
      }
      initialPickup={typeof pickup === 'string' ? pickup : undefined}
      initialPickupCoords={
        pickupLatValue !== undefined && pickupLngValue !== undefined
          ? { lat: pickupLatValue, lng: pickupLngValue }
          : undefined
      }
      initialVehicleType={parseVehicleType(vehicleType)}
      onCreated={(orderId) => router.replace(`/customer/orders/checkout/${orderId}`)}
    />
  );
}

