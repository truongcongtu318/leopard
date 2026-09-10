import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconSizeToken = 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  size?: number | IconSizeToken;
  color?: string;
  strokeWidth?: number;
  testID?: string;
  style?: any;
}

export interface IconChevronProps extends IconProps {
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const ICON_SIZE_TOKENS: Record<IconSizeToken, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 36,
} as const;

export function resolveIconSize(size?: number | IconSizeToken): number {
  if (typeof size === 'number') return size;
  if (size && size in ICON_SIZE_TOKENS) return ICON_SIZE_TOKENS[size];
  return ICON_SIZE_TOKENS.lg;
}

const DEFAULT_COLOR = '#0F172A';
const DEFAULT_STROKE = 1.8;
const INTERACTIVE_STROKE = 2.0;

export function IconTruck({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-truck',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M2 5H15V16H2V5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 9H18.5L21 12.5V16H15V9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="6" cy="18" r="2" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17.5" cy="18" r="2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconVan({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-van',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M2 7C2 6.44772 2.44772 6 3 6H14V16H2V7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 8H18C18.5 8 19 8.4 19.3 8.9L21.5 12.5C21.8 13 22 13.5 22 14V16H14V8Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="6.5" cy="18" r="2" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17.5" cy="18" r="2" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M14 9H17.5L19.5 12.5H14V9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBike({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-bike',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Circle cx="5.5" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="18.5" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M5.5 17.5H10L13 12H16.5L18.5 17.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 12L15 7H17"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10.5H11.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconWarehouse({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-warehouse',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M3 21V9L12 4L21 9V21H3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V13H15V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 16H15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconOffice({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-office',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7H10M14 7H16M8 11H10M14 11H16M8 15H10M14 15H16M10 21V17H14V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPin({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-pin',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M12 21C16 16.5 19 13.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 13.5 8 16.5 12 21Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconReceipt({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-receipt',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M4 3H20V21L17 19.5L14 21L11 19.5L8 21L4 18.5V3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7H16M8 11H16M8 15H13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconShield({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-shield',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M12 2.5L4 5.5V11.5C4 16.5 7.5 20.8 12 22C16.5 20.8 20 16.5 20 11.5V5.5L12 2.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 12L11 14.5L15.5 9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClose({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = INTERACTIVE_STROKE,
  testID = 'icon-close',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconChevron({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = INTERACTIVE_STROKE,
  direction = 'down',
  testID = 'icon-chevron',
  style,
}: IconChevronProps) {
  const s = resolveIconSize(size);
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
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSearch({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = INTERACTIVE_STROKE,
  testID = 'icon-search',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M20 20L16 16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconAlertTriangle({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-alert-triangle',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 9v4M12 17h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClock({
  size = 'lg',
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE,
  testID = 'icon-clock',
  style,
}: IconProps) {
  const s = resolveIconSize(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" testID={testID} style={style}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7V12L15.5 14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
