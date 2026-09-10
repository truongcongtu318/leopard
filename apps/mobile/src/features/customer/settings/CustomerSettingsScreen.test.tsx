import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { CustomerSettingsScreen } from './CustomerSettingsScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('CustomerSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings sections and options', async () => {
    const screen = await render(<CustomerSettingsScreen />);

    expect(screen.getByText('Cài đặt')).toBeTruthy();
    expect(screen.getByText('THÔNG BÁO')).toBeTruthy();
    expect(screen.getByText('NGÔN NGỮ & KHU VỰC')).toBeTruthy();
    expect(screen.getByText('BẢO MẬT & PHÁP LÝ')).toBeTruthy();
    expect(screen.getByText('Bảo mật tài khoản & PIN')).toBeTruthy();

    await screen.unmount();
  });

  it('navigates to security screen when "Bảo mật tài khoản & PIN" is pressed', async () => {
    const screen = await render(<CustomerSettingsScreen />);

    const securityRow = screen.getByLabelText('Bảo mật tài khoản & PIN');
    await fireEvent.press(securityRow);

    expect(mockPush).toHaveBeenCalledWith('/customer/settings/security');
    await screen.unmount();
  });
});
