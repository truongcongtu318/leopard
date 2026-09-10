import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const PREVIEW_BANNER = 'Bản xem trước giao diện — dữ liệu mô phỏng';
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

const ADMIN_ROUTES = [
  { name: 'overview', path: '/admin?preview=enabled&scenario=ADM-OV-READY', table: true },
  { name: 'orders', path: '/admin/orders?preview=enabled&scenario=ADM-ORD-DENSE', table: true },
  { name: 'users', path: '/admin/users?preview=enabled&scenario=ADM-USR-DENSE', table: true },
  { name: 'fleets', path: '/admin/fleets?preview=enabled&scenario=ADM-FLT-EMPTY', table: true },
  { name: 'drivers', path: '/admin/drivers?preview=enabled&scenario=ADM-DRV-MIXED', table: true },
  {
    name: 'detail',
    path: '/admin/orders/33333333-3333-4333-8333-333333333101?preview=enabled&scenario=ADM-ORD-DETAIL',
    detail: true,
  },
  {
    name: 'dialog',
    path: '/admin/users?preview=enabled&scenario=ADM-CMD-INVALID&command=ENABLE_USER',
    dialog: true,
  },
] as const;

const FLEET_ROUTES = [
  { name: 'overview', path: '/fleet?preview=enabled&scenario=fleet-overview-success' },
  {
    name: 'drivers',
    path: '/fleet/drivers?preview=enabled&scenario=fleet-drivers-mixed',
    table: true,
  },
  {
    name: 'orders',
    path: '/fleet/orders?preview=enabled&scenario=fleet-orders-mixed',
    table: true,
  },
  {
    name: 'detail',
    path: '/fleet/orders/33333333-3333-4333-8333-333333333001?preview=enabled&scenario=fleet-order-detail-success',
    detail: true,
  },
] as const;

