import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@leopard/mobile-core';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>THÔNG BÁO</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Thông báo đẩy (Push Notification)</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi tài xế nhận đơn và di chuyển</Text>
            </View>
            <Switch
              onValueChange={setPushEnabled}
              thumbColor={pushEnabled ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin nhắn SMS cập nhật</Text>
              <Text style={styles.settingDesc}>Gửi SMS khi đơn hàng hoàn tất hoặc có sự cố</Text>
            </View>
            <Switch
              onValueChange={setSmsEnabled}
              thumbColor={smsEnabled ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={smsEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Âm thanh thông báo</Text>
              <Text style={styles.settingDesc}>Phát âm thanh khi có cập nhật mới</Text>
            </View>
            <Switch
              onValueChange={setSoundEnabled}
              thumbColor={soundEnabled ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={soundEnabled}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tin tức & Khuyến mãi</Text>
              <Text style={styles.settingDesc}>Nhận thông tin ưu đãi và giảm giá cước</Text>
            </View>
            <Switch
              onValueChange={setPromoEnabled}
              thumbColor={promoEnabled ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={promoEnabled}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>NGÔN NGỮ & KHU VỰC</Text>
        <View style={styles.card}>
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Ngôn ngữ hiển thị</Text>
              <Text style={styles.settingDesc}>Tiếng Việt (Mặc định)</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>BẢO MẬT & PHÁP LÝ</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow}>
            <Text style={styles.settingTitle}>Điều khoản dịch vụ</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.settingRow}>
            <Text style={styles.settingTitle}>Chính sách bảo mật dữ liệu</Text>
            <Text style={styles.chevron}>›</Text>
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
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.rowDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  settingTitle: {
    color: colors.neutral.titleText,
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: colors.neutral.subtleText,
    fontSize: 18,
  },
  versionText: {
    color: colors.neutral.subtleText,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
