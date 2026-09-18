import React from 'react';
import { render } from '@testing-library/react-native';

import { iconSize, resolveIconSize, resolveIconStroke } from '../theme/tokens';
import * as coreIcons from '../ui/icons/CoreIcons';
import * as svgIcons from './svg-icons';
import {
  IconAlertTriangle,
  IconBike,
  IconChevron,
  IconCrosshair,
  IconPin,
  IconReceipt,
  IconShield,
  IconTruck,
  IconVan,
} from './svg-icons';

describe('SVG Icons System', () => {
  describe('one geometry per icon name', () => {
    it('never exports the same icon name from both icon modules', () => {
      const coreNames = Object.keys(coreIcons).filter((name) => name.startsWith('Icon'));
      const svgNames = Object.keys(svgIcons).filter((name) => name.startsWith('Icon'));
      const collisions = coreNames.filter((name) => svgNames.includes(name));

      // Two modules used to own IconClock/IconClose/IconOffice/IconSearch/
      // IconWarehouse with different paths, strokes and default colours, so the
      // same import name rendered differently depending on the import path.
      expect(collisions).toEqual([]);
    });

    it('owns only glyphs that the canonical set does not provide', () => {
      expect(Object.keys(svgIcons).filter((name) => name.startsWith('Icon')).sort()).toEqual([
        'IconAlertTriangle',
        'IconBike',
        'IconChevron',
        'IconCrosshair',
        'IconPin',
        'IconReceipt',
        'IconShield',
        'IconTruck',
        'IconVan',
      ]);
    });
  });

  describe('resolveIconSize', () => {
    it('maps token sizes to the shared icon scale', () => {
      expect(resolveIconSize('xs')).toBe(iconSize.xs);
      expect(resolveIconSize('sm')).toBe(16);
      expect(resolveIconSize('md')).toBe(20);
      expect(resolveIconSize('lg')).toBe(24);
      expect(resolveIconSize('xl')).toBe(28);
      expect(resolveIconSize('xxl')).toBe(32);
      expect(resolveIconSize('display')).toBe(56);
    });

    it('preserves numeric sizes', () => {
      expect(resolveIconSize(32)).toBe(32);
      expect(resolveIconSize(48)).toBe(48);
    });

    it('defaults to 24px (lg) when undefined', () => {
      expect(resolveIconSize(undefined)).toBe(24);
    });
  });

  describe('resolveIconStroke', () => {
    it('maps token strokes and preserves numeric values', () => {
      expect(resolveIconStroke('regular')).toBe(1.5);
      expect(resolveIconStroke('medium')).toBe(1.75);
      expect(resolveIconStroke('bold')).toBe(2);
      expect(resolveIconStroke(3)).toBe(3);
      expect(resolveIconStroke(undefined)).toBe(1.75);
    });
  });

  describe('Standardized Vector Icons', () => {
    const icons = [
      { name: 'IconBike', Component: IconBike, defaultTestID: 'icon-bike' },
      { name: 'IconPin', Component: IconPin, defaultTestID: 'icon-pin' },
      { name: 'IconCrosshair', Component: IconCrosshair, defaultTestID: 'icon-crosshair' },
      { name: 'IconReceipt', Component: IconReceipt, defaultTestID: 'icon-receipt' },
      { name: 'IconAlertTriangle', Component: IconAlertTriangle, defaultTestID: 'icon-alert-triangle' },
    ];

    // These names now resolve to the canonical CoreIcons implementation, so they
    // carry its testIDs. The drawings are asserted in CoreIcons.test.tsx.
    const aliases = [
      { name: 'IconTruck -> IconVehicleLightTruck', Component: IconTruck, defaultTestID: 'icon-vehicle-light-truck' },
      { name: 'IconVan -> IconVehicleVan', Component: IconVan, defaultTestID: 'icon-vehicle-van' },
      { name: 'IconShield -> IconSecurityShield', Component: IconShield, defaultTestID: 'icon-security-shield' },
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
          <Component size={30} color="#F59E0B" strokeWidth={2.0} testID={`custom-styled-${defaultTestID}`} />,
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
          const screen = await render(<IconChevron direction={dir} testID={`chevron-${dir}`} />);
          expect(screen.getByTestId(`chevron-${dir}`)).toBeTruthy();
        }
      });
    });

    describe('duplicate metaphors', () => {
      it('resolves every legacy vehicle/shield name to the canonical component', () => {
        expect(IconTruck).toBe(coreIcons.IconVehicleLightTruck);
        expect(IconVan).toBe(coreIcons.IconVehicleVan);
        expect(IconShield).toBe(coreIcons.IconSecurityShield);
      });
    });
  });
});
