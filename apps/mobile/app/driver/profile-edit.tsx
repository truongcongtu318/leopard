import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { EditProfileScreen } from '../../src/features/customer/profile/EditProfileScreen';
import { createDriverProfileHttpAdapter } from '../../src/features/driver/profile/adapter';

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
  const initialName = view && view.kind === 'content' ? (view.name ?? '') : '';
  const avatarUrl = view && view.kind === 'content' ? view.avatarUrl : null;

  return (
    <EditProfileScreen
      avatarUrl={avatarUrl}
      eyebrow="DRIVER · HỒ SƠ"
      errorMessage={errorMessage}
      initialEmail=""
      initialName={initialName}
      isSaving={saveMutation.isPending}
      onPickAvatar={(file) => avatarMutation.mutate(file)}
      onSave={(input) => {
        setErrorMessage(undefined);
        saveMutation.mutate(input);
      }}
    />
  );
}
