import type { Metadata } from 'next';

import { FleetPreviewRoute } from '../../../features/fleet/FleetPreviewRoute';
import type { FleetSearchParams } from '../../../features/fleet/adapter';
import { readFleetPreviewInput } from '../../../features/fleet/route-input';

export const metadata: Metadata = {
  title: 'Tổng quan đội xe — LEOPARD Operations',
};

export default async function FleetDashboardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<FleetSearchParams> }>) {
  const search = await searchParams;
  const preview = readFleetPreviewInput(search);
  return (
    <FleetPreviewRoute
      localFlag={preview.localFlag}
      scenario={preview.scenario}
      screen="dashboard"
    />
  );
}
