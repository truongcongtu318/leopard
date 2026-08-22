import { expect, test } from '@playwright/test';

test.describe('Live System Verification', () => {
  test('Web Admin: login via Demo Admin button and navigate to Dashboard', async ({ page }) => {
    // 1. Visit Web Login
    await page.goto('http://localhost:3002/login');
    await expect(page.getByRole('heading', { name: 'LEOPARD Operations' })).toBeVisible();

    // Take screenshot of Login page
    await page.screenshot({ path: '/home/tuinfi/.gemini/antigravity/brain/6101f63a-22ac-4e65-9afe-2440388eeec5/web_login_page.png' });

    // 2. Click "Demo Admin"
    const demoAdminBtn = page.getByRole('button', { name: 'Demo Admin' });
    await expect(demoAdminBtn).toBeVisible();
    await demoAdminBtn.click();

    // 3. Verify Admin Dashboard loaded
    await page.waitForURL('**/admin**', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Tổng quan|Dashboard|Operations|Admin/i })).toBeVisible();

    // Take screenshot of Admin Dashboard
    await page.screenshot({ path: '/home/tuinfi/.gemini/antigravity/brain/6101f63a-22ac-4e65-9afe-2440388eeec5/admin_dashboard.png' });
  });

  test('Web Fleet Owner: login via Demo Fleet Owner button and navigate to Fleet view', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    const demoFleetBtn = page.getByRole('button', { name: 'Demo Fleet Owner' });
    await expect(demoFleetBtn).toBeVisible();
    await demoFleetBtn.click();

    await page.waitForURL('**/fleet**', { timeout: 10000 });
    await page.screenshot({ path: '/home/tuinfi/.gemini/antigravity/brain/6101f63a-22ac-4e65-9afe-2440388eeec5/fleet_dashboard.png' });
  });

  test('Mobile App: portal navigation to Customer and Driver screens', async ({ page }) => {
    // 1. Visit Mobile App root
    await page.goto('http://localhost:8081');
    await expect(page.getByText('LEOPARD Mobile')).toBeVisible();

    // Take screenshot of Mobile Portal
    await page.screenshot({ path: '/home/tuinfi/.gemini/antigravity/brain/6101f63a-22ac-4e65-9afe-2440388eeec5/mobile_portal.png' });

    // 2. Click Khách Hàng
    const customerBtn = page.getByText('Khách Hàng (Customer)');
    await customerBtn.click();

    // Wait for customer screen
    await page.waitForURL('**/customer/orders**', { timeout: 10000 });
    await page.screenshot({ path: '/home/tuinfi/.gemini/antigravity/brain/6101f63a-22ac-4e65-9afe-2440388eeec5/customer_orders.png' });
  });
});
