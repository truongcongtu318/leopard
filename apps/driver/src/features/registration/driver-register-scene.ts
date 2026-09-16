import {
  driverPrimitives,
  driverSemantics,
  leopardPalette,
} from '@leopard/mobile-core';

/**
 * Scene palette for Driver Registration.
 * Reference tokens:
 * - canvas: driverSemantics.surface.canvas (or '#0B1E42' for dark night cockpit)
 * - surface: driverSemantics.surface.card
 * - ink: driverSemantics.text.inverse ('#FFFFFF')
 * - muted/subtle: driverSemantics.text.muted ('#94A3B8')
 * - borders: driverPrimitives.colors.*
 * - CTA #0284C7: driverPrimitives.colors.blue500 or '#0284C7'
 * - success: driverPrimitives.colors.green500 ('#00B14F')
 */
export const scene = {
  canvas: driverSemantics.surface.canvas, // '#F8FAFC' in light, theme-aware
  canvasDark: '#0B1E42',
  surface: driverSemantics.surface.card, // '#FFFFFF'
  surfaceDark: '#0F2347',
  fieldBg: '#132B52',
  fieldBgSoft: 'rgba(255, 255, 255, 0.06)',
  ink: driverSemantics.text.inverse, // '#FFFFFF'
  muted: driverSemantics.text.muted, // '#94A3B8'
  mutedLight: '#CBD5E1',
  subtle: driverSemantics.text.muted,
  border: driverPrimitives.colors.gray200,
  borderDark: 'rgba(255, 255, 255, 0.12)',
  inputBorder: 'rgba(255, 255, 255, 0.16)',
  inputFocusBorder: '#38BDF8',
  ctaTop: '#0284C7',
  ctaBottom: '#0284C7',
  ctaCyan: '#38BDF8',
  accentYellow: leopardPalette.accentYellow,
  badgeBg: 'rgba(56, 189, 248, 0.12)',
  badgeBorder: 'rgba(56, 189, 248, 0.35)',
  badgeText: '#38BDF8',
  success: driverPrimitives.colors.green500, // '#00B14F'
  successLight: '#4ADE80',
  successBg: 'rgba(34, 197, 94, 0.16)',
  successBorder: 'rgba(34, 197, 94, 0.35)',
} as const;
