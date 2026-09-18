import React from 'react';
import { StyleSheet, View, ViewProps, DimensionValue } from 'react-native';
import { radius, colors } from '../../theme/tokens';

export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ProgressProps extends ViewProps {
  value: number; // 0 to 100
  size?: ProgressSize;
  children?: React.ReactNode;
}

export interface ProgressFilledTrackProps extends ViewProps {
  color?: string;
}

const ProgressContext = React.createContext<{ value: number; size: ProgressSize }>({
  value: 0,
  size: 'md',
});

const sizeHeights: Record<ProgressSize, number> = {
  xs: 3,
  sm: 6,
  md: 8,
  lg: 12,
};

export const Progress: React.FC<ProgressProps> & {
  FilledTrack: React.FC<ProgressFilledTrackProps>;
} = ({ value, size = 'md', style, children, ...props }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const height = sizeHeights[size];

  return (
    <ProgressContext.Provider value={{ value: clampedValue, size }}>
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2 },
          style,
        ]}
        {...props}
      >
        {children || <ProgressFilledTrack />}
      </View>
    </ProgressContext.Provider>
  );
};

const ProgressFilledTrack: React.FC<ProgressFilledTrackProps> = ({ color, style, ...props }) => {
  const { value, size } = React.useContext(ProgressContext);
  const height = sizeHeights[size];

  return (
    <View
      style={[
        styles.filledTrack,
        {
          width: `${value}%` as DimensionValue,
          height,
          borderRadius: height / 2,
          backgroundColor: color || colors.brand.primary,
        },
        style,
      ]}
      {...props}
    />
  );
};

Progress.FilledTrack = ProgressFilledTrack;

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.neutral.surfaceMuted,
    overflow: 'hidden',
  },
  filledTrack: {
    height: '100%',
  },
});
