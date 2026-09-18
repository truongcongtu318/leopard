import React from 'react';
import { Platform } from 'react-native';
import { VietMapWeb as WebMap, type VietMapWebProps } from './VietMap.web';
import { VietMapWeb as NativeMap } from './VietMap.native';

export function VietMap(props: VietMapWebProps) {
  if (Platform.OS === 'web') {
    return <WebMap {...props} />;
  }
  return <NativeMap {...props} />;
}

export { WebMap as VietMapWeb };
export type { VietMapWebProps };
