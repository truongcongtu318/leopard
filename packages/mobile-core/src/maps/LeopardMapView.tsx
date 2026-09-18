import React from 'react';
import { Platform } from 'react-native';

import type { LeopardMapViewProps } from './types';
import { LeopardMapView as NativeMap } from './LeopardMapView.native';
import { LeopardMapView as WebMap } from './LeopardMapView.web';

export function LeopardMapView(props: LeopardMapViewProps) {
  if (Platform.OS === 'web') {
    return <WebMap {...props} />;
  }
  return <NativeMap {...props} />;
}
