import { Platform } from 'react-native';

export const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
});

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  control: 12,
  card: 20,
  cardSm: 14,
  cardLg: 24,
  cardXl: 28,
  bezelOuter: 24,
  bezelInner: 18,
  tabBar: 9999,
  modal: 26,
  pill: 9999,
} as const;

/**
 * Apple Human Interface Guidelines: Continuous squircle curve.
 * iOS CALayer kCACornerCurveContinuous eliminates abrupt tangent changes at corner boundaries.
 */
export const iosContinuousCurve = {
  borderCurve: 'continuous' as const,
};

/**
 * Apple iOS Fluid Spring Physics tokens for Animated.spring.
 */
export const appleSpring = {
  /** Snappy response for sliders, toggles, button presses */
  snappy: { damping: 20, stiffness: 220, mass: 0.8 },
  /** Smooth floating response for bottom sheets and drawers */
  sheet: { damping: 24, stiffness: 200, mass: 0.85 },
  /** Bouncy celebratory spring for badges and success indicators */
  bouncy: { damping: 14, stiffness: 180, mass: 0.9 },
  /** Gentle transition for backdrop fades */
  gentle: { damping: 28, stiffness: 160, mass: 1 },
} as const;

export const control = {
  minimumTouchHeight: 44,
  stickyPrimaryMinimumHeight: 48,
} as const;

export const motion = {
  none: 0,
  fast: 120,
  standard: 180,
  slow: 240,
} as const;

export const layout = {
  contentMaxWidth: 768,
  mapMinimumHeight: 280,
  floatingNavHeight: 64,
  floatingNavBottomOffset: 16,
  floatingNavTotalHeight: 80,
  bottomNavClearance: 104,
} as const;

const sectionTitle = {
  fontSize: 20,
  fontWeight: '600' as const,
  lineHeight: 28,
} as const;

