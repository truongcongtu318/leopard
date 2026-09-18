import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { ProofSourceSelectModal } from './ProofSourceSelectModal';

describe('ProofSourceSelectModal', () => {
  it('renders pickup leg title and subtitle correctly', async () => {
    const onSelectCamera = jest.fn();
    const onSelectLibrary = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <ProofSourceSelectModal
        visible={true}
        leg="pickup"
        onSelectCamera={onSelectCamera}
        onSelectLibrary={onSelectLibrary}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Ảnh kiểm hàng tại điểm lấy')).toBeTruthy();
    expect(
      screen.getByText('Chụp hoặc tải ảnh kiện hàng trước khi rời điểm lấy'),
    ).toBeTruthy();
    expect(screen.getByTestId('btn-source-camera')).toBeTruthy();
    expect(screen.getByTestId('btn-source-library')).toBeTruthy();
  });

  it('renders delivery leg title and subtitle correctly', async () => {
    const onSelectCamera = jest.fn();
    const onSelectLibrary = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <ProofSourceSelectModal
        visible={true}
        leg="delivery"
        onSelectCamera={onSelectCamera}
        onSelectLibrary={onSelectLibrary}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Ảnh xác nhận đã giao hàng')).toBeTruthy();
    expect(
      screen.getByText('Chụp hoặc tải ảnh hàng hóa/chứng từ bàn giao thành công'),
    ).toBeTruthy();
  });

  it('calls onSelectCamera when camera option is pressed', async () => {
    const onSelectCamera = jest.fn();
    const onSelectLibrary = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <ProofSourceSelectModal
        visible={true}
        leg="pickup"
        onSelectCamera={onSelectCamera}
        onSelectLibrary={onSelectLibrary}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId('btn-source-camera'));
    expect(onSelectCamera).toHaveBeenCalledTimes(1);
    expect(onSelectLibrary).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onSelectLibrary when library option is pressed', async () => {
    const onSelectCamera = jest.fn();
    const onSelectLibrary = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <ProofSourceSelectModal
        visible={true}
        leg="pickup"
        onSelectCamera={onSelectCamera}
        onSelectLibrary={onSelectLibrary}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId('btn-source-library'));
    expect(onSelectLibrary).toHaveBeenCalledTimes(1);
    expect(onSelectCamera).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when close button or cancel button is pressed', async () => {
    const onSelectCamera = jest.fn();
    const onSelectLibrary = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <ProofSourceSelectModal
        visible={true}
        leg="delivery"
        onSelectCamera={onSelectCamera}
        onSelectLibrary={onSelectLibrary}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId('btn-close-source-modal'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
