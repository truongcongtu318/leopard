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
});
