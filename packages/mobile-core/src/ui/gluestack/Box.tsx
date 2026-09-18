import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { spacing, radius, colors } from '../../theme/tokens';

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;

export interface BoxProps extends ViewProps {
  children?: React.ReactNode;
  p?: SpacingKey | number;
  px?: SpacingKey | number;
  py?: SpacingKey | number;
  pt?: SpacingKey | number;
  pb?: SpacingKey | number;
  pl?: SpacingKey | number;
  pr?: SpacingKey | number;
  m?: SpacingKey | number;
  mx?: SpacingKey | number;
  my?: SpacingKey | number;
  mt?: SpacingKey | number;
  mb?: SpacingKey | number;
  ml?: SpacingKey | number;
  mr?: SpacingKey | number;
  bg?: string;
  rounded?: RadiusKey | number;
  borderWidth?: number;
  borderColor?: string;
}

const resolveSpacing = (val?: SpacingKey | number): number | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return val;
  return spacing[val];
};

const resolveRadius = (val?: RadiusKey | number): number | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return val;
  return radius[val];
};

/**
 * Gluestack-compatible layout Box primitive for LEOPARD mobile apps.
 * Operates purely on token mappings without requiring PostCSS/NativeWind bundler setups.
 */
export const Box = React.forwardRef<View, BoxProps>(
  (
    {
      children,
      style,
      p,
      px,
      py,
      pt,
      pb,
      pl,
      pr,
      m,
      mx,
      my,
      mt,
      mb,
      ml,
      mr,
      bg,
      rounded,
      borderWidth,
      borderColor,
      ...props
    },
    ref
  ) => {
    const computedStyle = {
      padding: resolveSpacing(p),
      paddingHorizontal: resolveSpacing(px),
      paddingVertical: resolveSpacing(py),
      paddingTop: resolveSpacing(pt),
      paddingBottom: resolveSpacing(pb),
      paddingLeft: resolveSpacing(pl),
      paddingRight: resolveSpacing(pr),
      margin: resolveSpacing(m),
      marginHorizontal: resolveSpacing(mx),
      marginVertical: resolveSpacing(my),
      marginTop: resolveSpacing(mt),
      marginBottom: resolveSpacing(mb),
      marginLeft: resolveSpacing(ml),
      marginRight: resolveSpacing(mr),
      backgroundColor: bg,
      borderRadius: resolveRadius(rounded),
      borderWidth,
      borderColor,
    };

    return (
      <View ref={ref} style={[computedStyle, style]} {...props}>
        {children}
      </View>
    );
  }
);

Box.displayName = 'Box';
