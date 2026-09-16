import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverEditProfileScreen } from './DriverEditProfileScreen';

describe('DriverEditProfileScreen', () => {
  it('does not render hardcoded driver identity when BE fields are null', async () => {
    const screen = await render(
      <DriverEditProfileScreen
        avatarUrl={null}
        initialEmail=""
        initialName=""
        isSaving={false}
        onPickAvatar={jest.fn()}
        onSave={jest.fn()}
        phone={null}
        vehicleLabel={null}
      />,
    );

    expect(screen.queryByText('DRV-88924')).toBeNull();
    expect(screen.queryByText(/Tân Bình/)).toBeNull();
    expect(screen.queryByText('51C-889.24 · Xe tải 2.5T')).toBeNull();
    expect(screen.queryByText('0987 *** 892')).toBeNull();
    expect(screen.queryByText('0909 113 115')).toBeNull();
    expect(screen.queryByText('0912 345 678 (Chủ xe Tân Bình)')).toBeNull();
    expect(screen.queryByText('4/4 Giấy tờ kiểm duyệt')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    await screen.unmount();
  });

  it('renders avatar studio, guidelines, editable fields, and protected identity', async () => {
    const screen = await render(
      <DriverEditProfileScreen
        avatarUrl={null}
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
    expect(screen.getByText('THÔNG TIN ĐỊNH DANH (CHỈ ĐỌC)')).toBeTruthy();

    // Values in inputs
    expect(screen.getByDisplayValue('Nguyễn Văn Tuấn')).toBeTruthy();
    expect(screen.getByDisplayValue('tuan.nguyen@leopard.vn')).toBeTruthy();

    // Readonly values (BE-provided)
    expect(screen.getByText('0987 654 321')).toBeTruthy();
    expect(screen.getByText('51C-889.24 · Xe tải 2.5T')).toBeTruthy();
    // Verification badges use a vector icon, not a text glyph.
    expect(screen.getByText('Xác thực OTP')).toBeTruthy();

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
