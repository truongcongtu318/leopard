import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import type { OrderStatus } from '@leopard/shared';
import type { DriverTrackingSender } from '../tracking-sender';
import { isTrackingEligibleStatus } from '../tracking-sender';

interface UseDriverOrderTrackingParams {
  orderId: string;
  status?: OrderStatus | null;
  sender: DriverTrackingSender;
}

export function useDriverOrderTracking({
  orderId,
  status,
  sender,
}: UseDriverOrderTrackingParams) {
  const startedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!status) return;
    if (startedOrderRef.current !== orderId) {
      startedOrderRef.current = orderId;
      void sender.start(orderId, status);
    } else {
      sender.handleOrderStatusChange(status);
    }
  }, [sender, orderId, status]);

  useEffect(() => {
    return () => {
      sender.destroy();
    };
  }, [sender]);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      if (!isTrackingEligibleStatus(status)) {
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (permission.status !== 'granted') {
        sender.setPermissionDenied(true);
        return;
      }

      sender.setPermissionDenied(false);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        (position) => {
          if (cancelled) return;
          void sender.sendPoint({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy ?? undefined,
            heading: position.coords.heading,
            speed: position.coords.speed,
            capturedAt: new Date(position.timestamp).toISOString(),
          });
        },
      );
      if (cancelled && subscription) {
        subscription.remove();
      }
    }

    void startWatching();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [sender, status]);
}
