import type { Metadata } from 'next';

import { FleetPreviewRoute } from '../../../../features/fleet/FleetPreviewRoute';
import {
  parseFleetDriverFilters,
  type FleetSearchParams,
} from '../../../../features/fleet/adapter';
import { readFleetPreviewInput } from '../../../../features/fleet/route-input';

export const metadata: Metadata = {
  title: 'Tài xế đội xe — LEOPARD Operations',
};

export default async function FleetDriversPage({
  searchParams,
}: Readonly<{ searchParams: Promise<FleetSearchParams> }>) {
  const search = await searchParams;
  const preview = readFleetPreviewInput(search);
  return (
    <FleetPreviewRoute
      driverFilters={parseFleetDriverFilters(search)}
      localFlag={preview.localFlag}
      scenario={preview.scenario}
      screen="drivers"
    />
  );
}
