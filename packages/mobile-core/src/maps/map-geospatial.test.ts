import { describe, expect, it } from '@jest/globals';
import {
  anchorRouteToTruck,
  calculateBearing,
  calculateDynamicVisibleCenterOffset,
  calculateRouteBoundingBox,
  haversineDistanceMeters,
  lerpCoordinate,
  projectPointOnSegment,
  slerpBearing,
} from './map-geospatial';

describe('map-geospatial', () => {
  describe('calculateBearing', () => {
    it('calculates north heading (0 degrees)', () => {
      const p1 = { lat: 10.0, lng: 106.0 };
      const p2 = { lat: 11.0, lng: 106.0 };
      const bearing = calculateBearing(p1, p2);
      expect(Math.round(bearing)).toBe(0);
    });

    it('calculates east heading (90 degrees)', () => {
      const p1 = { lat: 0.0, lng: 100.0 };
      const p2 = { lat: 0.0, lng: 101.0 };
      const bearing = calculateBearing(p1, p2);
      expect(Math.round(bearing)).toBe(90);
    });

    it('calculates south heading (180 degrees)', () => {
      const p1 = { lat: 11.0, lng: 106.0 };
      const p2 = { lat: 10.0, lng: 106.0 };
      const bearing = calculateBearing(p1, p2);
      expect(Math.round(bearing)).toBe(180);
    });
  });

  describe('calculateRouteBoundingBox', () => {
    it('returns null for empty coords', () => {
      expect(calculateRouteBoundingBox([])).toBeNull();
    });

    it('computes valid bounding box with padding for multi-stop route', () => {
      const coords = [
        { lat: 10.77, lng: 106.69 }, // Saigon center
        { lat: 10.82, lng: 106.63 }, // Tan Binh
      ];
      const box = calculateRouteBoundingBox(coords, 0.1);
      expect(box).not.toBeNull();
      expect(box!.sw[0]).toBeLessThan(106.63);
      expect(box!.sw[1]).toBeLessThan(10.77);
      expect(box!.ne[0]).toBeGreaterThan(106.69);
      expect(box!.ne[1]).toBeGreaterThan(10.82);
    });
  });

  describe('lerpCoordinate', () => {
    it('interpolates midpoint correctly at t=0.5', () => {
      const start = { lat: 10.0, lng: 106.0 };
      const end = { lat: 11.0, lng: 108.0 };
      const mid = lerpCoordinate(start, end, 0.5);
      expect(mid.lat).toBeCloseTo(10.5);
      expect(mid.lng).toBeCloseTo(107.0);
    });
  });

  describe('slerpBearing', () => {
    it('interpolates across 0/360 boundary smoothly', () => {
      const current = 350;
      const target = 10;
      // shortest turn is +20 degrees, mid is 0 (or 360)
      const mid = slerpBearing(current, target, 0.5);
      expect(mid).toBeCloseTo(0);
    });
  });

  describe('calculateDynamicVisibleCenterOffset', () => {
    it('returns negative offset (shifted up) when bottom sheet is open', () => {
      const screenHeight = 800;
      const sheetHeight = 400;
      const topInset = 50;
      const offset = calculateDynamicVisibleCenterOffset(screenHeight, sheetHeight, topInset);
      // Visible area: 50 to 400 (height 350). Visible center = 50 + 175 = 225.
      // Screen center = 400. Offset = 225 - 400 = -175 (upward shift)
      expect(offset).toBe(-175);
    });
  });

  describe('haversineDistanceMeters', () => {
    it('calculates accurate distance between known coordinates', () => {
      // 1 degree latitude ~ 111.195 km = ~111,195 meters
      const p1 = { lat: 10.0, lng: 106.0 };
      const p2 = { lat: 11.0, lng: 106.0 };
      const dist = haversineDistanceMeters(p1, p2);
      expect(dist).toBeGreaterThan(110000);
      expect(dist).toBeLessThan(112000);
    });

    it('returns 0 for identical points', () => {
      const p = { lat: 10.77, lng: 106.69 };
      expect(haversineDistanceMeters(p, p)).toBe(0);
    });
  });

  describe('projectPointOnSegment', () => {
    it('projects point perpendicularly onto line segment', () => {
      const p1 = { lat: 10.0, lng: 106.0 };
      const p2 = { lat: 10.0, lng: 108.0 };
      const query = { lat: 10.5, lng: 107.0 };
      const proj = projectPointOnSegment(query, p1, p2);
      expect(proj.point.lat).toBeCloseTo(10.0);
      expect(proj.point.lng).toBeCloseTo(107.0);
      expect(proj.t).toBeCloseTo(0.5);
    });
  });

  describe('anchorRouteToTruck', () => {
    it('anchors route to truck on PICKING_UP leg (routes truck to origin only, without delivery leg)', () => {
      const truckLocation = { lat: 10.75, lng: 106.65 };
      const origin = { lat: 10.78, lng: 106.68 };
      const destination = { lat: 10.82, lng: 106.72 };
      const deliveryRouteCoords = [origin, { lat: 10.80, lng: 106.70 }, destination];

      const anchored = anchorRouteToTruck({
        isPickupLeg: true,
        originCoords: origin,
        destinationCoords: destination,
        routeCoords: deliveryRouteCoords,
        truckLocation,
      });

      // Must connect truck to origin, never append delivery leg across to destination
      expect(anchored[0]).toEqual(truckLocation);
      expect(anchored[1]).toEqual(origin);
      expect(anchored.length).toBe(2);
    });

    it('snaps truck onto pickup street route when route leads to origin', () => {
      const origin = { lat: 10.78, lng: 106.68 };
      const step1 = { lat: 10.74, lng: 106.64 };
      const step2 = { lat: 10.76, lng: 106.66 };
      const pickupStreetRoute = [step1, step2, origin];
      const truckLocation = { lat: 10.75, lng: 106.65 };

      const anchored = anchorRouteToTruck({
        isPickupLeg: true,
        originCoords: origin,
        routeCoords: pickupStreetRoute,
        truckLocation,
      });

      expect(anchored[0]).toEqual(truckLocation);
      expect(anchored[anchored.length - 1]).toEqual(origin);
    });

    it('anchors route to truck on IN_TRANSIT leg by slicing past waypoints', () => {
      const p0 = { lat: 10.0, lng: 106.0 };
      const p1 = { lat: 10.5, lng: 106.0 };
      const p2 = { lat: 11.0, lng: 106.0 };
      const truckLocation = { lat: 10.25, lng: 106.05 }; // near segment [p0, p1]

      const anchored = anchorRouteToTruck({
        isPickupLeg: false,
        routeCoords: [p0, p1, p2],
        truckLocation,
      });

      // First point must be truckLocation, followed by remaining route ahead
      expect(anchored[0]).toEqual(truckLocation);
      expect(anchored[1]).toEqual(p1);
      expect(anchored[2]).toEqual(p2);
    });

    it('returns original route when truckLocation is absent', () => {
      const p0 = { lat: 10.0, lng: 106.0 };
      const p1 = { lat: 11.0, lng: 106.0 };
      const anchored = anchorRouteToTruck({ routeCoords: [p0, p1] });
      expect(anchored).toEqual([p0, p1]);
    });
  });
});
