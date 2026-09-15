import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button, iosContinuousCurve } from '@leopard/mobile-core';
import type { DriverListContentView } from '../model';

export type DriverNoticeProps = Readonly<{
  view: DriverListContentView;
  onNoticeAction?: () => void;
}>;

/** Dispatch-issued notice (tone + optional action) rendered inside the sheet. */
export function DriverNotice({ onNoticeAction, view }: DriverNoticeProps) {
  if (!view.notice) return null;

  const toneStyle =
    view.notice.tone === 'danger'
      ? styles.danger
      : view.notice.tone === 'warning'
        ? styles.warning
        : styles.info;

  const textStyle =
    view.notice.tone === 'danger'
      ? styles.dangerText
      : view.notice.tone === 'warning'
        ? styles.warningText
        : styles.infoText;

  return (
    <View accessibilityRole="alert" style={[styles.notice, toneStyle]} testID="driver-notice">
      <Text style={[styles.body, textStyle]}>{view.notice.message}</Text>
      {view.notice.actionLabel ? (
        <Button label={view.notice.actionLabel} onPress={onNoticeAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 6,
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    ...Platform.select({
      web: { boxShadow: '0 6px 14px rgba(11, 30, 66, 0.14)' } as object,
    }),
  },
  info: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  danger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  body: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  infoText: {
    color: '#0B1E42',
  },
  warningText: {
    color: '#92400E',
  },
  dangerText: {
    color: '#991B1B',
  },
});
