import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Box,
  Card,
  Divider,
  HStack,
  IconChevron,
  ScreenScaffold,
  Switch,
  VStack,
  colors,
  customerPalette,
  iosContinuousCurve,
  layout,
  leopardPalette,
  radius,
  spacing,
  systemFontFamily,
  typeScale,
} from '@leopard/mobile-core';

export function CustomerSettingsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => router.back()}
      title="Cài đặt"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Group 1: Thông báo */}
        <Text style={styles.sectionLabel}>Thông báo</Text>
        <Card style={styles.groupedCard}>
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Thông báo đẩy (Push Notification)</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi tài xế nhận đơn và di chuyển</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật hoặc tắt thông báo đẩy"
              onValueChange={setPushEnabled}
              thumbColor={colors.neutral.surface}
              trackColor={{ false: colors.neutral.subtleBorder, true: customerPalette.primary }}
              value={pushEnabled}
            />
          </HStack>

          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin nhắn SMS cập nhật</Text>
              <Text style={styles.settingDesc}>Gửi SMS khi đơn hàng hoàn tất hoặc có sự cố</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật hoặc tắt tin nhắn SMS cập nhật"
              onValueChange={setSmsEnabled}
              thumbColor={colors.neutral.surface}
              trackColor={{ false: colors.neutral.subtleBorder, true: customerPalette.primary }}
              value={smsEnabled}
            />
          </HStack>

          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Âm thanh thông báo</Text>
              <Text style={styles.settingDesc}>Phát âm thanh khi có cập nhật mới</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật hoặc tắt âm thanh thông báo"
              onValueChange={setSoundEnabled}
              thumbColor={colors.neutral.surface}
              trackColor={{ false: colors.neutral.subtleBorder, true: customerPalette.primary }}
              value={soundEnabled}
            />
          </HStack>

          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin tức & Khuyến mãi</Text>
              <Text style={styles.settingDesc}>Nhận thông tin ưu đãi và giảm giá cước</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật hoặc tắt tin tức và khuyến mãi"
              onValueChange={setPromoEnabled}
              thumbColor={colors.neutral.surface}
              trackColor={{ false: colors.neutral.subtleBorder, true: customerPalette.primary }}
              value={promoEnabled}
            />
          </HStack>
        </Card>

        {/* Group 2: Ngôn ngữ */}
        <Text style={styles.sectionLabel}>Ngôn ngữ & khu vực</Text>
        <Card style={styles.groupedCard}>
          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Ngôn ngữ hiển thị</Text>
              <Text style={styles.settingDesc}>Tiếng Việt (Mặc định)</Text>
            </VStack>
            <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="md" />
          </HStack>
        </Card>

        {/* Group 3: Bảo mật & Pháp lý */}
        <Text style={styles.sectionLabel}>Bảo mật & pháp lý</Text>
        <Card style={styles.groupedCard}>
          <Pressable
            accessibilityLabel="Bảo mật tài khoản & PIN"
            accessibilityRole="button"
            onPress={() => router.push('/customer/settings/security')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Bảo mật tài khoản & PIN</Text>
              <Text style={styles.settingDesc}>Sinh trắc học FaceID và xóa tài khoản vĩnh viễn</Text>
            </VStack>
            <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="md" />
          </Pressable>

          <Pressable
            accessibilityLabel="Điều khoản dịch vụ"
            accessibilityRole="button"
            onPress={() => router.push('/customer/support')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <Text style={styles.settingTitle}>Điều khoản dịch vụ</Text>
            <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="md" />
          </Pressable>

          <Pressable
            accessibilityLabel="Chính sách bảo mật dữ liệu"
            accessibilityRole="button"
            onPress={() => router.push('/customer/support')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <Text style={styles.settingTitle}>Chính sách bảo mật dữ liệu</Text>
            <IconChevron color={leopardPalette.inputPlaceholder} direction="right" size="md" />
          </Pressable>

          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <Text style={styles.settingTitle}>Phiên bản hệ thống</Text>
            <Text style={styles.versionText}>1.0.0-pilot (Build 2608)</Text>
          </HStack>
        </Card>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.xs,
    paddingBottom: layout.bottomNavClearance + 32,
  },
  sectionLabel: {
    color: customerPalette.textMutedSlate,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  groupedCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    paddingHorizontal: spacing.md,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.surfaceMuted,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  settingTitle: {
    fontFamily: systemFontFamily,
    color: customerPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontFamily: systemFontFamily,
    color: customerPalette.textSubtle,
    fontSize: typeScale.footnote.fontSize,
    marginTop: 2,
    lineHeight: 16,
  },
  versionText: {
    fontFamily: systemFontFamily,
    color: leopardPalette.inputPlaceholder,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});