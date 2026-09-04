import React from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';

const leopardWordmarkSource = require('../../../assets/brand/leopard-wordmark.png');
const leopardEmblemSource = require('../../../assets/brand/leopard-emblem.png');

// Intrinsic pixel ratios of the brand PNGs (keep aspect when sizing).
const WORDMARK_RATIO = 1464 / 241;
const EMBLEM_RATIO = 1099 / 591;

export type VectorIconProps = Readonly<{
  size?: number;
  color?: string;
  secondaryColor?: string;
  strokeWidth?: number;
  testID?: string;
}>;

/**
 * 📍 Vector Icon: Định vị / Ghim điểm lấy / giao hàng (Location Pin)
 */
export function IconLocationPin({
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-location-pin',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 21C16 16.5 19 13.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 13.5 8 16.5 12 21Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <circle cx="12" cy="9.5" r="3" fill={secondaryColor} stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View
        style={[
          styles.nativePinOuter,
          {
            width: size * 0.65,
            height: size * 0.65,
            borderRadius: (size * 0.65) / 2,
            borderColor: color,
            borderWidth: strokeWidth,
            backgroundColor: secondaryColor,
          },
        ]}
      />
    </View>
  );
}

/**
 * 🚚 Vector Icon: Vận chuyển nhanh / Điều phối (Speed Truck)
 */
