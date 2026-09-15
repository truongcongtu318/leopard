import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { iosContinuousCurve } from '@leopard/mobile-core';

export type DriverConnectionStatusRowProps = Readonly<{
  isOnline: boolean;
  /** Optional secondary line, e.g. the registered vehicle. */
  subtitle?: string | null;
}>;

/**
 * Grab-style status row pinned at the top of the idle sheet: a coloured dot plus
 * one plain sentence telling the driver whether dispatch can see them.
 */
export function DriverConnectionStatusRow({
  isOnline,
  subtitle,
}: DriverConnectionStatusRowProps): React.JSX.Element {
  return (
    <View style={styles.row} testID="driver-connection-status">
      <View style={[styles.dot, { backgroundColor: isOnline ? '#16A34A' : '#EF4444' }]} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {isOnline ? 'Bạn đang bật kết nối.' : 'Bạn đang tắt kết nối.'}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    marginRight: 10,
    width: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
