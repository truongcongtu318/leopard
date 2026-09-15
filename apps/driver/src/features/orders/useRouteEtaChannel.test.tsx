import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RouteEtaResponse } from '@leopard/shared';

import { useRouteEtaChannel } from './useRouteEtaChannel';
import type { DriverOrdersPort } from './port';
import type { DriverTrackingSender } from './tracking-sender';

function makeMockRouteEtaResponse(): RouteEtaResponse {
  return {
    orderId: 'order-1',
    serverTime: '2026-09-15T08:00:00.000Z',
    desiredInputRevision: 1,
    currentInputRevision: 1,
    recompute: {
      state: 'CURRENT',
      failedReason: null,
      failedInputRevision: null,
      nextRetryAt: null,
    },
    quotedRoute: null,
    activeRoute: {
      snapshotId: 'snap-1',
      routeSnapshotVersion: 1,
      geometryEncoding: 'POLYLINE6',
      fullRouteCoords: [{ lat: 10.79, lng: 106.65 }, { lat: 10.80, lng: 106.66 }],
      legs: [],
      geometryHash: 'hash-1',
      calculatedAt: '2026-09-15T08:00:00.000Z',
      ageSeconds: 5,
      source: 'VIETMAP',
      quality: 'VERIFIED_PROVIDER',
    },
    estimates: {
      nextStop: {
        kind: 'NEXT_STOP',
        outcome: 'AVAILABLE',
        targetStopId: 'stop-1',
        remainingDistanceM: 5000,
        remainingDurationS: 600,
        arrivalAt: '08:10',
        unavailableReason: null,
        calculatedAt: '2026-09-15T08:00:00.000Z',
        validUntil: '2026-09-15T08:05:00.000Z',
        isStale: false,
        staleSinceAt: null,
      },
      completion: null,
    },
  };
}

describe('useRouteEtaChannel (Task 19)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('returns disabled when status is not eligible (e.g. DELIVERED or REQUESTED)', async () => {
    const mockPort: DriverOrdersPort = {
      getOrdersView: jest.fn<any>(),
      getOrderDetailView: jest.fn<any>(),
      setAvailability: jest.fn<any>(),
      acceptOrder: jest.fn<any>(),
      executeLifecycle: jest.fn<any>(),
      getRouteEta: jest.fn<any>(),
    };

    const { result } = await renderHook(
      () =>
        useRouteEtaChannel({
          orderId: 'order-1',
          status: 'DELIVERED',
          port: mockPort,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.kind).toBe('disabled');
    expect(mockPort.getRouteEta).not.toHaveBeenCalled();
  });

  it('fetches route ETA via REST when status is IN_TRANSIT and transitions to content', async () => {
    const mockResponse = makeMockRouteEtaResponse();
    const mockPort: DriverOrdersPort = {
      getOrdersView: jest.fn<any>(),
      getOrderDetailView: jest.fn<any>(),
      setAvailability: jest.fn<any>(),
      acceptOrder: jest.fn<any>(),
      executeLifecycle: jest.fn<any>(),
      getRouteEta: jest.fn<any>().mockResolvedValue(mockResponse),
    };

    const { result } = await renderHook(
      () =>
        useRouteEtaChannel({
          orderId: 'order-1',
          status: 'IN_TRANSIT',
          port: mockPort,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.kind).toBe('content');
    });

    if (result.current.kind === 'content') {
      expect(result.current.data.orderId).toBe('order-1');
      expect(result.current.view.distanceMeters).toBe(5000);
      expect(result.current.view.outcome).toBe('COMPUTED');
    }
  });

  it('subscribes to socket route-eta events and unbinds on unmount', async () => {
    const mockPort: DriverOrdersPort = {
      getOrdersView: jest.fn<any>(),
      getOrderDetailView: jest.fn<any>(),
      setAvailability: jest.fn<any>(),
      acceptOrder: jest.fn<any>(),
      executeLifecycle: jest.fn<any>(),
      getRouteEta: jest.fn<any>().mockResolvedValue(makeMockRouteEtaResponse()),
    };

    const unsubscribe = jest.fn();
    const subscribeRouteEta = jest.fn<any>().mockReturnValue({ unsubscribe });

    const mockSender = {
      subscribeRouteEta,
    } as unknown as DriverTrackingSender;

    const { unmount } = await renderHook(
      () =>
        useRouteEtaChannel({
          orderId: 'order-1',
          status: 'IN_TRANSIT',
          port: mockPort,
          sender: mockSender,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(subscribeRouteEta).toHaveBeenCalledWith('order-1', expect.any(Object));
    });

    await act(async () => {
      unmount();
    });
    expect(unsubscribe).toHaveBeenCalled();
  });
});
