import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { driverPrimitives, iosContinuousCurve } from '@leopard/mobile-core';
import type { DriverListContentView } from '../model';

export type DriverNoticeProps = Readonly<{
  view: DriverListContentView;
  onNoticeAction?: () => void;
}>;

function WarningTriangleIcon({ size = 20, color = driverPrimitives.colors.red500 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 2L1 21h22L12 2zm0 3.5L20 19H4L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"
        fill={color}
      />
    </Svg>
  );
}

/** Dispatch-issued notice card matching Image 1 from Grab Driver. */
export function DriverNotice({ onNoticeAction, view }: DriverNoticeProps) {
  if (!view.notice) return null;

  return (
    <View accessibilityRole="alert" style={styles.card} testID="driver-notice">
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <WarningTriangleIcon />
        </View>
        <Text style={styles.messageText}>{view.notice.message}</Text>
      </View>

      {view.notice.actionLabel ? (
        <>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={onNoticeAction}
            style={({ pressed }) => [styles.actionButton, pressed ? styles.actionPressed : null]}
          >
            <Text style={styles.actionLabel}>{view.notice.actionLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    marginBottom: 12,
    paddingTop: 14,
    ...driverPrimitives.shadows.sm,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  iconWrap: {
    marginTop: 2,
  },
  messageText: {
    color: driverPrimitives.colors.gray900,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  divider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    color: driverPrimitives.colors.blue500,
    fontSize: 14,
    fontWeight: '700',
  },
});
