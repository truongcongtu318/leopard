import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { createCustomerProfileHttpAdapter } from './adapter';
import { EditProfileScreen } from './EditProfileScreen';

export function CustomerEditProfileRuntime() {
  const port = useMemo(() => createCustomerProfileHttpAdapter(), []);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const query = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => port.getProfileView(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: { name: string; email: string }) => port.updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
      router.back();
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu hồ sơ.');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => port.uploadAvatar(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
    },
  });

  const view = query.data;
  const initialName = view && view.kind === 'content' ? (view.name ?? '') : '';
  const initialEmail = view && view.kind === 'content' ? (view.email ?? '') : '';
  const avatarUrl = view && view.kind === 'content' ? view.avatarUrl : null;

  return (
    <EditProfileScreen
      avatarUrl={avatarUrl}
      errorMessage={errorMessage}
      initialEmail={initialEmail}
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
