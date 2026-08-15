import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { RoleNavigation } from './RoleNavigation';

const navItems = [
  { label: 'Dashboard', href: '/fleet' },
  { label: 'Drivers', href: '/fleet/drivers' },
  { label: 'Orders', href: '/fleet/orders' },
];

describe('RoleNavigation', () => {
  it('renders all nav items', () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeDefined();
    }
  });

  it('highlights current route with aria-current="page"', () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet/drivers" />);
    const driversLink = screen.getByText('Drivers');
    expect(driversLink.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive items', () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet/drivers" />);
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.getAttribute('aria-current')).toBeNull();
  });

  it.each([
    {
      items: navItems,
      currentPath: '/fleet/orders/order-123',
      activeLabel: 'Orders',
      rootLabel: 'Dashboard',
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

      expect(screen.getByText(activeLabel).getAttribute('aria-current')).toBe('page');
      expect(screen.getByText(rootLabel).getAttribute('aria-current')).toBeNull();
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

    expect(screen.getByText('Order exceptions').getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Orders').getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('Admin dashboard').getAttribute('aria-current')).toBeNull();
  });

  it.each(['/fleet/unlisted', '/fleet/orders-archive/order-123'])(
    'does not treat the dashboard or a partial segment as current for %s',
    (currentPath) => {
      const { container } = render(<RoleNavigation items={navItems} currentPath={currentPath} />);

      expect(container.querySelector('[aria-current="page"]')).toBeNull();
    },
  );

  it('renders links with correct hrefs', () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    for (const item of navItems) {
      const link = screen.getByText(item.label);
      expect(link.getAttribute('href')).toBe(item.href);
    }
  });

  it('has accessible navigation role', () => {
    render(<RoleNavigation items={navItems} currentPath="/fleet" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeDefined();
  });
});
