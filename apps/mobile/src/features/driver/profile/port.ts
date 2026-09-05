import type { DriverProfileView } from './model';

export type DriverProfilePort = Readonly<{
  getProfileView: () => Promise<DriverProfileView>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string; email: string }) => Promise<void>;
  uploadAvatar: (
    file: { uri: string; name: string; type: string },
  ) => Promise<{ avatarStorageKey: string }>;
}>;
