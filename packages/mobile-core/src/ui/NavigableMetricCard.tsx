import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { driverPrimitives } from '../theme/driver-tokens';
import { iosContinuousCurve } from '../theme/tokens';

export type NavigableMetricCardProps = Readonly<{
  title: string;
  value: string | number;
  subtitle?: string | ReactNode | null;
  leadingIcon?: ReactNode;
  badge?: ReactNode;
  rightElement?: ReactNode;
  footer?: ReactNode;
  hasChevron?: boolean;
  valueTone?: 'default' | 'success' | 'danger';
  layout?: 'stack' | 'row';
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  style?: object;
}>;

function ChevronIcon({ color = '#1E293B', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Grab-style Navigable Metric Card.
 * Standardized reusable card for presenting metrics, wallet balances,
 * and clickable navigational rows across driver screens.
 */
export function NavigableMetricCard({
  accessibilityLabel,
  badge,
  footer,
  hasChevron = true,
  layout = 'stack',
  leadingIcon,
  onPress,
  rightElement,
  style,
  subtitle,
  testID,
  title,
  value,
  valueTone = 'default',
}: NavigableMetricCardProps) {
  const isActionable = Boolean(onPress);

  const valueStyle =
    valueTone === 'success'
      ? styles.valueSuccess
      : valueTone === 'danger'
        ? styles.valueDanger
        : styles.valueDefault;

  const cardBody = (
    <View style={[styles.card, style]} testID={testID}>
      {layout === 'row' ? (
        // Compact Row Layout: Title on left, Value on top right, Subtitle in middle, Chevron on right
        <View style={styles.rowLayoutContainer}>
          <View style={styles.compactHeaderRow}>
            <View style={styles.compactTitleWrap}>
              {leadingIcon ? <View style={styles.leadingWrap}>{leadingIcon}</View> : null}
              <Text numberOfLines={1} style={styles.compactTitleText}>
                {title}
              </Text>
              {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
            </View>

            <Text numberOfLines={1} style={[styles.compactValueText, valueStyle]}>
              {value}
            </Text>
          </View>

          <View style={styles.compactBodyRow}>
            <View style={styles.compactSubtitleCol}>
              {subtitle ? (
                typeof subtitle === 'string' ? (
                  <Text numberOfLines={1} style={styles.subtitleText}>
                    {subtitle}
                  </Text>
                ) : (
                  subtitle
                )
              ) : null}
            </View>

            {rightElement ? (
              <View style={styles.rightWrap}>{rightElement}</View>
            ) : hasChevron && isActionable ? (
              <View style={styles.chevronWrap}>
                <ChevronIcon />
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        // Standard Stack Layout: Title on top, Value below, Chevron on right
        <View style={styles.contentRow}>
          {leadingIcon ? <View style={styles.leadingWrap}>{leadingIcon}</View> : null}

          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.titleText}>
                {title}
              </Text>
              {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
            </View>

            <Text numberOfLines={1} style={[styles.valueText, valueStyle]}>
              {value}
            </Text>

            {subtitle ? (
              typeof subtitle === 'string' ? (
                <Text numberOfLines={1} style={styles.subtitleText}>
                  {subtitle}
                </Text>
              ) : (
                <View style={styles.customSubtitleWrap}>{subtitle}</View>
              )
            ) : null}
          </View>

          {rightElement ? (
            <View style={styles.rightWrap}>{rightElement}</View>
          ) : hasChevron && isActionable ? (
            <View style={styles.chevronWrap}>
              <ChevronIcon />
            </View>
          ) : null}
        </View>
      )}

      {footer ? (
        <>
          <View style={styles.footerDivider} />
          <View style={styles.footerWrap}>{footer}</View>
        </>
      ) : null}
    </View>
  );

  if (!isActionable) {
    return cardBody;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || `${title}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressableWrap, pressed ? styles.pressed : null]}
    >
      {cardBody}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    width: '100%',
  },
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    ...driverPrimitives.shadows.sm,
  },
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLayoutContainer: {
    gap: 8,
  },
  compactHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  compactTitleText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  compactValueText: {
    fontSize: 16.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  compactBodyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactSubtitleCol: {
    flex: 1,
    marginRight: 8,
  },
  leadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  titleText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 13.5,
    fontWeight: '400',
    lineHeight: 18,
  },
  badgeWrap: {
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  valueDefault: {
    color: driverPrimitives.colors.gray900,
  },
  valueSuccess: {
    color: driverPrimitives.colors.green500,
  },
  valueDanger: {
    color: driverPrimitives.colors.red500,
  },
  subtitleText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
    marginTop: 2,
  },
  customSubtitleWrap: {
    marginTop: 4,
  },
  rightWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  chevronWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  footerDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginVertical: 10,
    width: '100%',
  },
  footerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
