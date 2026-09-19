import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { httpClient, sessionStore } from '@leopard/mobile-core';
import { useDriverRegister } from '../../src/features/registration/useDriverRegister';
import { DriverRegisterView } from '../../src/features/registration/DriverRegisterView';

export {
  type VehicleOption,
  type VehicleDefinition,
  VEHICLE_OPTIONS,
  CITIES,
  type DocType,
  DOC_SLOTS,
  DRAFT_STORAGE_KEY,
  type DriverRegisterDraft,
  draftStorage,
  isValidPlate,
} from '../../src/features/registration/driver-register-model';

export default function RegisterScreen() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkApplication = async () => {
      try {
        const app = await httpClient.get<{ status: string }>('/driver/application');
        if (!active) return;
        if (app.status === 'PENDING_APPROVAL') {
          router.replace('/(public)/kyc-pending');
        } else if (app.status === 'ACTIVE') {
          router.replace('/orders');
        }
      } catch {
        // No application yet or 404, allow user to fill the registration form
      }
    };

    if (sessionStore.getAccessToken()) {
      void checkApplication();
    }

    const unsubscribe =
      typeof sessionStore.subscribe === 'function'
        ? sessionStore.subscribe((state) => {
            if (state.authenticated && active) {
              void checkApplication();
            }
          })
        : () => {};

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const registration = useDriverRegister({
    onSuccess: () => router.replace('/(public)/kyc-pending'),
  });


  return (
    <DriverRegisterView
      onDone={() => router.replace('/(public)/kyc-pending')}
      registration={registration}
    />
  );
}
