import { Platform } from 'react-native';

export const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
});

/**
 * San Francisco carries optical tracking in its `trak` table and the iOS text
 * system applies it per point size. Setting our own `letterSpacing` on top
 * would replace Apple's value with one derived from a table whose unit we
 * cannot verify in this environment, so iOS omits it and lets the platform
 * decide. Roboto and the web stacks have no optical tracking, so they do
 * receive the HIG value.
 */
export const platformAppliesOpticalTracking = Platform.OS === 'ios';

/**
 * Apple publishes tracking in 1/1000 em. React Native expresses
 * `letterSpacing` in points, so the value is derived here instead of guessed.
 */
export const trackingToLetterSpacing = (trackingPerMille: number, fontSize: number): number => {
  const points = Math.round((trackingPerMille / 1000) * fontSize * 100) / 100;
  // Collapse IEEE-754 negative zero so tokens compare cleanly.
  return points === 0 ? 0 : points;
};

/**
 * HIG tracking for a text style, or `undefined` where the platform already
 * applies its own optical tracking.
 */
export const opticalLetterSpacing = (
  trackingPerMille: number,
  fontSize: number,
): number | undefined =>
  platformAppliesOpticalTracking ? undefined : trackingToLetterSpacing(trackingPerMille, fontSize);

/**
 * Uppercase micro-labels are the one place manual tracking stays correct:
 * optical tracking is size-based, not case-based, and uppercase letterforms
 * need looser spacing to stay legible.
 */
export const letterSpacing = {
  uppercaseLabel: 0.5,
} as const;

