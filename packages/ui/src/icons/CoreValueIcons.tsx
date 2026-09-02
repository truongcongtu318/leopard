import React from 'react';
import type { IconProps } from './IconProps';

/**
 * 📍 Icon "ĐÚNG NƠI" — Định vị chính xác điểm lấy/giao hàng qua GPS/Vietmap
 */
export function IconDungNoi({
  size = 24,
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  className,
  title = 'Đúng nơi',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      {/* Vòng nền / Sóng định vị */}
      <circle cx="12" cy="10" r="8.5" fill={secondaryColor} opacity="0.6" />
      {/* Thân ghim định vị */}
      <path
        d="M12 2C7.58172 2 4 5.58172 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58172 16.4183 2 12 2Z"
        fill={color}
      />
      {/* Tâm định vị GPS */}
      <circle cx="12" cy="10" r="3.5" fill="#FFFFFF" />
      <circle cx="12" cy="10" r="1.75" fill={color} />
      {/* Bóng đổ chân ghim */}
      <ellipse cx="12" cy="22" rx="4" ry="1.2" fill={color} opacity="0.3" />
    </svg>
  );
}

/**
 * 🚚 Icon "ĐÚNG HẸN" — Cam kết giao hàng chuẩn giờ, AI dự báo ETA chính xác
 */
export function IconDungHen({
  size = 24,
  color = '#0B2545',
  secondaryColor = '#0284C7',
  className,
  title = 'Đúng hẹn',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      {/* Vệt gió tốc độ */}
      <path
        d="M1.5 8.5H7M0.5 12H5M2 15.5H6.5"
        stroke={secondaryColor}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Thùng xe tải */}
      <path
        d="M6.5 6C6.5 5.44772 6.94772 5 7.5 5H15.5C16.0523 5 16.5 5.44772 16.5 6V15.5H6.5V6Z"
        fill={color}
      />
      {/* Cabin xe tải */}
      <path
        d="M16.5 8H19.2C19.6418 8 20.0463 8.28912 20.191 8.7077L21.791 13.3477C21.928 13.7452 22 14.1627 22 14.5823V15.5C22 16.0523 21.5523 16.5 21 16.5H16.5V8Z"
        fill={color}
      />
      {/* Kính chắn gió cabin */}
      <path
        d="M17.5 9.5H19.1L20.5 13.5H17.5V9.5Z"
        fill={secondaryColor}
      />
      {/* Bánh xe trước & sau */}
      <circle cx="10" cy="17.5" r="2.5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="10" cy="17.5" r="1" fill={secondaryColor} />
      <circle cx="18.5" cy="17.5" r="2.5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="18.5" cy="17.5" r="1" fill={secondaryColor} />
    </svg>
  );
}

/**
 * 🛡️ Icon "AN TOÀN" — Bảo vệ hàng hóa nguyên vẹn, tài xế xác thực uy tín
 */
export function IconAnToan({
  size = 24,
  color = '#16A34A',
  secondaryColor = '#DCFCE7',
  className,
  title = 'An toàn',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      {/* Nền khiên mềm */}
      <path
        d="M12 2L4 5V11.5C4 16.5 7.5 21.1 12 22.5C16.5 21.1 20 16.5 20 11.5V5L12 2Z"
        fill={secondaryColor}
      />
      {/* Viền khiên bảo hộ */}
      <path
        d="M12 2L4 5V11.5C4 16.5 7.5 21.1 12 22.5C16.5 21.1 20 16.5 20 11.5V5L12 2Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Dấu kiểm tích xanh xác thực */}
      <path
        d="M8.5 12L11 14.5L15.5 9.5"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 🎧 Icon "HỖ TRỢ 24/7" — Điều phối viên và tổng đài CSKH đồng hành 24/7
 */
export function IconHoTro247({
  size = 24,
  color = '#0B2545',
  secondaryColor = '#0284C7',
  className,
  title = 'Hỗ trợ 24/7',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      {/* Vòng cung tai nghe */}
      <path
        d="M3.5 13V11C3.5 6.30558 7.30558 2.5 12 2.5C16.6944 2.5 20.5 6.30558 20.5 11V13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Đệm tai nghe trái & phải */}
      <rect x="2" y="11" width="3.5" height="7" rx="1.75" fill={color} />
      <rect x="18.5" y="11" width="3.5" height="7" rx="1.75" fill={color} />
      {/* Cần mic thoại */}
      <path
        d="M19 16.5V18.5C19 19.8807 17.8807 21 16.5 21H14"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="13" cy="21" r="1.5" fill={secondaryColor} />
      {/* Khung bong bóng chat 24/7 */}
      <path
        d="M8 9.5H16C16.8284 9.5 17.5 10.1716 17.5 11V14C17.5 14.8284 16.8284 15.5 16 15.5H11.5L8.5 17.5V15.5H8C7.17157 15.5 6.5 14.8284 6.5 14V11C6.5 10.1716 7.17157 9.5 8 9.5Z"
        fill={secondaryColor}
        opacity="0.9"
      />
      {/* Ba chấm thoại */}
      <circle cx="9.5" cy="12.5" r="1" fill="#FFFFFF" />
      <circle cx="12" cy="12.5" r="1" fill="#FFFFFF" />
      <circle cx="14.5" cy="12.5" r="1" fill="#FFFFFF" />
    </svg>
  );
}
