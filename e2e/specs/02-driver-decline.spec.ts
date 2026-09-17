import { test, expect, loginViaApi } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Driver Decline & Dispatch Re-offer', () => {
  test('Customer creates order -> Driver declines dispatch offer', async ({
    customerApp,
    driverApp,
  }) => {
    // 1. Driver goes online
    await driverApp.goto();
    await driverApp.goOnline();

    // 2. Customer creates booking with quick hub address
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.selectVehicle('VAN_500KG');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Driver receives offer and declines
    await driverApp.expectIncomingDispatch();
    await driverApp.declineDispatch();

    // 4. Cleanup: cancel order so it doesn't linger in REQUESTED state
    const urlMatch = customerApp.page.url().match(/orders\/(?:searching|checkout)\/([a-f0-9-]+)/);
    if (urlMatch) {
      const custAuth = await loginViaApi('customer');
      await fetch(`http://127.0.0.1:3000/api/v1/orders/${urlMatch[1]}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custAuth.session.accessToken}`,
        },
        body: JSON.stringify({ reason: 'E2E Decline Cleanup' }),
      });
    }
  });
});