export function IconSpeedTruck({
  color = '#0284C7',
  secondaryColor = '#E0F2FE',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-speed-truck',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          height="10"
          rx="1"
          stroke={color}
          strokeWidth={strokeWidth}
          width="11"
          x="2"
          y="6"
        />
        <path
          d="M13 8H17.5L21 12V16H13V8Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <circle cx="6" cy="18" fill="#FFFFFF" r="2" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="17" cy="18" fill="#FFFFFF" r="2" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.75, height: size * 0.45, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🛡️ Vector Icon: An toàn & Xác thực (Security Shield)
 */
export function IconSecurityShield({
  color = '#16A34A',
  secondaryColor = '#DCFCE7',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-security-shield',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5L4 5.5V11.5C4 16.5 7.5 20.8 12 22C16.5 20.8 20 16.5 20 11.5V5.5L12 2.5Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M8.5 12L11 14.5L15.5 9.5"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeShield, { width: size * 0.65, height: size * 0.75, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🎧 Vector Icon: Hỗ trợ 24/7 / Điều phối viên (Support Headset)
 */
export function IconSupport247({
  color = '#0284C7',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-support-247',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 13V11C3 6.02944 7.02944 2 12 2C16.9706 2 21 6.02944 21 11V13"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
        <rect height="6" rx="1.5" stroke={color} strokeWidth={strokeWidth} width="3" x="2" y="11" />
        <rect height="6" rx="1.5" stroke={color} strokeWidth={strokeWidth} width="3" x="19" y="11" />
        <path
          d="M19 16V18C19 19.6569 17.6569 21 16 21H13"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 💳 Vector Icon: Thanh toán / Thẻ ngân hàng (Payment Card)
 */
export function IconPaymentConvenient({
  color = '#0284C7',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-payment-convenient',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          height="14"
          rx="2"
          stroke={color}
          strokeWidth={strokeWidth}
          width="20"
          x="2"
          y="5"
        />
        <line stroke={color} strokeWidth={strokeWidth} x1="2" x2="22" y1="9.5" y2="9.5" />
        <rect fill={color} height="2" rx="0.5" width="4" x="5" y="14" />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.8, height: size * 0.55, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📱 Vector Icon: Mã QR VietQR (QR Code)
 */
export function IconQrPayment({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-qr-payment',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="6" rx="1" stroke={color} strokeWidth={strokeWidth} width="6" x="3" y="3" />
        <rect height="6" rx="1" stroke={color} strokeWidth={strokeWidth} width="6" x="15" y="3" />
        <rect height="6" rx="1" stroke={color} strokeWidth={strokeWidth} width="6" x="3" y="15" />
        <path d="M15 15H17V17H15V15ZM19 15H21V17H19V15ZM15 19H17V21H15V19ZM19 19H21V21H19V19ZM10 4H12V6H10V4ZM4 10H6V12H4V10ZM10 10H14V14H10V10Z" fill={color} />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🏦 Vector Icon: Ngân hàng / Tổ chức tín dụng (Bank Building)
 */
export function IconBank({
  color = '#0284C7',
  size = 22,
  strokeWidth = 1.75,
  testID = 'icon-bank',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 4L21 9.5" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M5 10V18M10 10V18M14 10V18M19 10V18" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M2 20H22" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.8, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📥 Vector Icon: Tiền vào / Nạp tiền (Topup / Incoming Transaction)
 */
export function IconTxTopup({
  color = '#16A34A',
  size = 20,
  strokeWidth = 2,
  testID = 'icon-tx-topup',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M17 7L7 17M7 17H15M7 17V9" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <Text style={{ color, fontSize: size * 0.7, fontWeight: '800' }}>↓</Text>
    </View>
  );
}

/**
 * 📤 Vector Icon: Tiền ra / Thanh toán (Payment / Outgoing Transaction)
 */
export function IconTxPayment({
  color = '#475569',
  size = 20,
  strokeWidth = 2,
  testID = 'icon-tx-payment',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M7 17L17 7M17 7H9M17 7V15" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <Text style={{ color, fontSize: size * 0.7, fontWeight: '800' }}>↑</Text>
    </View>
  );
}

/**
 * ↺ Vector Icon: Hoàn tiền (Refund Transaction)
 */
export function IconTxRefund({
  color = '#D97706',
  size = 20,
  strokeWidth = 2,
  testID = 'icon-tx-refund',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10H14C17.3137 10 20 12.6863 20 16C20 19.3137 17.3137 22 14 22H6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M7 6L3 10L7 14" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <Text style={{ color, fontSize: size * 0.7, fontWeight: '800' }}>↺</Text>
    </View>
  );
}

/**
 * 📋 Vector Icon: Sao chép (Copy to Clipboard)
 */
export function IconCopy({
  color = '#0284C7',
  size = 18,
  strokeWidth = 1.75,
  testID = 'icon-copy',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <rect height="13" rx="2" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} width="13" x="9" y="9" />
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 👁️ Vector Icon: Mắt hiển thị (Eye)
 */
export function IconEye({
  color = '#94A3B8',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-eye',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.5, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🙈 Vector Icon: Mắt ẩn (Eye Off)
 */
export function IconEyeOff({
  color = '#94A3B8',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-eye-off',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 6.06L17.94 17.94Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.82 16.14" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M1 1L23 23" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.5, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🏠 Vector Icon: Trang chủ (Home)
 */
export function IconHome({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-home',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M9 21V12H15V21" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🗺️ Vector Icon: Lộ trình / Tuyến đường (Route)
 */
export function IconRoute({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-route',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="18" r="3" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="18" cy="6" r="3" stroke={color} strokeWidth={strokeWidth} />
        <path d="M9 18H13C15.2091 18 17 16.2091 17 14V10C17 7.79086 15.2091 6 13 6H9" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 💼 Vector Icon: Ví tiền (Wallet)
 */
export function IconWallet({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-wallet',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 7V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <rect height="8" rx="2" stroke={color} strokeWidth={strokeWidth} width="7" x="15" y="8" />
        <circle cx="18.5" cy="12" fill={color} r="1" />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.7, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📦 Vector Icon: Đơn hàng / Kiện hàng (Package / Orders)
 */
export function IconOrders({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-orders',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 16V8C21 7.64 20.81 7.31 20.5 7.13L13 2.87C12.38 2.51 11.62 2.51 11 2.87L3.5 7.13C3.19 7.31 3 7.64 3 8V16C3 16.36 3.19 16.69 3.5 16.87L11 21.13C11.62 21.49 12.38 21.49 13 21.13L20.5 16.87C20.81 16.69 21 16.36 21 16Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M3.3 7.5L12 12.5L20.7 7.5" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M12 21.5V12.5" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 👤 Vector Icon: Tài khoản / Người dùng (User)
 */
export function IconUser({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-user',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <circle cx="12" cy="7" r="4" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.5, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🔔 Vector Icon: Thông báo (Bell)
 */
export function IconBell({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-bell',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M13.73 21A2 2 0 0 1 10.27 21" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🔍 Vector Icon: Tìm kiếm (Search)
 */
export function IconSearch({
  color = '#64748B',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-search',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
        <path d="M20 20L16 16" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📸 Vector Icon: Bằng chứng giao hàng (Camera / Proof of Delivery)
 */
export function IconCameraProof({
  color = '#0F172A',
  size = 24,
  strokeWidth = 1.75,
  testID = 'icon-camera-proof',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.7, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📞 Vector Icon: Gọi điện (Phone)
 */
export function IconPhone({
  color = '#0284C7',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-phone',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4742 21.8325 20.7294C21.7209 20.9846 21.5573 21.2137 21.3521 21.4019C21.1468 21.5902 20.9046 21.7336 20.6407 21.8228C20.3769 21.912 20.0974 21.9452 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49997 10.2412 2.44824 7.27099 2.12 4.18C2.095 3.90353 2.12787 3.62486 2.21656 3.36171C2.30526 3.09856 2.44787 2.85679 2.6353 2.65174C2.82274 2.44669 3.05086 2.2829 3.30514 2.17079C3.55942 2.05868 3.83424 2.00072 4.112 2H7.112C7.5953 1.99524 8.06377 2.16708 8.43003 2.48354C8.7963 2.80001 9.03456 3.23899 9.102 3.72C9.22723 4.61464 9.44577 5.49258 9.752 6.33C9.89745 6.72103 9.91978 7.14725 9.81643 7.55106C9.71308 7.95487 9.48834 8.31889 9.172 8.59L7.902 9.86C9.33614 12.3827 11.4173 14.4639 13.94 15.9L15.21 14.63C15.4811 14.3137 15.8451 14.0889 16.2489 13.9856C16.6528 13.8822 17.079 13.9045 17.47 14.05C18.3074 14.3562 19.1854 14.5748 20.08 14.7C20.5663 14.7679 21.0102 15.0103 21.3277 15.3819C21.6451 15.7535 21.8136 16.2287 21.8 16.71L22 16.92Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 💬 Vector Icon: Tin nhắn (Message)
 */
export function IconMessage({
  color = '#0284C7',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-message',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.6, height: size * 0.5, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🛵 Vector Icon Phương Tiện: Xe Máy (Motorbike / Scooter)
 */
export function IconVehicleMotorbike({
  color = '#0284C7',
  size = 28,
  strokeWidth = 1.75,
  testID = 'icon-vehicle-motorbike',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 28 28" width={size} xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="19" fill="#FFFFFF" r="3.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="21" cy="19" fill="#FFFFFF" r="3.5" stroke={color} strokeWidth={strokeWidth} />
        <path d="M7 19H12L15 13H19L21 19" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M15 13L17 7H19" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <path d="M10 11H13.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🚐 Vector Icon Phương Tiện: Xe Van (Delivery Van)
 */
export function IconVehicleVan({
  color = '#0284C7',
  size = 28,
  strokeWidth = 1.75,
  testID = 'icon-vehicle-van',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 28 28" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8C3 7.44772 3.44772 7 4 7H17V18H3V8Z" stroke={color} strokeWidth={strokeWidth} />
        <path d="M17 9H21.5C22.1 9 22.6 9.4 22.8 10L24.5 13.5C24.7 13.8 24.8 14.1 24.8 14.5V18H17V9Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <rect height="4" rx="0.5" stroke={color} strokeWidth={strokeWidth} width="4.5" x="17.5" y="10" />
        <circle cx="7.5" cy="19.5" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="20.5" cy="19.5" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.75, height: size * 0.45, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * ⚠️ Vector Icon: Cảnh báo / Thoát (Warning Shield)
 */
export function IconWarningShield({
  color = '#D97706',
  size = 32,
  strokeWidth = 1.75,
  testID = 'icon-warning-shield',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <line stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} x1="12" x2="12" y1="8" y2="13" />
        <circle cx="12" cy="16.5" fill={color} r="1" />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeShield, { width: size * 0.6, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🛺 Vector Icon Phương Tiện: Xe Ba Gác (3-Wheel Bike)
 */
export function IconVehicle3Wheel({
  color = '#D97706',
  size = 28,
  strokeWidth = 1.75,
  testID = 'icon-vehicle-3wheel',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 28 28" width={size} xmlns="http://www.w3.org/2000/svg">
        <rect height="9" rx="1" stroke={color} strokeWidth={strokeWidth} width="12" x="2" y="9" />
        <line stroke={color} strokeWidth={strokeWidth} x1="6" x2="6" y1="9" y2="18" />
        <path d="M14 15H18L21 10H19" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M21 10L22.5 7H24.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <circle cx="8" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="21" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.7, height: size * 0.45, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🚐 Vector Icon Phương Tiện: Xe Tải Nhẹ (Light Truck)
 */
export function IconVehicleLightTruck({
  color = '#0284C7',
  size = 28,
  strokeWidth = 1.75,
  testID = 'icon-vehicle-light-truck',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 28 28" width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M2 9C2 7.89543 2.89543 7 4 7H16V18H2V9Z" stroke={color} strokeWidth={strokeWidth} />
        <path d="M16 10H20.5C21.1 10 21.6 10.4 21.8 10.9L23.8 14.3C23.9 14.5 24 14.8 24 15.1V18H16V10Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <line stroke={color} strokeWidth={strokeWidth} x1="17.5" x2="22" y1="14" y2="14" />
        <circle cx="7" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="19" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.75, height: size * 0.45, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 🚛 Vector Icon Phương Tiện: Xe Tải Nặng (Heavy Truck)
 */
export function IconVehicleHeavyTruck({
  color = '#2563EB',
  size = 28,
  strokeWidth = 1.75,
  testID = 'icon-vehicle-heavy-truck',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg data-testid={testID} fill="none" height={size} viewBox="0 0 28 28" width={size} xmlns="http://www.w3.org/2000/svg">
        <rect height="12" rx="1" stroke={color} strokeWidth={strokeWidth} width="15" x="2" y="6" />
        <line stroke={color} strokeDasharray="2 2" strokeWidth={strokeWidth} x1="2" x2="17" y1="12" y2="12" />
        <path d="M17 9H22C22.6 9 23.2 9.5 23.4 10.1L24.8 13.5C24.9 13.8 25 14.1 25 14.4V18H17V9Z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
        <circle cx="6" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="11" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="20" cy="20" fill="#FFFFFF" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    );
  }
  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={[styles.nativeRect, { width: size * 0.8, height: size * 0.45, borderColor: color, borderWidth: strokeWidth }]} />
    </View>
  );
}

/**
 * 📦 Vector Icon Vai trò: Khách hàng (Customer)
 */
export function IconRoleCustomer({ color = '#0284C7', secondaryColor = '#E0F2FE', size = 24 }: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <circle cx="10" cy="8" fill={secondaryColor} r="4" stroke={color} strokeWidth="1.75" />
        <path d="M3 19C3 15.7 5.7 13 9 13H11C14.3 13 17 15.7 17 19" stroke={color} strokeLinecap="round" strokeWidth="1.75" />
        <rect fill={color} height="6" rx="1" width="7" x="15" y="14" />
      </svg>
    );
  }
  return <View style={[styles.centerBox, { width: size, height: size }]}><View style={[styles.nativeCircle, { width: size * 0.5, height: size * 0.5, borderColor: color, borderWidth: 1.5 }]} /></View>;
}

/**
 * 🚚 Vector Icon Vai trò: Tài xế (Driver)
 */
export function IconRoleDriver({ color = '#1D4ED8', secondaryColor = '#DBEAFE', size = 24 }: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <circle cx="12" cy="12" fill={secondaryColor} r="9" stroke={color} strokeWidth="1.75" />
        <circle cx="12" cy="12" fill={color} r="2.5" />
        <line stroke={color} strokeLinecap="round" strokeWidth="1.75" x1="12" x2="12" y1="3" y2="9.5" />
        <line stroke={color} strokeLinecap="round" strokeWidth="1.75" x1="4.5" x2="9.8" y1="16.5" y2="13.5" />
        <line stroke={color} strokeLinecap="round" strokeWidth="1.75" x1="19.5" x2="14.2" y1="16.5" y2="13.5" />
      </svg>
    );
  }
  return <View style={[styles.centerBox, { width: size, height: size }]}><View style={[styles.nativeCircle, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: 1.5 }]} /></View>;
}

/**
 * 🏢 Vector Icon Vai trò: Đội xe (Fleet Owner)
 */
export function IconRoleFleet({ color = '#0F172A', secondaryColor = '#E0F2FE', size = 24 }: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <path d="M3 21H21M4 21V6C4 4.9 4.9 4 6 4H14C15.1 4 16 4.9 16 6V21M16 10H19C19.6 10 20 10.4 20 11V21" stroke={color} strokeLinecap="round" strokeWidth="1.75" />
        <rect fill={secondaryColor} height="2" width="2" x="7" y="7" />
        <rect fill={secondaryColor} height="2" width="2" x="11" y="7" />
        <rect fill={secondaryColor} height="2" width="2" x="7" y="11" />
        <rect fill={secondaryColor} height="2" width="2" x="11" y="11" />
      </svg>
    );
  }
  return <View style={[styles.centerBox, { width: size, height: size }]}><View style={[styles.nativeRect, { width: size * 0.6, height: size * 0.6, borderColor: color, borderWidth: 1.5 }]} /></View>;
}

/**
 * 🛡️ Vector Icon Vai trò: Quản trị viên (Admin)
 */
export function IconRoleAdmin({ color = '#0F172A', secondaryColor = '#38BDF8', size = 24 }: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <path d="M12 2L4 5.5V11.5C4 16.5 7.5 21.1 12 22.5C16.5 21.1 20 16.5 20 11.5V5.5L12 2Z" fill="#F8FAFC" stroke={color} strokeLinejoin="round" strokeWidth="1.75" />
        <line stroke={color} strokeLinecap="round" strokeWidth="1.5" x1="8" x2="16" y1="9" y2="9" />
        <circle cx="10" cy="9" fill={secondaryColor} r="1.5" />
        <line stroke={color} strokeLinecap="round" strokeWidth="1.5" x1="8" x2="16" y1="14" y2="14" />
        <circle cx="14" cy="14" fill={secondaryColor} r="1.5" />
      </svg>
    );
  }
  return <View style={[styles.centerBox, { width: size, height: size }]}><View style={[styles.nativeShield, { width: size * 0.6, height: size * 0.7, borderColor: color, borderWidth: 1.5 }]} /></View>;
}

/**
 * 🐆 Chữ thương hiệu LEOPARD (ảnh thật, chạy trên iOS/Android/web).
 * Giữ đúng tỉ lệ gốc theo chiều cao truyền vào.
 */
export function LeopardWordmark({
  height = 40,
  testID = 'leopard-wordmark',
}: {
  height?: number;
  testID?: string;
}) {
  return (
    <Image
      accessibilityLabel="LEOPARD"
      accessibilityRole="image"
      resizeMode="contain"
      source={leopardWordmarkSource}
      style={{ height, width: Math.round(height * WORDMARK_RATIO) }}
      testID={testID}
    />
  );
}

/**
 * 🐆 Emblem LEOPARD (báo + xe tải) — ảnh thật, cross-platform.
 */
export function LeopardEmblem({
  width = 120,
  testID = 'leopard-emblem',
}: {
  width?: number;
  testID?: string;
}) {
  return (
    <Image
      accessibilityLabel="LEOPARD"
      accessibilityRole="image"
      resizeMode="contain"
      source={leopardEmblemSource}
      style={{ width, height: Math.round(width / EMBLEM_RATIO) }}
      testID={testID}
    />
  );
}

/**
 * Alias tương thích ngược: các màn cũ vẫn gọi <LeopardMobileLogo />.
 * Nhận `width`/`height` như trước nhưng render ảnh wordmark thật, giữ tỉ lệ.
 */
export function LeopardMobileLogo({
  height = 40,
  testID = 'leopard-mobile-logo',
  width: _width,
}: {
  width?: number;
  height?: number;
  testID?: string;
}) {
  return <LeopardWordmark height={height} testID={testID} />;
}

/**
 * 🇻🇳 Vector Icon: Cờ đỏ sao vàng Việt Nam (Vietnam Flag)
 * Tỉ lệ chuẩn 3:2 với nền đỏ tươi (#DA251D) và ngôi sao vàng 5 cánh ở chính giữa,
 * hoạt động sắc nét trên mọi nền tảng (Web, Windows, iOS, Android).
 */
export function VietnamFlagIcon({
  width = 22,
  height = 15,
  borderRadius = 3,
  testID = 'vietnam-flag-icon',
}: {
  width?: number;
  height?: number;
  borderRadius?: number;
  testID?: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        height={height}
        style={{
          borderRadius,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
        viewBox="0 0 30 20"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#DA251D" height="20" width="30" />
        <polygon
          fill="#FFFF00"
          points="15,3.8 16.6,8.6 21.7,8.6 17.6,11.6 19.2,16.4 15,13.4 10.8,16.4 12.4,11.6 8.3,8.6 13.4,8.6"
        />
      </svg>
    );
  }

  return (
    <View
      style={[
        styles.vietnamFlagNative,
        {
          width,
          height,
          borderRadius,
        },
      ]}
      testID={testID}
    >
      <Text style={[styles.vietnamStarText, { fontSize: height * 0.78, lineHeight: height }]}>
        ★
      </Text>
    </View>
  );
}

/**
 * 📱 Animated OTP Phone Verification Hero Component
 * Displays a sleek modern smartphone with animated pulsing signal rings and SMS message indicator.
 */
export function OtpPhoneHeroIcon({
  size = 56,
  isVerified = false,
  testID = 'otp-phone-hero-icon',
}: {
  size?: number;
  isVerified?: boolean;
  testID?: string;
}) {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.45],
  });

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  if (isVerified) {
    return (
      <View style={[styles.phoneHeroWrap, { width: size + 16, height: size + 16 }]} testID={testID}>
        <View style={[styles.phoneVerifiedCircle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.phoneVerifiedCheck}>✓</Text>
        </View>
      </View>
    );
  }

  const phoneW = Math.round(size * 0.64);
  const phoneH = size;

  return (
    <View style={[styles.phoneHeroWrap, { width: size + 16, height: size + 16 }]} testID={testID}>
      {/* Animated Glowing Signal Wave */}
      <Animated.View
        style={[
          styles.phoneSignalRing,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* Main Smartphone Shell */}
      <View style={[styles.phoneShell, { width: phoneW, height: phoneH }]}>
        {/* Top Speaker Earpiece */}
        <View style={styles.phoneEarpiece} />

        {/* Screen Display */}
        <View style={styles.phoneInnerScreen}>
          {/* SMS Code Pill Preview */}
          <View style={styles.phoneSmsPill}>
            <View style={styles.phoneSmsDot} />
            <View style={styles.phoneSmsDot} />
            <View style={styles.phoneSmsDot} />
          </View>
        </View>

        {/* Bottom Home Indicator Bar */}
        <View style={styles.phoneHomeBar} />
      </View>

      {/* Floating Animated Badge */}
      <View style={styles.phoneFloatingBadge}>
        <Text style={styles.phoneFloatingBadgeText}>💬</Text>
      </View>
    </View>
  );
}

/**
 * 🏢 Vector Icon: Kho hàng (Warehouse / Depot)
 */
export function IconWarehouse({
  color = '#2563EB',
  size = 18,
  strokeWidth = 1.75,
  testID = 'icon-warehouse',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 21V8L12 3L21 8V21H3Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M9 21V13H15V21"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M9 17H15"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={{ width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }} />
    </View>
  );
}


/**
 * 🏢 Vector Icon: Văn phòng / Tòa nhà công ty (Office / Corporate Building)
 */
export function IconOffice({
  color = '#2563EB',
  size = 18,
  strokeWidth = 1.75,
  testID = 'icon-office',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          height="18"
          rx="1"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          width="14"
          x="5"
          y="3"
        />
        <path d="M9 7H11" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M13 7H15" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M9 11H11" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M13 11H15" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        <path d="M10 21V17H14V21" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={{ width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }} />
    </View>
  );
}

/**
 * 🏷️ Vector Icon: Nhãn / Khác (Tag / Label)
 */
export function IconTag({
  color = '#2563EB',
  size = 18,
  strokeWidth = 1.75,
  testID = 'icon-tag',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2H2V12L13.59 23.59C14.37 24.37 15.63 24.37 16.41 23.59L22.59 17.41C23.37 16.63 23.37 15.37 22.59 14.59L12 2Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <circle cx="7" cy="7" fill={color} r="1.5" />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View style={{ width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth }} />
    </View>
  );
}

/**
 * ⚙️ Vector Icon: Cài đặt hệ thống (Settings Gear)
 */
export function IconSettings({
  color = '#64748B',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-settings',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: (size * 0.7) / 2,
          borderColor: color,
          borderWidth: strokeWidth,
        }}
      />
    </View>
  );
}

/**
 * 🗑️ Vector Icon: Thùng rác / Xóa (Trash / Delete)
 */
export function IconTrash({
  color = '#EF4444',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-trash',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View
        style={[
          styles.nativeRect,
          { width: size * 0.65, height: size * 0.7, borderColor: color, borderWidth: strokeWidth },
        ]}
      />
    </View>
  );
}

/**
 * ⭐ Vector Icon: Ngôi sao / Mặc định (Star / Default)
 */
export function IconStar({
  color = '#F59E0B',
  fill = 'none',
  size = 20,
  strokeWidth = 1.75,
  testID = 'icon-star',
}: VectorIconProps & { fill?: string }) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill={fill}
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View
        style={[
          styles.nativeCircle,
          { width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth },
        ]}
      />
    </View>
  );
}

/**
 * ➕ Vector Icon: Dấu cộng (Plus / Add)
 */
export function IconPlus({
  color = '#FFFFFF',
  size = 18,
  strokeWidth = 2,
  testID = 'icon-plus',
}: VectorIconProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        data-testid={testID}
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5v14M5 12h14"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <View style={[styles.centerBox, { width: size, height: size }]} testID={testID}>
      <View
        style={[
          styles.nativeCircle,
          { width: size * 0.7, height: size * 0.7, borderColor: color, borderWidth: strokeWidth },
        ]}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativePinOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeCircle: {
    borderRadius: 999,
  },
  nativeRect: {
    borderRadius: 4,
  },
  nativeShield: {
    borderRadius: 6,
  },
  nativeBrandBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nativeBrandTextPrimary: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  vietnamFlagNative: {
    backgroundColor: '#DA251D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  vietnamStarText: {
    color: '#FFFF00',
    fontWeight: '900',
    textAlign: 'center',
  },
  phoneHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneSignalRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  phoneShell: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneEarpiece: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#64748B',
    marginTop: 1,
  },
  phoneInnerScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  phoneSmsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#0284C7',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  phoneSmsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  phoneHomeBar: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#64748B',
    marginBottom: 1,
  },
  phoneFloatingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  phoneFloatingBadgeText: {
    fontSize: 9,
  },
  phoneVerifiedCircle: {
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneVerifiedCheck: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
});