async function useRole(context: BrowserContext, token: 'qa-admin' | 'qa-fleet') {
  await context.addCookies([
    {
      name: 'leopard.admin.access',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectResponsiveResultMode(page: Page, width: number) {
  const table = page.locator('table').first();
  const responsiveRows = page.locator('ul[aria-label*="responsive"]').first();
  if (width >= 768) {
    await expect(table).toBeVisible();
    await expect(responsiveRows).toBeHidden();
  } else {
    await expect(table).toBeHidden();
    await expect(responsiveRows).toBeVisible();
  }
}

test.describe('Operations static UI gate', () => {
  test('keeps the login surface usable at all approved web viewports', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'LEOPARD Operations' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
      await expectNoDocumentOverflow(page);
    }
  });

  test('passes the Admin route, breakpoint, investigation and dialog matrix', async ({
    context,
    page,
  }) => {
    test.setTimeout(120_000);
    await useRole(context, 'qa-admin');
    const httpErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
    });

    for (const route of ADMIN_ROUTES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await expectNoDocumentOverflow(page);

        if ('table' in route && route.table) {
          await expectResponsiveResultMode(page, viewport.width);
        }

        if ('detail' in route && route.detail) {
          const map = page
            .getByRole('heading', { name: 'Tracking và vị trí gần nhất' })
            .locator('xpath=ancestor::section[1]');
          expect((await map.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(280);

          const audit = page.getByLabel('Audit Rail — thao tác đặc quyền');
          const investigation = audit.locator('xpath=../preceding-sibling::*[1]');
          const [auditBox, investigationBox] = await Promise.all([
            audit.boundingBox(),
            investigation.boundingBox(),
          ]);
          expect(auditBox).not.toBeNull();
          expect(investigationBox).not.toBeNull();
          if (auditBox && investigationBox) {
            if (viewport.width >= 1024) {
              expect(Math.abs(auditBox.y - investigationBox.y)).toBeLessThan(4);
            } else {
              expect(auditBox.y).toBeGreaterThanOrEqual(
                investigationBox.y + investigationBox.height - 4,
              );
            }
          }
        }

        if ('dialog' in route && route.dialog) {
          const dialog = page.getByRole('dialog');
          const box = await dialog.boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            expect(Math.abs(box.width - Math.min(576, viewport.width - 32))).toBeLessThanOrEqual(2);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
          }
        }
      }
    }

    expect(httpErrors).toEqual([]);
  });

  test('passes the Fleet Owner read-only route and breakpoint matrix', async ({
    context,
    page,
  }) => {
    test.setTimeout(120_000);
    await useRole(context, 'qa-fleet');
    const httpErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
    });

    for (const route of FLEET_ROUTES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
        await expect(page.getByLabel('Phạm vi truy cập đội xe')).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await expectNoDocumentOverflow(page);

        if ('table' in route && route.table) {
          await expectResponsiveResultMode(page, viewport.width);
        }
        if ('detail' in route && route.detail) {
          const map = page
            .getByRole('heading', { name: 'Tracking và vị trí gần nhất' })
            .locator('xpath=ancestor::section[1]');
          expect((await map.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(280);
        }

        for (const label of ['Tạo đơn', 'Hủy đơn', 'Nhận đơn', 'Xác nhận thanh toán']) {
          await expect(page.getByRole('button', { name: label })).toHaveCount(0);
        }
      }
    }

    expect(httpErrors).toEqual([]);
  });

  test('opens, traps and safely closes the Admin drawer at tablet width', async ({
    context,
    page,
  }) => {
    await useRole(context, 'qa-admin');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin?preview=enabled&scenario=ADM-OV-READY');

    const trigger = page.getByRole('button', { name: 'Mở điều hướng' });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Điều hướng quản trị vận hành' });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đóng điều hướng' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('keeps privacy-safe preview context through Admin investigation links', async ({
    context,
    page,
  }) => {
    await useRole(context, 'qa-admin');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      '/admin/orders?preview=enabled&scenario=ADM-ORD-DENSE&q=0909123456',
    );

    await page.getByRole('link', { name: 'Xem đơn LP-A-260815-104' }).first().click();
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Đơn LP-A-260815-104' })).toBeVisible();

    let destination = new URL(page.url());
    expect(destination.pathname).toBe(
      '/admin/orders/33333333-3333-4333-8333-333333333104',
    );
    expect(destination.searchParams.get('preview')).toBe('enabled');
    expect(destination.searchParams.get('scenario')).toBe('ADM-ORD-DETAIL');
    expect(destination.searchParams.has('q')).toBe(false);
    expect(destination.href).not.toContain('0909123456');

    await page
      .getByLabel('Đường dẫn')
      .getByRole('link', { name: 'Đơn hàng' })
      .click();
    destination = new URL(page.url());
    expect(destination.pathname).toBe('/admin/orders');
    expect(destination.searchParams.get('preview')).toBe('enabled');
    expect(destination.searchParams.get('scenario')).toBe('ADM-ORD-DENSE');
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();

    await page
      .getByLabel('Đường dẫn')
      .getByRole('link', { name: 'Tổng quan' })
      .click();
    destination = new URL(page.url());
    expect(destination.pathname).toBe('/admin');
    expect(destination.searchParams.get('preview')).toBe('enabled');
    expect(destination.searchParams.get('scenario')).toBe('ADM-OV-READY');
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
  });

  test('binds Fleet preview navigation to the selected in-scope order', async ({
    context,
    page,
  }) => {
    await useRole(context, 'qa-fleet');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fleet/orders?preview=enabled&scenario=fleet-orders-mixed');

    await page.getByRole('link', { name: 'Xem đơn LP-F-260815-002' }).first().click();
    await expect(page.getByRole('heading', { name: 'Đơn LP-F-260815-002' })).toBeVisible();
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
    expect(new URL(page.url()).searchParams.get('scenario')).toBe(
      'fleet-order-detail-success',
    );

    await page.goto('/fleet/drivers?preview=enabled&scenario=fleet-drivers-mixed');
    await page.getByRole('link', { name: 'Xem đơn LP-F-260815-001' }).first().click();
    await expect(page.getByRole('heading', { name: 'Đơn LP-F-260815-001' })).toBeVisible();
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();

    await page.goto('/fleet?preview=enabled&scenario=fleet-overview-success');
    await page.getByRole('link', { name: 'LP-F-260815-002' }).click();
    await expect(page.getByRole('heading', { name: 'Đơn LP-F-260815-002' })).toBeVisible();
    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
  });

  test('keeps the Admin investigation usable at 200% text zoom', async ({ context, page }) => {
    await useRole(context, 'qa-admin');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      '/admin/orders/33333333-3333-4333-8333-333333333101?preview=enabled&scenario=ADM-ORD-DETAIL',
    );
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });

    await expect(page.getByText(PREVIEW_BANNER)).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByLabel('Audit Rail — thao tác đặc quyền')).toBeVisible();
    await expectNoDocumentOverflow(page);

    const trigger = page.getByRole('button', { name: 'Hủy đơn hàng' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', {
      name: 'Hủy đơn hàng: Đơn LP-A-260815-101',
    });
    const dialogHeading = dialog.getByRole('heading', {
      name: 'Hủy đơn hàng: Đơn LP-A-260815-101',
    });
    const reason = dialog.getByRole('textbox', { name: /Lý do hủy/ });
    const cancel = dialog.getByRole('button', { name: 'Hủy thao tác' });
    const submit = dialog.getByRole('button', { name: 'Hủy đơn hàng' });

    await expect(dialog).toBeVisible();
    await expect(dialogHeading).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reason).toBeFocused();
    await page.keyboard.type('Xác minh điều phối bằng bàn phím');
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cancel).toBeFocused();
    await expectNoDocumentOverflow(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectNoDocumentOverflow(page);
  });
});
