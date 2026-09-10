import type { Metadata } from 'next';

import { DriverApplicationsScreen } from '../../../../features/admin/DriverApplicationsScreen';

export const metadata: Metadata = {
  title: 'Duyệt tài xế — LEOPARD Operations',
};

export default function AdminDriverApplicationsPage() {
  return <DriverApplicationsScreen />;
}
