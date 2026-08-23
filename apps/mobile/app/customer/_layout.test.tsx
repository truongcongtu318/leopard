import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

jest.mock('expo-router', () => ({
  Slot: () => null,
  usePathname: () => '/customer/orders',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../src/navigation/role-router', () => ({
  useProtectedLayout: () => ({ canRenderProtectedContent: true, kind: 'authorized' }),
}));

describe('Customer layout', () => {
  it('renders a tab for Orders and a tab for Profile', async () => {
    const { default: CustomerLayout } = require('./_layout');
    const view = await render(<CustomerLayout />);

    expect(view.getByRole('tab', { name: 'Đơn hàng' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Hồ sơ' })).toBeTruthy();
    await view.unmount();
  });
});
