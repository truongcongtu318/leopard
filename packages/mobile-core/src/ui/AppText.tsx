import type { TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import {
  colors,
  dynamicType,
  resolveHigTextStyleName,
  resolveTextVariant,
  type TextVariant,
} from '../theme/tokens';

/**
 * Semantic text colours. Screens must not hardcode hex values for text.
 */
export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'inverse'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

const tones: Record<AppTextTone, TextStyle> = StyleSheet.create({
  primary: { color: colors.neutral.text },
  secondary: { color: colors.neutral.mutedText },
  subtle: { color: colors.neutral.subtleText },
  inverse: { color: colors.brand.text },
  brand: { color: colors.brand.primary },
  accent: { color: colors.brand.accentText },
  success: { color: colors.success.text },
  warning: { color: colors.warning.text },
  danger: { color: colors.danger.text },
});

export type AppTextProps = Readonly<
  TextProps & {
    /** HIG text style. Defaults to `body`. */
    variant?: TextVariant;
    /** Semantic colour token. Defaults to `primary`. */
    tone?: AppTextTone;
    /**
     * Right-align digits so live values do not jitter as they change.
     * Use for money, distance, counters and timers — not for prose.
     */
    numeric?: boolean;
    /**
     * Marks fixed-geometry chrome (tab bar, dock, badge), which has no room to
     * reflow and therefore caps Dynamic Type.
     *
     * Do not set this on content. Apple expects content to scale with the
     * reader's preferred size and the layout to grow around it.
     */
    chrome?: boolean;
    /** Explicit cap. Only meaningful together with `chrome`. */
    maxFontSizeMultiplier?: number;
  }
>;

/**
 * The one text primitive for LEOPARD mobile.
 *
 * It applies a HIG text style, a semantic colour, the system font and Dynamic
 * Type together, so screens cannot drift into arbitrary point sizes.
 *
 * On iOS the variant is also handed to `dynamicTypeRamp`, so the native side
 * scales it with `UIFontMetrics(forTextStyle:)` — Apple's real per-style curve,
 * where Body grows further than Large Title instead of everything scaling by one
 * linear factor. Content is left uncapped on purpose.
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  numeric = false,
  chrome = false,
  maxFontSizeMultiplier,
  style,
  allowFontScaling = true,
  ...rest
}: AppTextProps) {
  const cap = maxFontSizeMultiplier ?? (chrome ? dynamicType.chromeMaxScale : undefined);

  return (
    <Text
      allowFontScaling={allowFontScaling}
      dynamicTypeRamp={resolveHigTextStyleName(variant)}
      {...(cap === undefined ? {} : { maxFontSizeMultiplier: cap })}
      style={[resolveTextVariant(variant), tones[tone], numeric ? styles.numeric : null, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  numeric: { fontVariant: ['tabular-nums'] },
});
