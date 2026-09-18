import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';

export interface SpinnerProps extends ActivityIndicatorProps {
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  color = colors.brand.primary,
  size = 'small',
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={color} size={size} style={style} {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
