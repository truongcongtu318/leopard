import { OperationsShell } from '../../../components/shell/OperationsShell';
import { canAccess } from '../../../lib/auth/role-policy';
import { getVerifiedOperationsUser } from '../../../lib/auth/server-session';
import { redirect } from 'next/navigation';

const adminNavItems = [
  { label: 'Tổng quan', href: '/admin' },
  { label: 'Đơn hàng', href: '/admin/orders' },
  { label: 'Người dùng', href: '/admin/users' },
  { label: 'Đội xe', href: '/admin/fleets' },
  { label: 'Tài xế', href: '/admin/drivers' },
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
