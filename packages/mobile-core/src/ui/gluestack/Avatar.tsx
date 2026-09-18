import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
} from 'react-native';
import { radius, colors, iosContinuousCurve } from '../../theme/tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends ViewProps {
  size?: AvatarSize;
  children?: React.ReactNode;
}

export interface AvatarImageProps {
  source: ImageSourcePropType;
  accessibilityLabel?: string;
}

export interface AvatarFallbackTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export interface AvatarBadgeProps extends ViewProps {
  action?: 'success' | 'warning' | 'error' | 'muted';
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const AvatarContext = React.createContext<{ size: AvatarSize }>({ size: 'md' });

export const Avatar: React.FC<AvatarProps> & {
  Image: React.FC<AvatarImageProps>;
  FallbackText: React.FC<AvatarFallbackTextProps>;
  Badge: React.FC<AvatarBadgeProps>;
} = ({ size = 'md', style, children, ...props }) => {
  const dimension = sizeMap[size];

  return (
    <AvatarContext.Provider value={{ size }}>
      <View
        style={[
          styles.container,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </AvatarContext.Provider>
  );
};

const AvatarImage: React.FC<AvatarImageProps> = ({ source, accessibilityLabel }) => {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      source={source}
      style={StyleSheet.absoluteFill}
    />
  );
};

const AvatarFallbackText: React.FC<AvatarFallbackTextProps> = ({ children, style }) => {
  const { size } = React.useContext(AvatarContext);
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 12 : size === 'md' ? 15 : size === 'lg' ? 18 : 22;

  return (
    <Text style={[styles.fallbackText, { fontSize }, style]}>
      {children.slice(0, 2).toUpperCase()}
    </Text>
  );
};

const AvatarBadge: React.FC<AvatarBadgeProps> = ({ action = 'success', style, ...props }) => {
  const { size } = React.useContext(AvatarContext);
  const badgeSize = size === 'xs' ? 6 : size === 'sm' ? 8 : size === 'md' ? 10 : 12;

  const bgMap = {
    success: '#00B14F',
    warning: '#F26722',
    error: '#FF3B30',
    muted: '#999999',
  };

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: bgMap[action],
        },
        style,
      ]}
      {...props}
    />
  );
};

Avatar.Image = AvatarImage;
Avatar.FallbackText = AvatarFallbackText;
Avatar.Badge = AvatarBadge;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...iosContinuousCurve,
  },
  fallbackText: {
    fontWeight: '700',
    color: colors.neutral.text,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
