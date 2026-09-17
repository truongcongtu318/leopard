import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverKycScreen } from './DriverKycScreen';
import type { DriverDocumentItem } from './adapter';

const mockBack = jest.fn();

const fixtureDocs: readonly DriverDocumentItem[] = [
  {
    id: 'doc-01',
    type: 'ID_CARD',
    title: 'Căn cước công dân (CCCD)',
    url: 'https://storage.example.com/kyc/id_card.jpg',
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'doc-02',
    type: 'LICENSE',
    title: 'Giấy phép lái xe (GPLX)',
    url: 'https://storage.example.com/kyc/license.jpg',
    createdAt: '2026-08-01T08:05:00.000Z',
  },
  {
    id: 'doc-03',
    type: 'VEHICLE_REGISTRATION',
    title: 'Giấy đăng ký xe (Cà vẹt)',
    url: 'https://storage.example.com/kyc/reg.jpg',
    createdAt: '2026-08-01T08:10:00.000Z',
  },
  {
    id: 'doc-04',
    type: 'VEHICLE_PHOTO',
    title: 'Ảnh phương tiện',
    url: 'https://storage.example.com/kyc/vehicle.jpg',
    createdAt: '2026-08-01T08:15:00.000Z',
  },
];

describe('DriverKycScreen', () => {
  it('renders all documents and checklist when loaded', async () => {
    const screen = await render(
      <DriverKycScreen
        documents={fixtureDocs}
        isLoading={false}
        onBack={mockBack}
      />,
    );

    expect(screen.getByText('Hồ sơ & Giấy tờ KYC')).toBeTruthy();
    expect(screen.getByText('Hồ sơ đối tác đã nộp')).toBeTruthy();
    expect(screen.getByTestId('kyc-document-checklist')).toBeTruthy();
    expect(screen.getAllByText('Căn cước công dân (CCCD)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Giấy phép lái xe (GPLX)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Giấy đăng ký xe (Cà vẹt)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ảnh phương tiện')).toBeTruthy();

    await screen.unmount();
  });

  it('can open document photo preview modal when pressing a document row', async () => {
    const screen = await render(
      <DriverKycScreen
        documents={fixtureDocs}
        isLoading={false}
        onBack={mockBack}
      />,
    );

    const docRow = screen.getByLabelText('Xem giấy tờ Căn cước công dân (CCCD)');
    await fireEvent.press(docRow);

    expect(screen.getByText('Loại giấy tờ:')).toBeTruthy();
    expect(screen.getByText('✓ Đã phê duyệt chính thức')).toBeTruthy();

    await screen.unmount();
  });

  it('renders loading state cleanly', async () => {
    const screen = await render(
      <DriverKycScreen
        documents={[]}
        isLoading={true}
        onBack={mockBack}
      />,
    );

    expect(screen.queryByTestId('kyc-document-checklist')).toBeNull();
    await screen.unmount();
  });

  it('renders error state and handles retry action', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <DriverKycScreen
        documents={[]}
        isError={true}
        isLoading={false}
        onBack={mockBack}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Thử lại')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
