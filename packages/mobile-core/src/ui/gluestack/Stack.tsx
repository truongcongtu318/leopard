import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Box, BoxProps } from './Box';
import { spacing } from '../../theme/tokens';

export interface StackProps extends BoxProps {
  space?: keyof typeof spacing | number;
  reversed?: boolean;
}

const resolveGap = (space?: keyof typeof spacing | number): number | undefined => {
  if (space === undefined) return undefined;
  if (typeof space === 'number') return space;
  return spacing[space];
};

/**
 * Gluestack-compatible VStack for vertical layout with standardized token gaps.
 */
export const VStack = React.forwardRef<View, StackProps>(
  ({ space, reversed, style, children, ...props }, ref) => {
    const gap = resolveGap(space);
    const stackStyle: ViewStyle = {
      flexDirection: reversed ? 'column-reverse' : 'column',
      gap,
    };

    return (
      <Box ref={ref} style={[stackStyle, style]} {...props}>
        {children}
      </Box>
    );
  }
);

VStack.displayName = 'VStack';

/**
 * Gluestack-compatible HStack for horizontal layout with standardized token gaps.
 */
export const HStack = React.forwardRef<View, StackProps>(
  ({ space, reversed, style, children, ...props }, ref) => {
    const gap = resolveGap(space);
    const stackStyle: ViewStyle = {
      flexDirection: reversed ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap,
    };

    return (
      <Box ref={ref} style={[stackStyle, style]} {...props}>
        {children}
      </Box>
    );
  }
);

HStack.displayName = 'HStack';
