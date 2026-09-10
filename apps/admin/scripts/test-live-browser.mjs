/* global document */
import { chromium } from '@playwright/test';
import console from 'node:console';

async function main() {
  console.log('🌐 Starting Comprehensive Web UI Audit with Playwright...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const artifactDir = '/home/tuinfi/.gemini/antigravity/brain/0976fb9e-323b-4d9c-9d38-0f307a3564e1';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditResults = [];

  const checkPage = async (name, url, screenshotName, options = {}) => {
    console.log(`\n🔍 Checking: ${name} (${url})...`);
    if (options.viewport) {
      await page.setViewportSize(options.viewport);
    } else {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    const consoleErrors = [];
    const onConsole = (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    page.on('console', onConsole);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);

      const title = await page.title();
      const path = `${artifactDir}/${screenshotName}`;
      await page.screenshot({ path });
      console.log(`  ✓ Title: "${title}"`);
      console.log(`  📸 Screenshot saved: ${screenshotName}`);

      auditResults.push({
        name,
        url,
        status: 'PASS',
        title,
        screenshot: screenshotName,
        errors: consoleErrors,
      });
    } catch (err) {
      console.error(`  ❌ Error on ${name}:`, err.message);
      const errPath = `${artifactDir}/err_${screenshotName}`;
      await page.screenshot({ path: errPath }).catch(() => {});
      auditResults.push({
        name,
        url,
        status: 'FAIL',
        error: err.message,
        screenshot: `err_${screenshotName}`,
        errors: consoleErrors,
      });
    } finally {
      page.off('console', onConsole);
    }
  };

  try {
    // 1. Auth Login Screen
    await checkPage('1. Login Screen (Desktop 1440px)', 'http://localhost:3002/login', 'audit_01_login_desktop.png');
    await checkPage('2. Login Screen (Mobile 375px)', 'http://localhost:3002/login', 'audit_02_login_mobile.png', { viewport: { width: 375, height: 667 } });

    // 2. Authenticate as Admin
    console.log('\n🔑 Authenticating as Demo Admin...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="demo-admin-button"]', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="demo-admin-button"]');
      if (el) el.click();
    });
    await page.waitForURL('**/admin**', { timeout: 10000 });
    console.log('  ✓ Authenticated as Admin successfully');

    // 3. Admin Portal Screens
    await checkPage('3. Admin Overview (Live)', 'http://localhost:3002/admin', 'audit_03_admin_overview.png');
    await checkPage('4. Admin Orders (Live)', 'http://localhost:3002/admin/orders', 'audit_04_admin_orders.png');
    await checkPage('5. Admin Users Directory', 'http://localhost:3002/admin/users', 'audit_05_admin_users.png');
    await checkPage('6. Admin Fleets Directory', 'http://localhost:3002/admin/fleets', 'audit_06_admin_fleets.png');
    await checkPage('7. Admin Drivers Directory', 'http://localhost:3002/admin/drivers', 'audit_07_admin_drivers.png');
    await checkPage('8. Admin Orders List (Dense Scenarios)', 'http://localhost:3002/admin/orders?preview=enabled&scenario=ADM-ORD-DENSE', 'audit_08_admin_orders_dense.png');
    await checkPage('9. Admin Order Detail (Route Spine & Audit Rail)', 'http://localhost:3002/admin/orders/33333333-3333-4333-8333-333333333101?preview=enabled&scenario=ADM-ORD-DETAIL', 'audit_09_admin_order_detail.png');

    // 4. Authenticate as Fleet Owner
    console.log('\n🔑 Authenticating as Demo Fleet Owner...');
    await context.clearCookies();
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="demo-fleet-owner-button"]', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="demo-fleet-owner-button"]');
      if (el) el.click();
    });
    await page.waitForURL('**/fleet**', { timeout: 10000 });
    console.log('  ✓ Authenticated as Fleet Owner successfully');

    // 5. Fleet Owner Portal Screens
    await checkPage('10. Fleet Owner Dashboard (Live)', 'http://localhost:3002/fleet', 'audit_10_fleet_dashboard.png');
    await checkPage('11. Fleet Owner Drivers List (Dense)', 'http://localhost:3002/fleet/drivers?preview=enabled&scenario=fleet-drivers-mixed', 'audit_11_fleet_drivers_dense.png');
    await checkPage('12. Fleet Owner Orders List (Dense)', 'http://localhost:3002/fleet/orders?preview=enabled&scenario=fleet-orders-mixed', 'audit_12_fleet_orders_dense.png');
    await checkPage('13. Fleet Owner Order Detail (Read-Only Scope)', 'http://localhost:3002/fleet/orders/33333333-3333-4333-8333-333333333001?preview=enabled&scenario=fleet-order-detail-success', 'audit_13_fleet_order_detail.png');

    console.log('\n=============================================');
    console.log('📊 AUDIT SUMMARY:');
    const passed = auditResults.filter(r => r.status === 'PASS').length;
    const failed = auditResults.filter(r => r.status === 'FAIL').length;
    console.log(`✅ Passed: ${passed} / ${auditResults.length}`);
    console.log(`❌ Failed: ${failed} / ${auditResults.length}`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Fatal error during audit:', error);
  } finally {
    await browser.close();
  }
}

main();

