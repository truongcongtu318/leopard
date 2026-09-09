import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@leopard/mobile-core';

export const MOBILE_PREVIEW_BANNER_TEXT = 'LEOPARD Logistics · Phiên bản Thử nghiệm Pilot';

export function PreviewBanner() {
  return (
    <View
      accessible
      accessibilityLabel={MOBILE_PREVIEW_BANNER_TEXT}
      accessibilityLanguage="vi-VN"
      accessibilityRole="summary"
      style={styles.container}
    >
      <Text style={styles.label}>{MOBILE_PREVIEW_BANNER_TEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.info.text,
    flexShrink: 1,
  },
});
