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
    // LEOPARD Brand — Lalamove Heat Orange
    orange50: '#FFF5EE',
    orange500: '#F26722',
    orange600: '#D9541F',
    orange700: '#C2410C',

    // Primary Emerald / Fresh Green — used for success/online status
    green50: '#E8F8EE',
    green100: '#D1F2DD',
    green500: '#00B14F', // Fresh Green
    green600: '#009743',
    green700: '#008038',
    green900: '#004D22',

    // Dark HUD & Charcoal Inks
    dark950: '#0B2545',
    dark900: '#1A1A1A', // "Bật kết nối" Hero Duty Switch background
    dark800: '#2A323D',
    dark700: '#334155',

    // Neutral Grays & Surfaces (Lalamove Clean Grey Scheme)
    white: '#FFFFFF',
    gray50: '#F5F6F8', // Lalamove Canvas
    gray100: '#F0F2F5', // Circular action icon bg
    gray200: '#E8E8E8', // Card dividers & borders
    gray300: '#D8D8D8',
    gray400: '#999999', // Inactive icons & chevrons
    gray500: '#777777', // Subtitles & metadata
    gray700: '#555555', // Body labels
    gray900: '#1A1A1A', // High contrast title text

    // Accents & Signals
    amber400: '#FFB800',
    amber500: '#FEA000', // Lalamove Orange Peel star rating (★ 5.00)
    red500: '#FF4D4F', // "MỚI" badge, red notification dot, critical alert
    red600: '#DC2626',
    red50: '#FFF1F0',
    blue500: '#1890FF', // Action link, navigation puck, tooltip callout
    blue600: '#096DD9',
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

/**
 * LEOPARD brand tokens for driver screens migrating off Grab green.
 * Not consumed anywhere yet — existing screens read driverPrimitives.colors.green*
 * directly for both brand-active state and success/online status.
 */
export const driverBrand = {
  primary: driverPrimitives.colors.orange500,
  primaryDark: driverPrimitives.colors.orange600,
  primarySoft: driverPrimitives.colors.orange50,
} as const;

/* ==========================================================================
 * 2. SEMANTICS (Role-based Mappings)
 * ========================================================================== */

export const driverSemantics = {
  surface: {
    canvas: driverPrimitives.colors.gray50,
    card: driverPrimitives.colors.white,
    cardSubtle: driverPrimitives.colors.gray50,
    cardHighlighted: driverPrimitives.colors.orange50,
    overlayScrim: 'rgba(15, 23, 42, 0.45)',
    hudPill: driverPrimitives.colors.white,
    powerPill: driverPrimitives.colors.dark950,
    quickActionCircle: driverPrimitives.colors.gray100,
    activeTabCircle: driverPrimitives.colors.dark950,
  },

  text: {
    primary: driverPrimitives.colors.gray900,
    secondary: driverPrimitives.colors.gray500,
    muted: driverPrimitives.colors.gray400,
    inverse: driverPrimitives.colors.white,
    brand: driverPrimitives.colors.dark950,
    brandDark: driverPrimitives.colors.dark950,
    warning: driverPrimitives.colors.red600,
    link: driverPrimitives.colors.blue500,
  },

  border: {
    divider: driverPrimitives.colors.gray200,
    subtle: 'rgba(232, 232, 232, 0.8)',
    highlight: driverPrimitives.colors.orange50,
    focus: driverPrimitives.colors.dark950,
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
    activeItemBg: driverPrimitives.colors.dark950,
    inactiveItemColor: driverPrimitives.colors.gray500,
    iconSize: 24,
  },

  financeTabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: driverPrimitives.colors.gray200,
    backgroundColor: driverPrimitives.colors.white,
    activeColor: driverPrimitives.colors.dark950,
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
    bannerHighlightBg: driverPrimitives.colors.orange50,
    bannerHighlightTextColor: driverPrimitives.colors.orange700,
    switchActiveColor: driverPrimitives.colors.orange500,
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

/* ==========================================================================
 * 4. DRIVER JOURNEY HIG TOKENS (12-State Cockpit Standard)
 * ========================================================================== */
export const driverJourneyTokens = {
  sizes: {
    primaryCtaHeight: 56,
    swipeBarHeight: 64,
    secondaryTouchTarget: 48,
    cardRadius: 14,
    pillRadius: 9999,
  },
  colors: {
    primaryNavy: '#0B2545',
    successGreen: '#34C759',
    alertRed: '#FF3B30',
    codAmber: '#F59E0B',
    canvasSlate: '#F8FAFC',
    cardLight: '#FFFFFF',
    darkOled: '#0B0F17',
    darkSurface: '#161F30',
    darkBorder: '#26354A',
    darkRoutePuck: '#38BDF8',
  },
} as const;

