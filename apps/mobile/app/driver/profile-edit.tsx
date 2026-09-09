import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { createDriverProfileHttpAdapter } from '../../src/features/driver/profile/adapter';
import { DriverEditProfileScreen } from '../../src/features/driver/profile/DriverEditProfileScreen';

export default function DriverProfileEditRoute() {
  const port = useMemo(() => createDriverProfileHttpAdapter(), []);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const query = useQuery({ queryKey: ['driver', 'profile'], queryFn: () => port.getProfileView() });

  const saveMutation = useMutation({
    mutationFn: (input: { name: string; email: string }) => port.updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['driver', 'profile'] });
      router.back();
    },
    onError: (error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu hồ sơ.'),
  });

  const avatarMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => port.uploadAvatar(file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['driver', 'profile'] }),
    onError: (error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Không thể tải ảnh lên.'),
  });

  const view = query.data;
  const isContent = view && view.kind === 'content';
  const initialName = isContent ? (view.name ?? '') : '';
  const initialEmail = isContent ? (view.email ?? '') : '';
  const avatarUrl = isContent ? view.avatarUrl : null;
  const phone = isContent ? view.phone : undefined;
  const vehicleLabel = isContent ? view.vehicleLabel : undefined;

  return (
    <DriverEditProfileScreen
      avatarUrl={avatarUrl}
      driverCode="DRV-88924"
      errorMessage={errorMessage}
      fleetLabel="Fleet Tân Bình (Pilot)"
      initialEmail={initialEmail}
      initialName={initialName}
      isSaving={saveMutation.isPending}
      onBack={() => router.back()}
      onPickAvatar={(file) => avatarMutation.mutate(file)}
      onSave={(input) => {
        setErrorMessage(undefined);
        saveMutation.mutate(input);
      }}
      phone={phone}
      vehicleLabel={vehicleLabel}
    />
  );
}
