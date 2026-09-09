import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { DriversRepository } from '../src/drivers/drivers.repository.js';
import { resolveRealDbGeoGate } from './real-db-geo-gate.js';

// Reference point: a spot in Quận 7, TP.HCM, used as the pickup location for
// every distance calculation below.
const PICKUP = { lat: 10.7326, lng: 106.7168 };
const RADIUS_M = 3_000;

function offsetMeters(base: { lat: number; lng: number }, north: number, east: number) {
  const EARTH_RADIUS_M = 6_371_000;
  const lat = base.lat + (north / EARTH_RADIUS_M) * (180 / Math.PI);
  const lng =
    base.lng + (east / (EARTH_RADIUS_M * Math.cos((base.lat * Math.PI) / 180))) * (180 / Math.PI);
  return { lat, lng };
}

const { skipReason } = resolveRealDbGeoGate(process.env);
const describeRealDb = skipReason ? describe.skip : describe;

describeRealDb(
  skipReason
    ? `Nearby available drivers — real DB geo query (skipped: ${skipReason})`
    : 'Nearby available drivers — real DB geo query',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let driversRepository: DriversRepository;
    let fixtureUserIds: string[] = [];

    async function createDriver(
      phone: string,
      availability: 'AVAILABLE' | 'OFFLINE' | 'BUSY',
      location: { lat: number; lng: number } | null,
      lastKnownAt: Date | null,
    ): Promise<string> {
      const user = await prisma.user.create({
        data: { phone, role: 'DRIVER', status: 'ACTIVE' },
      });
      fixtureUserIds.push(user.id);
      await prisma.driverProfile.create({
        data: { userId: user.id, availability, vehicleType: 'MOTORBIKE' },
      });

      if (location) {
        await driversRepository.updateLocation(user.id, location.lat, location.lng);
        if (lastKnownAt) {
          await prisma.driverProfile.update({
            where: { userId: user.id },
            data: { lastKnownAt },
          });
        }
      }

      return user.id;
    }

    beforeAll(async () => {
      process.env = {
        ...process.env,
        NODE_ENV: 'test',
        AUTH_DEMO_LOGIN_ENABLED: 'true',
        AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
        AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      };

      const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new ApiExceptionFilter());
      app.useGlobalPipes(
        new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
      );
      await app.init();

      prisma = app.get(PrismaService);
      driversRepository = app.get(DriversRepository);
    });

    afterEach(async () => {
      if (fixtureUserIds.length === 0) return;
      await prisma.driverProfile.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      fixtureUserIds = [];
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    it('returns only AVAILABLE, fresh, in-radius drivers ordered by distance ascending', async () => {
      const runId = Date.now().toString().slice(-8);
      const near = offsetMeters(PICKUP, 200, 0); // ~200m away
      const mid = offsetMeters(PICKUP, 0, 1500); // ~1500m away
      const farButInRadius = offsetMeters(PICKUP, 0, 2800); // ~2800m away
      const outsideRadius = offsetMeters(PICKUP, 0, 6000); // ~6km away

      const nearId = await createDriver(`+8491${runId}1`, 'AVAILABLE', near, new Date());
      const midId = await createDriver(`+8491${runId}2`, 'AVAILABLE', mid, new Date());
      const farId = await createDriver(`+8491${runId}3`, 'AVAILABLE', farButInRadius, new Date());
      await createDriver(`+8491${runId}4`, 'AVAILABLE', outsideRadius, new Date()); // out of radius
      await createDriver(`+8491${runId}5`, 'BUSY', near, new Date()); // wrong availability
      await createDriver(
        `+8491${runId}6`,
        'AVAILABLE',
        near,
        new Date(Date.now() - 5 * 60 * 1000),
      ); // stale ping (5 min old)

      const results = await driversRepository.findNearbyAvailableDrivers(
        PICKUP.lat,
        PICKUP.lng,
        RADIUS_M,
      );
      const resultIds = results.map((r) => r.userId);

      expect(resultIds).toEqual([nearId, midId, farId]);
      expect(results[0].distanceM).toBeLessThan(results[1].distanceM);
      expect(results[1].distanceM).toBeLessThan(results[2].distanceM);
    });

    it(
      'answers a radius query over ~2,000 driver locations well within a usable latency bound',
      async () => {
        const runId = Date.now().toString().slice(-6);
        const SEED_COUNT = 2_000;
        const CHUNK_SIZE = 100;

        for (let start = 0; start < SEED_COUNT; start += CHUNK_SIZE) {
          const chunk = Array.from(
            { length: Math.min(CHUNK_SIZE, SEED_COUNT - start) },
            (_, i) => start + i,
          );
          await Promise.all(
            chunk.map(async (i) => {
              // Spread randomly within ~15km of the pickup point.
              const north = (Math.random() - 0.5) * 30_000;
              const east = (Math.random() - 0.5) * 30_000;
              await createDriver(
                `+8492${runId}${i.toString().padStart(4, '0')}`,
                'AVAILABLE',
                offsetMeters(PICKUP, north, east),
                new Date(),
              );
            }),
          );
        }

        const startedAt = Date.now();
        const results = await driversRepository.findNearbyAvailableDrivers(
          PICKUP.lat,
          PICKUP.lng,
          RADIUS_M,
        );
        const durationMs = Date.now() - startedAt;

        // eslint-disable-next-line no-console
        console.log(
          `[nearby-drivers benchmark] ST_DWithin over ${SEED_COUNT} drivers took ${durationMs}ms, returned ${results.length} rows`,
        );

        // Sanity bound only — catches a catastrophic full-table-scan regression,
        // not a strict SLA. See Dispatch Radar Phase 1 plan for the real p95 target.
        expect(durationMs).toBeLessThan(5_000);
      },
      120_000,
    );
  },
);
