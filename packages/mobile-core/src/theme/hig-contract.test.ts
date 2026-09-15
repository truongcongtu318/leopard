import { describe, expect, it } from '@jest/globals';

import {
  dynamicType,
  higTextStyleOrder,
  hitSlop,
  iconDefaults,
  iconSize,
  iconStroke,
  letterSpacing,
  platformAppliesOpticalTracking,
  resolveHigTextStyleName,
  resolveIconSize,
  resolveIconStroke,
  resolveTextVariant,
  spacing,
  spacingScale,
  systemFontFamily,
  trackingToLetterSpacing,
  typeScale,
  typeScaleAliases,
  typography,
} from './tokens';

/**
 * Apple Human Interface Guidelines — iOS 18 published text styles.
 * https://developer.apple.com/design/human-interface-guidelines/typography
 *
 * These values are the contract. If this table changes, the design system
 * changed and the docs under docs/ui must change in the same commit.
 */
const HIG_TEXT_STYLES = {
  largeTitle: { fontSize: 34, lineHeight: 41, tracking: 0.4 },
  title1: { fontSize: 28, lineHeight: 34, tracking: 0.38 },
  title2: { fontSize: 22, lineHeight: 28, tracking: 0.34 },
  title3: { fontSize: 20, lineHeight: 25, tracking: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, tracking: -0.41 },
  body: { fontSize: 17, lineHeight: 22, tracking: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, tracking: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, tracking: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, tracking: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, tracking: 0 },
  caption2: { fontSize: 11, lineHeight: 13, tracking: 0.07 },
} as const;

describe('Apple HIG type scale', () => {
  it('matches the published HIG size and leading for every text style', () => {
    for (const [name, hig] of Object.entries(HIG_TEXT_STYLES)) {
      const style = typeScale[name as keyof typeof typeScale];
      expect(style.fontSize).toBe(hig.fontSize);
      expect(style.lineHeight).toBe(hig.lineHeight);
    }
  });

  it('applies HIG tracking only where the platform has no optical tracking', () => {
    for (const [name, hig] of Object.entries(HIG_TEXT_STYLES)) {
      const style = typeScale[name as keyof typeof typeScale];
      if (platformAppliesOpticalTracking) {
        // iOS forwards to SF Pro's `trak` table; a manual value would replace it.
        expect(style.letterSpacing).toBeUndefined();
      } else {
        expect(style.letterSpacing).toBe(
          trackingToLetterSpacing(hig.tracking, hig.fontSize),
        );
      }
    }
  });

  it('derives tracking in points from Apple\u2019s 1/1000 em values', () => {
    expect(trackingToLetterSpacing(-0.41, 17)).toBe(-0.01);
    expect(trackingToLetterSpacing(0.4, 34)).toBe(0.01);
    expect(trackingToLetterSpacing(0, 12)).toBe(0);
  });

  it('no longer over-tightens the legacy heading tokens', () => {
    // They used to carry hand-picked -0.8 / -0.5 / -0.4, which visibly squeezed
    // headings and contradicted SF Pro's own optical tracking.
    for (const name of ['largeTitle', 'title1', 'title2', 'headline', 'callout'] as const) {
      const value = typography[name].letterSpacing;
      if (platformAppliesOpticalTracking) {
        expect(value).toBeUndefined();
      } else {
        expect(Math.abs(value as number)).toBeLessThan(0.05);
      }
    }
  });

  it('pins the system font on every style so no screen falls back to a default', () => {
    for (const style of Object.values(typeScale)) {
      expect(style.fontFamily).toBe(systemFontFamily);
    }
  });

  it('never renders readable text below the HIG Caption 2 floor', () => {
    const sizes = Object.values(typeScale).map((style) => style.fontSize);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(dynamicType.minimumReadableSize);
    expect(typeScale.caption2.fontSize).toBe(11);
  });

  it('keeps a monotonic ramp (Headline and Body share the HIG 17pt size)', () => {
    const order = Object.keys(HIG_TEXT_STYLES) as Array<keyof typeof typeScale>;
    const sizes = order.map((name) => typeScale[name].fontSize);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
    expect(typeScale.headline.fontSize).toBe(typeScale.body.fontSize);
    expect(typeScale.headline.fontWeight).not.toBe(typeScale.body.fontWeight);
  });

  it('resolves the docs/ui vocabulary aliases onto real HIG styles', () => {
    expect(resolveTextVariant('caption')).toEqual(typeScale.caption1);
    expect(resolveTextVariant('label')).toEqual(typeScale.subheadline);
    expect(resolveTextVariant('body')).toEqual(typeScale.body);
    expect(resolveTextVariant('sectionTitle')).toEqual(typeScale.title3);
    expect(resolveTextVariant('pageTitle')).toEqual(typeScale.title2);
    expect(Object.keys(typeScaleAliases)).toEqual([
      'caption',
      'label',
      'body',
      'sectionTitle',
      'pageTitle',
    ]);
  });
  it('keeps manual tracking only for uppercase micro-labels', () => {
    // Uppercase letterforms need looser spacing; that is a typographic rule,
    // not optical sizing, so it is the one manual tracking we keep.
    expect(letterSpacing.uppercaseLabel).toBeGreaterThan(0);
    expect(letterSpacing.uppercaseLabel).toBeLessThanOrEqual(1);
  });
});

