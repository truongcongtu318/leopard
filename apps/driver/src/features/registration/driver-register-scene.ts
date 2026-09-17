import {
  colors,
  driverPrimitives,
  driverSemantics,
  leopardPalette,
} from '@leopard/mobile-core';

/**
 * Global Driver Apple HIG Inset Grouped Theme palette.
 * Strictly adheres to Apple Human Interface Guidelines:
 * - Canvas (System Grouped Background): #F8FAFC
 * - Surface / Cards (Inset Grouped Card): #FFFFFF with fine border #E2E8F0
 * - Inks: Slate dark #0F172A (Primary), #64748B (Secondary / Muted), #94A3B8 (Tertiary / Subtle)
 * - Brand Primary: Midnight Navy (#0B2545) & Accent Amber (#F59E0B)
 */
export const scene = {
  canvas: '#F8FAFC',
  canvasDark: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceDark: '#FFFFFF',
  fieldBg: '#F8FAFC',
  fieldBgSoft: '#F1F5F9',
  ink: '#0F172A',
  muted: '#64748B',
  mutedLight: '#64748B',
  subtle: '#94A3B8',
  placeholder: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#E2E8F0',
  borderLight: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderDivider: '#F1F5F9',
  inputBorder: '#E2E8F0',
  inputFocusBorder: leopardPalette.primary,
  ctaTop: leopardPalette.primary,
  ctaBottom: leopardPalette.primary,
  ctaCyan: leopardPalette.primary,
  accentYellow: leopardPalette.accentYellow,
  badgeBg: 'rgba(11, 37, 69, 0.08)',
  badgeBorder: 'rgba(11, 37, 69, 0.16)',
  badgeText: leopardPalette.primary,
  success: '#15803D',
  successLight: '#15803D',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  danger: '#DC2626',
  dangerLight: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#B91C1C',
} as const;
