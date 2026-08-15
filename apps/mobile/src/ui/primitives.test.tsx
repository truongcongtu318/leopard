import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, control, motion, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';
import { EtaIndicator } from './EtaIndicator';
import { FormField } from './FormField';
import { ScreenState } from './ScreenState';
import { StatusBadge, type StatusBadgeProps } from './StatusBadge';

function statusBadgeTypeContract() {
  const userActive = { domain: 'user', status: 'ACTIVE' } satisfies StatusBadgeProps;
  const fleetMemberActive = {
    domain: 'fleet-member',
    status: 'ACTIVE',
  } satisfies StatusBadgeProps;
  const safeLegacy = { status: 'AVAILABLE' } satisfies StatusBadgeProps;

  // @ts-expect-error ACTIVE is ambiguous and requires an explicit domain.
  const ambiguousLegacyActive: StatusBadgeProps = { status: 'ACTIVE' };
  // @ts-expect-error IN_TRANSIT belongs to the order domain, not payment.
  const invalidDomainPair: StatusBadgeProps = { domain: 'payment', status: 'IN_TRANSIT' };

  return {
    ambiguousLegacyActive,
    fleetMemberActive,
    invalidDomainPair,
    safeLegacy,
    userActive,
  };
}

void statusBadgeTypeContract;

describe('theme tokens', () => {
  it('exposes the approved platform typography, motion and control tokens', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
    expect(radius.control).toBe(6);
    expect(radius.card).toBe(6);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.sectionTitle).toEqual({
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    });
    expect(typography.pageTitle).toEqual({
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    });
    expect(motion).toEqual({
      none: 0,
      fast: 120,
      standard: 180,
      slow: 240,
    });
    expect(control.minimumTouchHeight).toBe(44);
    expect(control.stickyPrimaryMinimumHeight).toBe(48);
    expect(Object.keys(colors)).toEqual([
      'neutral',
      'brand',
      'info',
      'warning',
      'active',
      'success',
      'danger',
    ]);
  });
});

describe('Button', () => {
  it('uses a 44px minimum touch target and handles an enabled press', async () => {
    const onPress = jest.fn();
    const screen = await render(<Button label="Tiếp tục" onPress={onPress} />);
    const button = screen.getByRole('button');

    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('shows a loading label and blocks duplicate presses', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button isLoading label="Lưu" loadingLabel="Đang lưu" onPress={onPress} />,
    );

    expect(screen.getByText('Đang lưu')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();

    await screen.unmount();
  });

  it('shows a disabled label and blocks presses', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button disabled disabledLabel="Chưa thể tiếp tục" label="Tiếp tục" onPress={onPress} />,
    );

    expect(screen.getByText('Chưa thể tiếp tục')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();

    await screen.unmount();
  });

  it('provides the 48px Driver primary target without disabling Dynamic Type', async () => {
    const screen = await render(
      <Button label="Nhận đơn" onPress={() => {}} size="driver-primary" />,
    );
    const button = screen.getByRole('button');
    const label = screen.getByText('Nhận đơn');

    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(48);
    expect(label.props.allowFontScaling).not.toBe(false);

    await screen.unmount();
  });
});

describe('FormField', () => {
  it('links label and hint to the input and reserves a stable inline error area', async () => {
    const screen = await render(
      <FormField
        error="Số điện thoại không hợp lệ"
        hint="Nhập số điện thoại đang sử dụng"
        label="Số điện thoại"
        onChangeText={() => {}}
        value=""
      />,
    );
    const label = screen.getByText('Số điện thoại');
    const hint = screen.getByText('Nhập số điện thoại đang sử dụng');
    const input = screen.getByLabelText('Số điện thoại');
    const errorArea = screen.getByTestId('field-error-area');

    expect(input.props.accessibilityLabelledBy).toBe(label.props.nativeID);
    expect(input.props.accessibilityHint).toContain(hint.props.children);
    expect(input.props.accessibilityHint).toContain('Số điện thoại không hợp lệ');
    expect(screen.getByRole('alert').props.children).toBe('Số điện thoại không hợp lệ');
    expect(StyleSheet.flatten(errorArea.props.style).minHeight).toBeGreaterThan(0);

    await screen.unmount();
  });
});

