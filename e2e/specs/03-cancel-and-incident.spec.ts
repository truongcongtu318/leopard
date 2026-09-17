import { test, expect } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Cancellation and Incident Management', () => {
  test('Driver accepts order -> Reports incident with note', async ({
    customerApp,
    driverApp,
  }) => {
    // 1. Driver online
    await driverApp.goto();
    await driverApp.goOnline();

    // 2. Customer creates booking
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.selectVehicle('VAN_500KG');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Driver accepts order
    await driverApp.expectIncomingDispatch();
    await driverApp.acceptDispatch();

    // 4. Driver reports incident
    await driverApp.reportIncident('vehicle_breakdown', 'Xe bi hong lop giua duong');
  });
});
