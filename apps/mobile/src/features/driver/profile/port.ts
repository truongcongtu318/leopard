import type { DriverProfileView } from './model';

export type DriverProfilePort = Readonly<{
  getProfileView: () => Promise<DriverProfileView>;
  logout: () => Promise<void>;
}>;
