import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors } from '../../theme/tokens';

export interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  size?: number;
  color?: string;
}

/**
 * Gluestack-compatible Divider primitive.
 * Standardizes hairline separators across mobile lists, cards, and KPI sections.
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  size = StyleSheet.hairlineWidth,
  color = colors.neutral.border,
  style,
  ...props
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      style={[
        isHorizontal
          ? { height: size, width: '100%', backgroundColor: color }
          : { width: size, height: '100%', backgroundColor: color },
        style,
      ]}
      {...props}
    />
  );
};
