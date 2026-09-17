import { test, expect, createDriverSession, loginViaApi } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Conflict Resolution & Race Conditions', () => {
  test('Two drivers contest same order: Driver 1 accepts, Driver 2 gets 409 Conflict', async ({
    customerApp,
    browser,
  }) => {
    // 1. Setup two competing Van drivers
    const driver1 = await createDriverSession(browser, '0900000002');
    const driver2 = await createDriverSession(browser, '0900000007');

    await driver1.driverApp.goto();
    await driver1.driverApp.goOnline();

    await driver2.driverApp.goto();
    await driver2.driverApp.goOnline();

    // 2. Customer creates order
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.selectVehicle('VAN_500KG');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Driver 1 receives and accepts first
    await driver1.driverApp.expectIncomingDispatch(20000);
    await driver1.driverApp.acceptDispatch();

    // 4. Driver 2 attempts to accept the same order via API -> Expect 409 Conflict
    // Retrieve orderId from customer URL or driver1 active order via fresh API session
    const urlMatch = customerApp.page.url().match(/orders\/(?:searching|checkout)\/([a-f0-9-]+)/);
    let orderId = urlMatch ? urlMatch[1] : undefined;

    if (!orderId) {
      const driver1Auth = await loginViaApi('0900000002');
      for (let i = 0; i < 10; i++) {
        const activeRes = await fetch('http://127.0.0.1:3000/api/v1/driver/orders/active', {
          headers: { Authorization: `Bearer ${driver1Auth.session.accessToken}` },
        });
        const activeData = await activeRes.json();
        orderId = activeData.order?.id;
        if (orderId) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    expect(orderId).toBeDefined();

    const driver2Auth = await loginViaApi('0900000007');
    const conflictRes = await fetch(`http://127.0.0.1:3000/api/v1/driver/orders/${orderId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driver2Auth.session.accessToken}`,
      },
    });

    expect(conflictRes.status).toBe(409);
    const conflictBody = await conflictRes.json();
    expect(conflictBody.code).toBe('ORDER_ALREADY_ASSIGNED');

    // 5. Driver 1 completes order and clean up
    await driver1.driverApp.completeEpod('Nguoi Nhan Hang');
    await driver1.context.close();
    await driver2.context.close();
  });

  test('Customer cancels order before driver accepts: Driver acceptance rejected with 409', async ({
    customerApp,
    driverApp,
  }) => {
    // 1. Driver goes online
    await driverApp.goto();
    await driverApp.goOnline();

    // 2. Customer creates booking
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.selectVehicle('VAN_500KG');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Get customer token and cancel order
    const custAuth = await loginViaApi('customer');

    const urlMatch = customerApp.page.url().match(/orders\/(?:searching|checkout)\/([a-f0-9-]+)/);
    let orderId = urlMatch ? urlMatch[1] : undefined;

    if (!orderId) {
      const adminAuth = await loginViaApi('admin');
      const pendingRes = await fetch('http://127.0.0.1:3000/api/v1/admin/orders?pageSize=5', {
        headers: { Authorization: `Bearer ${adminAuth.session.accessToken}` },
      });
      const pendingData = await pendingRes.json();
      const targetOrder = pendingData.items?.find((o: any) => o.status === 'REQUESTED') || pendingData.items?.[0];
      orderId = targetOrder?.id;
    }
    expect(orderId).toBeDefined();

    // Customer cancels order
    const cancelRes = await fetch(`http://127.0.0.1:3000/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.session.accessToken}`,
      },
      body: JSON.stringify({ reason: 'Doi y khong giao nua' }),
    });
    expect(cancelRes.status).toBe(200);

    // 4. Driver attempts to accept cancelled order -> Expect 409
    const driverAuth = await loginViaApi('driver');
    const acceptRes = await fetch(`http://127.0.0.1:3000/api/v1/driver/orders/${orderId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverAuth.session.accessToken}`,
      },
    });
    expect(acceptRes.status).toBe(409);
  });
});
