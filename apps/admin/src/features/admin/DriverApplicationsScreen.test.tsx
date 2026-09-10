import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { DriverApplicationsScreen } from './DriverApplicationsScreen';
import { browserClient } from '../../lib/api/browser-client';

const application = {
  userId: '11111111-1111-4111-8111-111111111111',
  name: 'Nguyễn Văn A',
  phone: '+84900000002',
  status: 'PENDING_APPROVAL',
  vehicleType: 'VAN',
  licensePlate: '59D-123.45',
  licenseNumber: 'GPLX-1',
  submittedAt: '2026-09-01T00:00:00.000Z',
  rejectionReason: null,
};

describe('DriverApplicationsScreen (Admin)', () => {
  let getSpy: jest.SpiedFunction<typeof browserClient.get>;
  let postSpy: jest.SpiedFunction<typeof browserClient.post>;

  beforeEach(() => {
    jest.clearAllMocks();
    getSpy = jest.spyOn(browserClient, 'get') as jest.SpiedFunction<typeof browserClient.get>;
    postSpy = jest.spyOn(browserClient, 'post') as jest.SpiedFunction<typeof browserClient.post>;
  });

  it('loads and renders pending driver applications', async () => {
    getSpy.mockResolvedValueOnce([application]);

    render(<DriverApplicationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('+84900000002')).toBeTruthy();
      expect(screen.getByText('59D-123.45')).toBeTruthy();
    });
    expect(getSpy).toHaveBeenCalledWith(
      '/admin/drivers/applications?status=PENDING_APPROVAL',
    );
  });

  it('approves an application and refetches the list', async () => {
    getSpy.mockResolvedValueOnce([application]).mockResolvedValueOnce([]);
    postSpy.mockResolvedValueOnce({ success: true });

    render(<DriverApplicationsScreen />);

    await waitFor(() => expect(screen.getByText('+84900000002')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        `/admin/drivers/${application.userId}/approve`,
        expect.objectContaining({ clientRequestId: expect.any(String) }),
      );
      expect(screen.getByText('Không có hồ sơ nào đang chờ duyệt.')).toBeTruthy();
    });
  });

  it('requires a reason before rejecting', async () => {
    getSpy.mockResolvedValueOnce([application]);

    render(<DriverApplicationsScreen />);
    await waitFor(() => expect(screen.getByText('+84900000002')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('từ 5 ký tự');
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('loads and displays a driver KYC documents on demand', async () => {
    getSpy
      .mockResolvedValueOnce([application])
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          type: 'LICENSE',
          contentType: 'image/jpeg',
          url: 'https://cdn.example/leopard/gplx.jpg',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ]);

    render(<DriverApplicationsScreen />);
    await waitFor(() => expect(screen.getByText('+84900000002')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Xem giấy tờ' }));

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        `/admin/drivers/${application.userId}/documents`,
      );
      const img = screen.getByAltText('GPLX') as HTMLImageElement;
      expect(img.src).toBe('https://cdn.example/leopard/gplx.jpg');
    });
  });

  it('shows an empty state when there are no applications', async () => {
    getSpy.mockResolvedValueOnce([]);

    render(<DriverApplicationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Không có hồ sơ nào đang chờ duyệt.')).toBeTruthy();
    });
  });
});
