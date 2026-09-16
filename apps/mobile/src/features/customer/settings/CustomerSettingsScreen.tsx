import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  colors,
  iosContinuousCurve,
  layout,
  radius,
  spacing,
  systemFontFamily,
  IconChevron,
  ScreenScaffold,
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
      onBack={() => router.back()}
      subtitle="Tùy chỉnh thông báo, ngôn ngữ và bảo mật ứng dụng."
      title="Cài đặt"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Group 1: Thông báo */}
        <Text style={styles.sectionLabel}>THÔNG BÁO</Text>
        <View style={styles.groupedCard}>
          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Thông báo đẩy (Push Notification)</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi tài xế nhận đơn và di chuyển</Text>
            </View>
            <Switch
              accessibilityLabel="Bật hoặc tắt thông báo đẩy"
              onValueChange={setPushEnabled}
              thumbColor={Platform.OS === 'android' ? (pushEnabled ? '#0B1E42' : '#F4F3F4') : undefined}
              trackColor={{ false: '#CBD5E1', true: '#0B1E42' }}
              value={pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin nhắn SMS cập nhật</Text>
              <Text style={styles.settingDesc}>Gửi SMS khi đơn hàng hoàn tất hoặc có sự cố</Text>
            </View>
            <Switch
              accessibilityLabel="Bật hoặc tắt tin nhắn SMS cập nhật"
              onValueChange={setSmsEnabled}
              thumbColor={Platform.OS === 'android' ? (smsEnabled ? '#0B1E42' : '#F4F3F4') : undefined}
              trackColor={{ false: '#CBD5E1', true: '#0B1E42' }}
              value={smsEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Âm thanh thông báo</Text>
              <Text style={styles.settingDesc}>Phát âm thanh khi có cập nhật mới</Text>
            </View>
            <Switch
              accessibilityLabel="Bật hoặc tắt âm thanh thông báo"
              onValueChange={setSoundEnabled}
              thumbColor={Platform.OS === 'android' ? (soundEnabled ? '#0B1E42' : '#F4F3F4') : undefined}
              trackColor={{ false: '#CBD5E1', true: '#0B1E42' }}
              value={soundEnabled}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin tức & Khuyến mãi</Text>
              <Text style={styles.settingDesc}>Nhận thông tin ưu đãi và giảm giá cước</Text>
            </View>
            <Switch
              accessibilityLabel="Bật hoặc tắt tin tức và khuyến mãi"
              onValueChange={setPromoEnabled}
              thumbColor={Platform.OS === 'android' ? (promoEnabled ? '#0B1E42' : '#F4F3F4') : undefined}
              trackColor={{ false: '#CBD5E1', true: '#0B1E42' }}
              value={promoEnabled}
            />
          </View>
        </View>

        {/* Group 2: Ngôn ngữ */}
        <Text style={styles.sectionLabel}>NGÔN NGỮ & KHU VỰC</Text>
        <View style={styles.groupedCard}>
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Ngôn ngữ hiển thị</Text>
              <Text style={styles.settingDesc}>Tiếng Việt (Mặc định)</Text>
            </View>
            <IconChevron color="#94A3B8" direction="right" size="md" />
          </View>
        </View>

        {/* Group 3: Bảo mật & Pháp lý */}
        <Text style={styles.sectionLabel}>BẢO MẬT & PHÁP LÝ</Text>
        <View style={styles.groupedCard}>
          <Pressable
            accessibilityLabel="Bảo mật tài khoản & PIN"
            accessibilityRole="button"
            onPress={() => router.push('/customer/settings/security')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Bảo mật tài khoản & PIN</Text>
              <Text style={styles.settingDesc}>Sinh trắc học FaceID và xóa tài khoản vĩnh viễn</Text>
            </View>
            <IconChevron color="#94A3B8" direction="right" size="md" />
          </Pressable>

          <Pressable
            accessibilityLabel="Điều khoản dịch vụ"
            accessibilityRole="button"
            onPress={() => router.push('/customer/support')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <Text style={styles.settingTitle}>Điều khoản dịch vụ</Text>
            <IconChevron color="#94A3B8" direction="right" size="md" />
          </Pressable>

          <Pressable
            accessibilityLabel="Chính sách bảo mật dữ liệu"
            accessibilityRole="button"
            onPress={() => router.push('/customer/support')}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <Text style={styles.settingTitle}>Chính sách bảo mật dữ liệu</Text>
            <IconChevron color="#94A3B8" direction="right" size="md" />
          </Pressable>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <Text style={styles.settingTitle}>Phiên bản hệ thống</Text>
            <Text style={styles.versionText}>1.0.0-pilot (Build 2608)</Text>
          </View>
        </View>
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
    fontFamily: systemFontFamily,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: '#F1F5F9',
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
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontFamily: systemFontFamily,
    color: '#64748B',
    fontSize: typeScale.footnote.fontSize,
    marginTop: 2,
    lineHeight: 16,
  },
  versionText: {
    fontFamily: systemFontFamily,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});