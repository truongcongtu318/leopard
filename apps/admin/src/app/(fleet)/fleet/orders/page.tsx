import type { Metadata } from 'next';

import { FleetPreviewRoute } from '../../../../features/fleet/FleetPreviewRoute';
import { parseFleetOrderFilters, type FleetSearchParams } from '../../../../features/fleet/adapter';
import { readFleetPreviewInput } from '../../../../features/fleet/route-input';

export const metadata: Metadata = {
  title: 'Đơn của đội xe — LEOPARD Operations',
};

export default async function FleetOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<FleetSearchParams> }>) {
  const search = await searchParams;
  const preview = readFleetPreviewInput(search);
  return (
    <FleetPreviewRoute
      localFlag={preview.localFlag}
      orderFilters={parseFleetOrderFilters(search)}
      scenario={preview.scenario}
      screen="orders"
    />
  );
}
