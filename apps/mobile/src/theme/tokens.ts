export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  control: 6,
  card: 6,
  pill: 999,
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
  body: {
    fontSize: 16,
    lineHeight: 24,
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
    canvas: '#F6F7F4',
    surface: '#F3F4F6',
    text: '#17202A',
    mutedText: '#4B5563',
    border: '#6B7280',
    subtleBorder: '#D1D5DB',
  },
  operational: {
    ink: '#102A36',
    inkMuted: '#C8D6DA',
    road: '#D9DEDC',
    mapLand: '#EDF0EA',
  },
  brand: {
    background: '#075985',
    text: '#FFFFFF',
    softBackground: '#E0F2FE',
    softText: '#0C4A6E',
  },
  info: {
    background: '#E0F2FE',
    text: '#075985',
    border: '#0369A1',
  },
  warning: {
    background: '#FEF3C7',
    text: '#78350F',
    border: '#B45309',
  },
  active: {
    background: '#DBEAFE',
    text: '#1E3A8A',
    border: '#1D4ED8',
  },
  success: {
    background: '#DCFCE7',
    text: '#14532D',
    border: '#15803D',
  },
  danger: {
    background: '#FEE2E2',
    text: '#7F1D1D',
    border: '#B91C1C',
  },
} as const;

export type SemanticColorRole = keyof typeof colors;
