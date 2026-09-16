import type { Metadata } from 'next';

import { AdminPreviewRoute } from '../../../../../features/admin/AdminPreviewRoute';
import {
  parseAdminEntityId,
  type AdminSearchParams,
} from '../../../../../features/admin/adapter';
import { readAdminPreviewInput } from '../../../../../features/admin/route-input';

export const metadata: Metadata = {
  title: 'Xử lý khiếu nại — LEOPARD Operations',
};

export default async function AdminReportDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}>) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const preview = readAdminPreviewInput(search);
  const parsedId = parseAdminEntityId(id);
  return (
    <AdminPreviewRoute
      commandKind={preview.commandKind}
      localFlag={preview.localFlag}
      orderId={parsedId}
      reportId={parsedId}
      scenario={preview.scenario}
      screen="report-detail"
    />
  );
}
