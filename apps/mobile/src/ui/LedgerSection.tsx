import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, leopardRadius, spacing, typography } from '../theme/tokens';

export type LedgerSectionProps = PropsWithChildren<
  Readonly<{
    description?: string;
    icon?: ReactNode;
    index?: string;
    title: string;
    tone?: 'plain' | 'signal' | 'ink';
  }>
>;

export function LedgerSection({
  children,
  description,
  icon,
  index,
  title,
  tone = 'plain',
}: LedgerSectionProps) {
  const isInk = tone === 'ink';
  const isSignal = tone === 'signal';

  return (
    <View
      style={[
        styles.container,
        isSignal && styles.signal,
        isInk && styles.ink,
      ]}
    >
      <View style={styles.header}>
        {icon ? (
          <View style={[styles.index, isInk && styles.indexInk]}>
            {icon}
          </View>
        ) : index ? (
          <View style={[styles.index, isInk && styles.indexInk]}>
            <Text style={[styles.indexText, isInk && styles.indexTextInk]}>
              {index}
            </Text>
          </View>
        ) : null}
        <View style={styles.headingCopy}>
          <Text
            accessibilityRole="header"
            style={[styles.title, isInk && styles.titleInk]}
          >
            {title}
          </Text>
          {description ? (
            <Text style={[styles.description, isInk && styles.descriptionInk]}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  signal: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    padding: spacing.md,
    borderRadius: leopardRadius.md,
  },
  ink: {
    backgroundColor: colors.brand.softBackground,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    padding: spacing.md,
    borderRadius: leopardRadius.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  index: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: leopardRadius.sm,
    height: spacing.xl,
    justifyContent: 'center',
    width: spacing.xl,
  },
  indexInk: {
    backgroundColor: leopardPalette.primaryDark,
  },
  indexText: {
    ...typography.caption,
    color: leopardPalette.primaryDark,
    fontWeight: '700',
  },
  indexTextInk: {
    color: leopardPalette.surfaceWhite,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  title: {
    ...typography.sectionTitle,
    color: leopardPalette.textSlateDark,
    flexShrink: 1,
  },
  titleInk: {
    color: leopardPalette.textSlateDark,
  },
  description: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    flexShrink: 1,
  },
  descriptionInk: {
    color: leopardPalette.textMutedSlate,
  },
  content: {
    gap: spacing.sm,
  },
});
