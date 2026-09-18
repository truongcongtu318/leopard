import React from 'react';
import {
  Switch as RNSwitch,
  SwitchProps as RNSwitchProps,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors } from '../../theme/tokens';

export interface SwitchProps extends Omit<RNSwitchProps, 'trackColor' | 'thumbColor'> {
  size?: 'sm' | 'md' | 'lg';
  trackColor?: { false?: string; true?: string };
  thumbColor?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  trackColor = { false: '#E2E8F0', true: colors.brand.primary },
  thumbColor = '#FFFFFF',
  style,
  ...props
}) => {
  return (
    <RNSwitch
      disabled={disabled}
      onValueChange={onValueChange}
      style={style}
      thumbColor={thumbColor}
      trackColor={trackColor}
      value={value}
      {...props}
    />
  );
};
