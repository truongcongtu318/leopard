import React from 'react';
import type { IconProps } from './IconProps';

/**
 * 📡 Icon Trạng thái: Chờ tài xế (REQUESTED)
 */
export function IconOrderRequested({
  size = 24,
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  className,
  title = 'Chờ tài xế',
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
      <circle cx="12" cy="12" r="10" fill={secondaryColor} opacity="0.5" />
      <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      {/* Vệt quét radar */}
      <path d="M12 12L17.5 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 🤝 Icon Trạng thái: Đã nhận đơn (ACCEPTED)
 */
export function IconOrderAccepted({
  size = 24,
  color = '#1D4ED8',
  secondaryColor = '#DBEAFE',
  className,
  title = 'Đã nhận đơn',
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
      <rect x="2" y="4" width="20" height="16" rx="4" fill={secondaryColor} stroke={color} strokeWidth="1.5" />
      {/* Huy hiệu xác nhận */}
      <path
        d="M7 12L10.5 15.5L17 9"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 📦 Icon Trạng thái: Đang đến điểm lấy (PICKING_UP)
 */
export function IconOrderPickingUp({
  size = 24,
  color = '#D97706',
  secondaryColor = '#FEF3C7',
  className,
  title = 'Đang đến điểm lấy',
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
      {/* Khối hộp hàng */}
      <path
        d="M12 2.5L20 6.5V16L12 20L4 16V6.5L12 2.5Z"
        fill={secondaryColor}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 2.5V20M4 6.5L12 11L20 6.5" stroke={color} strokeWidth="1.5" />
      {/* Mũi tên hướng nhận hàng */}
      <path
        d="M12 7.5V15M12 15L9.5 12.5M12 15L14.5 12.5"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 🛣️ Icon Trạng thái: Đang vận chuyển (IN_TRANSIT)
 */
export function IconOrderInTransit({
  size = 24,
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  className,
  title = 'Đang vận chuyển',
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
      {/* Tuyến đường cao tốc */}
      <path d="M4 21L8 3M20 21L16 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 5V8M12 11V14M12 17V20" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" />
      {/* Vị trí xe trên tuyến */}
      <circle cx="12" cy="11" r="3.5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="12" cy="11" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * ✅ Icon Trạng thái: Đã giao thành công (DELIVERED)
 */
export function IconOrderDelivered({
  size = 24,
  color = '#16A34A',
  secondaryColor = '#DCFCE7',
  className,
  title = 'Đã giao',
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
      <circle cx="12" cy="12" r="10" fill={secondaryColor} stroke={color} strokeWidth="1.75" />
      <path
        d="M7.5 12L10.5 15L16.5 9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 📷 Icon Bằng chứng giao hàng (Proof of Delivery - POD)
 */
export function IconProofOfDelivery({
  size = 24,
  color = '#0F172A',
  secondaryColor = '#0284C7',
  className,
  title = 'Chứng nhận giao hàng',
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
      <rect x="2" y="6" width="20" height="14" rx="3" fill="#FFFFFF" stroke={color} strokeWidth="1.75" />
      <path d="M8 6L9.5 3.5H14.5L16 6H8Z" fill={color} />
      {/* Ống kính máy ảnh & Tích xanh POD */}
      <circle cx="12" cy="13" r="4.5" fill={secondaryColor} stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="13" r="2" fill="#FFFFFF" />
      <circle cx="18" cy="9" r="1" fill={color} />
    </svg>
  );
}

/**
 * 💳 Icon Mã QR Chuyển Khoản Ngân Hàng (VietQR)
 */
export function IconQrPayment({
  size = 24,
  color = '#0B2545',
  secondaryColor = '#0284C7',
  className,
  title = 'Mã QR thanh toán',
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
      {/* Định vị góc trên trái */}
      <rect x="3" y="3" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="5" y="5" width="2" height="2" fill={secondaryColor} />
      {/* Định vị góc trên phải */}
      <rect x="15" y="3" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="17" y="5" width="2" height="2" fill={secondaryColor} />
      {/* Định vị góc dưới trái */}
      <rect x="3" y="15" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="5" y="17" width="2" height="2" fill={secondaryColor} />
      {/* Khối dữ liệu ma trận */}
      <rect x="11" y="4" width="2" height="4" fill={color} />
      <rect x="4" y="11" width="4" height="2" fill={color} />
      <rect x="11" y="11" width="3" height="3" fill={secondaryColor} />
      <rect x="16" y="11" width="5" height="2" fill={color} />
      <rect x="11" y="16" width="2" height="5" fill={color} />
      <rect x="15" y="15" width="2" height="2" fill={color} />
      <rect x="19" y="18" width="2" height="3" fill={color} />
    </svg>
  );
}
