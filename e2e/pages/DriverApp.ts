import { Page, Locator, expect } from '@playwright/test';

export class DriverApp {
  readonly page: Page;
  readonly connectionToggle: Locator;
  readonly incomingDispatchModal: Locator;
  readonly dispatchSlideAction: Locator;
  readonly dispatchSlideThumb: Locator;
  readonly declineOfferBtn: Locator;
  readonly incidentModalBtn: Locator;
  readonly incidentModal: Locator;
  readonly confirmIncidentBtn: Locator;
  readonly advanceLegSlide: Locator;
  readonly advanceLegThumb: Locator;
  readonly epodContainer: Locator;
  readonly recipientNameInput: Locator;
  readonly completeDeliveryBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.connectionToggle = page.getByTestId('driver-connection-toggle');
    this.incomingDispatchModal = page.getByTestId('incoming-dispatch-modal');
    this.dispatchSlideAction = page.getByTestId('dispatch-slide-action');
    this.dispatchSlideThumb = page.getByTestId('dispatch-slide-action-thumb');
    this.declineOfferBtn = page.getByTestId('dispatch-modal-decline-top');
    this.incidentModalBtn = page.getByTestId('btn-open-incident-modal');
    this.incidentModal = page.getByTestId('driver-incident-modal');
    this.confirmIncidentBtn = page.getByTestId('btn-confirm-incident-report');
    this.advanceLegSlide = page.getByTestId('btn-advance-leg-slide');
    this.advanceLegThumb = page.getByTestId('btn-advance-leg-slide-thumb');
    this.epodContainer = page.getByTestId('epod-verification-container');
    this.recipientNameInput = page.getByTestId('epod-recipient-name-input');
    this.completeDeliveryBtn = page.getByTestId('btn-epod-complete-delivery');
  }

  async goto() {
    await this.page.goto('/orders');
  }

  async goOnline() {
    const continueTripBtn = this.page.getByText('Tiếp tục chuyến');
    if (await continueTripBtn.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
      await this.page.goto('/orders');
      await this.page.waitForTimeout(500);
    }

    const retryBtn = this.page.getByText('Thử tải lại danh sách');
    if (await retryBtn.isVisible().catch(() => false)) {
      await retryBtn.click();
      await this.page.waitForTimeout(800);
    }

    if (await this.connectionToggle.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
      const label = await this.connectionToggle.getAttribute('aria-label');
      if (label?.includes('Chạm để bật')) {
        await this.connectionToggle.click();
      }
    } else {
      if (await retryBtn.isVisible().catch(() => false)) {
        await retryBtn.click();
        await this.page.waitForTimeout(1000);
      }
      if (await this.connectionToggle.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
        const label = await this.connectionToggle.getAttribute('aria-label');
        if (label?.includes('Chạm để bật')) {
          await this.connectionToggle.click();
        }
      }
    }

    // Ensure toggle confirms online status and socket joins driver room
    await expect(this.connectionToggle).toHaveAttribute('aria-label', /Đang nhận cuốc/, { timeout: 10000 });
    await this.page.waitForTimeout(800);
  }

  async expectIncomingDispatch(timeoutMs: number = 30_000) {
    await expect(this.incomingDispatchModal).toBeVisible({ timeout: timeoutMs });
  }

  async acceptDispatch() {
    const thumbBox = await this.dispatchSlideThumb.boundingBox();
    const trackBox = await this.dispatchSlideAction.boundingBox();

    if (thumbBox && trackBox) {
      const startX = thumbBox.x + thumbBox.width / 2;
      const startY = thumbBox.y + thumbBox.height / 2;
      const endX = trackBox.x + trackBox.width - 20;

      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(endX, startY, { steps: 10 });
      await this.page.mouse.up();
    } else {
      await this.dispatchSlideAction.click();
    }
  }

  async slideAdvanceLeg() {
    const hiddenA11yBtn = this.page.locator('[data-testid^="btn-lifecycle-"]');
    if (await hiddenA11yBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hiddenA11yBtn.click();
      return;
    }

    const thumbBox = await this.advanceLegThumb.boundingBox();
    const trackBox = await this.advanceLegSlide.boundingBox();

    if (thumbBox && trackBox) {
      const startX = thumbBox.x + thumbBox.width / 2;
      const startY = thumbBox.y + thumbBox.height / 2;
      const endX = trackBox.x + trackBox.width - 20;

      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(endX, startY, { steps: 10 });
      await this.page.mouse.up();
    } else {
      await this.advanceLegSlide.click();
    }
  }

  async declineDispatch() {
    await this.declineOfferBtn.click();
    await expect(this.incomingDispatchModal).toBeHidden();
  }

  async reportIncident(reasonId: string, note: string) {
    // Click the incident button on screen (testID: btn-open-incident-modal or btn-report-incident)
    const openBtn = this.page.getByTestId('btn-open-incident-modal').or(this.page.getByTestId('btn-report-incident'));
    await expect(openBtn.first()).toBeVisible({ timeout: 5000 });
    await openBtn.first().click();

    await expect(this.page.getByText('Báo cáo sự cố chuyến đi')).toBeVisible({ timeout: 5000 });
    const reasonItem = this.page.getByTestId(`incident-reason-${reasonId}`);
    if (await reasonItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reasonItem.click();
    }
    await this.page.getByTestId('input-incident-note').fill(note);
    await this.confirmIncidentBtn.click();
  }

  async progressStop(stopSequence: number) {
    const stopBtn = this.page.getByTestId(`btn-stop-progress-${stopSequence}`);
    if (await stopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stopBtn.click();
    }
  }

  async completeEpod(recipientName: string) {
    const continueTripBtn = this.page.getByText('Tiếp tục chuyến');
    if (await continueTripBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
      await continueTripBtn.click();
      await this.page.waitForTimeout(1000);
    }

    // Advance any intermediate stops if present (e.g. multi-stop orders)
    for (let s = 0; s < 5; s++) {
      const stopBtn = this.page.locator('[data-testid^="btn-stop-progress-"]');
      if (await stopBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await stopBtn.first().click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(500);
      } else {
        break;
      }
    }

    for (let i = 0; i < 8; i++) {
      if (await this.epodContainer.isVisible()) {
        break;
      }
      const hiddenA11yBtn = this.page.locator('[data-testid^="btn-lifecycle-"]');
      if (await hiddenA11yBtn.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
        await hiddenA11yBtn.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(1000);
      } else if (await this.advanceLegSlide.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
        await this.slideAdvanceLeg();
        await this.page.waitForTimeout(1000);
      }
    }

    if (await this.epodContainer.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
      const capturePhotoBtn = this.page.getByTestId('btn-capture-cargo-photo');
      if (await capturePhotoBtn.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
        await capturePhotoBtn.click();
      }

      const sigPad = this.page.getByTestId('epod-signature-pad');
      if (await sigPad.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
        await sigPad.click();
      }

      await this.recipientNameInput.fill(recipientName);

      const thumb = this.page.getByTestId('btn-epod-complete-delivery-thumb');
      const track = this.completeDeliveryBtn;
      const thumbBox = await thumb.boundingBox();
      const trackBox = await track.boundingBox();
      if (thumbBox && trackBox) {
        const startX = thumbBox.x + thumbBox.width / 2;
        const startY = thumbBox.y + thumbBox.height / 2;
        const endX = trackBox.x + trackBox.width - 20;

        await this.page.mouse.move(startX, startY);
        await this.page.mouse.down();
        await this.page.mouse.move(endX, startY, { steps: 10 });
        await this.page.mouse.up();
      } else {
        await this.completeDeliveryBtn.click();
      }
      await this.page.waitForTimeout(1000);
    }
  }
}
