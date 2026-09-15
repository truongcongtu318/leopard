import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { RoleNavigation } from './RoleNavigation';

const navItems = [
  { label: 'Tổng quan', href: '/admin' },
  { label: 'Tài xế', href: '/admin/drivers' },
  { label: 'Đơn hàng', href: '/admin/orders' },
  { label: 'Duyệt hồ sơ', href: '/admin/driver-applications' },
];

describe('RoleNavigation', () => {
  it('renders all nav items', () => {
    render(<RoleNavigation items={navItems} currentPath="/admin" orientation="horizontal" />);
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeDefined();
    }
  });

  it('highlights current route with aria-current="page"', () => {
    render(
      <RoleNavigation
        items={navItems}
        currentPath="/admin/drivers"
        orientation="horizontal"
      />,
    );
    const driversLink = screen.getByText('Tài xế').closest('a');
    expect(driversLink?.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive items', () => {
    render(
      <RoleNavigation items={navItems} currentPath="/admin/drivers" />,
    );
    const dashboardLink = screen.getByText('Tổng quan').closest('a');
    expect(dashboardLink?.getAttribute('aria-current')).toBeNull();
  });

  it.each([
    {
      items: navItems,
      currentPath: '/admin/orders/order-123',
      activeLabel: 'Đơn hàng',
      rootLabel: 'Tổng quan',
    },
    {
      items: [
        { label: 'Admin dashboard', href: '/admin' },
        { label: 'Admin orders', href: '/admin/orders' },
      ],
      currentPath: '/admin/orders/order-123',
      activeLabel: 'Admin orders',
      rootLabel: 'Admin dashboard',
    },
  ])(
    'keeps $activeLabel current on a role detail route',
    ({ items, currentPath, activeLabel, rootLabel }) => {
      render(<RoleNavigation items={items} currentPath={currentPath} />);

      expect(screen.getByText(activeLabel).closest('a')?.getAttribute('aria-current')).toBe('page');
      expect(screen.getByText(rootLabel).closest('a')?.getAttribute('aria-current')).toBeNull();
    },
  );

  it('selects only the longest matching href segment', () => {
    render(
      <RoleNavigation
        items={[
          { label: 'Admin dashboard', href: '/admin' },
          { label: 'Orders', href: '/admin/orders' },
          { label: 'Order exceptions', href: '/admin/orders/exceptions' },
        ]}
        currentPath="/admin/orders/exceptions/exception-123"
      />,
    );

    expect(screen.getByText('Order exceptions').closest('a')?.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Orders').closest('a')?.getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('Admin dashboard').closest('a')?.getAttribute('aria-current')).toBeNull();
  });

  it.each(['/admin/unlisted', '/admin/orders-archive/order-123'])(
    'does not treat the dashboard or a partial segment as current for %s',
    (currentPath) => {
      const { container } = render(<RoleNavigation items={navItems} currentPath={currentPath} />);

      expect(container.querySelector('[aria-current="page"]')).toBeNull();
    },
  );

  it('renders links with correct hrefs', () => {
    render(<RoleNavigation items={navItems} currentPath="/admin" />);
    for (const item of navItems) {
      const link = screen.getByText(item.label).closest('a');
      expect(link?.getAttribute('href')).toBe(item.href);
    }
  });

  it('applies macOS segmented control pill styles in horizontal mode', () => {
    const { container } = render(
      <RoleNavigation
        items={navItems}
        currentPath="/admin"
        orientation="horizontal"
      />,
    );

    const ul = container.querySelector('ul');
    expect(ul?.className).toContain('bg-slate-200/50');
    expect(ul?.className).toContain('rounded-full');
    expect(ul?.className).toContain('backdrop-blur-md');

    const activeLink = screen.getByText('Tổng quan').closest('a');
    expect(activeLink?.className).toContain('bg-slate-900');
    expect(activeLink?.className).toContain('text-white');
    expect(activeLink?.className).toContain('rounded-full');

    const inactiveLink = screen.getByText('Tài xế').closest('a');
    expect(inactiveLink?.className).toContain('text-slate-600');
  });

  it('has accessible navigation role', () => {
    render(<RoleNavigation items={navItems} currentPath="/admin" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeDefined();
  });
});
