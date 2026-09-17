import { test, expect } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Multi-stop Delivery Routing', () => {
  test('Customer creates multi-stop order -> Driver advances stops sequentially', async ({
    customerApp,
    driverApp,
  }) => {
    // 1. Driver online
    await driverApp.goto();
    await driverApp.goOnline();

    // 2. Customer creates order with intermediate stop
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.addIntermediateStop('789 Cach Mang Thang 8, Quan 3, TP.HCM', 0);
    await customerApp.selectVehicle('VAN_500KG');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Driver accepts order
    await driverApp.expectIncomingDispatch();
    await driverApp.acceptDispatch();

    // 4. Driver completes delivery
    await driverApp.completeEpod('Tran Thi B');
  });
});
