import { describe, expect, it, jest } from '@jest/globals';
import { fetchStreetRoute } from './street-routing';

describe('street-routing', () => {
  it('falls back to interpolated road spline if network fails', async () => {
    const origin = { lat: 10.7768, lng: 106.7009 };
    const destination = { lat: 10.8231, lng: 106.6297 };

    // Mock fetch error
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject(new Error('Network offline'))) as any;

    try {
      const result = await fetchStreetRoute(origin, destination);
      expect(result.coordinates.length).toBeGreaterThanOrEqual(3);
      expect(result.coordinates[0]).toEqual(origin);
      expect(result.coordinates[result.coordinates.length - 1]).toEqual(destination);
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.steps.length).toBeGreaterThanOrEqual(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('parses OSRM driving response properly', async () => {
    const origin = { lat: 21.0285, lng: 105.8542 };
    const destination = { lat: 21.0368, lng: 105.8347 };

    const mockOsrmData = {
      routes: [
        {
          distance: 2400,
          duration: 360,
          geometry: {
            coordinates: [
              [105.8542, 21.0285],
              [105.8450, 21.0320],
              [105.8347, 21.0368],
            ],
          },
          legs: [
            {
              steps: [
                {
                  name: 'Tràng Tiền',
                  distance: 800,
                  duration: 120,
                  maneuver: { type: 'depart', modifier: 'straight', location: [105.8542, 21.0285] },
                },
                {
                  name: 'Điện Biên Phủ',
                  distance: 1600,
                  duration: 240,
                  maneuver: { type: 'turn', modifier: 'right', location: [105.8450, 21.0320] },
                },
              ],
            },
          ],
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOsrmData),
      }),
    ) as any;

    try {
      const result = await fetchStreetRoute(origin, destination);
      expect(result.source).toBe('OSRM');
      expect(result.coordinates).toHaveLength(3);
      expect(result.distanceMeters).toBe(2400);
      expect(result.durationSeconds).toBe(360);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[1]?.instruction).toContain('Rẽ phải vào Điện Biên Phủ');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('parses Vietmap routing response properly when apiKey is supplied', async () => {
    const origin = { lat: 10.7723, lng: 106.6983 };
    const destination = { lat: 10.7800, lng: 106.7000 };

    const mockVietmapData = {
      paths: [
        {
          distance: 1500,
          time: 180000,
          points: {
            type: 'LineString',
            coordinates: [
              [106.6983, 10.7723],
              [106.6990, 10.7750],
              [106.7000, 10.7800],
            ],
          },
          instructions: [
            {
              distance: 600,
              time: 70000,
              sign: 0,
              text: 'Đi thẳng trên Lê Lợi',
              street_name: 'Lê Lợi',
              interval: [0, 1],
            },
            {
              distance: 900,
              time: 110000,
              sign: 2,
              text: 'Rẽ phải vào Pasteur',
              street_name: 'Pasteur',
              interval: [1, 2],
            },
          ],
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn((url: any) => {
      if (typeof url === 'string' && url.includes('maps.vietmap.vn')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVietmapData),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    }) as any;

    try {
      const result = await fetchStreetRoute(origin, destination, {
        vietmapApiKey: 'valid-test-key-12345',
      });
      expect(result.source).toBe('VIETMAP');
      expect(result.coordinates).toHaveLength(3);
      expect(result.distanceMeters).toBe(1500);
      expect(result.durationSeconds).toBe(180);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]?.instruction).toBe('Đi thẳng trên Lê Lợi');
      expect(result.steps[0]?.maneuverType).toBe('straight');
      expect(result.steps[1]?.instruction).toBe('Rẽ phải vào Pasteur');
      expect(result.steps[1]?.maneuverType).toBe('turn-right');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
