import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';

// Regression test: a driver toggled AVAILABLE with location permission
// denied (or a stale ping) must see a warning — previously the idle ping
// failed silently with zero UI feedback.

const mockUseDriverIdlePingHealth = jest.fn();
jest.mock('./useDriverIdlePing', () => ({
  useDriverIdlePingHealth: () => mockUseDriverIdlePingHealth(),
}));

import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen: radar health warning', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows a warning banner when online but location permission is denied', async () => {
    mockUseDriverIdlePingHealth.mockReturnValue('permission-denied');
    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />);

    expect(screen.getByTestId('radar-health-warning')).toBeTruthy();
    expect(screen.getByText(/Chưa cấp quyền vị trí/i)).toBeTruthy();
  });

  it('shows a warning banner when the ping has gone stale', async () => {
    mockUseDriverIdlePingHealth.mockReturnValue('stale');
    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />);

    expect(screen.getByTestId('radar-health-warning')).toBeTruthy();
  });

  it('does not show the warning when the ping is healthy', async () => {
    mockUseDriverIdlePingHealth.mockReturnValue('healthy');
    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />);

    expect(screen.queryByTestId('radar-health-warning')).toBeNull();
  });

  it('does not show the warning while offline, even if permission is denied', async () => {
    mockUseDriverIdlePingHealth.mockReturnValue('permission-denied');
    // D-LIST-EMPTY is this fixture set's OFFLINE scenario (see fixtures.ts's
    // availabilityFor: only D-LIST-EMPTY yields status 'OFFLINE').
    await render(<DriverOrdersScreen view={createDriverListFixture('D-LIST-EMPTY')} />);

    expect(screen.queryByTestId('radar-health-warning')).toBeNull();
  });
});
