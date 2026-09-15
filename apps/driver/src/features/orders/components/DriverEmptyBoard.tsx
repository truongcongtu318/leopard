import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconLocationPin,
  IconVehicleMotorbike,
  iosContinuousCurve,
} from '@leopard/mobile-core';

export type DriverEmptyBoardProps = Readonly<{
  isOnline: boolean;
  onGoOnline: () => void;
  onExpandRadius: () => void;
}>;

/**
 * Context-aware empty state for the idle load board.
 *
 * Replaces the old duplicated "offline banner": the connection capsule already
 * owns the offline indicator, so the board only explains what to do next.
 */
export function DriverEmptyBoard({
  isOnline,
  onExpandRadius,
  onGoOnline,
}: DriverEmptyBoardProps): React.JSX.Element {
  const isOffline = !isOnline;

  return (
    <View style={styles.card} testID={isOffline ? 'driver-offline-board' : 'driver-empty-board'}>
      <View style={styles.iconCircle}>
        {isOffline ? (
          <IconVehicleMotorbike color="#64748B" size={26} />
        ) : (
          <IconLocationPin color="#0B1E42" size={26} />
        )}
      </View>

      <Text style={styles.title}>
        {isOffline ? 'Radar đang tạm dừng' : 'Chưa có đơn phù hợp'}
      </Text>
      <Text style={styles.message}>
        {isOffline
          ? 'Bật kết nối để radar bắt đầu quét và điều phối gửi đơn hàng gần bạn.'
          : 'LEOPARD sẽ thông báo ngay khi có đơn khớp với loại xe và phạm vi nhận của bạn.'}
      </Text>

      <Pressable
        accessibilityLabel={isOffline ? 'Bật trực tuyến' : 'Mở rộng phạm vi nhận đơn'}
        accessibilityRole="button"
        onPress={isOffline ? onGoOnline : onExpandRadius}
        style={({ pressed }) => [
          styles.actionBtn,
          isOffline ? styles.actionBtnPrimary : styles.actionBtnSecondary,
          pressed ? styles.pressed : null,
        ]}
        testID={isOffline ? 'driver-go-online-btn' : 'driver-expand-radius-btn'}
      >
        <Text
          style={[
            styles.actionText,
            isOffline ? styles.actionTextPrimary : styles.actionTextSecondary,
          ]}
        >
          {isOffline ? 'Bật nhận đơn' : 'Mở rộng phạm vi nhận đơn'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 2,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
  title: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 14,
    ...iosContinuousCurve,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionBtnPrimary: {
    backgroundColor: '#0B1E42',
    elevation: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  actionBtnSecondary: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionTextPrimary: {
    color: '#FFFFFF',
  },
  actionTextSecondary: {
    color: '#0B1E42',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
