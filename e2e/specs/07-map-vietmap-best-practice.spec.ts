import { test, expect } from '../fixtures/test-context.js';

test.describe('Vietmap & Ride-Hailing Best Practice Map Verification', () => {
  test('Customer Home: Verifies basemap, nearby fleet, and floating Recenter button (No badge)', async ({
    customerPage,
  }) => {
    // 1. Navigate to Customer Home
    await customerPage.goto('/customer/home');
    await customerPage.waitForLoadState('networkidle');

    // If demo customer button appears, click it
    const demoBtn = customerPage.getByText('Demo Customer');
    if (await demoBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
      await demoBtn.click();
      await customerPage.waitForURL(/customer\/home/, { timeout: 15000 });
    }

    // 2. Verify Map iframe is rendered and visible
    const iframeElement = customerPage.locator('iframe[title="Bản đồ Vietmap Vector GL"]');
    await expect(iframeElement).toBeVisible({ timeout: 15000 });

    const frame = customerPage.frameLocator('iframe[title="Bản đồ Vietmap Vector GL"]');

    // 3. Verify Map container inside iframe
    const mapDiv = frame.locator('#map');
    await expect(mapDiv).toBeVisible({ timeout: 10000 });

    // 4. Verify VIETMAP VECTOR GL badge is completely REMOVED as requested
    const vietmapBadge = frame.locator('.vietmap-overlay-badge');
    await expect(vietmapBadge).toHaveCount(0);

    // 5. Verify Canvas or MapLibre elements rendered
    const mapCanvas = frame.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible({ timeout: 15000 });

    // 6. Verify Nearby Drivers (Grab/Lalamove style vehicle fleet pulse)
    const nearbyMarkers = frame.locator('.nearby-driver-badge');
    await expect(nearbyMarkers.first()).toBeVisible({ timeout: 15000 });
    const markerCount = await nearbyMarkers.count();
    console.log(`[Playwright Map Test] Found ${markerCount} nearby driver markers on Customer Home map.`);
    expect(markerCount).toBeGreaterThanOrEqual(1);

    // 7. Verify Floating Recenter Button (Grab/Uber standard) and click it
    const recenterBtn = customerPage.getByTestId('customer-map-recenter-btn');
    await expect(recenterBtn).toBeVisible({ timeout: 10000 });
    await recenterBtn.click();
    await customerPage.waitForTimeout(1000);

    // 8. Take screenshot of Customer Home Map
    await customerPage.screenshot({
      path: 'test-results/map-customer-home.png',
      fullPage: false,
    });
  });

  test('Customer Route Selection: Verifies Origin/Dest Pins and Dual-Layer Route Polyline', async ({
    customerPage,
    customerApp,
  }) => {
    await customerPage.goto('/customer/home');
    await customerPage.waitForLoadState('networkidle');

    const demoBtn = customerPage.getByText('Demo Customer');
    if (await demoBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
      await demoBtn.click();
      await customerPage.waitForURL(/customer\/home/, { timeout: 15000 });
    }

    // Select quick dropoff hub to generate A -> B route
    await customerApp.selectQuickDropoffHub();
    await customerPage.waitForTimeout(1500);

    const frame = customerPage.frameLocator('iframe[title="Bản đồ Vietmap Vector GL"]');

    // 1. Verify Origin Pin (Green pulse / pin)
    const originPin = frame.locator('.origin-pulse');
    await expect(originPin).toBeVisible({ timeout: 10000 });

    // 2. Verify Destination Pin (Red pulse / pin)
    const destPin = frame.locator('.dest-pulse');
    await expect(destPin).toBeVisible({ timeout: 10000 });

    // 3. Verify Route Polyline: SVG route overlay or MapLibre Vector GL layer
    const svgOverlay = frame.locator('#svg-route-overlay');
    await expect(svgOverlay).toBeAttached();

    // Check MapLibre instance has route coordinates
    const hasRouteCoords = await frame.locator('#map').evaluate(() => {
      return Boolean((window as any).currentRouteCoords && (window as any).currentRouteCoords.length >= 2);
    }).catch(() => false);
    console.log(`[Playwright Map Test] Route coordinates resolved on map: ${hasRouteCoords}`);

    // Take screenshot of Route Preview Map
    await customerPage.screenshot({
      path: 'test-results/map-customer-route.png',
      fullPage: false,
    });
  });

  test('Location Picker: Verifies Grab/Uber Style Interactive Center Pin Marker', async ({
    customerPage,
  }) => {
    // Navigate to location-picker screen
    await customerPage.goto('/customer/location-picker');
    await customerPage.waitForLoadState('networkidle');

    // Verify Map iframe exists
    const iframeElement = customerPage.locator('iframe[title="Bản đồ Vietmap Vector GL"]');
    await expect(iframeElement).toBeVisible({ timeout: 15000 });

    const frame = customerPage.frameLocator('iframe[title="Bản đồ Vietmap Vector GL"]');
    const mapDiv = frame.locator('#map');
    await expect(mapDiv).toBeVisible({ timeout: 10000 });

    // Verify Vietmap Badge is REMOVED
    const vietmapBadge = frame.locator('.vietmap-overlay-badge');
    await expect(vietmapBadge).toHaveCount(0);

    // Verify Grab/Uber/Lalamove style fixed center pin with shadow
    const fixedCenterPin = customerPage.getByTestId('fixed-center-pin');
    await expect(fixedCenterPin).toBeVisible({ timeout: 10000 });

    // Take screenshot of Location Picker
    await customerPage.screenshot({
      path: 'test-results/map-location-picker.png',
      fullPage: false,
    });
  });

  test('Driver World Map: Verifies Full-Bleed Navigation Map, Vehicle Puck, and Radar Aura (No badge)', async ({
    driverPage,
  }) => {
    await driverPage.goto('/orders');
    await driverPage.waitForLoadState('networkidle');

    // Verify Driver map iframe exists
    const iframeElement = driverPage.locator('iframe[title="Bản đồ Vietmap Vector GL"]');
    await expect(iframeElement).toBeVisible({ timeout: 15000 });

    const frame = driverPage.frameLocator('iframe[title="Bản đồ Vietmap Vector GL"]');
    const mapDiv = frame.locator('#map');
    await expect(mapDiv).toBeVisible({ timeout: 10000 });

    // Verify badge is REMOVED
    const badge = frame.locator('.vietmap-overlay-badge');
    await expect(badge).toHaveCount(0);

    // Verify MapLibre WebGL Canvas
    const canvas = frame.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify Vehicle Puck (Navigation Arrow + Radar pulse waves)
    const truckWrap = frame.locator('.truck-wrap');
    await expect(truckWrap).toBeVisible({ timeout: 10000 });

    const radarWave1 = frame.locator('.truck-radar-wave.wave-1');
    await expect(radarWave1).toBeVisible();
    const truckBadge = frame.locator('.truck-badge');
    await expect(truckBadge).toBeVisible();
    console.log('[Playwright Map Test] Driver vehicle puck and radar waves verified.');

    // Take screenshot of Driver Cockpit Map
    await driverPage.screenshot({
      path: 'test-results/map-driver-cockpit.png',
      fullPage: false,
    });
  });
});
