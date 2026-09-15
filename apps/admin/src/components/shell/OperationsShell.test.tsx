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
  { label: 'Fleets', href: '/admin/fleets' },
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
      ['Đội xe', '/admin/fleets'],
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

    expect(screen.getAllByText('Khu vực vận hành').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Điều hướng vận hành' })).toBeTruthy();
  });
});
