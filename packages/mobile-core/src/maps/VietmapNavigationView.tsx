import React from 'react';
import { Platform } from 'react-native';

import type { VietmapNavigationProps } from './types';
import { VietmapNavigationView as NativeNav } from './VietmapNavigationView.native';
import { VietmapNavigationView as WebNav } from './VietmapNavigationView.web';

export function VietmapNavigationView(props: VietmapNavigationProps) {
  if (Platform.OS === 'web') {
    return <WebNav {...props} />;
  }
  return <NativeNav {...props} />;
}
