import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '../theme/tokens';

// The app root applies all SafeAreaView edges. Children only own in-safe spacing.
export const SCREEN_SCAFFOLD_SAFE_AREA_OWNER = 'root' as const;

type ScreenScaffoldProps = PropsWithChildren<
  Readonly<{
    stickyFooter?: ReactNode;
    eyebrow?: string;
    headerTone?: 'plain' | 'ink';
    headerRight?: ReactNode;
    headerLeading?: ReactNode;
    onBack?: () => void;
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
  headerLeading,
  headerRight,
  headerTone = 'plain',
  onBack,
  stickyFooter,
  subtitle,
  title,
}: ScreenScaffoldProps) {
  const inverse = headerTone === 'ink';
  return (
    <View style={styles.scaffold} testID="screen-scaffold">
      <View
        style={[styles.pageHeader, inverse ? styles.pageHeaderInk : styles.pageHeaderPlain]}
        testID="screen-scaffold-masthead"
      >
        {onBack ? (
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.backArrow, inverse ? styles.backArrowInk : null]}>‹</Text>
            <Text style={[styles.backText, inverse ? styles.backTextInk : null]}>Quay lại</Text>
          </Pressable>
        ) : headerLeading ? (
          headerLeading
        ) : null}

        {eyebrow ? (
          <View
            style={[
              styles.eyebrowBadge,
              inverse ? styles.eyebrowBadgeInk : styles.eyebrowBadgePlain,
            ]}
          >
            <Text
              style={[styles.eyebrowText, inverse ? styles.eyebrowTextInk : styles.eyebrowTextPlain]}
            >
              {eyebrow}
            </Text>
          </View>
        ) : null}

        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={[styles.pageTitle, inverse ? styles.pageTitleInk : styles.pageTitlePlain]}
          >
            {title}
          </Text>
          {headerRight ? <View style={styles.headerRightWrap}>{headerRight}</View> : null}
        </View>

        {subtitle ? (
          <Text style={[styles.subtitle, inverse ? styles.subtitleInk : styles.subtitlePlain]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.content} testID="screen-scaffold-content">
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
    minHeight: 0,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    minHeight: 0,
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    width: '100%',
  },
  pageHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  pageHeaderPlain: {
    backgroundColor: colors.neutral.canvas,
  },
  pageHeaderInk: {
    backgroundColor: colors.operational.ink,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerRightWrap: {
    flexShrink: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.brand.background,
  },
  backArrowInk: {
    color: colors.operational.inkMuted,
  },
  backText: {
    ...typography.label,
    color: colors.brand.background,
    fontWeight: '700',
  },
  backTextInk: {
    color: colors.operational.inkMuted,
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  eyebrowBadgePlain: {
    backgroundColor: colors.brand.softBackground,
  },
  eyebrowBadgeInk: {
    backgroundColor: colors.operational.inkPillBg,
  },
  eyebrowText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  eyebrowTextPlain: {
    color: colors.brand.background,
  },
  eyebrowTextInk: {
    color: colors.operational.inkMuted,
  },
  pageTitle: {
    ...typography.pageTitle,
    flex: 1,
  },
  pageTitlePlain: {
    color: colors.neutral.titleText,
  },
  pageTitleInk: {
    color: colors.neutral.background,
  },
  subtitle: {
    ...typography.body,
    fontSize: 13.5,
  },
  subtitlePlain: {
    color: colors.neutral.mutedText,
  },
  subtitleInk: {
    color: colors.operational.inkMuted,
  },
  body: {
    flex: 1,
    minHeight: 0,
    gap: spacing.md,
  },
  stickyFooter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
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
    color: colors.neutral.titleText,
    flexShrink: 1,
  },
  sectionDescription: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

