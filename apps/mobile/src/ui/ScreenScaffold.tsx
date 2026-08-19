import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '../theme/tokens';

// The app root applies all SafeAreaView edges. Children only own in-safe spacing.
export const SCREEN_SCAFFOLD_SAFE_AREA_OWNER = 'root' as const;

type ScreenScaffoldProps = PropsWithChildren<
  Readonly<{
    stickyFooter?: ReactNode;
    eyebrow?: string;
    headerTone?: 'plain' | 'ink';
    subtitle?: string;
    title: string;
  }>
>;

type SectionHeadingProps = Readonly<{
  description?: string;
  title: string;
}>;

export function ScreenScaffold({
  children,
  eyebrow,
  headerTone = 'plain',
  stickyFooter,
  subtitle,
  title,
}: ScreenScaffoldProps) {
  const inverse = headerTone === 'ink';
  return (
    <View style={styles.scaffold} testID="screen-scaffold">
      <View style={styles.content} testID="screen-scaffold-content">
        <View
          style={[styles.pageHeader, inverse ? styles.pageHeaderInk : null]}
          testID="screen-scaffold-masthead"
        >
          {eyebrow ? (
            <Text style={[styles.eyebrow, inverse ? styles.eyebrowInk : null]}>{eyebrow}</Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[styles.pageTitle, inverse ? styles.pageTitleInk : null]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, inverse ? styles.subtitleInk : null]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.body}>{children}</View>
      </View>
      {stickyFooter ? (
        <View style={styles.stickyFooter} testID="screen-scaffold-sticky-footer">
          <View style={styles.footerContent}>{stickyFooter}</View>
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeading({ description, title }: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    gap: spacing.lg,
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: '100%',
  },
  pageHeader: {
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pageHeaderInk: {
    backgroundColor: colors.operational.ink,
    padding: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.brand.background,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  eyebrowInk: { color: colors.brand.softBackground },
  pageTitle: {
    ...typography.pageTitle,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  pageTitleInk: { color: colors.brand.text },
  subtitle: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  subtitleInk: { color: colors.operational.inkMuted },
  body: {
    flex: 1,
  },
  stickyFooter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderTopWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: 'relative',
  },
  footerContent: {
    maxWidth: layout.contentMaxWidth,
    width: '100%',
  },
  sectionHeading: {
    gap: spacing.xxs,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
});
