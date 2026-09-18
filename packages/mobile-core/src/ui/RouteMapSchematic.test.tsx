import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { RouteMapSchematic } from './RouteMapSchematic';

describe('RouteMapSchematic', () => {
  it('renders origin, destination, and passes coordinates down to map', async () => {
    const screen = await render(
      <RouteMapSchematic
        destinationCoords={{ lat: 16.024, lng: 108.245 }}
        destinationLabel="400 Đường Lê Văn Hiến, Đà Nẵng"
        originCoords={{ lat: 16.035, lng: 108.243 }}
        originLabel="12 Đường Hoàng Công Chất, Đà Nẵng"
      />,
    );

    expect(screen.getByTestId('route-map-schematic')).toBeTruthy();
    expect(screen.getByText('12 Đường Hoàng Công Chất, Đà Nẵng')).toBeTruthy();
    expect(screen.getByText('400 Đường Lê Văn Hiến, Đà Nẵng')).toBeTruthy();
    await screen.unmount();
  });

  it('announces live tracking when only a driver coordinate is supplied', async () => {
    const screen = await render(
      <RouteMapSchematic
        destinationLabel="400 Đường Lê Văn Hiến, Đà Nẵng"
        originLabel="12 Đường Hoàng Công Chất, Đà Nẵng"
        truckLocation={{ lat: 16.03, lng: 108.24 }}
      />,
    );

    // The customer must be able to tell the truck pin is on the map even
    // without an ETA label.
    // The pill lives inside the map's decorative layer, hidden from the a11y tree.
    expect(
      screen.getByText('Theo dõi xe trực tiếp', { includeHiddenElements: true }),
    ).toBeTruthy();
    await screen.unmount();
  });

  it('falls back to a plain route label when there is no driver position', async () => {
    const screen = await render(
      <RouteMapSchematic
        destinationLabel="400 Đường Lê Văn Hiến, Đà Nẵng"
        originLabel="12 Đường Hoàng Công Chất, Đà Nẵng"
      />,
    );

    expect(
      screen.getByText('Lộ trình trực tiếp', { includeHiddenElements: true }),
    ).toBeTruthy();
    await screen.unmount();
  });
});
