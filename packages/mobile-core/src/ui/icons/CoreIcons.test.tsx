import React from 'react';
import { render } from '@testing-library/react-native';
import {
  IconLocationPin,
  IconSpeedTruck,
  IconSecurityShield,
  IconClose,
} from './CoreIcons';

describe('CoreIcons Native Vector Rendering', () => {
  it('renders IconLocationPin with vector primitives', async () => {
    const screen = await render(<IconLocationPin testID="pin-test" />);
    expect(screen.getByTestId('pin-test')).toBeTruthy();
  });

  it('renders IconSpeedTruck with vector primitives', async () => {
    const screen = await render(<IconSpeedTruck testID="truck-test" />);
    expect(screen.getByTestId('truck-test')).toBeTruthy();
  });

  it('renders IconSecurityShield with vector primitives', async () => {
    const screen = await render(<IconSecurityShield testID="shield-test" />);
    expect(screen.getByTestId('shield-test')).toBeTruthy();
  });

  it('renders IconClose with vector primitives', async () => {
    const screen = await render(<IconClose testID="close-test" />);
    expect(screen.getByTestId('close-test')).toBeTruthy();
  });
});
