import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  iconDefaults,
  iconStroke,
  resolveIconSize,
  resolveIconStroke,
  type IconSizeToken,
  type IconStrokeToken,
} from '../theme/tokens';

export interface IconProps {
  size?: number | IconSizeToken;
  color?: string;
  strokeWidth?: number | IconStrokeToken;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export interface IconChevronProps extends IconProps {
  direction?: 'up' | 'down' | 'left' | 'right';
}

const DEFAULT_COLOR = '#0F172A';

/**
 * Vehicle and document glyphs that do not exist in the CoreIcons set.
 *
 * The duplicated names this module used to own (IconClock, IconClose,
 * IconOffice, IconSearch, IconWarehouse) now resolve to the single CoreIcons
 * implementation. Two geometries for one name rendered differently depending
 * on the import path, which is a defect, not a variant.
 */

export function IconBike({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.medium,
  testID = 'icon-bike',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Circle cx="5.5" cy="17.5" r="2.5" stroke={color} strokeWidth={sw} />
      <Circle cx="18.5" cy="17.5" r="2.5" stroke={color} strokeWidth={sw} />
      <Path
        d="M5.5 17.5H10L13 12H16.5L18.5 17.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 12L15 7H17"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10.5H11.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPin({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.medium,
  testID = 'icon-pin',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M12 21C16 16.5 19 13.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 13.5 8 16.5 12 21Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth={sw} />
    </Svg>
  );
}

export function IconReceipt({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.medium,
  testID = 'icon-receipt',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M4 3H20V21L17 19.5L14 21L11 19.5L8 21L4 18.5V3Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7H16M8 11H16M8 15H13"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// These three were byte-for-byte (IconShield) or near-identical (IconVan,
// IconTruck) redraws of icons the canonical set already ships. Two drawings of
// one metaphor under two names is the same drift the icon contract forbids, so
// the names now resolve to the single CoreIcons implementation.
export {
  IconSecurityShield as IconShield,
  IconVehicleLightTruck as IconTruck,
  IconVehicleVan as IconVan,
} from '../ui/icons/CoreIcons';
export function IconChevron({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.bold,
  direction = 'down',
  testID = 'icon-chevron',
  style,
}: IconChevronProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  const dMap: Record<string, string> = {
    down: 'M6 9L12 15L18 9',
    up: 'M18 15L12 9L6 15',
    left: 'M15 18L9 12L15 6',
    right: 'M9 6L15 12L9 18',
  };
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d={dMap[direction] || dMap.down}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconAlertTriangle({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.medium,
  testID = 'icon-alert-triangle',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 9v4M12 17h.01"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCrosshair({
  size = iconDefaults.size,
  color = DEFAULT_COLOR,
  strokeWidth = iconStroke.medium,
  testID = 'icon-crosshair',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  const sw = resolveIconStroke(strokeWidth);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Circle cx={12} cy={12} r={7} stroke={color} strokeWidth={sw} />
      <Circle cx={12} cy={12} r={2.5} fill={color} />
      <Path d="M12 2v3.5M12 18.5v3.5M2 12h3.5M18.5 12h3.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}