describe('Dynamic Type contract', () => {
  it('meets the WCAG 1.4.4 200% bar for content', () => {
    expect(dynamicType.wcagMinimumScale).toBeGreaterThanOrEqual(2);
  });

  it('caps only fixed-geometry chrome, because content must reflow', () => {
    expect(dynamicType.chromeMaxScale).toBeGreaterThan(1);
    expect(dynamicType.chromeMaxScale).toBeLessThan(dynamicType.wcagMinimumScale);
  });
});

describe('HIG Dynamic Type ramp', () => {
  it('hands iOS the exact text style name React Native dynamicTypeRamp expects', () => {
    expect(resolveHigTextStyleName('body')).toBe('body');
    expect(resolveHigTextStyleName('largeTitle')).toBe('largeTitle');
    expect(resolveHigTextStyleName('headline')).toBe('headline');
  });

  it('resolves every legacy alias onto a real HIG ramp', () => {
    expect(resolveHigTextStyleName('caption')).toBe('caption1');
    expect(resolveHigTextStyleName('label')).toBe('subheadline');
    expect(resolveHigTextStyleName('sectionTitle')).toBe('title3');
    expect(resolveHigTextStyleName('pageTitle')).toBe('title2');
  });

  it('covers every text style exactly once, ascending by size', () => {
    expect(new Set(higTextStyleOrder).size).toBe(Object.keys(typeScale).length);
    expect(
      [...higTextStyleOrder].sort((a, b) => typeScale[a].fontSize - typeScale[b].fontSize),
    ).toEqual([...higTextStyleOrder]);
  });
});

describe('spacing scale', () => {
  it('exposes exactly the sanctioned values and nothing else', () => {
    expect(Object.values(spacing)).toEqual(spacingScale);
  });

  it('stays on the 4pt grid, with 2 reserved for hairline gaps', () => {
    for (const value of spacingScale) {
      if (value === 2) continue;
      expect(value % 4).toBe(0);
    }
  });

  it('is strictly ascending and starts at zero', () => {
    expect(spacingScale[0]).toBe(0);
    for (let i = 1; i < spacingScale.length; i += 1) {
      expect(spacingScale[i]).toBeGreaterThan(spacingScale[i - 1]);
    }
  });
});

describe('icon contract', () => {
  it('exposes a strictly ascending size ramp', () => {
    const sizes = Object.values(iconSize);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    }
  });

  it('resolves every size token and falls back to the default', () => {
    expect(resolveIconSize('xs')).toBe(12);
    expect(resolveIconSize('sm')).toBe(16);
    expect(resolveIconSize('md')).toBe(20);
    expect(resolveIconSize('lg')).toBe(24);
    expect(resolveIconSize('xl')).toBe(28);
    expect(resolveIconSize('xxl')).toBe(32);
    expect(resolveIconSize('display')).toBe(56);
    expect(resolveIconSize()).toBe(iconSize[iconDefaults.size]);
    expect(resolveIconSize(17)).toBe(17);
  });

  it('resolves every stroke token and falls back to the default', () => {
    expect(resolveIconStroke('regular')).toBe(1.5);
    expect(resolveIconStroke('medium')).toBe(1.75);
    expect(resolveIconStroke('bold')).toBe(2);
    expect(resolveIconStroke()).toBe(iconStroke[iconDefaults.stroke]);
    expect(resolveIconStroke(2.5)).toBe(2.5);
  });
});

describe('hitSlop', () => {
  it('expands a small icon to the HIG 44pt minimum on every edge', () => {
    expect(hitSlop(16)).toEqual({ top: 14, bottom: 14, left: 14, right: 14 });
    expect(hitSlop(iconSize.xs)).toEqual({ top: 16, bottom: 16, left: 16, right: 16 });
  });

  it('never shrinks a target that is already large enough', () => {
    expect(hitSlop(44)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(hitSlop(iconSize.display)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('accepts a higher minimum for Android and primary actions', () => {
    expect(hitSlop(24, 48)).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
  });
});
