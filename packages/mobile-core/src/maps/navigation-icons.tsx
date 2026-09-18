import React from 'react';

export interface NavigationIconProps {
  sign: number;
  size?: number;
  color?: string;
}

export function getManeuverSignDescription(sign: number): string {
  switch (sign) {
    case -3:
      return 'Rẽ gắt trái';
    case -2:
      return 'Rẽ trái';
    case -1:
      return 'Rẽ nhẹ trái';
    case 1:
      return 'Rẽ nhẹ phải';
    case 2:
      return 'Rẽ phải';
    case 3:
      return 'Rẽ gắt phải';
    case 4:
      return 'Đã đến đích';
    case 5:
      return 'Đến điểm dừng';
    case 6:
      return 'Vào vòng xuyến';
    case 8:
      return 'Quay đầu xe';
    case 0:
    default:
      return 'Tiếp tục đi thẳng';
  }
}

/**
 * Returns raw SVG markup string for use inside HTML/DOM MapLibre markers or HUD.
 */
export function getManeuverSvg(sign: number, color = '#FFFFFF', size = 28): string {
  let path = 'M12 4v16m0-16l-5 5m5-5l5 5'; // default straight
  if (sign === -2) {
    // Turn left
    path = 'M19 19v-6a4 4 0 0 0-4-4H5m0 0l5-5m-5 5l5 5';
  } else if (sign === -1) {
    // Slight left
    path = 'M16 19l-4-6-4-4m0 0h6m-6 0v6';
  } else if (sign === -3) {
    // Sharp left
    path = 'M18 19v-8a3 3 0 0 0-3-3H7m0 0l4-4m-4 4l4 4';
  } else if (sign === 2) {
    // Turn right
    path = 'M5 19v-6a4 4 0 0 1 4-4h10m0 0l-5-5m5 5l-5 5';
  } else if (sign === 1) {
    // Slight right
    path = 'M8 19l4-6 4-4m0 0h-6m6 0v6';
  } else if (sign === 3) {
    // Sharp right
    path = 'M6 19v-8a3 3 0 0 1 3-3h8m0 0l-4-4m4 4l-4 4';
  } else if (sign === 4) {
    // Finish flag
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
  } else if (sign === 8) {
    // U-turn
    path = 'M9 19V9a5 5 0 0 1 10 0v10m0 0l-4-4m4 4l4-4';
  } else if (sign === 6) {
    // Roundabout
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M16 3h5v5"/></svg>`;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}
