import React from 'react';
import type { IconProps } from './IconProps';

/**
 * 🛺 Icon Xe Ba Gác — Chở hàng cồng kềnh, chuyển trọ, linh hoạt trong hẻm phố
 */
export function IconVehicleBaGac({
  size = 24,
  color = '#F59E0B',
  secondaryColor = '#FEF3C7',
  className,
  title = 'Xe ba gác',
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
      {/* Thùng hàng ba gác phía sau */}
      <rect x="2" y="9" width="11" height="6.5" rx="1" fill={secondaryColor} stroke={color} strokeWidth="1.5" />
      <line x1="5.5" y1="9" x2="5.5" y2="15.5" stroke={color} strokeWidth="1" />
      <line x1="9" y1="9" x2="9" y2="15.5" stroke={color} strokeWidth="1" />
      {/* Khung nối & Động cơ */}
      <path d="M13 13.5H16.5L18.5 9H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Tay lái & Kính chắn gió nhỏ */}
      <path d="M18.5 9L19.5 6M18 6.5H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Bánh sau */}
      <circle cx="6.5" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="6.5" cy="17.5" r="1" fill={color} />
      {/* Bánh trước */}
      <circle cx="19" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="19" cy="17.5" r="1" fill={color} />
    </svg>
  );
}

/**
 * 🚐 Icon Xe Tải Nhỏ (500kg - 1 Tấn) — Van giao hàng nhanh nội đô
 */
export function IconVehicleTruckLight({
  size = 24,
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  className,
  title = 'Xe tải nhỏ 500kg - 1 tấn',
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
      {/* Thùng xe van */}
      <path
        d="M3 8C3 6.89543 3.89543 6 5 6H14V16H3V8Z"
        fill={secondaryColor}
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Cabin trước */}
      <path
        d="M14 9H17.5C18.1 9 18.6 9.4 18.8 9.9L20.8 13.3C20.9 13.5 21 13.8 21 14.1V16H14V9Z"
        fill={color}
      />
      {/* Kính cabin */}
      <path d="M15.5 10.5H17.2L19.2 13.5H15.5V10.5Z" fill="#FFFFFF" />
      {/* Bánh xe */}
      <circle cx="7.5" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="7.5" cy="17.5" r="1" fill={color} />
      <circle cx="17.5" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="17.5" cy="17.5" r="1" fill={color} />
    </svg>
  );
}

/**
 * 🚛 Icon Xe Tải Vừa (1.5 - 2.5 Tấn) — Xe thùng tiêu chuẩn vận tải hàng hoá
 */
export function IconVehicleTruckMedium({
  size = 24,
  color = '#2563EB',
  secondaryColor = '#DBEAFE',
  className,
  title = 'Xe tải vừa 1.5 - 2.5 tấn',
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
      {/* Thùng xe tải cao */}
      <rect x="2" y="5" width="13" height="11" rx="1" fill={secondaryColor} stroke={color} strokeWidth="1.5" />
      <line x1="2" y1="10.5" x2="15" y2="10.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
      {/* Cabin vuông vắn */}
      <path
        d="M15 7H19C19.5523 7 20 7.44772 20 8V12L22 13.5V16H15V7Z"
        fill={color}
      />
      <rect x="16.5" y="8.5" width="3" height="3.5" rx="0.5" fill="#FFFFFF" />
      {/* Cản sau & Bánh xe */}
      <circle cx="6" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="6" cy="17.5" r="1" fill={color} />
      <circle cx="11" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="11" cy="17.5" r="1" fill={color} />
      <circle cx="18.5" cy="17.5" r="2.5" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <circle cx="18.5" cy="17.5" r="1" fill={color} />
    </svg>
  );
}

/**
 * 🚚 Icon Xe Tải Nặng (5 Tấn+ / Đầu Kéo Container) — Hàng trọng tải lớn công trình & liên tỉnh
 */
export function IconVehicleTruckHeavy({
  size = 24,
  color = '#7C3AED',
  secondaryColor = '#EDE9FE',
  className,
  title = 'Xe tải trọng tải lớn',
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
      {/* Thùng Container có vân sóng */}
      <rect x="1.5" y="4.5" width="13.5" height="11.5" rx="0.75" fill={secondaryColor} stroke={color} strokeWidth="1.5" />
      <line x1="4.5" y1="4.5" x2="4.5" y2="16" stroke={color} strokeWidth="1" />
      <line x1="7.5" y1="4.5" x2="7.5" y2="16" stroke={color} strokeWidth="1" />
      <line x1="10.5" y1="4.5" x2="10.5" y2="16" stroke={color} strokeWidth="1" />
      {/* Đầu kéo công suất lớn */}
      <path
        d="M15 6H19.5C20.3284 6 21 6.67157 21 7.5V11.5L22.5 13V16H15V6Z"
        fill={color}
      />
      <rect x="16.5" y="7.5" width="4" height="4" rx="0.5" fill="#FFFFFF" />
      {/* Ống khói / Cửa gió */}
      <line x1="15.5" y1="3" x2="15.5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Cụm 4 bánh xe chịu tải */}
      <circle cx="5" cy="17.5" r="2.25" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
      <circle cx="9" cy="17.5" r="2.25" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
      <circle cx="17" cy="17.5" r="2.25" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
      <circle cx="20.5" cy="17.5" r="2.25" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