describe('StatusBadge', () => {
  it('keeps the canonical enum in the accessibility label but not visible copy', async () => {
    const screen = await render(<StatusBadge domain="order" status="DELIVERED" />);
    const badge = screen.getByLabelText('Trạng thái đơn: Đã giao. Mã trạng thái: DELIVERED');

    expect(screen.getByText('Đã giao')).toBeTruthy();
    expect(screen.queryByText('DELIVERED')).toBeNull();
    expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(colors.success.background);

    await screen.unmount();
  });

  it('disambiguates ACTIVE between User and FleetMember domains', async () => {
    const screen = await render(
      <>
        <StatusBadge domain="user" status="ACTIVE" />
        <StatusBadge domain="fleet-member" status="ACTIVE" />
      </>,
    );

    expect(screen.getByText('Đang hoạt động')).toBeTruthy();
    expect(
      screen.getByLabelText('Trạng thái tài khoản: Đang hoạt động. Mã trạng thái: ACTIVE'),
    ).toBeTruthy();
    expect(screen.getByText('Đang tham gia')).toBeTruthy();
    expect(
      screen.getByLabelText('Trạng thái thành viên đội xe: Đang tham gia. Mã trạng thái: ACTIVE'),
    ).toBeTruthy();
    expect(screen.queryByText('ACTIVE')).toBeNull();

    await screen.unmount();
  });

  it('keeps legacy status-only compatibility for unambiguous values', async () => {
    const screen = await render(<StatusBadge status="AVAILABLE" />);

    expect(screen.getByText('Sẵn sàng')).toBeTruthy();
    expect(
      screen.getByLabelText('Trạng thái nhận đơn: Sẵn sàng. Mã trạng thái: AVAILABLE'),
    ).toBeTruthy();
    expect(screen.queryByText('AVAILABLE')).toBeNull();

    await screen.unmount();
  });

  it('fails unknown domain values closed to a neutral Vietnamese badge', async () => {
    const unknownProps = {
      domain: 'order',
      status: 'ARCHIVED',
    } as unknown as StatusBadgeProps;
    const screen = await render(<StatusBadge {...unknownProps} />);
    const badge = screen.getByLabelText('Trạng thái không xác định');

    expect(screen.getByText('Không xác định')).toBeTruthy();
    expect(screen.queryByText('ARCHIVED')).toBeNull();
    expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(colors.neutral.background);

    await screen.unmount();
  });

  it('fails invalid domain pairs and ambiguous legacy ACTIVE closed at runtime', async () => {
    const invalidDomainPair = {
      domain: 'payment',
      status: 'IN_TRANSIT',
    } as unknown as StatusBadgeProps;
    const ambiguousLegacyActive = { status: 'ACTIVE' } as unknown as StatusBadgeProps;
    const screen = await render(
      <>
        <StatusBadge {...invalidDomainPair} />
        <StatusBadge {...ambiguousLegacyActive} />
      </>,
    );
    const badges = screen.getAllByLabelText('Trạng thái không xác định');

    expect(badges).toHaveLength(2);
    expect(screen.getAllByText('Không xác định')).toHaveLength(2);
    expect(screen.queryByText('IN_TRANSIT')).toBeNull();
    expect(screen.queryByText('ACTIVE')).toBeNull();
    for (const badge of badges) {
      expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(colors.neutral.background);
    }

    await screen.unmount();
  });

  it('fails an unsupported runtime domain closed instead of throwing', async () => {
    const unsupportedDomain = {
      domain: 'shipment',
      status: 'IN_TRANSIT',
    } as unknown as StatusBadgeProps;
    const screen = await render(<StatusBadge {...unsupportedDomain} />);

    expect(screen.getByLabelText('Trạng thái không xác định')).toBeTruthy();
    expect(screen.getByText('Không xác định')).toBeTruthy();
    expect(screen.queryByText('IN_TRANSIT')).toBeNull();

    await screen.unmount();
  });
});

