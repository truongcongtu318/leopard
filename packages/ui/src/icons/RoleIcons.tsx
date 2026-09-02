import React from 'react';
import type { IconProps } from './IconProps';

/**
 * 👤 Icon Vai trò: Khách hàng / Chủ hàng (CUSTOMER)
 */
export function IconRoleCustomer({
  size = 24,
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  className,
  title = 'Khách hàng',
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
      <circle cx="10" cy="8" r="4" fill={secondaryColor} stroke={color} strokeWidth="1.75" />
      <path
        d="M3 19C3 15.6863 5.68629 13 9 13H11C14.3137 13 17 15.6863 17 19"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Kiện hàng nhỏ đại diện chủ hàng */}
      <rect x="15" y="14" width="7" height="6" rx="1" fill={color} />
      <line x1="18.5" y1="14" x2="18.5" y2="20" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

/**
 * 🪪 Icon Vai trò: Tài xế vận tải (DRIVER)
 */
export function IconRoleDriver({
  size = 24,
  color = '#1D4ED8',
  secondaryColor = '#DBEAFE',
  className,
  title = 'Tài xế',
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
      {/* Vành vô lăng lái xe */}
      <circle cx="12" cy="12" r="9" fill={secondaryColor} stroke={color} strokeWidth="2" />
      {/* Tâm & Chấu vô lăng */}
      <circle cx="12" cy="12" r="3" fill={color} />
      <line x1="12" y1="3" x2="12" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="4.5" y1="16.5" x2="9.5" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="19.5" y1="16.5" x2="14.5" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🏢 Icon Vai trò: Chủ đội xe (FLEET OWNER)
 */
export function IconRoleFleet({
  size = 24,
  color = '#0B2545',
  secondaryColor = '#0284C7',
  className,
  title = 'Chủ đội xe',
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
      {/* Tòa nhà / Trạm điều hành đội xe */}
      <path d="M3 21H21M4 21V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V21M16 10H19C19.5523 10 20 10.4477 20 11V21" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      {/* Cửa sổ */}
      <rect x="7" y="7" width="2" height="2" fill={secondaryColor} />
      <rect x="11" y="7" width="2" height="2" fill={secondaryColor} />
      <rect x="7" y="11" width="2" height="2" fill={secondaryColor} />
      <rect x="11" y="11" width="2" height="2" fill={secondaryColor} />
      <rect x="7" y="15" width="2" height="2" fill={secondaryColor} />
      <rect x="11" y="15" width="2" height="2" fill={secondaryColor} />
    </svg>
  );
}

/**
 * 🛡️ Icon Vai trò: Quản trị viên điều phối (ADMIN)
 */
export function IconRoleAdmin({
  size = 24,
  color = '#0F172A',
  secondaryColor = '#38BDF8',
  className,
  title = 'Quản trị viên',
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
      {/* Khiên bảo mật hệ thống */}
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.5 21.1 12 22.5C16.5 21.1 20 16.5 20 11.5V5.5L12 2Z"
        fill="#F1F5F9"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Biểu tượng thanh trượt cấu hình / Bảng điều phối */}
      <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="9" r="1.5" fill={secondaryColor} />
      <line x1="8" y1="14" x2="16" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="1.5" fill={secondaryColor} />
    </svg>
  );
}
