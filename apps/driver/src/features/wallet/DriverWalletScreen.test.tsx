// apps/driver/src/features/wallet/DriverWalletScreen.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverWalletScreen, type DriverWalletScreenProps } from './DriverWalletScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const baseProps: DriverWalletScreenProps = {
  summary: {
    availableBalanceVnd: 1450000,
    lifetimeDeliveredVnd: 3450000,
    pendingWithdrawalVnd: 300000,
    deliveredOrderCount: 12,
  },
  history: [
    {
      id: 'wr-1',
      status: 'APPROVED',
      amountVnd: 500000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-10T08:30:00.000Z',
    },
    {
      id: 'wr-2',
      status: 'PENDING',
      amountVnd: 300000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-12T14:32:00.000Z',
    },
  ],
  isLoading: false,
  isError: false,
  isSubmittingWithdrawal: false,
  withdrawalError: null,
  onRequestWithdrawal: jest.fn(),
  onRetry: jest.fn(),
};

describe('DriverWalletScreen', () => {
  it('renders the real available balance, not a hardcoded number', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);

    expect(screen.getByText('Ví tài xế')).toBeTruthy();
    expect(screen.getByText(/1.450.000/)).toBeTruthy();
    // The old fake instant-transfer claim must be gone.
    expect(screen.queryByText(/tức thì 24\/7/)).toBeNull();
    expect(screen.queryByText(/trong 60s/)).toBeNull();

    await screen.unmount();
  });

  it('does not show a saved-bank-account selector (out of scope for this pilot)', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);
    expect(screen.queryByText('Vietcombank')).toBeNull();
    await screen.unmount();
  });

  it('submits a withdrawal request with the entered bank details', async () => {
    const onRequestWithdrawal = jest.fn();
    const screen = await render(
      <DriverWalletScreen {...baseProps} onRequestWithdrawal={onRequestWithdrawal} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Yêu cầu rút tiền' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập số tiền'), '200000');
    await fireEvent.changeText(screen.getByPlaceholderText('VD: MB Bank'), 'MB Bank');
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập số tài khoản'), '0987654321');
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập tên chủ tài khoản (không dấu)'), 'NGUYEN VAN A');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi yêu cầu rút tiền' }));

    expect(onRequestWithdrawal).toHaveBeenCalledWith({
      amountVnd: 200000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });

    await screen.unmount();
  });

  it('shows PENDING/APPROVED/REJECTED status labels for withdrawal history rows, not always "Thành công"', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);
    expect(screen.getByText('Đã duyệt')).toBeTruthy(); // APPROVED row's status label
    await screen.unmount();
  });

  it('renders balance card with testID="driver-wallet-balance-card" and button with testID="btn-request-withdrawal"', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);
    expect(screen.getByTestId('driver-wallet-balance-card')).toBeTruthy();
    expect(screen.getByTestId('btn-request-withdrawal')).toBeTruthy();
    await screen.unmount();
  });

  it('renders transaction history with status indicators (+cước, -phí sàn, -rút tiền)', async () => {
    const mixedProps: DriverWalletScreenProps = {
      ...baseProps,
      history: [
        {
          id: 'tx-1',
          status: 'APPROVED',
          amountVnd: 500000,
          bankName: 'MB Bank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'NGUYEN VAN A',
          createdAt: '2026-09-10T08:30:00.000Z',
          type: 'WITHDRAWAL',
        },
        {
          id: 'tx-2',
          status: 'APPROVED',
          amountVnd: 250000,
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          createdAt: '2026-09-11T10:00:00.000Z',
          type: 'ORDER_PAYOUT',
          title: 'Cước chuyến LP-D-260815-001',
        },
        {
          id: 'tx-3',
          status: 'APPROVED',
          amountVnd: 37500,
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          createdAt: '2026-09-11T10:01:00.000Z',
          type: 'PLATFORM_FEE',
          title: 'Phí nền tảng 15%',
        },
      ],
    };

    const screen = await render(<DriverWalletScreen {...mixedProps} />);
    expect(screen.getByText('-rút tiền')).toBeTruthy();
    expect(screen.getByText('+cước')).toBeTruthy();
    expect(screen.getByText('-phí sàn')).toBeTruthy();
    await screen.unmount();
  });

  it('renders linked bank accounts bento card', async () => {
    const linkedProps: DriverWalletScreenProps = {
      ...baseProps,
      summary: {
        ...baseProps.summary,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      },
    };

    const screen = await render(<DriverWalletScreen {...linkedProps} />);
    expect(screen.getByTestId('driver-linked-bank-card')).toBeTruthy();
    expect(screen.getByText('Tài khoản liên kết')).toBeTruthy();
    expect(screen.getByText('0987654321')).toBeTruthy();
    await screen.unmount();
  });
});
