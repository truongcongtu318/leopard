import { OperationsShell } from '../../../components/shell/OperationsShell';
import { canAccess } from '../../../lib/auth/role-policy';
import { getVerifiedOperationsUser } from '../../../lib/auth/server-session';
import { redirect } from 'next/navigation';

const fleetNavItems = [
  { label: 'Tổng quan', href: '/fleet' },
  { label: 'Tài xế', href: '/fleet/drivers' },
  { label: 'Đơn hàng', href: '/fleet/orders' },
];

export default async function FleetLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedOperationsUser();
  if (!user) redirect('/login?expired=true');
  if (!canAccess(user.role, ['FLEET_OWNER'])) {
    redirect(user.role === 'ADMIN' ? '/admin' : '/login?forbidden=true');
  }

  return (
    <OperationsShell role="fleet_owner" navItems={fleetNavItems}>
      {children}
    </OperationsShell>
  );
}
