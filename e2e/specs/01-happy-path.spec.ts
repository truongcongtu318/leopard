import { test, expect } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Happy Path (Dual Role E2E)', () => {
  test('Customer creates order -> Driver accepts -> Driver completes ePOD', async ({
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

    // 3. Verify Customer sees active booking tracking
    await customerApp.expectBookingCreated();

    // 4. Driver receives incoming dispatch offer and accepts
    await driverApp.expectIncomingDispatch();
    await driverApp.acceptDispatch();

    // 5. Driver completes delivery
    await driverApp.completeEpod('Nguyen Van A');
  });
});
