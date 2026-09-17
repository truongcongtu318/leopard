import { test, expect, createDriverSession } from '../fixtures/test-context.js';

test.describe('Order Lifecycle: Fleet Matrix & Multi-Vehicle Dispatch', () => {
  test('Customer selects across all 4 fleet vehicles with dynamic pricing', async ({
    customerApp,
  }) => {
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();

    const vehicleExpectations = [
      { id: 'BIKE_3W', minFare: '70.000' },
      { id: 'VAN_500KG', minFare: '130.000' },
      { id: 'TRUCK_125T', minFare: '200.000' },
      { id: 'TRUCK_25T', minFare: '320.000' },
    ];

    for (const v of vehicleExpectations) {
      await customerApp.selectVehicle(v.id);
      await expect(customerApp.mainCtaBtn).toContainText(v.minFare);
    }
  });

  test('Customer books BIKE_3W and dispatches to Motorbike driver (0900000005)', async ({
    customerApp,
    browser,
  }) => {
    // 1. Setup Motorbike driver session
    const bikeDriver = await createDriverSession(browser, '0900000005');
    await bikeDriver.driverApp.goto();
    await bikeDriver.driverApp.goOnline();

    // 2. Customer selects BIKE_3W and books
    await customerApp.goto();
    await customerApp.selectQuickDropoffHub();
    await customerApp.selectVehicle('BIKE_3W');
    await customerApp.submitBooking();
    await customerApp.expectBookingCreated();

    // 3. Verify Motorbike driver receives the dispatch offer
    await bikeDriver.driverApp.expectIncomingDispatch(20000);
    await bikeDriver.driverApp.acceptDispatch();

    // Cleanup
    await bikeDriver.driverApp.completeEpod('Nhan Vien Kho');
    await bikeDriver.context.close();
  });
});
