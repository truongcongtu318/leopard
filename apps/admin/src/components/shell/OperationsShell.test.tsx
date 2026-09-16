import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

// NOTE: no hoisting in this toolchain – register the mock, import dynamically.
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ refresh: jest.fn() }),
}));

type ShellModule = typeof import('./OperationsShell');

let OperationsShell: ShellModule['OperationsShell'];

beforeEach(async () => {
  ({ OperationsShell } = await import('./OperationsShell'));
});

const adminItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Drivers', href: '/admin/drivers' },
  { label: 'Driver Applications', href: '/admin/driver-applications' },
] as const;

function renderShell(role = 'admin') {
  return render(
    <OperationsShell role={role} navItems={[...adminItems]}>
      <h1>Nội dung vận hành</h1>
    </OperationsShell>,
  );
}

describe('OperationsShell', () => {
  it('provides a Vietnamese skip link, landmarks and role context', () => {
    renderShell();

    expect(
      screen.getByRole('link', { name: 'Bỏ qua đến nội dung chính' }).getAttribute('href'),
    ).toBe('#noi-dung-chinh');
    expect(screen.getByRole('main').getAttribute('id')).toBe('noi-dung-chinh');
    expect(screen.getByText('LEOPARD')).toBeTruthy();
    // Fallback layout: horizontal topbar shows 'Admin Console' badge
    expect(screen.getByText('Admin Console')).toBeTruthy();
    expect(screen.getAllByText('Admin Dispatch Console').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeTruthy();
  });

  it('renders the Apple 2026 floating glass header with spotlight search and admin avatar', () => {
    renderShell();

    const header = screen
      .getByText('LEOPARD')
      .closest('header');
    expect(header?.className).toContain('bg-white/80');
    expect(header?.className).toContain('backdrop-blur-xl');
    expect(header?.className).toContain('rounded-3xl');
    expect(header?.className).toContain('border-black/[0.06]');

    expect(
      screen.getByRole('button', { name: /Tìm kiếm nhanh/ }),
    ).toBeTruthy();
    expect(screen.getByText('⌘K')).toBeTruthy();

    expect(screen.getByText('Nguyễn Hoài Nam')).toBeTruthy();
    expect(screen.getByText('Quản trị viên điều phối')).toBeTruthy();
  });

  it('localizes navigation copy without changing hrefs or mutating caller data', () => {
    const original = adminItems.map((item) => ({ ...item }));
    renderShell();

    const expectedLinks = [
      ['Tổng quan', '/admin'],
      ['Đơn hàng', '/admin/orders'],
      ['Người dùng', '/admin/users'],
      ['Tài xế', '/admin/drivers'],
      ['Duyệt hồ sơ', '/admin/driver-applications'],
    ] as const;

    expectedLinks.forEach(([label, href]) => {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
    });
    expect(adminItems).toEqual(original);
  });

  it('uses semantic Tailwind classes without inline style or style tags', () => {
    const { container } = renderShell();

    expect(container.querySelector('[style]')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
    const mainClasses = screen.getByRole('main').className.split(' ');
    expect(mainClasses).toEqual(
      expect.arrayContaining(['text-neutral-text', 'max-w-operations']),
    );
  });

  it('opens a labelled drawer, gives controls 44px targets and focuses close', () => {
    renderShell();

    const trigger = screen.getByRole('button', { name: 'Mở điều hướng' });
    expect(trigger.className.split(' ')).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    const drawer = screen.getByRole('dialog', {
      name: 'Điều hướng quản trị vận hành',
    });
    const close = within(drawer).getByRole('button', {
      name: 'Đóng điều hướng',
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(close.className.split(' ')).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']));
    expect(document.activeElement).toBe(close);
  });

  it('traps Tab and Shift+Tab inside the drawer', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }));

    const drawer = screen.getByRole('dialog');
    const close = within(drawer).getByRole('button', {
      name: 'Đóng điều hướng',
    });
    const lastLink = within(drawer).getByRole('link', { name: 'Duyệt hồ sơ' });

    lastLink.focus();
    fireEvent.keyDown(drawer, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(drawer, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastLink);
  });

  it('closes with Escape and restores focus to the drawer trigger', () => {
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Mở điều hướng' });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('respects reduced motion on interactive shell controls', () => {
    renderShell();

    expect(screen.getByRole('button', { name: 'Mở điều hướng' }).className).toContain(
      'motion-reduce:transition-none',
    );
    screen.getAllByRole('link').forEach((link) => {
      expect(link.className).toContain('motion-reduce:transition-none');
    });
  });

  it('uses a safe generic Vietnamese context for an unknown role', () => {
    renderShell('support_observer');

    // Unknown roles fall through to the fallback horizontal nav layout.
    // FALLBACK_CONTEXT.contextLabel is shown in the header subtitle.
    expect(screen.getAllByText('Khu vực vận hành').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Điều hướng vận hành' })).toBeTruthy();
  });

  describe('Grouped Dispatch Console layout (with navGroups)', () => {
    const testGroups = [
      {
        groupLabel: 'Tổng quan',
        items: [{ label: 'Dashboard', href: '/admin' }],
      },
      {
        groupLabel: 'Vận hành',
        items: [
          { label: 'Điều phối', href: '/admin/dispatch' },
          { label: 'Khiếu nại', href: '/admin/reports', badge: 3 },
        ],
      },
    ];

    function renderGroupedShell() {
      return render(
        <OperationsShell role="admin" navItems={[...adminItems]} navGroups={testGroups}>
          <h1>Nội dung console</h1>
        </OperationsShell>,
      );
    }

    it('renders search icon-only button and opens spotlight search dialog when clicked', () => {
      renderGroupedShell();

      const searchBtn = screen.getByRole('button', { name: /Tìm kiếm nhanh/i });
      expect(searchBtn).toBeTruthy();

      fireEvent.click(searchBtn);

      expect(screen.getByPlaceholderText(/Tìm kiếm nhanh chức năng/i)).toBeTruthy();
      expect(screen.getByText('LEOPARD Dispatch Console')).toBeTruthy();
    });

    it('renders user profile capsule and opens dropdown menu with action links and logout', () => {
      renderGroupedShell();

      const userBtn = screen.getByRole('button', { name: 'Menu tài khoản quản trị viên' });
      expect(userBtn).toBeTruthy();
      expect(screen.getAllByText('Nguyễn Hoài Nam').length).toBeGreaterThan(0);

      // Open dropdown
      fireEvent.click(userBtn);

      const menu = screen.getByRole('menu');
      expect(menu.className).toContain('animate-dropdown');
      expect(menu.className).toContain('w-full');
      expect(screen.getByText('Cài đặt hệ thống')).toBeTruthy();
      expect(screen.getByText('Nhật ký hoạt động')).toBeTruthy();
      expect(screen.getByText('Thông báo hệ thống')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: /Đăng xuất/ }).length).toBeGreaterThan(0);
    });

    it('renders sidebar group header without deceptive item counts and shows item notification badge', () => {
      renderGroupedShell();

      expect(screen.getAllByText('Tổng quan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vận hành').length).toBeGreaterThan(0);

      // Real notification badge on Khiếu nại item
      const badge = screen.getByLabelText('3 thông báo');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('3');
    });

    it('toggles sidebar collapse mode when collapse button is clicked', () => {
      renderGroupedShell();

      // Only one single collapse button centered on the vertical divider
      const collapseBtn = screen.getByRole('button', { name: 'Thu gọn thanh bên' });
      expect(collapseBtn).toBeTruthy();

      // Click to collapse
      fireEvent.click(collapseBtn);

      // Should now show single button to expand
      const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh bên' });
      expect(expandBtn).toBeTruthy();
      expect(screen.getByRole('navigation', { name: 'Menu điều hướng thu gọn' })).toBeTruthy();

      // Click expand button to restore
      fireEvent.click(expandBtn);

      expect(screen.getByRole('button', { name: 'Thu gọn thanh bên' })).toBeTruthy();
      expect(screen.getByRole('navigation', { name: 'Menu điều hướng' })).toBeTruthy();
    });
  });
});
