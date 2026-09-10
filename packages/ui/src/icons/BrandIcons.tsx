import React from 'react';
import type { IconProps } from './IconProps';

/**
 * 🐆 Biểu trưng Logo Mark LEOPARD (Báo đốm bứt tốc + Xe tải + Vòng tròn chuyển động)
 */
export function LeopardLogoMark({
  size = 48,
  color = '#0B2545',
  secondaryColor = '#0284C7',
  className,
  title = 'LEOPARD Logo Mark',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      {/* Vòng cung quỹ đạo tốc độ phía trên */}
      <path
        d="M38 16C58 14 78 24 85 42"
        stroke={secondaryColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Vòng cung quỹ đạo tốc độ phía dưới */}
      <path
        d="M20 74C42 84 72 80 84 66"
        stroke={secondaryColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Vệt gió tốc độ sau đuôi báo */}
      <path d="M12 36H32" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M6 44H28" stroke={secondaryColor} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 52H35" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M8 60H26" stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" />

      {/* Silhouette Xe Tải vững chãi */}
      <path
        d="M38 42H64C65.5 42 66.8 43.1 67.2 44.5L72 61C72.3 62 72.8 62.5 73.8 62.5H78C79.1 62.5 80 63.4 80 64.5V69C80 70.1 79.1 71 78 71H35C33.9 71 33 70.1 33 69V47C33 44.2 35.2 42 38 42Z"
        fill={color}
      />
      {/* Kính cabin xe tải */}
      <path d="M65 46H69.5L72.5 57H65V46Z" fill={secondaryColor} />
      
      {/* Bánh xe tải */}
      <circle cx="45" cy="71" r="5.5" fill="#FFFFFF" stroke={color} strokeWidth="3" />
      <circle cx="70" cy="71" r="5.5" fill="#FFFFFF" stroke={color} strokeWidth="3" />
      <circle cx="45" cy="71" r="2" fill={secondaryColor} />
      <circle cx="70" cy="71" r="2" fill={secondaryColor} />

      {/* Thân Báo đốm dũng mãnh lao về phía trước */}
      <path
        d="M26 58C31 52 38 43 47 38C56 33 65 31 72 34C75 35.5 77 38 78 41C77 43 74 44 71 44C68 44 65 42 61 43C56 44 51 49 46 56C42 61 36 65 30 67C26 68 23 66 22 63C21 60 23 58 26 58Z"
        fill="#FFFFFF"
        stroke={secondaryColor}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Đầu & Tai Báo */}
      <path
        d="M68 31C70 28 73 27 75 29C76 30 75 33 73 34C77 33 80 36 79 39C78 42 75 44 71 44"
        fill="#FFFFFF"
        stroke={secondaryColor}
        strokeWidth="2"
      />
      {/* Mắt báo */}
      <circle cx="72" cy="36" r="1.5" fill={color} />
      
      {/* Đốm hoa mai đặc trưng của Leopard */}
      <circle cx="42" cy="45" r="1.8" fill={color} />
      <circle cx="48" cy="42" r="1.6" fill={color} />
      <circle cx="54" cy="38" r="1.8" fill={color} />
      <circle cx="58" cy="46" r="1.5" fill={color} />
      <circle cx="64" cy="41" r="1.6" fill={color} />
      <circle cx="36" cy="53" r="1.6" fill={color} />
      <circle cx="43" cy="52" r="1.7" fill={color} />
    </svg>
  );
}

export type LeopardLogoFullProps = Readonly<{
  width?: number | string;
  height?: number | string;
  className?: string;
  variant?: 'horizontal' | 'stacked';
  dark?: boolean;
}>;

/**
 * 🐆 Logo Đầy Đủ LEOPARD (Logo Mark + Chữ LEOPARD A-Arrow + Slogan Tiếng Việt)
 */
