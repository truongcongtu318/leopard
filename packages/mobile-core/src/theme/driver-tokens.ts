/**
 * LEOPARD Driver Design System Tokens
 * Deconstructed directly from Grab Driver production interface.
 *
 * Three-Layer Token Architecture:
 *   1. Primitives (Raw values: palette, scales, curves)
 *   2. Semantics (Role-based mappings: surface, content, status, interactive)
 *   3. Components (Specific element contracts: HUD capsules, power switch, dock, badges)
 */

import { Platform } from 'react-native';

/* ==========================================================================
 * 1. PRIMITIVES (Raw Values)
 * ========================================================================== */

export const driverPrimitives = {
  colors: {
    // Grab Iconic Emerald Brand
    green50: '#E8F8EE',
    green100: '#D1F2DD',
    green500: '#00B14F', // Primary Grab Emerald
    green600: '#009743',
    green700: '#008038',
    green900: '#004D22',

    // Dark HUD & Charcoal Inks
    dark950: '#0F172A',
    dark900: '#1E242B', // "Bật kết nối" Hero Duty Switch background
    dark800: '#2A323D',
    dark700: '#334155',

    // Neutral Grays & Surfaces
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9', // Circular action icon bg
    gray200: '#E2E8F0', // Card dividers & borders
    gray300: '#CBD5E1',
    gray400: '#94A3B8', // Inactive icons & chevrons
    gray500: '#64748B', // Subtitles & metadata
    gray700: '#334155', // Body labels
    gray900: '#1E293B', // High contrast title text

    // Accents & Signals
    amber400: '#FBBF24',
    amber500: '#F59E0B', // Driver star rating (★ 5.00)
    red500: '#EF4444', // "MỚI" badge, red notification dot, critical alert
    red600: '#DC2626',
    red50: '#FEF2F2',
    blue500: '#007AFF', // Action link, navigation puck, tooltip callout
    blue600: '#0055D4',
    cyan400: '#06B6D4',
    teal400: '#2DD4BF', // Diamond rewards gem (💎)
  },

  typography: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Roboto, sans-serif',
    }),
    sizes: {
      heroNum: 32, // Large earnings amount (0 đ)
      largeTitle: 28, // Main headings
      title1: 22, // Screen titles ("Tất cả cài đặt", "Ví")
      title2: 18, // Card titles & Driver Name
      headline: 16, // Section headers ("Tài khoản của tôi", "Nhiều tiện ích...")
      body: 15, // Standard list item labels
      subheadline: 14, // Secondary labels & HUD pills
      footnote: 13, // KPI rates (0.0% Chấp nhận / Huỷ bỏ) & captions
      caption: 12, // Subtitles, timestamps
      badge: 10, // "MỚI" badges & notification pills
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
  },

  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hud: 44, // Minimum touch target clearance
    dock: 64, // Floating dock height
  },

  radius: {
    none: 0,
    xs: 4,
    sm: 6,
    md: 10,
    card: 12, // Crisp, restrained Apple HIG card curvature
    bento: 14, // Grouped settings & KPI containers
    sheet: 20, // Bottom sheets & popovers
    pill: 9999, // HUD capsules, "Bật kết nối" button, action circles
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    powerPill: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

/* ==========================================================================
 * 2. SEMANTICS (Role-based Mappings)
 * ========================================================================== */

export const driverSemantics = {
  surface: {
    canvas: driverPrimitives.colors.gray50,
    card: driverPrimitives.colors.white,
    cardSubtle: driverPrimitives.colors.gray50,
    cardHighlighted: driverPrimitives.colors.green50,
    overlayScrim: 'rgba(15, 23, 42, 0.45)',
    hudPill: driverPrimitives.colors.white,
    powerPill: driverPrimitives.colors.dark900,
    quickActionCircle: driverPrimitives.colors.gray100,
    activeTabCircle: driverPrimitives.colors.green500,
  },

  text: {
    primary: driverPrimitives.colors.gray900,
    secondary: driverPrimitives.colors.gray500,
    muted: driverPrimitives.colors.gray400,
    inverse: driverPrimitives.colors.white,
    brand: driverPrimitives.colors.green500,
    brandDark: driverPrimitives.colors.green700,
    warning: driverPrimitives.colors.red600,
    link: driverPrimitives.colors.blue500,
  },

  border: {
    divider: driverPrimitives.colors.gray200,
    subtle: 'rgba(226, 232, 240, 0.8)',
    highlight: driverPrimitives.colors.green100,
    focus: driverPrimitives.colors.green500,
  },

  status: {
    online: driverPrimitives.colors.green500,
    offline: driverPrimitives.colors.red500,
    ratingStar: driverPrimitives.colors.amber500,
    newBadgeBg: driverPrimitives.colors.red500,
    newBadgeText: driverPrimitives.colors.white,
    rewardGem: driverPrimitives.colors.teal400,
    tooltipBg: driverPrimitives.colors.blue500,
  },
} as const;

/* ==========================================================================
 * 3. COMPONENT SPECIFICATIONS (Grab Driver Architecture)
 * ========================================================================== */

export const driverComponents = {
  hudCapsule: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: driverPrimitives.radius.pill,
    backgroundColor: driverSemantics.surface.hudPill,
    ...driverPrimitives.shadows.md,
    textStyle: {
      fontSize: driverPrimitives.typography.sizes.subheadline,
      fontWeight: driverPrimitives.typography.weights.semibold,
      color: driverSemantics.text.primary,
    },
  },

  driverAvatarBadge: {
    avatarSize: 44,
    statusDotSize: 10,
    starPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: driverPrimitives.radius.pill,
      backgroundColor: driverPrimitives.colors.white,
      ...driverPrimitives.shadows.sm,
    },
  },

  powerDutySwitch: {
    height: 52,
    paddingHorizontal: 28,
    borderRadius: driverPrimitives.radius.pill,
    backgroundColor: driverSemantics.surface.powerPill,
    ...driverPrimitives.shadows.powerPill,
    iconColor: driverPrimitives.colors.white,
    textColor: driverPrimitives.colors.white,
    fontSize: driverPrimitives.typography.sizes.headline,
    fontWeight: driverPrimitives.typography.weights.bold,
  },

  noticeAlertCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: driverPrimitives.radius.card,
    borderWidth: 1,
    borderColor: driverPrimitives.colors.gray200,
    ...driverPrimitives.shadows.sm,
    padding: driverPrimitives.spacing.lg,
    actionLinkColor: driverPrimitives.colors.blue600,
  },

  floatingBottomDock: {
    height: 64,
    borderRadius: driverPrimitives.radius.pill,
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.floating,
    activeItemBg: driverPrimitives.colors.green500,
    inactiveItemColor: driverPrimitives.colors.gray500,
    iconSize: 24,
  },

  financeTabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: driverPrimitives.colors.gray200,
    backgroundColor: driverPrimitives.colors.white,
    activeColor: driverPrimitives.colors.green500,
    inactiveColor: driverPrimitives.colors.gray400,
    labelFontSize: 12,
  },

  metricCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: driverPrimitives.radius.card,
    borderWidth: 1,
    borderColor: driverPrimitives.colors.gray200,
    padding: driverPrimitives.spacing.lg,
    amountFontSize: driverPrimitives.typography.sizes.heroNum,
    amountFontWeight: driverPrimitives.typography.weights.bold,
    amountColor: driverPrimitives.colors.gray900,
  },

  quickActionCircle: {
    size: 52,
    borderRadius: driverPrimitives.radius.pill,
    backgroundColor: driverPrimitives.colors.gray100,
    iconSize: 22,
    iconColor: driverPrimitives.colors.gray900,
    labelFontSize: 12,
    labelColor: driverPrimitives.colors.gray900,
    badgeColor: driverPrimitives.colors.red500,
  },

  settingsGroup: {
    borderRadius: driverPrimitives.radius.bento,
    backgroundColor: driverPrimitives.colors.white,
    borderWidth: 1,
    borderColor: driverPrimitives.colors.gray200,
    bannerHighlightBg: driverPrimitives.colors.green50,
    bannerHighlightTextColor: driverPrimitives.colors.green700,
    switchActiveColor: driverPrimitives.colors.green500,
    chevronColor: driverPrimitives.colors.gray400,
  },

  floatingTooltip: {
    backgroundColor: driverPrimitives.colors.blue500,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    textColor: driverPrimitives.colors.white,
    fontSize: 13,
    fontWeight: driverPrimitives.typography.weights.semibold,
    arrowSize: 6,
  },
} as const;
