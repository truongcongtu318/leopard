import { VietmapProvider } from '../src/maps/providers/vietmap.provider.js';

// ── Opt-in gate (spec §3.1bis point 3) ───────────────────────────────────
//
// This test hits the REAL Vietmap API — it is never run as part of
// `pnpm --filter api test` or `pnpm --filter api test:contract`, and is not
// wired into CI. It exists to prove, against the live routing engine, that
// TRUCK routing genuinely avoids weight-restricted roads differently from
// motorbike/van routing (not just "the mock returns a different polyline").
//
// Run manually (or from a scheduled/manual check), never from CI:
//   RUN_VIETMAP_CONTRACT_TESTS=true VIETMAP_API_KEY=<real key> \
//     pnpm --filter api test:contract:vietmap
//
// The filename (`.contract-spec.ts`, not `.spec.ts`) is itself the primary
// exclusion mechanism: the default `test` and `test:contract` Jest configs
// use a testRegex that does not match it, so it is invisible to Jest unless
// explicitly targeted via jest.config.contract-vietmap.cjs. The env var
// gate below is a second, independent line of defense in case this file is
// ever picked up by a broadened testRegex.
const RUN_CONTRACT = process.env.RUN_VIETMAP_CONTRACT_TESTS === 'true';
const describeIfEnabled = RUN_CONTRACT ? describe : describe.skip;

// Fixture: Sơn Trà ↔ Hải Châu (Đà Nẵng), verified by hand — the direct path
// crosses Cầu Sông Hàn, which is weight-restricted for trucks.
// See spec §3.1bis / §9.6.
const PICKUP = { latitude: 16.1024, longitude: 108.262 };
const DROPOFF = { latitude: 16.0678, longitude: 108.2208 };

describeIfEnabled('Vietmap truck-restriction golden route (contract, not mocked)', () => {
  const provider = new VietmapProvider({ apiKey: process.env.VIETMAP_API_KEY ?? '' });

  it('routes TRUCK_25T around the weight-restricted bridge, differently from BIKE and VAN', async () => {
    const [bike] = await provider.route({ pickup: PICKUP, stops: [], dropoff: DROPOFF, vehicleType: 'MOTORBIKE' });
    const [van] = await provider.route({ pickup: PICKUP, stops: [], dropoff: DROPOFF, vehicleType: 'VAN' });
    const [truck] = await provider.route({
      pickup: PICKUP,
      stops: [],
      dropoff: DROPOFF,
      vehicleType: 'TRUCK',
      cargoWeightKg: 2500,
    });

    expect(truck!.distanceM).toBeGreaterThan(bike!.distanceM);
    expect(truck!.polyline).not.toBe(bike!.polyline);
    expect(truck!.polyline).not.toBe(van!.polyline);
  });
});
