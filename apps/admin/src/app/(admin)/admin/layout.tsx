import { OperationsShell } from '../../../components/shell/OperationsShell';
import { canAccess } from '../../../lib/auth/role-policy';
import { getVerifiedOperationsUser } from '../../../lib/auth/server-session';
import { redirect } from 'next/navigation';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Fleets', href: '/admin/fleets' },
  { label: 'Drivers', href: '/admin/drivers' },
  { label: 'Orders', href: '/admin/orders' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedOperationsUser();
  if (!user) redirect('/login?expired=true');
  if (!canAccess(user.role, ['ADMIN'])) {
    redirect(user.role === 'FLEET_OWNER' ? '/fleet' : '/login?forbidden=true');
  }

  return (
    <OperationsShell role="admin" navItems={adminNavItems}>
      {children}
    </OperationsShell>
  );
}
