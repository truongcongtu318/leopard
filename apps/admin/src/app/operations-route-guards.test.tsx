import { afterEach, describe, expect, it } from '@jest/globals';
import React from 'react';

jest.mock('../lib/auth/server-session', () => ({
  getVerifiedOperationsUser: jest.fn(),
}));

import AdminLayout from './(admin)/admin/layout';
import FleetLayout from './(fleet)/fleet/layout';
import { OperationsShell } from '../components/shell/OperationsShell';
import { getVerifiedOperationsUser } from '../lib/auth/server-session';

const child = <div data-testid="private-child">Private data</div>;
type OperationsLayout = (props: { children: React.ReactNode }) => Promise<React.JSX.Element>;

const guardedLayouts: Array<[string, OperationsLayout]> = [
  ['fleet', FleetLayout],
  ['admin', AdminLayout],
];

const exactRoleLayouts: Array<['FLEET_OWNER' | 'ADMIN', OperationsLayout]> = [
  ['FLEET_OWNER', FleetLayout],
  ['ADMIN', AdminLayout],
];

async function redirectDestination(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? '';
    return digest.split(';')[2] ?? '';
  }
  return '';
}

describe('operations route guards', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(guardedLayouts)(
    'redirects unauthenticated /%s requests before shell render',
    async (_name, layout) => {
      jest.mocked(getVerifiedOperationsUser).mockResolvedValueOnce(null);

      await expect(redirectDestination(() => layout({ children: child }))).resolves.toBe(
        '/login?expired=true',
      );
    },
  );

  it('redirects ADMIN away from the Fleet Owner surface', async () => {
    jest.mocked(getVerifiedOperationsUser).mockResolvedValueOnce({
      id: 'usr-admin-1',
      role: 'ADMIN',
    });

    await expect(redirectDestination(() => FleetLayout({ children: child }))).resolves.toBe(
      '/admin',
    );
  });

  it('redirects FLEET_OWNER away from the Admin surface', async () => {
    jest.mocked(getVerifiedOperationsUser).mockResolvedValueOnce({
      id: 'usr-fleet-1',
      role: 'FLEET_OWNER',
    });

    await expect(redirectDestination(() => AdminLayout({ children: child }))).resolves.toBe(
      '/fleet',
    );
  });

  it.each(exactRoleLayouts)(
    'allows exact role %s to compose its private shell',
    async (role, layout) => {
      jest.mocked(getVerifiedOperationsUser).mockResolvedValueOnce({
        id: `usr-${role.toLowerCase()}`,
        role,
      });

      const result = await layout({ children: child });

      expect(result.type).toBe(OperationsShell);
      expect(result.props.children).toBe(child);
    },
  );
});