export function LeopardLogoFull({
  width = 280,
  height = 76,
  className,
  variant = 'horizontal',
  dark = false,
}: LeopardLogoFullProps) {
  const textColor = dark ? '#FFFFFF' : '#0B2545';
  const cyanColor = '#0284C7';

  if (variant === 'stacked') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="LEOPARD — Kết nối vận tải, giao hàng nhanh chóng"
      >
        <g transform="translate(50, 0)">
          <LeopardLogoMark size={100} color={textColor} secondaryColor={cyanColor} ariaHidden />
        </g>
        <text
          x="100"
          y="124"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="28"
          fontStyle="italic"
          letterSpacing="2.5"
          fill={textColor}
        >
          LEOP
        </text>
        {/* Chữ A mũi tên hướng lên */}
        <g transform="translate(132, 102)">
          <path d="M0 22L7.5 0L15 22H10.5L7.5 13L4.5 22H0Z" fill={cyanColor} />
          <path d="M7.5 6L10.2 15H4.8L7.5 6Z" fill={dark ? '#0F172A' : '#FFFFFF'} />
        </g>
        <text
          x="166"
          y="124"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="28"
          fontStyle="italic"
          letterSpacing="2.5"
          fill={textColor}
        >
          RD
        </text>
        <text
          x="100"
          y="146"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="8"
          letterSpacing="1.2"
          fill={cyanColor}
        >
          KẾT NỐI VẬN TẢI • GIAO HÀNG NHANH CHÓNG
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 340 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="LEOPARD — Kết nối vận tải, giao hàng nhanh chóng"
    >
      <g transform="translate(0, 2)">
        <LeopardLogoMark size={80} color={textColor} secondaryColor={cyanColor} ariaHidden />
      </g>
      {/* Tên thương hiệu LEOPARD */}
      <g transform="translate(86, 12)">
        <text
          x="0"
          y="38"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="36"
          fontStyle="italic"
          letterSpacing="3"
          fill={textColor}
        >
          LEOP
        </text>
        {/* Chữ A mũi tên hướng lên chuyển động */}
        <g transform="translate(112, 10)">
          <path d="M0 28L10 0L20 28H14L10 16.5L6 28H0Z" fill={cyanColor} />
          <path d="M10 7.5L13.8 19H6.2L10 7.5Z" fill={dark ? '#0F172A' : '#FFFFFF'} />
        </g>
        <text
          x="136"
          y="38"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="36"
          fontStyle="italic"
          letterSpacing="3"
          fill={textColor}
        >
          RD
        </text>
        {/* Đường gạch phân cách & Slogan */}
        <line x1="0" y1="48" x2="245" y2="48" stroke={cyanColor} strokeWidth="1.5" opacity="0.6" />
        <text
          x="0"
          y="62"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="9.5"
          letterSpacing="1.4"
          fill={cyanColor}
        >
          KẾT NỐI VẬN TẢI — GIAO HÀNG NHANH CHÓNG
        </text>
      </g>
    </svg>
  );
}

/**
 * 📱 App Icon Biểu Tượng Squircle Dành Cho Mobile App & Favicon Web
 */
export function LeopardAppIcon({
  size = 64,
  className,
  title = 'LEOPARD App Icon',
  ariaHidden = false,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {title && !ariaHidden ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="leopardBg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B2545" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      {/* Squircle Background */}
      <rect width="120" height="120" rx="28" fill="url(#leopardBg)" />
      
      {/* Vòng hào quang tốc độ */}
      <circle cx="60" cy="60" r="46" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 4" opacity="0.3" />
      
      {/* Logo Mark tâm giữa */}
      <g transform="translate(18, 12)">
        <LeopardLogoMark size={84} color="#FFFFFF" secondaryColor="#38BDF8" ariaHidden />
      </g>
      
      {/* Text LEOPARD thu nhỏ chân App Icon */}
      <text
        x="60"
        y="108"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="12"
        fontStyle="italic"
        letterSpacing="2.5"
        fill="#FFFFFF"
      >
        LEOPARD
      </text>
    </svg>
  );
}
