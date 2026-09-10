import type { CustomerProfileView } from './model';

export interface CustomerProfilePort {
  getProfileView(): Promise<CustomerProfileView>;
  logout(): Promise<void>;
  updateProfile(input: { name: string; email: string }): Promise<void>;
  uploadAvatar(file: { uri: string; name: string; type: string }): Promise<{ avatarStorageKey: string }>;
}
