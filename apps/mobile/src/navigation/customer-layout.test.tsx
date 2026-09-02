import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Slot: () => null,
  usePathname: () => '/customer/orders',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('./role-router', () => ({
  useProtectedLayout: () => ({ canRenderProtectedContent: true, kind: 'authorized' }),
}));

describe('Customer layout', () => {
  it('renders tabs for Home, Orders, Route and Account', async () => {
    const { default: CustomerLayout } = require('../../app/customer/_layout');
    const view = await render(<CustomerLayout />);

    expect(view.getByRole('tab', { name: 'Trang chủ' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Đơn hàng' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Lộ trình' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Tài khoản' })).toBeTruthy();
    await view.unmount();
  });
});
