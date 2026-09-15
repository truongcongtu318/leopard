import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { iosContinuousCurve } from '@leopard/mobile-core';

export type DriverEmptyBoardProps = Readonly<{
  isOnline: boolean;
}>;

/**
 * Compact informational card for an empty load board.
 *
 * Mirrors the reference's short two-line info card: no icon hero, no button.
 * The action already lives in the connection pill floating above the sheet, so
 * repeating it here only added visual weight.
 */
export function DriverEmptyBoard({ isOnline }: DriverEmptyBoardProps): React.JSX.Element {
  return (
    <View
      style={styles.card}
      testID={isOnline ? 'driver-empty-board' : 'driver-offline-board'}
    >
      <Text style={styles.title}>
        {isOnline ? 'Chưa có đơn phù hợp' : 'Radar đang tạm dừng'}
      </Text>
      <Text style={styles.message}>
        {isOnline
          ? 'LEOPARD sẽ báo ngay khi có đơn khớp loại xe và phạm vi nhận của bạn.'
          : 'Bật kết nối để radar bắt đầu quét đơn gần bạn.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  message: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
  },
});
