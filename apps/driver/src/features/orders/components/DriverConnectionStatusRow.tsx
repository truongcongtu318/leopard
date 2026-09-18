import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Box,
  HStack,
  driverPrimitives,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type DriverConnectionStatusRowProps = Readonly<{
  isOnline: boolean;
  /** Optional secondary line, e.g. the registered vehicle. */
  subtitle?: string | null;
}>;

/**
 * Grab-style status row: clean white pill with glowing status dot.
 * Refactored using Gluestack Box and HStack primitives while preserving driverTokens.
 */
export function DriverConnectionStatusRow({
  isOnline,
  subtitle,
}: DriverConnectionStatusRowProps): React.JSX.Element {
  return (
    <HStack style={styles.row} testID="driver-connection-status">
      <Box
        style={[
          styles.dot,
          {
            backgroundColor: isOnline
              ? driverPrimitives.colors.green500
              : driverPrimitives.colors.red500,
          },
        ]}
      />
      <Box style={styles.textWrap}>
        <Text style={styles.title}>
          {isOnline ? 'Bạn đang bật kết nối.' : 'Bạn đang tắt kết nối.'}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
    </HStack>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...driverPrimitives.shadows.sm,
  },
  dot: {
    borderRadius: radius.pill,
    height: 10,
    marginRight: spacing.xs + 2,
    width: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  subtitle: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption1,
    fontWeight: '500',
    marginTop: 1,
  },
});
