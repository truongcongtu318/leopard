import {
  colors,
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
 * - CTA: driverPrimitives.colors.blue500 or '#0284C7'
 * - success: driverPrimitives.colors.green500 ('#00B14F')
 */
export const scene = {
  canvas: driverSemantics.surface.canvas,
  canvasDark: leopardPalette.primary,
  surface: driverSemantics.surface.card,
  surfaceDark: '#0F2347',
  fieldBg: '#132B52',
  fieldBgSoft: 'rgba(255, 255, 255, 0.06)',
  ink: driverSemantics.text.inverse,
  muted: driverSemantics.text.muted,
  mutedLight: leopardPalette.inputBorder,
  subtle: driverSemantics.text.muted,
  placeholder: colors.neutral.subtleText,
  border: driverPrimitives.colors.gray200,
  borderDark: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.20)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderDivider: 'rgba(255, 255, 255, 0.06)',
  inputBorder: 'rgba(255, 255, 255, 0.16)',
  inputFocusBorder: driverPrimitives.colors.cyan400 ?? '#38BDF8',
  ctaTop: '#0284C7',
  ctaBottom: '#0284C7',
  ctaCyan: driverPrimitives.colors.cyan400 ?? '#38BDF8',
  accentYellow: leopardPalette.accentYellow,
  badgeBg: 'rgba(56, 189, 248, 0.12)',
  badgeBorder: 'rgba(56, 189, 248, 0.35)',
  badgeText: driverPrimitives.colors.cyan400 ?? '#38BDF8',
  success: driverPrimitives.colors.green500,
  successLight: '#4ADE80',
  successBg: 'rgba(34, 197, 94, 0.16)',
  successBorder: 'rgba(34, 197, 94, 0.35)',
  warning: driverPrimitives.colors.amber500,
  danger: driverPrimitives.colors.red500,
  dangerLight: '#F87171',
  dangerBg: 'rgba(239, 68, 68, 0.14)',
  dangerBorder: 'rgba(248, 113, 113, 0.46)',
  dangerText: '#FECACA',
} as const;
