import React from 'react';
import { render } from '@testing-library/react-native';
import {
  IconTruck,
  IconVan,
  IconBike,
  IconWarehouse,
  IconOffice,
  IconPin,
  IconReceipt,
  IconShield,
  IconClose,
  IconChevron,
  IconSearch,
  IconClock,
  IconAlertTriangle,
  resolveIconSize,
} from './svg-icons';

describe('SVG Icons System', () => {
  describe('resolveIconSize', () => {
    it('maps token sizes correctly according to design tokens', () => {
      expect(resolveIconSize('sm')).toBe(16);
      expect(resolveIconSize('md')).toBe(20);
      expect(resolveIconSize('lg')).toBe(24);
      expect(resolveIconSize('xl')).toBe(36);
    });

    it('preserves numeric sizes', () => {
      expect(resolveIconSize(32)).toBe(32);
      expect(resolveIconSize(48)).toBe(48);
    });

    it('defaults to 24px (lg) when undefined', () => {
      expect(resolveIconSize(undefined)).toBe(24);
    });
  });

  describe('Standardized Vector Icons', () => {
    const icons = [
      { name: 'IconTruck', Component: IconTruck, defaultTestID: 'icon-truck' },
      { name: 'IconVan', Component: IconVan, defaultTestID: 'icon-van' },
      { name: 'IconBike', Component: IconBike, defaultTestID: 'icon-bike' },
      { name: 'IconWarehouse', Component: IconWarehouse, defaultTestID: 'icon-warehouse' },
      { name: 'IconOffice', Component: IconOffice, defaultTestID: 'icon-office' },
      { name: 'IconPin', Component: IconPin, defaultTestID: 'icon-pin' },
      { name: 'IconReceipt', Component: IconReceipt, defaultTestID: 'icon-receipt' },
      { name: 'IconShield', Component: IconShield, defaultTestID: 'icon-shield' },
      { name: 'IconClose', Component: IconClose, defaultTestID: 'icon-close' },
      { name: 'IconSearch', Component: IconSearch, defaultTestID: 'icon-search' },
      { name: 'IconClock', Component: IconClock, defaultTestID: 'icon-clock' },
      { name: 'IconAlertTriangle', Component: IconAlertTriangle, defaultTestID: 'icon-alert-triangle' },
    ];

    icons.forEach(({ name, Component, defaultTestID }) => {
      it(`renders ${name} with default props`, async () => {
        const screen = await render(<Component />);
        const element = screen.getByTestId(defaultTestID);
        expect(element).toBeTruthy();
        expect(element.props.width).toBe(24);
        expect(element.props.height).toBe(24);
      });

      it(`renders ${name} with token size "sm"`, async () => {
        const screen = await render(<Component size="sm" testID={`custom-${defaultTestID}`} />);
        const element = screen.getByTestId(`custom-${defaultTestID}`);
        expect(element.props.width).toBe(16);
        expect(element.props.height).toBe(16);
      });

      it(`renders ${name} with custom numeric size and color`, async () => {
        const screen = await render(
          <Component size={30} color="#F59E0B" strokeWidth={2.0} testID={`custom-styled-${defaultTestID}`} />
        );
        const element = screen.getByTestId(`custom-styled-${defaultTestID}`);
        expect(element.props.width).toBe(30);
        expect(element.props.height).toBe(30);
      });
    });

    describe('IconChevron', () => {
      it('renders with default direction "down"', async () => {
        const screen = await render(<IconChevron />);
        const element = screen.getByTestId('icon-chevron');
        expect(element).toBeTruthy();
      });

      it('supports directions "up", "down", "left", "right"', async () => {
        const directions = ['up', 'down', 'left', 'right'] as const;
        for (const dir of directions) {
          const screen = await render(
            <IconChevron direction={dir} testID={`chevron-${dir}`} />
          );
          expect(screen.getByTestId(`chevron-${dir}`)).toBeTruthy();
        }
      });
    });
  });
});
