import { describe, expect, it } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { computeCumulativeDistances, useVietmapRoute } from './useVietmapRoute';

describe('useVietmapRoute', () => {
  it('computes cumulative distances along coordinate path accurately', () => {
    // 2 points in HCMC: ~1.4 km apart
    const coords: [number, number][] = [
      [106.6900, 10.7700],
      [106.7000, 10.7800],
    ];
    const cumDist = computeCumulativeDistances(coords);
    expect(cumDist.length).toBe(2);
    expect(cumDist[0]).toBe(0);
    expect(cumDist[1]).toBeGreaterThan(1000);
    expect(cumDist[1]).toBeLessThan(2000);
  });

  it('respects provided routeCoords directly without making network requests', async () => {
    const customCoords = [
      { lat: 10.7700, lng: 106.6900 },
      { lat: 10.7750, lng: 106.6950 },
      { lat: 10.7800, lng: 106.7000 },
    ];

    const screen = await renderHook(() =>
      useVietmapRoute({
        origin: { coords: customCoords[0], label: 'Điểm lấy' },
        destination: { coords: customCoords[2], label: 'Điểm giao' },
        routeCoords: customCoords,
      }),
    );

    expect(screen.result.current.coordinates.length).toBe(3);
    expect(screen.result.current.totalDistanceM).toBeGreaterThan(0);
    expect(screen.result.current.instructions.length).toBeGreaterThan(0);
    expect(screen.result.current.routeGeoJSON).not.toBeNull();
    expect(screen.result.current.routeGeoJSON.features[0].geometry.coordinates.length).toBe(3);
  });

  it('returns empty route when fewer than 2 points are provided', async () => {
    const screen = await renderHook(() =>
      useVietmapRoute({
        origin: { coords: { lat: 10.77, lng: 106.69 }, label: 'Điểm lấy' },
      }),
    );

    expect(screen.result.current.coordinates.length).toBe(0);
    expect(screen.result.current.totalDistanceM).toBe(0);
    expect(screen.result.current.routeGeoJSON).toBeNull();
  });
});
