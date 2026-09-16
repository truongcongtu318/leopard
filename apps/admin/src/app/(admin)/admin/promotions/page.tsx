import type { Metadata } from 'next';

import { AdminPreviewRoute } from '../../../../features/admin/AdminPreviewRoute';
import {
  parseAdminListFilters,
  type AdminSearchParams,
} from '../../../../features/admin/adapter';
import { readAdminPreviewInput } from '../../../../features/admin/route-input';

export const metadata: Metadata = {
  title: 'Khuyến mãi — LEOPARD Operations',
};

export default async function AdminPromotionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<AdminSearchParams> }>) {
  const search = await searchParams;
  const preview = readAdminPreviewInput(search);
  return (
    <AdminPreviewRoute
      commandKind={preview.commandKind}
      filters={parseAdminListFilters('promotions', search)}
      localFlag={preview.localFlag}
      scenario={preview.scenario}
      screen="promotions"
    />
  );
}
