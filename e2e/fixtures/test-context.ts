import { test as baseTest, expect, Page, BrowserContext } from '@playwright/test';
import { CustomerApp } from '../pages/CustomerApp.js';
import { DriverApp } from '../pages/DriverApp.js';

interface AuthResponse {
  session: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    role: string;
  };
}

export const TEST_PICKUP_COORDS = { latitude: 10.7769, longitude: 106.7009 };

async function resetActiveOrders(_driverAccessToken?: string) {
  try {
    const adminAuth = await loginViaApi('admin');

    // Cancel all active orders in the system across all unfinished statuses in parallel
    const unfinishedStatuses = ['REQUESTED', 'ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'RETURNING'];
    await Promise.all(
      unfinishedStatuses.map(async (status) => {
        try {
          const res = await fetch(
            `http://127.0.0.1:3000/api/v1/admin/orders?status=${status}&pageSize=30`,
            {
              headers: { Authorization: `Bearer ${adminAuth.session.accessToken}` },
            },
          );
          if (res.ok) {
            const data = await res.json();
            await Promise.all(
              (data.items || []).map((ord: any) =>
                fetch(`http://127.0.0.1:3000/api/v1/orders/${ord.id}/cancel`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminAuth.session.accessToken}`,
                  },
                  body: JSON.stringify({ reason: 'E2E Reset' }),
                }),
              ),
            );
          }
        } catch {
          // ignore per-status error
        }
      }),
    );
  } catch {
    // ignore
  }
}

export async function loginViaApi(accountId: string): Promise<AuthResponse> {
  const randomOctet1 = Math.floor(Math.random() * 250) + 1;
  const randomOctet2 = Math.floor(Math.random() * 250) + 1;

  const res = await fetch('http://127.0.0.1:3000/api/v1/auth/login/demo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.99.${randomOctet1}.${randomOctet2}`,
    },
    body: JSON.stringify({ accountId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to login via demo API for ${accountId}: ${res.statusText}`);
  }
  return (await res.json()) as AuthResponse;
}

export interface DualRoleFixtures {
  customerContext: BrowserContext;
  driverContext: BrowserContext;
  customerPage: Page;
  driverPage: Page;
  customerApp: CustomerApp;
  driverApp: DriverApp;
}

export const test = baseTest.extend<DualRoleFixtures>({
  customerContext: async ({ browser }, use) => {
    const authData = await loginViaApi('customer');
    const context = await browser.newContext({
      baseURL: 'http://localhost:8081',
      viewport: { width: 393, height: 852 },
      permissions: ['geolocation'],
      geolocation: TEST_PICKUP_COORDS,
    });

    const sampleAddresses = [
      {
        id: 'addr-near-1',
        label: 'Kho Quận 1',
        address: '123 Nguyen Hue, Ben Nghe, Quan 1, TP.HCM',
        latitude: 10.7769,
        longitude: 106.7009,
        isDefault: true,
        category: 'WAREHOUSE',
      },
      {
        id: 'addr-near-2',
        label: 'Giao Lê Duẩn',
        address: '456 Le Duan, Ben Nghe, Quan 1, TP.HCM',
        latitude: 10.782,
        longitude: 106.698,
        isDefault: false,
        category: 'OFFICE',
      },
    ];

    await context.addInitScript(
      ({ refreshToken, role, addresses }) => {
        try {
          if (!window.localStorage.getItem('leopard.refresh')) {
            window.localStorage.setItem('leopard.refresh', refreshToken);
          }
          window.localStorage.setItem('leopard.role', role);
          window.localStorage.setItem(
            'leopard_customer_addresses_v1',
            JSON.stringify(addresses),
          );
          window.localStorage.setItem(
            'leopard_customer_default_address_v1',
            'addr-near-1',
          );
        } catch {
          // ignore
        }
      },
      {
        refreshToken: authData.session.refreshToken,
        role: authData.user.role,
        addresses: sampleAddresses,
      },
    );

    await use(context);
    await context.close();
  },

  driverContext: async ({ browser }, use) => {
    const authData = await loginViaApi('driver');

    // Cancel order via direct database cleanup endpoint or cancel API
    try {
      await resetActiveOrders(authData.session.accessToken);

      await fetch('http://127.0.0.1:3000/api/v1/driver/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.session.accessToken}`,
        },
        body: JSON.stringify({ availability: 'AVAILABLE' }),
      });
      await fetch('http://127.0.0.1:3000/api/v1/driver/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.session.accessToken}`,
        },
        body: JSON.stringify({
          lat: 10.7769,
          lng: 106.7009,
        }),
      });
    } catch {
      // ignore
    }

    const context = await browser.newContext({
      baseURL: 'http://localhost:8082',
      viewport: { width: 393, height: 852 },
      permissions: ['geolocation'],
      geolocation: TEST_PICKUP_COORDS,
    });

    await context.addInitScript(
      ({ refreshToken, role }) => {
        try {
          if (!window.localStorage.getItem('leopard.refresh')) {
            window.localStorage.setItem('leopard.refresh', refreshToken);
          }
          window.localStorage.setItem('leopard.role', role);
        } catch {
          // ignore
        }
      },
      { refreshToken: authData.session.refreshToken, role: authData.user.role },
    );

    await use(context);
    await context.close();
  },

  customerPage: async ({ customerContext }, use) => {
    const page = await customerContext.newPage();
    await use(page);
  },

  driverPage: async ({ driverContext }, use) => {
    const page = await driverContext.newPage();
    await use(page);
  },

  customerApp: async ({ customerPage }, use) => {
    const app = new CustomerApp(customerPage);
    await use(app);
  },

  driverApp: async ({ driverPage }, use) => {
    const app = new DriverApp(driverPage);
    await use(app);
  },
});

test.beforeEach(async () => {
  // Clear any active orders between tests so driver is immediately available for new dispatch
  try {
    await resetActiveOrders();

    const driverAccounts = ['driver', '0900000005', '0900000007'];
    await Promise.all(
      driverAccounts.map(async (acc) => {
        try {
          const auth = await loginViaApi(acc);
          await fetch('http://127.0.0.1:3000/api/v1/driver/availability', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.session.accessToken}`,
            },
            body: JSON.stringify({ availability: 'AVAILABLE' }),
          });
          await fetch('http://127.0.0.1:3000/api/v1/driver/location', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.session.accessToken}`,
            },
            body: JSON.stringify({
              lat: TEST_PICKUP_COORDS.latitude,
              lng: TEST_PICKUP_COORDS.longitude,
            }),
          });
        } catch {
          // ignore per-driver error
        }
      }),
    );
  } catch {
    // ignore
  }
});

