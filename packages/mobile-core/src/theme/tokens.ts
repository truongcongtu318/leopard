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
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle,
  pageTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
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
    subtleText: '#94A3B8',
    border: '#E2E8F0',
    subtleBorder: '#F1F5F9',
    rowDivider: '#F1F5F9',
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
  textSubtle: '#94A3B8',

  // Borders & dividers
  cardBorder: '#E2E8F0',
  subtleDivider: '#F1F5F9',

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
 * Amber Gold (#F59E0B) is the primary action colour; Midnight Navy (#0B1E42) is secondary/supporting.
 * Use this in every customer-specific screen instead of leopardPalette.
 */
export const customerPalette = {
  // Primary — Amber Gold (cam vàng LEOPARD)
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryBg: '#FFFBEB',
  primaryBorder: '#FDE68A',
  primaryText: '#92400E',   // readable text on amber bg

  // Secondary — Midnight Navy
  secondary: '#0B1E42',
  secondaryBg: '#F0F4F9',
  secondaryBorder: '#CBD5E1',

  // Tab / nav
  tabActive: '#F59E0B',
  tabActiveBg: '#FFFBEB',
  tabInactive: '#64748B',

  // Input focus
  inputFocusBorder: '#F59E0B',
  inputFocusRing: 'rgba(245, 158, 11, 0.12)',

  // Shared neutrals — mirrors leopardPalette
  textSlateDark: '#0F172A',
  textMutedSlate: '#475569',
  textSubtle: '#94A3B8',
  cardBorder: '#E2E8F0',
  subtleDivider: '#F1F5F9',
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

export type SemanticColorRole = keyof typeof colors;
