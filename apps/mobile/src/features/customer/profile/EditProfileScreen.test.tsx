import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { EditProfileScreen } from './EditProfileScreen';

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    initialName: 'Nguyen Van A',
    initialEmail: 'vana@example.com',
    avatarUrl: null,
    isSaving: false,
    onSave: jest.fn(),
    onPickAvatar: jest.fn(),
    onBack: jest.fn(),
  };

  it('renders profile fields and avatar initial correctly', async () => {
    const screen = await render(<EditProfileScreen {...defaultProps} />);

    expect(screen.getByText('Chỉnh sửa hồ sơ')).toBeTruthy();
    expect(screen.getByText('Thông tin cá nhân')).toBeTruthy();
    expect(screen.getByText('Họ và tên')).toBeTruthy();
    expect(screen.getByText('Địa chỉ Email')).toBeTruthy();
    expect(screen.getByDisplayValue('Nguyen Van A')).toBeTruthy();
    expect(screen.getByDisplayValue('vana@example.com')).toBeTruthy();
    expect(screen.getByText('N')).toBeTruthy(); // Avatar initial
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeTruthy();
    await screen.unmount();
  });

  it('validates empty name before saving', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <EditProfileScreen {...defaultProps} initialName="" onSave={onSave} />,
    );

    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    await fireEvent.press(saveBtn);

    expect(screen.getByText('Vui lòng nhập họ và tên')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('calls onSave with updated values when valid', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <EditProfileScreen {...defaultProps} onSave={onSave} />,
    );

    const nameInput = screen.getByDisplayValue('Nguyen Van A');
    await fireEvent.changeText(nameInput, 'Tran Thi B');

    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    await fireEvent.press(saveBtn);

    expect(onSave).toHaveBeenCalledWith({
      name: 'Tran Thi B',
      email: 'vana@example.com',
    });
    await screen.unmount();
  });
});
