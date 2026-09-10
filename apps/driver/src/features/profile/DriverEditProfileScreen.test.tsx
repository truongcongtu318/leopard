import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverEditProfileScreen } from './DriverEditProfileScreen';

describe('DriverEditProfileScreen', () => {
  it('renders avatar studio, guidelines, editable fields, and protected identity', async () => {
    const screen = await render(
      <DriverEditProfileScreen
        avatarUrl={null}
        driverCode="DRV-88924"
        fleetLabel="Fleet Tân Bình (Pilot)"
        initialEmail="tuan.nguyen@leopard.vn"
        initialName="Nguyễn Văn Tuấn"
        isSaving={false}
        onPickAvatar={jest.fn()}
        onSave={jest.fn()}
        phone="0987 654 321"
        vehicleLabel="51C-889.24 · Xe tải 2.5T"
      />,
    );

    // Screen title
    expect(screen.getByRole('header', { name: 'Chỉnh sửa hồ sơ' })).toBeTruthy();

    // Avatar studio & guideline
    expect(screen.getByText('Chụp ảnh mới')).toBeTruthy();
    expect(screen.getByText('Chọn từ thư viện')).toBeTruthy();
    expect(screen.getByText('Tiêu chuẩn ảnh nhận diện đối tác')).toBeTruthy();

    // Section headings
    expect(screen.getByText('THÔNG TIN LIÊN HỆ & HIỂN THỊ')).toBeTruthy();
    expect(screen.getByText('ĐỊNH DANH BUỒNG LÁI & ĐỘI XE (FLEET)')).toBeTruthy();

    // Values in inputs
    expect(screen.getByDisplayValue('Nguyễn Văn Tuấn')).toBeTruthy();
    expect(screen.getByDisplayValue('tuan.nguyen@leopard.vn')).toBeTruthy();

    // Readonly values
    expect(screen.getByText('0987 654 321')).toBeTruthy();
    expect(screen.getByText('DRV-88924')).toBeTruthy();
    expect(screen.getByText('51C-889.24 · Xe tải 2.5T')).toBeTruthy();
    expect(screen.getByText('Fleet Tân Bình (Pilot)')).toBeTruthy();
    expect(screen.getByText('✓ Xác thực OTP')).toBeTruthy();
    expect(screen.getByText('✓ Đã duyệt')).toBeTruthy();

    await screen.unmount();
  });

  it('validates empty name and triggers onSave with valid data', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <DriverEditProfileScreen
        avatarUrl={null}
        initialEmail="driver@leopard.vn"
        initialName="Nguyễn Văn A"
        isSaving={false}
        onPickAvatar={jest.fn()}
        onSave={onSave}
      />,
    );

    const nameInput = screen.getByLabelText('Nhập họ và tên tài xế');
    const saveBtn = screen.getByRole('button', { name: 'Lưu thông tin hồ sơ' });

    // Clear name
    await fireEvent.changeText(nameInput, '');
    await fireEvent.press(saveBtn);

    expect(screen.getByText('Vui lòng nhập họ và tên tài xế')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    // Enter valid name
    await fireEvent.changeText(nameInput, 'Trần Minh Đức');
    await fireEvent.press(saveBtn);

    expect(onSave).toHaveBeenCalledWith({
      name: 'Trần Minh Đức',
      email: 'driver@leopard.vn',
    });

    await screen.unmount();
  });

  it('shows error banner when errorMessage prop is provided', async () => {
    const screen = await render(
      <DriverEditProfileScreen
        avatarUrl={null}
        errorMessage="Không thể kết nối đến máy chủ"
        initialEmail=""
        initialName="Nguyễn Văn A"
        isSaving={false}
        onPickAvatar={jest.fn()}
        onSave={jest.fn()}
      />,
    );

    expect(screen.getByText('Không thể kết nối đến máy chủ')).toBeTruthy();

    await screen.unmount();
  });
});
