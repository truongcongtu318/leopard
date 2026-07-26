import { test, expect } from "@playwright/test";

test.describe("Shell renders without overflow", () => {
  const viewports = [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders login page without overflow at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");

      const heading = page.locator("h1");
      await expect(heading).toContainText("LEOPARD Operations", { timeout: 15000 });

      // Verify no horizontal overflow on body
      const body = page.locator("body");
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      const clientWidth = await body.evaluate((el) => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});

test.describe("Login page", () => {
  test("loads with heading and login button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("LEOPARD Operations", { timeout: 15000 });
    const button = page.locator("button", { hasText: "Login" });
    await expect(button).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Mobile drawer", () => {
  test("opens and closes at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/fleet");

    const hamburger = page.locator('[aria-label="Open navigation menu"]');
    await expect(hamburger).toBeVisible({ timeout: 15000 });

    // Click hamburger to open drawer
    await hamburger.click();

    // Drawer should now be visible
    const closeButton = page.locator('[aria-label="Close navigation menu"]');
    await expect(closeButton).toBeVisible({ timeout: 5000 });

    // Click close to dismiss
    await closeButton.click();

    // After close, overlay should not be visible
    await expect(page.locator('div[aria-hidden="true"]')).not.toBeVisible({ timeout: 5000 });
  });

  test("Escape key closes drawer", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/fleet");

    const hamburger = page.locator('[aria-label="Open navigation menu"]');
    await expect(hamburger).toBeVisible({ timeout: 15000 });
    await hamburger.click();

    // Verify drawer is open
    const closeButton = page.locator('[aria-label="Close navigation menu"]');
    await expect(closeButton).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press("Escape");

    // Drawer should close — overlay should not be visible
    await expect(page.locator('div[aria-hidden="true"]')).not.toBeVisible({ timeout: 5000 });
  });
});
