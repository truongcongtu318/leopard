import React from 'react';
import { Platform } from 'react-native';

import type { VietmapNavigationProps } from './types';
import {
  VietmapNavigationView as NativeNav,
  LeopardNavigationController as NativeController,
} from './VietmapNavigationView.native';
import {
  VietmapNavigationView as WebNav,
  LeopardNavigationController as WebController,
} from './VietmapNavigationView.web';

export const LeopardNavigationController =
  Platform.OS === 'web' ? WebController : NativeController;

export function VietmapNavigationView(props: VietmapNavigationProps) {
  if (Platform.OS === 'web') {
    return <WebNav {...props} />;
  }
  return <NativeNav {...props} />;
}
