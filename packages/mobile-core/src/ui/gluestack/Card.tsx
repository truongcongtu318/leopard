import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Box, BoxProps } from './Box';
import { colors, radius, iosContinuousCurve } from '../../theme/tokens';

export interface CardProps extends BoxProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'elevated' | 'outline' | 'filled';
}

/**
 * Gluestack-compatible Card component adhering to Apple HIG continuous squircle tokens.
 */
export const Card = React.forwardRef<View, CardProps>(
  ({ size = 'md', variant = 'elevated', style, children, ...props }, ref) => {
    const cardStyles = [
      styles.base,
      styles[size],
      styles[variant],
      style,
    ];

    return (
      <Box ref={ref} style={cardStyles} {...props}>
        {children}
      </Box>
    );
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    ...iosContinuousCurve,
  },
  // Sizes
  sm: {
    padding: 12,
  },
  md: {
    padding: 16,
  },
  lg: {
    padding: 24,
  },
  // Variants
  elevated: {
    backgroundColor: colors.neutral.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  filled: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 0,
  },
});
