import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '../theme/tokens';

// The app root applies all SafeAreaView edges. Children only own in-safe spacing.
export const SCREEN_SCAFFOLD_SAFE_AREA_OWNER = 'root' as const;

type ScreenScaffoldProps = PropsWithChildren<
  Readonly<{
    stickyFooter?: ReactNode;
    subtitle?: string;
    title: string;
  }>
>;

type SectionHeadingProps = Readonly<{
  description?: string;
  title: string;
}>;

export function ScreenScaffold({ children, stickyFooter, subtitle, title }: ScreenScaffoldProps) {
  return (
    <View style={styles.scaffold} testID="screen-scaffold">
      <View style={styles.content} testID="screen-scaffold-content">
        <View style={styles.pageHeader}>
          <Text accessibilityRole="header" style={styles.pageTitle}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    backgroundColor: colors.neutral.background,
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
    gap: spacing.xs,
  },
  pageTitle: {
    ...typography.pageTitle,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  body: {
    flex: 1,
  },
  stickyFooter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
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
