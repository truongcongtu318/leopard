import React from 'react';
import { useRouter } from 'expo-router';
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