export const typography = {
  largeTitle: {
    fontFamily: systemFontFamily,
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 41,
    letterSpacing: -0.8,
  },
  title1: {
    fontFamily: systemFontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  title2: {
    fontFamily: systemFontFamily,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: systemFontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  callout: {
    fontFamily: systemFontFamily,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  subheadline: {
    fontFamily: systemFontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle,
  pageTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'] as const,
  },
  // Compatibility alias for existing primitives; new code should name the hierarchy.
  title: sectionTitle,
} as const;

export const colors = {
  neutral: {
    background: '#FFFFFF',
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    text: '#0F172A',
    titleText: '#0F172A',
    mutedText: '#475569',
    subtleText: '#64748B',
    border: '#E2E8F0',
    subtleBorder: '#CBD5E1',
    rowDivider: '#E2E8F0',
  },
  operational: {
    ink: '#0F172A',
    inkMuted: '#CBD5E1',
    inkPillBg: 'rgba(11, 30, 66, 0.08)',
    road: '#CBD5E1',
    mapLand: '#F8FAFC',
  },
  brand: {
    primary: '#0B1E42',
    accent: '#F59E0B',
    blue: '#0284C7',
    green: '#16A34A',
    background: '#0B1E42',
    text: '#FFFFFF',
    softBackground: '#F0F4F9',
    softText: '#0B1E42',
    border: '#0B1E42',
    accentSoft: '#FFFBEB',
    accentText: '#92400E',
  },
  info: {
    background: '#F0F4F9',
    text: '#0B1E42',
    border: '#CBD5E1',
  },
  warning: {
    background: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
  },
  active: {
    background: '#F0F4F9',
    text: '#0B1E42',
    border: '#0B1E42',
  },
  success: {
    background: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0',
  },
  danger: {
    background: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
  },
} as const;

/**
 * Calm, subtle theme for cards and operational modules.
 * Standardized across the application to prevent cartoonish saturated colors.
 */
export const pastelTheme = {
  yellowCard: {
    bg: '#FFFFFF',
    border: '#FDE68A',
    accent: '#F59E0B',
    text: '#92400E',
  },
  greenCard: {
    bg: '#FFFFFF',
    border: '#BBF7D0',
    accent: '#16A34A',
    text: '#14532D',
  },
  blueCard: {
    bg: '#FFFFFF',
    border: '#CBD5E1',
    accent: '#0B1E42',
    text: '#0B1E42',
  },
  slateCard: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    accent: '#475569',
    text: '#0F172A',
  },
} as const;

export const leopardPalette = {
  // Brand — Midnight Navy Blue
  primary: '#0B1E42',
  primaryDark: '#061226',
  primarySoft: '#0284C7',
  primaryBg: '#F0F4F9',
  primaryBorder: '#CBD5E1',

  // Accent — Leopard Amber Gold
  accentYellow: '#F59E0B',
  accentYellowDark: '#D97706',
  accentYellowSoft: '#FDE68A',
  accentYellowBg: '#FFFBEB',
  accentYellowBorder: '#FDE68A',

  // Eco — Calm Green
  ecoGreen: '#16A34A',
  ecoGreenSoft: '#BBF7D0',
  ecoGreenBg: '#F0FDF4',
  ecoGreenBorder: '#BBF7D0',

  // Surfaces
  bgMuted: '#F8FAFC',
  surfaceWhite: '#FFFFFF',
  canvas: '#F8FAFC',

  // Typography
  textSlateDark: '#0F172A',
  textMutedSlate: '#475569',
  textSubtle: '#64748B',

  // Borders & dividers
  cardBorder: '#E2E8F0',
  subtleDivider: '#E2E8F0',

  // Tab bar
  tabActive: '#0B1E42',
  tabInactive: '#64748B',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',

  // Input fields
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputFocusBorder: '#0B1E42',
  inputFocusRing: 'rgba(11, 30, 66, 0.08)',
  inputPlaceholder: '#94A3B8',

  // Vehicle card accents
  vehicleBaGac: '#F59E0B',
  vehicleTruck500: '#0B1E42',
  vehicleTruck1T: '#1D4ED8',
  vehicleTruck2T: '#4338CA',

  // Status online/offline indicator
  onlineGreen: '#16A34A',
  offlineGray: '#94A3B8',

  // Legacy — kept for backward compatibility
  darkHeroBg: '#0B1E42',
} as const;

/**
 * Customer-role colour palette.
 * Midnight Navy (#0B1E42) is primary action colour; Leopard Amber (#F59E0B) is accent/badges/points.
 * Use this in every customer-specific screen instead of leopardPalette.
 */
export const customerPalette = {
  // Primary — Midnight Navy (Chủ đạo thương hiệu & Hành động)
  primary: '#0B1E42',
  primaryDark: '#061226',
  primaryBg: '#F0F4F9',
  primaryBorder: '#CBD5E1',
  primaryText: '#0B1E42',

  // Brand Accent — Leopard Amber (Huy hiệu, điểm thưởng, voucher)
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentBg: '#FFFBEB',
  accentBorder: '#FDE68A',
  accentText: '#92400E',

  // Tab / nav (Active state)
  tabActive: '#0B1E42',
  tabActiveBg: '#F0F4F9',
  tabInactive: '#64748B',

  // Input focus
  inputFocusBorder: '#0B1E42',
  inputFocusRing: 'rgba(11, 30, 66, 0.08)',

  // Shared neutrals
  textSlateDark: '#0F172A',
  textMutedSlate: '#475569',
  textSubtle: '#64748B',
  cardBorder: '#E2E8F0',
  subtleDivider: '#E2E8F0',
  surfaceWhite: '#FFFFFF',
  bgMuted: '#F8FAFC',
  canvas: '#F8FAFC',
  onlineGreen: '#16A34A',
  offlineGray: '#94A3B8',
} as const;

export const leopardRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 999,
} as const;

export const leopardElevation = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const glass = {
  liquidDock: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export type SemanticColorRole = keyof typeof colors;
