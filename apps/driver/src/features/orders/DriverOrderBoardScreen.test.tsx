import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverOrderBoardScreen } from './DriverOrderBoardScreen';
import { createDriverListFixture } from './fixtures';

describe('DriverOrderBoardScreen', () => {
  it('renders the load board header, radar status and flat order cards', async () => {
    const screen = await render(
      <DriverOrderBoardScreen view={createDriverListFixture('D-LIST-REQUESTED')} />,
    );

    expect(screen.getByTestId('driver-load-board-header')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Đơn có thể nhận' })).toBeTruthy();
    expect(screen.getByText('2 đơn phù hợp trong bán kính 5 km')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

    expect(screen.getByText('LP-D-260815-101')).toBeTruthy();
    expect(screen.getByText('285.000 ₫')).toBeTruthy();
    expect(screen.getAllByTestId('nearby-order-cargo-name').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('nearby-order-cargo-weight').length).toBeGreaterThan(0);

    await screen.unmount();
  });

  it('keeps the load-board counter in sync when a compatible order is dismissed', async () => {
    const screen = await render(
      <DriverOrderBoardScreen view={createDriverListFixture('D-LIST-REQUESTED')} />,
    );

    expect(screen.getByText('2 đơn phù hợp trong bán kính 5 km')).toBeTruthy();

    const declineButtons = screen.getAllByRole('button', { name: 'Bỏ qua đơn này' });
    expect(declineButtons.length).toBe(2);
    await fireEvent.press(declineButtons[0]);

    expect(screen.getByText('1 đơn phù hợp trong bán kính 5 km')).toBeTruthy();

    await screen.unmount();
  });

  it('navigates to order details when pressing public order card body or accept action', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrderBoardScreen
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    const cardButton = screen.getByRole('button', {
      name: /Xem chi tiết đơn LP-D-260815-101/,
    });
    await fireEvent.press(cardButton);
    expect(onOpenOrder).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222101');

    const acceptButton = screen.getByRole('button', {
      name: 'Nhận đơn LP-D-260815-101',
    });
    await fireEvent.press(acceptButton);
    expect(onOpenOrder).toHaveBeenCalledTimes(2);
    expect(onOpenOrder).toHaveBeenLastCalledWith('22222222-2222-4222-8222-222222222101');

    await screen.unmount();
  });

  it('reports the paused radar line while a trip is active, with no debug trigger of its own', async () => {
    const screen = await render(
      <DriverOrderBoardScreen view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')} />,
    );

    expect(screen.getByText('Tạm dừng nhận đơn mới trong lúc chạy chuyến')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

    await screen.unmount();
  });

  it('shows the empty-board explanation when offline with no orders', async () => {
    const screen = await render(
      <DriverOrderBoardScreen view={createDriverListFixture('D-LIST-EMPTY')} />,
    );

    expect(screen.getByTestId('driver-offline-board')).toBeTruthy();
    await screen.unmount();
  });
});
