import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { radius, colors, iosContinuousCurve, spacing } from '../../theme/tokens';

export type AlertAction = 'info' | 'success' | 'warning' | 'error' | 'muted';

export interface AlertProps extends ViewProps {
  action?: AlertAction;
  children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> & {
  Icon: React.FC<{ children: React.ReactNode }>;
  Text: React.FC<{ children: React.ReactNode; style?: any }>;
} = ({ action = 'info', style, children, ...props }) => {
  const bgMap = {
    info: colors.info.background,
    success: colors.success.background,
    warning: colors.warning.background,
    error: colors.danger.background,
    muted: colors.neutral.surfaceMuted,
  };

  const borderMap = {
    info: colors.info.border,
    success: colors.success.border,
    warning: colors.warning.border,
    error: colors.danger.border,
    muted: colors.neutral.border,
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgMap[action], borderColor: borderMap[action] },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const AlertIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={styles.iconBox}>{children}</View>;
};

const AlertText: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  return <Text style={[styles.text, style]}>{children}</Text>;
};

Alert.Icon = AlertIcon;
Alert.Text = AlertText;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.text,
  },
});
