import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';

export type LedgerSectionProps = PropsWithChildren<
  Readonly<{
    description?: string;
    index?: string;
    title: string;
    tone?: 'plain' | 'signal' | 'ink';
  }>
>;

export function LedgerSection({
  children,
  description,
  index,
  title,
  tone = 'plain',
}: LedgerSectionProps) {
  const inverse = tone === 'ink';
  return (
    <View
      style={[
        styles.container,
        tone === 'signal' ? styles.signal : null,
        inverse ? styles.ink : null,
      ]}
    >
      <View style={styles.header}>
        {index ? (
          <View style={[styles.index, inverse ? styles.indexInverse : null]}>
            <Text style={[styles.indexText, inverse ? styles.indexTextInverse : null]}>
              {index}
            </Text>
          </View>
        ) : null}
        <View style={styles.headingCopy}>
          <Text
            accessibilityRole="header"
            style={[styles.title, inverse ? styles.titleInverse : null]}
          >
            {title}
          </Text>
          {description ? (
            <Text style={[styles.description, inverse ? styles.descriptionInverse : null]}>
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
    borderTopColor: colors.neutral.subtleBorder,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  signal: {
    backgroundColor: colors.neutral.background,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    padding: spacing.md,
  },
  ink: {
    backgroundColor: colors.operational.ink,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    padding: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  index: {
    alignItems: 'center',
    backgroundColor: colors.operational.ink,
    height: spacing.xl,
    justifyContent: 'center',
    width: spacing.xl,
  },
  indexInverse: {
    backgroundColor: colors.brand.background,
  },
  indexText: {
    ...typography.caption,
    color: colors.brand.text,
    fontWeight: '700',
  },
  indexTextInverse: {
    color: colors.brand.text,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  titleInverse: {
    color: colors.brand.text,
  },
  description: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  descriptionInverse: {
    color: colors.operational.inkMuted,
  },
  content: {
    gap: spacing.sm,
  },
});
