import type { Metadata } from 'next';

import { AdminPreviewRoute } from '../../../../features/admin/AdminPreviewRoute';
import {
  parseAdminListFilters,
  type AdminSearchParams,
} from '../../../../features/admin/adapter';
import { readAdminPreviewInput } from '../../../../features/admin/route-input';

export const metadata: Metadata = {
  title: 'Hỗ trợ khách hàng — LEOPARD Operations',
};

export default async function AdminSupportPage({
  searchParams,
}: Readonly<{ searchParams: Promise<AdminSearchParams> }>) {
  const search = await searchParams;
  const preview = readAdminPreviewInput(search);
  return (
    <AdminPreviewRoute
      commandKind={preview.commandKind}
      filters={parseAdminListFilters('orders', search)}
      localFlag={preview.localFlag}
      scenario={preview.scenario}
      screen="support"
    />
  );
}
