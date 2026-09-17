import { Page, Locator, expect } from '@playwright/test';

export class CustomerApp {
  readonly page: Page;
  readonly pickupInput: Locator;
  readonly dropoffInput: Locator;
  readonly addStopBtn: Locator;
  readonly mainCtaBtn: Locator;
  readonly confirmBookingBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pickupInput = page.getByTestId('cr-pickup-input');
    this.dropoffInput = page.getByTestId('cr-dropoff-input');
    this.addStopBtn = page.getByTestId('cr-add-stop');
    this.mainCtaBtn = page.getByTestId('home-main-cta-btn');
    this.confirmBookingBtn = page.getByTestId('btn-confirm-booking-details');
  }

  async goto() {
    await this.page.goto('/customer/home');
    const demoBtn = this.page.getByText('Demo Customer');
    if (await demoBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
      await demoBtn.click();
      await this.page.waitForURL(/customer\/home/, { timeout: 15000 });
    }
  }

  async selectQuickDropoffHub() {
    const hubChip = this.page.getByTestId('hub-chip-Giao Lê Duẩn');
    await expect(hubChip).toBeVisible({ timeout: 15000 });

    const pickupVal = await this.pickupInput.inputValue().catch(() => '');
    if (!pickupVal || pickupVal.trim().length === 0) {
      await this.pickupInput.fill('123 Nguyen Hue, Ben Nghe, Quan 1, TP.HCM');
    }

    await hubChip.click();
  }

  async setPickup(address: string) {
    await this.pickupInput.fill(address);
  }

  async setDropoff(address: string) {
    await this.dropoffInput.fill(address);
  }

  async addIntermediateStop(address: string, stopIndex: number = 0) {
    await this.addStopBtn.click();
    const stopInput = this.page.getByTestId(`cr-stop-input-${stopIndex}`);
    await stopInput.fill(address);
    await stopInput.press('Enter');
  }

  async selectVehicle(vehicleId: string) {
    const vehicleRow = this.page.getByTestId(`vehicle-row-${vehicleId}`);
    await vehicleRow.waitFor({ state: 'visible', timeout: 10000 });
    await vehicleRow.click();
    await expect(vehicleRow).toHaveAttribute('aria-selected', 'true', { timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async submitBooking() {
    await expect(this.mainCtaBtn).toBeVisible({ timeout: 10000 });
    await this.mainCtaBtn.click();

    // Check if modal appears
    if (
      await this.confirmBookingBtn
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await this.confirmBookingBtn.click();
    }
  }

  async expectBookingCreated() {
    // Navigates to searching screen or checkout screen
    await expect(this.page).toHaveURL(/orders\/(searching|checkout)/, {
      timeout: 20000,
    });
  }
}
