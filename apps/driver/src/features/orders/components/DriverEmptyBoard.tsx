import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconOrders, NavigableMetricCard, spacing } from '@leopard/mobile-core';

export type DriverEmptyBoardProps = Readonly<{
  isOnline: boolean;
  onGoHome?: () => void;
}>;

/**
 * Empty load board: dùng chung NavigableMetricCard đồng bộ toàn app.
 * Không bấm được khi online (chỉ là thông tin); khi offline bấm để về
 * Cockpit bật kết nối.
 */
export function DriverEmptyBoard({ isOnline, onGoHome }: DriverEmptyBoardProps): React.JSX.Element {
  return (
    <View
      style={styles.wrap}
      testID={isOnline ? 'driver-empty-board' : 'driver-offline-board'}
    >
      <NavigableMetricCard
        accessibilityLabel={
          isOnline ? 'Chưa có đơn phù hợp' : 'Radar đang tạm dừng, về trang chủ'
        }
        hasChevron={!isOnline}
        layout="stack"
        leadingIcon={<IconOrders color="#0B1E42" size={20} />}
        onPress={isOnline ? undefined : onGoHome}
        subtitle={
          isOnline
            ? 'LEOPARD sẽ báo ngay khi có đơn khớp loại xe và phạm vi nhận của bạn.'
            : 'Bật kết nối để radar bắt đầu quét đơn gần bạn.'
        }
        title={isOnline ? 'Chưa có đơn phù hợp' : 'Radar đang tạm dừng'}
        value={isOnline ? 'Đang quét…' : 'Về trang chủ'}
        valueTone={isOnline ? 'default' : 'success'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
  },
});
