import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

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
});
