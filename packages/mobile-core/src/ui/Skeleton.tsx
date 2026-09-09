import { useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme/tokens';

export type SkeletonBarProps = Readonly<{
  height?: number;
  style?: ViewStyle;
  width?: number | `${number}%`;
  borderRadius?: number;
}>;

export function SkeletonBar({
  borderRadius = radius.control,
  height = 16,
  style,
  width = '100%',
}: SkeletonBarProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 700,
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 700,
          toValue: 0.45,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeleton,
        {
          borderRadius,
          height,
          opacity,
          width,
        },
        style,
      ]}
    />
  );
}

export type SkeletonCardProps = Readonly<{
  children?: React.ReactNode;
  style?: ViewStyle;
}>;

export function SkeletonCard({ children, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]} testID="skeleton-card">
      {children ?? (
        <>
          <SkeletonBar height={14} width="60%" />
          <SkeletonBar height={38} width="100%" />
          <SkeletonBar height={14} width="80%" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  skeleton: {
    backgroundColor: colors.neutral.border,
  },
});
