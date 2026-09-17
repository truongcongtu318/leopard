import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, letterSpacing, radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { IconChevronLeft } from './icons/CoreIcons';

// The app root applies all SafeAreaView edges. Children only own in-safe spacing.
export const SCREEN_SCAFFOLD_SAFE_AREA_OWNER = 'root' as const;

type ScreenScaffoldProps = PropsWithChildren<
  Readonly<{
    stickyFooter?: ReactNode;
    stickyFooterBleed?: boolean;
    eyebrow?: string;
    hasFloatingNavBar?: boolean;
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
  hasFloatingNavBar = false,
  headerLeading,
  headerRight,
  headerTone = 'plain',
  onBack,
  stickyFooter,
  stickyFooterBleed = false,
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
        <View style={styles.topBar}>
          <View style={styles.topBarLeading}>
            {onBack ? (
              <Pressable
                accessibilityLabel="Quay lại"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <IconChevronLeft
                  color={inverse ? colors.operational.inkMuted : colors.brand.background}
                  size={22}
                />
              </Pressable>
            ) : headerLeading ? (
              headerLeading
            ) : (
              <View style={styles.topBarSpacer} />
            )}
          </View>

          <View style={styles.topBarCenter}>
            <AppText
              accessibilityRole="header"
              numberOfLines={1}
              variant="headline"
              style={[
                styles.pageTitle,
                inverse ? styles.pageTitleInk : styles.pageTitlePlain,
              ]}
            >
              {title}
            </AppText>
          </View>

          <View style={styles.topBarTrailing}>
            {headerRight ? (
              headerRight
            ) : (
              <View style={styles.topBarSpacer} />
            )}
          </View>
        </View>

        {eyebrow ? (
          <View
            style={[
              styles.eyebrowBadge,
              inverse ? styles.eyebrowBadgeInk : styles.eyebrowBadgePlain,
            ]}
          >
            <AppText
              variant="caption2"
              style={[styles.eyebrowText, inverse ? styles.eyebrowTextInk : styles.eyebrowTextPlain]}
            >
              {eyebrow}
            </AppText>
          </View>
        ) : null}

        {subtitle ? (
          <AppText
            variant="footnote"
            style={[styles.subtitle, inverse ? styles.subtitleInk : styles.subtitlePlain]}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.content} testID="screen-scaffold-content">
        <View style={styles.body}>{children}</View>
      </View>

      {stickyFooter ? (
        <View
          style={[
            styles.stickyFooter,
            stickyFooterBleed ? styles.stickyFooterBleed : null,
            hasFloatingNavBar ? styles.stickyFooterWithFloatingNav : null,
          ]}
          testID="screen-scaffold-sticky-footer"
        >
          <View
            style={[
              styles.footerContent,
              stickyFooterBleed ? styles.footerContentBleed : null,
            ]}
          >
            {stickyFooter}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeading({ description, title }: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <AppText accessibilityRole="header" variant="title3" style={styles.sectionTitle}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption1" style={styles.sectionDescription}>
          {description}
        </AppText>
      ) : null}
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
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: spacing.xs,
    width: '100%',
  },
  topBarLeading: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 44,
    flexShrink: 0,
  },
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  topBarTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 44,
    flexShrink: 0,
  },
  topBarSpacer: {
    height: 32,
    minWidth: 44,
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
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  eyebrowBadge: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  eyebrowBadgePlain: {
    backgroundColor: colors.brand.softBackground,
  },
  eyebrowBadgeInk: {
    backgroundColor: colors.operational.inkPillBg,
  },
  eyebrowText: {
    fontWeight: '700',
    letterSpacing: letterSpacing.uppercaseLabel,
  },
  eyebrowTextPlain: {
    color: colors.brand.background,
  },
  eyebrowTextInk: {
    color: colors.operational.inkMuted,
  },
  pageTitle: {
    textAlign: 'center',
  },
  pageTitlePlain: {
    color: colors.neutral.titleText,
  },
  pageTitleInk: {
    color: colors.neutral.background,
  },
  subtitle: {
    flexShrink: 1,
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
  stickyFooterBleed: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  stickyFooterWithFloatingNav: {
    paddingBottom: layout.bottomNavClearance,
  },
  footerContent: {
    maxWidth: layout.contentMaxWidth,
    width: '100%',
  },
  footerContentBleed: {
    maxWidth: '100%',
  },
  sectionHeading: {
    gap: spacing.xxs,
  },
  sectionTitle: {
    color: colors.neutral.titleText,
    flexShrink: 1,
  },
  sectionDescription: {
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

