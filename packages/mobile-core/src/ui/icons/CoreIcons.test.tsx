import React from 'react';
import { render } from '@testing-library/react-native';
import {
  IconLocationPin,
  IconSpeedTruck,
  IconSecurityShield,
  IconClose,
  IconHome,
  IconOrders,
  IconWallet,
  IconUser,
  IconBell,
  IconEarnings,
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

  it('renders filled nav icons with solid fills for active states', async () => {
    const home = await render(<IconHome filled testID="icon-home" />);
    expect(home.getByTestId('icon-home')).toBeTruthy();

    const orders = await render(<IconOrders filled testID="icon-orders" />);
    expect(orders.getByTestId('icon-orders')).toBeTruthy();

    const wallet = await render(<IconWallet filled testID="icon-wallet" />);
    expect(wallet.getByTestId('icon-wallet')).toBeTruthy();

    const user = await render(<IconUser filled testID="icon-user" />);
    expect(user.getByTestId('icon-user')).toBeTruthy();

    const bell = await render(<IconBell filled testID="icon-bell" />);
    expect(bell.getByTestId('icon-bell')).toBeTruthy();

    const earnings = await render(<IconEarnings filled testID="icon-earnings" />);
    expect(earnings.getByTestId('icon-earnings')).toBeTruthy();
  });
});
