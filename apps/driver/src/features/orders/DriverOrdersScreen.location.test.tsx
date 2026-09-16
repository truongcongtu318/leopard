import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { DriverLocationState } from './driver-current-location';

const mockGetDriverCurrentLocation = jest.fn<() => Promise<DriverLocationState>>();
jest.mock('./driver-current-location', () => ({
  getDriverCurrentLocation: () => mockGetDriverCurrentLocation(),
}));

import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen current location', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('centres the map on the real current GPS position after resolving coordinates', async () => {
    mockGetDriverCurrentLocation.mockResolvedValue({
      kind: 'ready',
      coords: { lat: 10.81234, lng: 106.67123 },
    });

    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />);

    expect(await screen.findByLabelText('Bản đồ vị trí hiện tại của tài xế')).toBeTruthy();
    // A healthy fix is silent chrome-wise: no leftover location pill.
    expect(screen.queryByTestId('driver-current-location-status')).toBeNull();
  });

  it('shows a truthful permission state, then clears it once the retry succeeds', async () => {
    mockGetDriverCurrentLocation
      .mockResolvedValueOnce({ kind: 'permission-denied' })
      .mockResolvedValueOnce({
        kind: 'ready',
        coords: { lat: 10.81234, lng: 106.67123 },
      });

    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />);

    const retry = await screen.findByRole('button', {
      name: 'Chưa cấp quyền vị trí · Thử lại',
    });
    await fireEvent.press(retry);

    await waitFor(() => expect(mockGetDriverCurrentLocation).toHaveBeenCalledTimes(2));
    expect(await screen.findByLabelText('Bản đồ vị trí hiện tại của tài xế')).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByTestId('driver-current-location-status')).toBeNull(),
    );
  });
});
