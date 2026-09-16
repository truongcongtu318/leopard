import { OperationsShell } from '../../../components/shell/OperationsShell';
import { canAccess } from '../../../lib/auth/role-policy';
import { getVerifiedOperationsUser } from '../../../lib/auth/server-session';
import { redirect } from 'next/navigation';
import type { SidebarNavGroup } from '../../../components/shell/AdminSidebar';

// Flat list kept for backward compat (mobile drawer, tests)
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
] as const;

// Grouped sidebar structure — matches LoadSwift-style dispatch console
const adminNavGroups: readonly SidebarNavGroup[] = [
  {
    groupLabel: 'Tổng quan',
    items: [
      { label: 'Dashboard', href: '/admin' },
    ],
  },
  {
    groupLabel: 'Vận hành',
    items: [
      { label: 'Điều phối', href: '/admin/dispatch' },
      { label: 'Bản đồ trực tiếp', href: '/admin/live-map' },
      { label: 'Đơn hàng', href: '/admin/orders', hasDropdown: true },
      { label: 'Khiếu nại', href: '/admin/reports', badge: 3 },
      { label: 'Hỗ trợ CSKH', href: '/admin/support' },
    ],
  },
  {
    groupLabel: 'Tài chính',
    items: [
      { label: 'Thanh toán', href: '/admin/payments' },
      { label: 'Hóa đơn', href: '/admin/invoices' },
      { label: 'Rút tiền', href: '/admin/withdrawals' },
      { label: 'Khuyến mãi', href: '/admin/promotions' },
    ],
  },
  {
    groupLabel: 'Người dùng',
    items: [
      { label: 'Khách hàng', href: '/admin/users' },
      { label: 'Tài xế', href: '/admin/drivers', hasDropdown: true },
      { label: 'Duyệt hồ sơ', href: '/admin/driver-applications' },
      { label: 'Đánh giá', href: '/admin/reviews' },
    ],
  },
  {
    groupLabel: 'Hệ thống',
    items: [
      { label: 'Thông báo', href: '/admin/notifications' },
      { label: 'Cấu hình giá', href: '/admin/pricing' },
      { label: 'Nhật ký kiểm toán', href: '/admin/audit' },
      { label: 'Cài đặt', href: '/admin/settings' },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedOperationsUser();
  if (!user) redirect('/login?expired=true');
  if (!canAccess(user.role, ['ADMIN'])) {
    redirect('/login?forbidden=true');
  }

  return (
    <OperationsShell role="admin" navItems={adminNavItems} navGroups={adminNavGroups}>
      {children}
    </OperationsShell>
  );
}