export const spacing = {
  none: 0,
  /** Tight icon-to-label gaps only; see `spacingScale`. */
  hairline: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/**
 * Real iOS inset-grouped cards/rows sit around 10–14pt, not 20–28pt — Apple
 * favors restrained, continuous curvature over "bubble" corners. Pill and
 * tab-bar shapes stay fully round (that IS the native look for those), and
 * `modal` stays larger since sheet-top corners are genuinely bigger in HIG.
 */
export const radius = {
  control: 12,
  card: 14,
  cardSm: 10,
  cardLg: 16,
  cardXl: 20,
  bezelOuter: 18,
  bezelInner: 14,
  tabBar: 9999,
  modal: 24,
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
  fontFamily: systemFontFamily,
  fontSize: 20,
  fontWeight: '600' as const,
  lineHeight: 25,
} as const;

// Apple Dynamic Type scale (San Francisco sizes, applied to Inter Display).
export const typography = {
  largeTitle: {
    fontFamily: systemFontFamily,
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 41,
    letterSpacing: opticalLetterSpacing(0.4, 34),
  },
  title1: {
    fontFamily: systemFontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: opticalLetterSpacing(0.38, 28),
  },
  title2: {
    fontFamily: systemFontFamily,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: opticalLetterSpacing(0.34, 22),
  },
  headline: {
    fontFamily: systemFontFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: opticalLetterSpacing(-0.41, 17),
  },
  body: {
    fontFamily: systemFontFamily,
    fontSize: 16,
    lineHeight: 22,
  },
  callout: {
    fontFamily: systemFontFamily,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: opticalLetterSpacing(-0.24, 15),
  },
  subheadline: {
    fontFamily: systemFontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  caption: {
    fontFamily: systemFontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: systemFontFamily,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyCompact: {
    fontFamily: systemFontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle,
  pageTitle: {
    fontFamily: systemFontFamily,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'] as const,
  },
  // Compatibility alias for existing primitives; new code should name the hierarchy.
  title: sectionTitle,
} as const;

/* ------------------------------------------------------------------------- *
 * Apple Human Interface Guidelines — iOS 18 layout & type contract
 *
 * Reference: https://developer.apple.com/design/human-interface-guidelines/typography
 *            https://developer.apple.com/design/human-interface-guidelines/layout
 *            https://developer.apple.com/design/human-interface-guidelines/accessibility
 *
 * `typeScale` below is the canonical text contract for LEOPARD mobile.
 * `typography` above is the legacy token set: it stays for backward
 * compatibility and is migrated to `typeScale` + `AppText` incrementally.
 * ------------------------------------------------------------------------- */

/**
 * HIG text styles at the default (Large) Dynamic Type size.
 *
 * `fontSize`, `lineHeight` and `tracking` are Apple's published values and are
 * pinned by `hig-contract.test.ts`. HIG also publishes a weight per style —
 * Regular for every title, Semibold only for Headline. LEOPARD raises the four
 * title styles because an operational cockpit needs a stronger hierarchy and
 * iOS system navigation already renders large titles bold. This is the one
 * deliberate deviation from the HIG table, and it is emphasis, not metrics.
 */
const higStyles = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', tracking: 0.4 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', tracking: 0.38 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', tracking: 0.34 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', tracking: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', tracking: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', tracking: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', tracking: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400', tracking: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', tracking: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400', tracking: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', tracking: 0.07 },
} as const;

export type HigTextStyleName = keyof typeof higStyles;

const buildHigStyle = ({ fontSize, lineHeight, fontWeight, tracking }: {
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  tracking: number;
}) => ({
  fontFamily: systemFontFamily,
  fontSize,
  lineHeight,
  fontWeight: fontWeight as '400' | '600' | '700',
  letterSpacing: opticalLetterSpacing(tracking, fontSize),
});

/**
 * Canonical HIG text styles, ready to spread into a React Native `Text` style.
 * Prefer `<AppText variant="body" />` so Dynamic Type and the font family are
 * applied together.
 */
export const typeScale = {
  largeTitle: buildHigStyle(higStyles.largeTitle),
  title1: buildHigStyle(higStyles.title1),
  title2: buildHigStyle(higStyles.title2),
  title3: buildHigStyle(higStyles.title3),
  headline: buildHigStyle(higStyles.headline),
  body: buildHigStyle(higStyles.body),
  callout: buildHigStyle(higStyles.callout),
  subheadline: buildHigStyle(higStyles.subheadline),
  footnote: buildHigStyle(higStyles.footnote),
  caption1: buildHigStyle(higStyles.caption1),
  caption2: buildHigStyle(higStyles.caption2),
} as const;

export type TypeScaleName = keyof typeof typeScale;

/** The lexical names Driver screens already use in docs/ui/08. */
export const typeScaleAliases = {
  caption: 'caption1',
  label: 'subheadline',
  body: 'body',
  sectionTitle: 'title3',
  pageTitle: 'title2',
} as const satisfies Record<string, TypeScaleName>;

export type TypeScaleAliasName = keyof typeof typeScaleAliases;

/** Every text style name `AppText` accepts. */
export type TextVariant = TypeScaleName | TypeScaleAliasName;

export const resolveTextVariant = (variant: TextVariant) =>
  typeScale[(typeScaleAliases as Record<string, TypeScaleName>)[variant] ?? (variant as TypeScaleName)];

/**
 * The HIG text style name behind a variant, which is exactly the value React
 * Native's iOS `dynamicTypeRamp` prop expects.
 *
 * Source: `Libraries/Text/TextProps.js` in React Native 0.86 — `dynamicTypeRamp`
 * accepts caption2…largeTitle. Native then derives the scale factor from
 * `UIFontMetrics(forTextStyle:).scaledValueForValue(...)`, so iOS applies
 * Apple's real per-style Dynamic Type curve instead of a single linear
 * `fontScale` multiplier.
 */
export const resolveHigTextStyleName = (variant: TextVariant): HigTextStyleName =>
  ((typeScaleAliases as Record<string, HigTextStyleName>)[variant] ??
    (variant as HigTextStyleName));

/** Every ramp React Native accepts on iOS, ascending. */
export const higTextStyleOrder = [
  'caption2',
  'caption1',
  'footnote',
  'subheadline',
  'callout',
  'body',
  'headline',
  'title3',
  'title2',
  'title1',
  'largeTitle',
] as const satisfies readonly HigTextStyleName[];

/**
 * Dynamic Type contract.
 *
 * Apple's philosophy is that text scales with the reader's preferred size and
 * the layout reflows around it. Dynamic Type therefore carries content past the
 * WCAG 1.4.4 bar — Body reaches 53pt at AX5 — so content is deliberately **not**
 * capped. Only fixed-geometry chrome may cap, and only because it has no room
 * to reflow.
 *
 * Never cap content to make a layout fit. Let it wrap, scroll or grow.
 */
export const dynamicType = {
  /** WCAG 1.4.4 floor content must survive: resize text to 200% without loss. */
  wcagMinimumScale: 2,
  /** Fixed-geometry chrome only (tab bar, dock, badge). Never content. */
  chromeMaxScale: 1.6,
  /** HIG Caption 2 is the smallest sanctioned size; nothing readable may be smaller. */
  minimumReadableSize: 11,
} as const;

/**
 * Layout rhythm. Apple lays out on a 4pt grid; `hairline` (2) exists only for
 * tight icon-to-label gaps. Any other value is drift — see `spacingScale`.
 */
export const spacingScale = [0, 2, 4, 8, 12, 16, 24, 32, 40, 48] as const;

export const isOnSpacingScale = (value: number): boolean =>
  (spacingScale as readonly number[]).includes(value);

/**
 * Icon sizing. HIG expects icons to align with the text they sit beside, so
 * each step pairs with a text style instead of being an arbitrary point value:
 *
 *   xs 12 ↔ caption1 · sm 16 ↔ callout · md 20 ↔ body · lg 24 ↔ title3
 *   xl 28 ↔ title2    · xxl 32 ↔ title1  · display 56 ↔ empty/hero state
 */
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  display: 56,
} as const;

export type IconSizeToken = keyof typeof iconSize;

export const iconStroke = {
  /** Decorative or dense inline icons. */
  regular: 1.5,
  /** Default interface weight; matches SF Symbols Regular. */
  medium: 1.75,
  /** Emphasis, selected state and standalone actionable icons. */
  bold: 2,
} as const;

export type IconStrokeToken = keyof typeof iconStroke;

export const iconDefaults = {
  size: 'lg',
  stroke: 'medium',
} as const satisfies { size: IconSizeToken; stroke: IconStrokeToken };

/**
 * Single resolver shared by every icon module, so a token like `size="sm"`
 * always resolves to the same number regardless of which set an icon lives in.
 */
export const resolveIconSize = (size?: number | IconSizeToken): number => {
  if (typeof size === 'number') return size;
  if (size && size in iconSize) return iconSize[size];
  return iconSize[iconDefaults.size];
};

export const resolveIconStroke = (stroke?: number | IconStrokeToken): number => {
  if (typeof stroke === 'number') return stroke;
  if (stroke && stroke in iconStroke) return iconStroke[stroke];
  return iconStroke[iconDefaults.stroke];
};

/**
 * HIG requires a >=44x44pt target on iOS (48dp on Android) even when the glyph
 * is smaller. Spread this into `hitSlop` for icon-only controls.
 */
export const hitSlop = (visualSize: number, minimum: number = 44) => {
  const inset = Math.max(0, Math.ceil((minimum - visualSize) / 2));
  return { top: inset, bottom: inset, left: inset, right: inset };
};

export const colors = {
  neutral: {
    background: '#FFFFFF',
    canvas: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceMuted: '#F0F2F5',
    text: '#1A1A1A',
    titleText: '#1A1A1A',
    mutedText: '#555555',
    subtleText: '#777777',
    border: '#E8E8E8',
    subtleBorder: '#D8D8D8',
    rowDivider: '#EEEEEE',
  },
  operational: {
    ink: '#1A1A1A',
    inkMuted: '#CBD5E1',
    inkPillBg: 'rgba(11, 30, 66, 0.08)',
    road: '#CBD5E1',
    mapLand: '#F5F6F8',
  },
  brand: {
    primary: '#0B2545',          // Midnight Navy (Chữ L & Viền Báo của Logo - Giữ nguyên)
    accent: '#F26722',           // Lalamove Heat Orange (Màu Báo Gấm & Năng lượng tốc độ)
    blue: '#1890FF',
    green: '#00B14F',
    background: '#0B2545',
    text: '#FFFFFF',
    softBackground: '#FFF5EE',
    softText: '#0B2545',
    border: '#0B2545',
    accentSoft: '#FFE8DB',
    accentText: '#D9541F',
  },
  // Apple system-color semantics (light mode values).
  info: {
    background: '#EAF2FF',
    text: '#1890FF',
    border: '#B8D6FF',
  },
  warning: {
    background: '#FFF5EE',
    text: '#F26722',
    border: '#FFD1B3',
  },
  active: {
    background: '#FFF5EE',
    text: '#D9541F',
    border: '#F26722',
  },
  success: {
    background: '#E8F8EE',
    text: '#00B14F',
    border: '#A3E7BD',
  },
  danger: {
    background: '#FFF1F0',
    text: '#FF4D4F',
    border: '#FFA39E',
  },
} as const;

/**
 * Calm, subtle theme for cards and operational modules.
 * Standardized across the application to prevent cartoonish saturated colors.
 */
export const pastelTheme = {
  yellowCard: {
    bg: '#FFFFFF',
    border: '#FFD1B3',
    accent: '#F26722',
    text: '#C2410C',
  },
  greenCard: {
    bg: '#FFFFFF',
    border: '#A3E7BD',
    accent: '#00B14F',
    text: '#00662A',
  },
  blueCard: {
    bg: '#FFFFFF',
    border: '#CBD5E1',
    accent: '#0B1E42',
    text: '#0B1E42',
  },
  slateCard: {
    bg: '#FFFFFF',
    border: '#E8E8E8',
    accent: '#555555',
    text: '#1A1A1A',
  },
} as const;

export const leopardPalette = {
  // Brand — Midnight Navy & Lalamove Orange
  primary: '#0B2545',
  primaryDark: '#071A30',
  primarySoft: '#133560',
  primaryBg: '#F0F4FA',
  primaryBorder: '#CBD9EB',

  // Accent — Lalamove Heat Orange & Cheetah Glow
  accentYellow: '#F26722',
  accentYellowDark: '#D9541F',
  accentYellowSoft: '#FFD1B3',
  accentYellowBg: '#FFF5EE',
  accentYellowBorder: '#FFD1B3',

  // Eco — Calm Green
  ecoGreen: '#00B14F',
  ecoGreenSoft: '#A3E7BD',
  ecoGreenBg: '#E8F8EE',
  ecoGreenBorder: '#A3E7BD',

  // Surfaces
  bgMuted: '#F5F6F8',
  surfaceWhite: '#FFFFFF',
  canvas: '#F5F6F8',

  // Typography
  textSlateDark: '#1A1A1A',
  textMutedSlate: '#555555',
  textSubtle: '#777777',

  // Borders & dividers
  cardBorder: '#E8E8E8',
  subtleDivider: '#EEEEEE',

  // Tab bar
  tabActive: '#0B2545',
  tabInactive: '#777777',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E8E8E8',

  // Input fields
  inputBg: '#FFFFFF',
  inputBorder: '#E0E0E0',
  inputFocusBorder: '#0B2545',
  inputFocusRing: 'rgba(11, 37, 69, 0.12)',
  inputPlaceholder: '#999999',

  // Vehicle card accents
  vehicleBaGac: '#FEA000',
  vehicleTruck500: '#0B2545',
  vehicleTruck1T: '#1890FF',
  vehicleTruck2T: '#4338CA',

  // Status online/offline indicator
  onlineGreen: '#00B14F',
  offlineGray: '#999999',

  // Legacy — kept for backward compatibility
  darkHeroBg: '#0B2545',
} as const;

/**
 * Customer-role colour palette.
 * Midnight Navy (#0B2545) is primary action colour; Lalamove Orange (#F26722) is accent/badges/points.
 * Use this in every customer-specific screen instead of leopardPalette.
 */
export const customerPalette = {
  // Primary — Midnight Navy (Chủ đạo thương hiệu & Hành động)
  primary: '#0B2545',
  primaryDark: '#071A30',
  primaryBg: '#F0F4FA',
  primaryBorder: '#CBD9EB',
  primaryText: '#0B2545',

  // Brand Secondary — Lalamove Orange / Cheetah Glow (Huy hiệu, điểm thưởng, voucher, CTA highlight)
  accent: '#F26722',
  accentDark: '#D9541F',
  accentBg: '#FFF5EE',
  accentBorder: '#FFD1B3',
  accentText: '#C2410C',

  // Tab / nav (Active state)
  tabActive: '#0B2545',
  tabActiveBg: '#F0F4FA',
  tabInactive: '#777777',

  // Input focus
  inputFocusBorder: '#0B2545',
  inputFocusRing: 'rgba(11, 37, 69, 0.12)',

  // Shared neutrals
  textSlateDark: '#1A1A1A',
  textMutedSlate: '#555555',
  textSubtle: '#777777',
  cardBorder: '#E8E8E8',
  subtleDivider: '#EEEEEE',
  surfaceWhite: '#FFFFFF',
  bgMuted: '#F5F6F8',
  canvas: '#F5F6F8',
  onlineGreen: '#00B14F',
  offlineGray: '#999999',
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
