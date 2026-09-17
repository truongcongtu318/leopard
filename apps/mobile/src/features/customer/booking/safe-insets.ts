import React from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

export interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useSafeInsets(): EdgeInsets {
  const insets = React.useContext(SafeAreaInsetsContext);
  return {
    top: insets?.top ?? 0,
    bottom: insets?.bottom ?? 0,
    left: insets?.left ?? 0,
    right: insets?.right ?? 0,
  };
}
