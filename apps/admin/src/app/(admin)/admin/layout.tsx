import { OperationsShell } from '../../../components/shell/OperationsShell';
import { canAccess } from '../../../lib/auth/role-policy';
import { getVerifiedOperationsUser } from '../../../lib/auth/server-session';
import { redirect } from 'next/navigation';

const adminNavItems = [
  { label: 'Tổng quan', href: '/admin' },
  { label: 'Điều phối', href: '/admin/dispatch' },
  { label: 'Bản đồ trực tiếp', href: '/admin/live-map' },
  { label: 'Đơn hàng', href: '/admin/orders' },
  { label: 'Khiếu nại', href: '/admin/reports' },
  { label: 'Hỗ trợ', href: '/admin/support' },
  { label: 'Thanh toán', href: '/admin/payments' },
  { label: 'Hóa đơn', href: '/admin/invoices' },
  { label: 'Rút tiền', href: '/admin/withdrawals' },
  { label: 'Khuyến mãi', href: '/admin/promotions' },
  { label: 'Thông báo', href: '/admin/notifications' },
  { label: 'Đánh giá', href: '/admin/reviews' },
  { label: 'Người dùng', href: '/admin/users' },
  { label: 'Tài xế', href: '/admin/drivers' },
  { label: 'Duyệt hồ sơ', href: '/admin/driver-applications' },
  { label: 'Cấu hình giá', href: '/admin/pricing' },
  { label: 'Kiểm toán', href: '/admin/audit' },
  { label: 'Cài đặt', href: '/admin/settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedOperationsUser();
  if (!user) redirect('/login?expired=true');
  if (!canAccess(user.role, ['ADMIN'])) {
    redirect('/login?forbidden=true');
  }

  return (
    <OperationsShell role="admin" navItems={adminNavItems}>
      {children}
    </OperationsShell>
  );
}
