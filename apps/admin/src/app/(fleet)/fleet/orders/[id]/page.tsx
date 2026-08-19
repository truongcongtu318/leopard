import type { Metadata } from 'next';

import { FleetPreviewRoute } from '../../../../../features/fleet/FleetPreviewRoute';
import { parseFleetOrderId, type FleetSearchParams } from '../../../../../features/fleet/adapter';
import { readFleetPreviewInput } from '../../../../../features/fleet/route-input';

export const metadata: Metadata = {
  title: 'Chi tiết đơn đội xe — LEOPARD Operations',
};

export default async function FleetOrderDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<FleetSearchParams>;
}>) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const preview = readFleetPreviewInput(search);
  return (
    <FleetPreviewRoute
      localFlag={preview.localFlag}
      orderId={parseFleetOrderId(id)}
      scenario={preview.scenario}
      screen="order-detail"
    />
  );
}
