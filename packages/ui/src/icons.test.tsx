import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import {
  IconDungNoi,
  IconDungHen,
  IconAnToan,
  IconHoTro247,
  LeopardLogoMark,
  LeopardLogoFull,
  LeopardAppIcon,
  IconVehicleBaGac,
  IconVehicleTruckLight,
  IconVehicleTruckMedium,
  IconVehicleTruckHeavy,
  IconOrderRequested,
  IconOrderAccepted,
  IconOrderPickingUp,
  IconOrderInTransit,
  IconOrderDelivered,
  IconProofOfDelivery,
  IconQrPayment,
  IconRoleCustomer,
  IconRoleDriver,
  IconRoleFleet,
  IconRoleAdmin,
} from './icons';

describe('Vector Icons Suite', () => {
  it('renders all 4 Core Value icons with titles and proper SVGs', () => {
    const { container } = render(
      <div>
        <IconDungNoi title="Đúng nơi" />
        <IconDungHen title="Đúng hẹn" />
        <IconAnToan title="An toàn" />
        <IconHoTro247 title="Hỗ trợ 24/7" />
      </div>
    );
    expect(screen.getByTitle('Đúng nơi')).toBeInTheDocument();
    expect(screen.getByTitle('Đúng hẹn')).toBeInTheDocument();
    expect(screen.getByTitle('An toàn')).toBeInTheDocument();
    expect(screen.getByTitle('Hỗ trợ 24/7')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('renders Brand Logos and App Icon', () => {
    const { container } = render(
      <div>
        <LeopardLogoMark title="Logo Mark" />
        <LeopardLogoFull variant="horizontal" />
        <LeopardLogoFull variant="stacked" dark />
        <LeopardAppIcon title="App Icon" />
      </div>
    );
    expect(screen.getByTitle('Logo Mark')).toBeInTheDocument();
    expect(screen.getByTitle('App Icon')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
  });

  it('renders Vehicle Fleet Category icons', () => {
    render(
      <div>
        <IconVehicleBaGac title="Xe ba gác" />
        <IconVehicleTruckLight title="Xe tải nhỏ" />
        <IconVehicleTruckMedium title="Xe tải vừa" />
        <IconVehicleTruckHeavy title="Xe tải nặng" />
      </div>
    );
    expect(screen.getByTitle('Xe ba gác')).toBeInTheDocument();
    expect(screen.getByTitle('Xe tải nhỏ')).toBeInTheDocument();
    expect(screen.getByTitle('Xe tải vừa')).toBeInTheDocument();
    expect(screen.getByTitle('Xe tải nặng')).toBeInTheDocument();
  });

  it('renders Order Status & Action icons', () => {
    render(
      <div>
        <IconOrderRequested title="Chờ tài xế" />
        <IconOrderAccepted title="Đã nhận đơn" />
        <IconOrderPickingUp title="Đang lấy hàng" />
        <IconOrderInTransit title="Đang vận chuyển" />
        <IconOrderDelivered title="Đã giao" />
        <IconProofOfDelivery title="POD Camera" />
        <IconQrPayment title="VietQR" />
      </div>
    );
    expect(screen.getByTitle('Chờ tài xế')).toBeInTheDocument();
    expect(screen.getByTitle('Đã nhận đơn')).toBeInTheDocument();
    expect(screen.getByTitle('Đang lấy hàng')).toBeInTheDocument();
    expect(screen.getByTitle('Đang vận chuyển')).toBeInTheDocument();
    expect(screen.getByTitle('Đã giao')).toBeInTheDocument();
    expect(screen.getByTitle('POD Camera')).toBeInTheDocument();
    expect(screen.getByTitle('VietQR')).toBeInTheDocument();
  });

  it('renders Role Identity icons', () => {
    render(
      <div>
        <IconRoleCustomer title="Khách hàng" />
        <IconRoleDriver title="Tài xế" />
        <IconRoleFleet title="Chủ đội xe" />
        <IconRoleAdmin title="Quản trị viên" />
      </div>
    );
    expect(screen.getByTitle('Khách hàng')).toBeInTheDocument();
    expect(screen.getByTitle('Tài xế')).toBeInTheDocument();
    expect(screen.getByTitle('Chủ đội xe')).toBeInTheDocument();
    expect(screen.getByTitle('Quản trị viên')).toBeInTheDocument();
  });
});