export async function createDriverSession(
  browser: any,
  accountId: string = 'driver',
  coords = TEST_PICKUP_COORDS,
): Promise<{ context: BrowserContext; page: Page; driverApp: DriverApp; authData: AuthResponse }> {
  const authData = await loginViaApi(accountId);

  try {
    await fetch('http://127.0.0.1:3000/api/v1/driver/availability', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.session.accessToken}`,
      },
      body: JSON.stringify({ availability: 'AVAILABLE' }),
    });
    await fetch('http://127.0.0.1:3000/api/v1/driver/location', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.session.accessToken}`,
      },
      body: JSON.stringify({
        lat: coords.latitude,
        lng: coords.longitude,
      }),
    });
  } catch {
    // ignore
  }

  const context = await browser.newContext({
    baseURL: 'http://localhost:8082',
    viewport: { width: 393, height: 852 },
    permissions: ['geolocation'],
    geolocation: coords,
  });

  await context.addInitScript(
    ({ refreshToken, role }: { refreshToken: string; role: string }) => {
      try {
        if (!window.localStorage.getItem('leopard.refresh')) {
          window.localStorage.setItem('leopard.refresh', refreshToken);
        }
        window.localStorage.setItem('leopard.role', role);
      } catch {}
    },
    { refreshToken: authData.session.refreshToken, role: authData.user.role },
  );

  const page = await context.newPage();
  const driverApp = new DriverApp(page);
  return { context, page, driverApp, authData };
}

export { expect };
