import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from './Button';
import { EtaIndicator } from './EtaIndicator';
import { FormField } from './FormField';
import { ScreenState } from './ScreenState';
import { StatusBadge } from './StatusBadge';

describe('theme tokens', () => {
  it('exposes the approved spacing, radius, typography and semantic color roles', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
    expect(radius.control).toBe(6);
    expect(radius.card).toBe(6);
    expect(typography.body.fontSize).toBe(16);
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
  it('always renders canonical status text with its semantic treatment', async () => {
    const screen = await render(<StatusBadge status="DELIVERED" />);
    const badge = screen.getByText('DELIVERED').parent;

    expect(screen.getByText('DELIVERED')).toBeTruthy();
    expect(StyleSheet.flatten(badge?.props.style).backgroundColor).toBe(colors.success.background);

    await screen.unmount();
  });
});

describe('ScreenState', () => {
  const stateCases = [
    ['loading', 'Đang tải dữ liệu'],
    ['empty', 'Chưa có dữ liệu'],
    ['error', 'Không thể tải dữ liệu'],
    ['success', 'Đã cập nhật dữ liệu'],
    ['permission-denied', 'Bạn không có quyền truy cập'],
    ['offline', 'Đang ngoại tuyến'],
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

  it('never renders private children for permission denial', async () => {
    const screen = await render(
      <ScreenState state="permission-denied">
        <>{'Mã đơn riêng tư'}</>
      </ScreenState>,
    );

    expect(screen.queryByText('Mã đơn riêng tư')).toBeNull();
    await screen.unmount();
  });
});

describe('EtaIndicator', () => {
  it('shows loading without displaying a zero-minute ETA and keeps the DEMO label visible', async () => {
    const screen = await render(
      <EtaIndicator durationSeconds={0} isLoading source="DEMO" />,
    );

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
    const screen = await render(
      <EtaIndicator durationSeconds={901} source="VIETMAP" />,
    );

    expect(screen.getByText('ETA dự kiến')).toBeTruthy();
    expect(screen.getByText('16 phút')).toBeTruthy();

    await screen.unmount();
  });
});
