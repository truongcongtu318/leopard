import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { radius, colors, iosContinuousCurve, spacing } from '../../theme/tokens';

export type ToastAction = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps extends ViewProps {
  action?: ToastAction;
  children: React.ReactNode;
}

export const Toast: React.FC<ToastProps> & {
  Title: React.FC<{ children: React.ReactNode; style?: any }>;
  Description: React.FC<{ children: React.ReactNode; style?: any }>;
} = ({ action = 'info', style, children, ...props }) => {
  const borderMap = {
    info: colors.info.border,
    success: colors.success.border,
    warning: colors.warning.border,
    error: colors.danger.border,
  };

  return (
    <View
      style={[
        styles.toast,
        { borderLeftColor: borderMap[action], borderLeftWidth: 4 },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const ToastTitle: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  return <Text style={[styles.title, style]}>{children}</Text>;
};

const ToastDescription: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  return <Text style={[styles.desc, style]}>{children}</Text>;
};

Toast.Title = ToastTitle;
Toast.Description = ToastDescription;

const styles = StyleSheet.create({
  toast: {
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    gap: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.neutral.text,
  },
  desc: {
    fontSize: 13,
    color: colors.neutral.mutedText,
  },
});
