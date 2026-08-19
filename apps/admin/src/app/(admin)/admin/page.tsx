import type { Metadata } from 'next';

import { AdminPreviewRoute } from '../../../features/admin/AdminPreviewRoute';
import type { AdminSearchParams } from '../../../features/admin/adapter';
import { readAdminPreviewInput } from '../../../features/admin/route-input';

export const metadata: Metadata = {
  title: 'Tổng quan vận hành — LEOPARD Operations',
};

export default async function AdminOverviewPage({
  searchParams,
}: Readonly<{ searchParams: Promise<AdminSearchParams> }>) {
  const search = await searchParams;
  const preview = readAdminPreviewInput(search);
  return (
    <AdminPreviewRoute
      commandKind={preview.commandKind}
      localFlag={preview.localFlag}
      scenario={preview.scenario}
      screen="overview"
    />
  );
}