describe('ScreenState', () => {
  const stateCases = [
    ['loading', 'Đang tải dữ liệu'],
    ['empty', 'Chưa có dữ liệu'],
    ['no-results', 'Không có kết quả phù hợp'],
    ['error', 'Không thể tải dữ liệu'],
    ['success', 'Đã cập nhật dữ liệu'],
    ['permission-denied', 'Bạn không có quyền truy cập'],
    ['offline', 'Đang ngoại tuyến'],
    ['stale', 'Dữ liệu cần được làm mới'],
    ['reconnecting', 'Đang kết nối lại'],
    ['session-expired', 'Phiên đăng nhập đã hết hạn'],
    ['conflict', 'Dữ liệu vừa thay đổi'],
  ] as const;

  for (const [state, copy] of stateCases) {
    it(`renders understandable ${state} copy`, async () => {
      const screen = await render(<ScreenState state={state} />);

      expect(screen.getByText(copy)).toBeTruthy();
      await screen.unmount();
    });
  }

  it('renders a safe action boundary for retryable states', async () => {
    const onAction = jest.fn();
    const screen = await render(
      <ScreenState actionLabel="Thử lại" onAction={onAction} state="error" />,
    );

    await fireEvent.press(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it.each(['permission-denied', 'session-expired'] as const)(
    'never mounts private children for %s',
    async (state) => {
      const PrivateChild = jest.fn(() => <Text>Mã đơn riêng tư</Text>);
      const screen = await render(
        <ScreenState state={state}>
          <PrivateChild />
        </ScreenState>,
      );

      expect(PrivateChild).not.toHaveBeenCalled();
      expect(screen.queryByText('Mã đơn riêng tư')).toBeNull();
      await screen.unmount();
    },
  );

  it.each(['offline', 'stale', 'reconnecting'] as const)(
    'keeps existing context mounted for %s',
    async (state) => {
      const screen = await render(
        <ScreenState state={state}>
          <Text>Lộ trình gần nhất</Text>
        </ScreenState>,
      );

      expect(screen.getByText('Lộ trình gần nhất')).toBeTruthy();
      await screen.unmount();
    },
  );

  it.each(['loading', 'reconnecting'] as const)(
    'announces %s as a polite busy update',
    async (state) => {
      const screen = await render(<ScreenState state={state} />);
      const panel = screen.getByTestId('screen-state-panel');

      expect(panel.props.accessibilityLiveRegion).toBe('polite');
      expect(panel.props.accessibilityState).toEqual({ busy: true });
      await screen.unmount();
    },
  );

  it('announces conflict assertively without mounting an implicit action', async () => {
    const screen = await render(<ScreenState actionLabel="Tải lại" state="conflict" />);
    const panel = screen.getByTestId('screen-state-panel');

    expect(panel.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.queryByRole('button')).toBeNull();
    await screen.unmount();
  });
});

describe('EtaIndicator', () => {
  it('shows loading without displaying a zero-minute ETA and keeps the DEMO label visible', async () => {
    const screen = await render(<EtaIndicator durationSeconds={0} isLoading source="DEMO" />);

    expect(screen.getByText('ETA dự kiến')).toBeTruthy();
    expect(screen.getByText('Đang tính ETA dự kiến.')).toBeTruthy();
    expect(screen.queryByText('0 phút')).toBeNull();
    expect(screen.getByText('Dữ liệu mô phỏng')).toBeTruthy();

    await screen.unmount();
  });

  it('shows an understandable error with retry when provided', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <EtaIndicator
        durationSeconds={null}
        error="Chưa thể tính ETA dự kiến."
        onRetry={onRetry}
        source="VIETMAP"
      />,
    );

    expect(screen.getByRole('alert').props.children).toBe('Chưa thể tính ETA dự kiến.');
    await fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders a rounded-up ETA value with the required label', async () => {
    const screen = await render(<EtaIndicator durationSeconds={901} source="VIETMAP" />);

    expect(screen.getByText('ETA dự kiến')).toBeTruthy();
    expect(screen.getByText('16 phút')).toBeTruthy();

    await screen.unmount();
  });
});
