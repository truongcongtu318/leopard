import type { CustomerProfileView } from './model';

export type CustomerProfilePort = Readonly<{
  getProfileView: () => Promise<CustomerProfileView>;
  logout: () => Promise<void>;
}>;
