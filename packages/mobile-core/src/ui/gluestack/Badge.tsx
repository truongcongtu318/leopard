import React from 'react';
import { View, StyleSheet, ViewProps, TextStyle, StyleProp } from 'react-native';
import { AppText } from '../AppText';
import { colors, radius, spacing, iosContinuousCurve } from '../../theme/tokens';

export type BadgeAction = 'muted' | 'info' | 'success' | 'warning' | 'error';
export type BadgeVariant = 'solid' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends ViewProps {
  action?: BadgeAction;
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: React.ReactNode;
}

export interface BadgeTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const BadgeContext = React.createContext<{ action: BadgeAction; variant: BadgeVariant; size: BadgeSize }>({
  action: 'muted',
  variant: 'solid',
  size: 'md',
});

/**
 * Gluestack-compatible Badge component with Apple HIG continuous curve & status colors.
 */
export const Badge: React.FC<BadgeProps> & { Text: React.FC<BadgeTextProps> } = ({
  action = 'muted',
  variant = 'solid',
  size = 'md',
  style,
  children,
  ...props
}) => {
  const containerStyle = [
    styles.base,
    styles[size],
    actionStyles[action][variant],
    style,
  ];

  return (
    <BadgeContext.Provider value={{ action, variant, size }}>
      <View style={containerStyle} {...props}>
        {children}
      </View>
    </BadgeContext.Provider>
  );
};

const BadgeText: React.FC<BadgeTextProps> = ({ children, style, numberOfLines }) => {
  const { action, variant, size } = React.useContext(BadgeContext);
  const textColor = textColors[action][variant];

  return (
    <AppText
      numberOfLines={numberOfLines}
      variant={size === 'sm' ? 'caption2' : 'caption1'}
      style={[{ color: textColor, fontWeight: '600' }, style]}
    >
      {children}
    </AppText>
  );
};

Badge.Text = BadgeText;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    ...iosContinuousCurve,
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

const actionStyles = {
  muted: {
    solid: { backgroundColor: colors.neutral.surfaceMuted },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.neutral.border },
  },
  info: {
    solid: { backgroundColor: colors.info.background },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.info.border },
  },
  success: {
    solid: { backgroundColor: colors.success.background },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success.border },
  },
  warning: {
    solid: { backgroundColor: colors.warning.background },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.warning.border },
  },
  error: {
    solid: { backgroundColor: colors.danger.background },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger.border },
  },
};

const textColors = {
  muted: {
    solid: colors.neutral.mutedText,
    outline: colors.neutral.mutedText,
  },
  info: {
    solid: colors.info.text,
    outline: colors.info.text,
  },
  success: {
    solid: colors.success.text,
    outline: colors.success.text,
  },
  warning: {
    solid: colors.warning.text,
    outline: colors.warning.text,
  },
  error: {
    solid: colors.danger.text,
    outline: colors.danger.text,
  },
};
