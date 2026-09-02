import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

export function DriverSettingsScreen() {
  const [autoAccept, setAutoAccept] = useState(false);
  const [highAlertSound, setHighAlertSound] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);
  const [vietmapNav, setVietmapNav] = useState(true);

  return (
    <ScreenScaffold
      eyebrow="DRIVER · SYSTEM PREFERENCES"
      headerTone="ink"
      subtitle="Cài đặt âm báo, điều hướng bản đồ và cấu hình GPS nền."
      title="Cài đặt tài xế"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>CÀI ĐẶT NHẬN ĐƠN & BÁO HIỆU</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Chuông báo chuyến mới âm lượng lớn</Text>
              <Text style={styles.settingDesc}>Tự động phát chuông to cả khi điện thoại ở chế độ rung</Text>
            </View>
            <Switch
              onValueChange={setHighAlertSound}
              thumbColor={highAlertSound ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={highAlertSound}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tự động nhận đơn trong bán kính 2km</Text>
              <Text style={styles.settingDesc}>Tự động chấp thuận chuyến phù hợp khi đang Sẵn sàng</Text>
            </View>
            <Switch
              onValueChange={setAutoAccept}
              thumbColor={autoAccept ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={autoAccept}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Chế độ tiết kiệm pin định vị</Text>
              <Text style={styles.settingDesc}>Giảm tần suất gửi ping GPS khi xe dừng đỗ</Text>
            </View>
            <Switch
              onValueChange={setBatterySaver}
              thumbColor={batterySaver ? colors.brand.background : '#F4F3F4'}
              trackColor={{ false: '#767577', true: colors.brand.softBackground }}
              value={batterySaver}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>BẢN ĐỒ & ĐIỀU HƯỚNG</Text>
        <View style={styles.card}>
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Ứng dụng dẫn đường mặc định</Text>
              <Text style={styles.settingDesc}>Vietmap Navigation SDK (Khuyên dùng)</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>QUYỀN HỆ THỐNG & PHÁP LÝ</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.textWrap}>
              <Text style={styles.settingTitle}>Quyền vị trí chạy nền</Text>
              <Text style={styles.settingDesc}>Luôn cho phép (Always Allow) để duy trì tracking</Text>
            </View>
            <View style={styles.okBadge}>
              <Text style={styles.okBadgeText}>Đã cấp</Text>
            </View>
          </View>

          <Pressable style={styles.settingRow}>
            <Text style={styles.settingTitle}>Quy chế hoạt động đối tác tài xế</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <Text style={styles.settingTitle}>Phiên bản Driver Cockpit</Text>
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
    paddingBottom: spacing.xl,
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
  okBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  okBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  versionText: {
    color: colors.neutral.subtleText,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
