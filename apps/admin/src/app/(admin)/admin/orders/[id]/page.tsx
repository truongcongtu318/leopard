import type { Metadata } from 'next';

import { AdminPreviewRoute } from '../../../../../features/admin/AdminPreviewRoute';
import {
  parseAdminEntityId,
  type AdminSearchParams,
} from '../../../../../features/admin/adapter';
import { readAdminPreviewInput } from '../../../../../features/admin/route-input';

export const metadata: Metadata = {
  title: 'Chi tiết đơn — LEOPARD Operations',
};

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}>) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const preview = readAdminPreviewInput(search);
  return (
    <AdminPreviewRoute
      commandKind={preview.commandKind}
      localFlag={preview.localFlag}
      orderId={parseAdminEntityId(id)}
      scenario={preview.scenario}
      screen="order-detail"
    />
  );
}
