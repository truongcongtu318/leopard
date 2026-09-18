import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import appJson from '../../../app.json';

import {
  Box,
  Card,
  Divider,
  HStack,
  IconChevronRight,
  IconWarningShield,
  ScreenScaffold,
  Switch,
  VStack,
  colors,
  driverPrimitives,
  iconSize,
  iosContinuousCurve,
  radius,
  spacing,
  systemFontFamily,
  typeScale,
} from '@leopard/mobile-core';

// Same source as profile adapter: real bundled version, never a hardcoded pilot tag.
const APP_VERSION: string = (appJson as { expo?: { version?: unknown } })?.expo?.version
  ? String((appJson as { expo: { version: unknown } }).expo.version)
  : '—';

// Apple HIG Standard Switch Colors from design tokens (Midnight Navy primary)
const SWITCH_TRACK_COLOR = {
  false: colors.neutral.subtleBorder,
  true: colors.brand.primary,
};

export function DriverSettingsScreen() {
  const router = useRouter();

  // 1. Alerts & Dispatch offers state
  const [autoAccept, setAutoAccept] = useState(false);
  const [autoAcceptRadius, setAutoAcceptRadius] = useState<number>(5);
  const [alertSound, setAlertSound] = useState(true);
  const [vibrateOnOffer, setVibrateOnOffer] = useState(true);
  const [autoOfflineOnComplete, setAutoOfflineOnComplete] = useState(false);

  // 2. Navigation state
  const [defaultNav, setDefaultNav] = useState<'vietmap' | 'google'>('vietmap');
  const [autoOpenNav, setAutoOpenNav] = useState(true);
  const [avoidTruckRestrictions, setAvoidTruckRestrictions] = useState(true);

  // 3. Display & Power state
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);

  const handleResetDefaults = () => {
    Alert.alert(
      'Khôi phục cài đặt gốc?',
      'Tất cả cấu hình âm thanh, bản đồ và nhận đơn sẽ được đưa về giá trị chuẩn của LEOPARD Driver.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: () => {
            setAutoAccept(false);
            setAutoAcceptRadius(5);
            setAlertSound(true);
            setVibrateOnOffer(true);
            setAutoOfflineOnComplete(false);
            setDefaultNav('vietmap');
            setAutoOpenNav(true);
            setAvoidTruckRestrictions(true);
            setKeepScreenAwake(true);
            setBatterySaver(false);
            Alert.alert('Thành công', 'Đã khôi phục cài đặt mặc định.');
          },
        },
      ],
    );
  };

  const handleSupportCall = () => {
    Alert.alert(
      'Tổng đài hỗ trợ đối tác',
      'Đường dây nóng điều hành LEOPARD Driver: 1900 6868 (24/7).',
      [{ text: 'Đóng', style: 'cancel' }],
    );
  };

  const handleEmergencySOS = () => {
    Alert.alert(
      'Cứu hộ khẩn cấp SOS',
      'Kết nối đường dây cứu hộ sự cố và an toàn đường dài LEOPARD.',
      [{ text: 'Hủy', style: 'cancel' }, { text: 'Gọi 115 / Cứu hộ', style: 'destructive' }],
    );
  };

  return (
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Khôi phục cài đặt gốc"
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={handleResetDefaults}
          style={styles.resetBtn}
        >
          <Text numberOfLines={1} style={styles.resetBtnText}>
            Đặt lại
          </Text>
        </Pressable>
      }
      headerTone="plain"
      onBack={() => router.back()}
      title="Cài đặt"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. Báo hiệu & điều phối ── */}
        <Text style={styles.sectionLabel}>Báo hiệu & điều phối</Text>
        <Card style={styles.groupedCard}>
          {/* Tự động nhận đơn */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tự động nhận đơn</Text>
              <Text style={styles.settingDesc}>Tự động nhận cuốc mới trong bán kính cài đặt</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật tắt tự động nhận đơn"
              onValueChange={setAutoAccept}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={autoAccept}
            />
          </HStack>

          {/* Bán kính tự động quét cuốc */}
          {autoAccept && (
            <Box style={styles.subConfigBox}>
              <Text style={styles.subConfigLabel}>Bán kính tự động quét cuốc:</Text>
              <HStack style={styles.segmentedControl}>
                {[2, 5, 10].map((radiusKm) => {
                  const isSelected = autoAcceptRadius === radiusKm;
                  return (
                    <Pressable
                      accessibilityLabel={`Bán kính ${radiusKm} kilômét`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={radiusKm}
                      onPress={() => setAutoAcceptRadius(radiusKm)}
                      style={[
                        styles.segmentBtn,
                        isSelected ? styles.segmentBtnActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          isSelected ? styles.segmentBtnTextActive : null,
                        ]}
                      >
                        {radiusKm} km
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>
            </Box>
          )}

          {/* Âm báo chuyến mới */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Âm báo chuyến mới</Text>
              <Text style={styles.settingDesc}>Phát chuông thông báo khi có đơn điều phối đến</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật tắt âm báo chuyến mới"
              onValueChange={setAlertSound}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={alertSound}
            />
          </HStack>

          {/* Rung khi có đơn mới */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Rung khi có đơn mới</Text>
              <Text style={styles.settingDesc}>Rung thiết bị liên tục khi nhận được tín hiệu cuốc xe</Text>
            </VStack>
            <Switch
              accessibilityLabel="Bật tắt rung khi có đơn mới"
              onValueChange={setVibrateOnOffer}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={vibrateOnOffer}
            />
          </HStack>

          {/* Tự động nghỉ sau chuyến này */}
          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tự động nghỉ sau chuyến này</Text>
              <Text style={styles.settingDesc}>
                Tự động chuyển về trạng thái Nghỉ (Offline) ngay khi hoàn tất đơn hiện tại
              </Text>
            </VStack>
            <Switch
              accessibilityLabel="Tự động nghỉ sau chuyến này"
              onValueChange={setAutoOfflineOnComplete}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={autoOfflineOnComplete}
            />
          </HStack>
        </Card>

        {/* ── 2. Bản đồ & dẫn đường xe tải ── */}
        <Text style={styles.sectionLabel}>Bản đồ & dẫn đường xe tải</Text>
        <Card style={styles.groupedCard}>
          {/* Lựa chọn app bản đồ */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Ứng dụng dẫn đường mặc định</Text>
              <Text style={styles.settingDesc}>
                {defaultNav === 'vietmap'
                  ? 'Vietmap Navigation (Tối ưu cho xe tải & biển cấm giờ)'
                  : 'Google Maps Navigation'}
              </Text>
            </VStack>
            <HStack style={styles.segmentedControlCompact}>
              <Pressable
                accessibilityLabel="Chọn bản đồ Vietmap"
                accessibilityRole="button"
                accessibilityState={{ selected: defaultNav === 'vietmap' }}
                onPress={() => setDefaultNav('vietmap')}
                style={[
                  styles.segmentCompactBtn,
                  defaultNav === 'vietmap' ? styles.segmentCompactBtnActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentCompactText,
                    defaultNav === 'vietmap' ? styles.segmentCompactTextActive : null,
                  ]}
                >
                  Vietmap
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Chọn bản đồ Google Maps"
                accessibilityRole="button"
                accessibilityState={{ selected: defaultNav === 'google' }}
                onPress={() => setDefaultNav('google')}
                style={[
                  styles.segmentCompactBtn,
                  defaultNav === 'google' ? styles.segmentCompactBtnActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentCompactText,
                    defaultNav === 'google' ? styles.segmentCompactTextActive : null,
                  ]}
                >
                  Google
                </Text>
              </Pressable>
            </HStack>
          </HStack>

          {/* Tự động mở dẫn đường */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tự động mở dẫn đường</Text>
              <Text style={styles.settingDesc}>
                Tự động chuyển tiếp sang bản đồ khi bắt đầu lấy hàng hoặc giao hàng
              </Text>
            </VStack>
            <Switch
              accessibilityLabel="Tự động mở dẫn đường"
              onValueChange={setAutoOpenNav}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={autoOpenNav}
            />
          </HStack>

          {/* Tránh đường cấm tải trọng */}
          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Cảnh báo đường cấm tải trọng xe</Text>
              <Text style={styles.settingDesc}>
                Cảnh báo giới hạn tải trọng cầu đường và khung giờ giới nghiêm xe tải
              </Text>
            </VStack>
            <Switch
              accessibilityLabel="Cảnh báo đường cấm tải"
              onValueChange={setAvoidTruckRestrictions}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={avoidTruckRestrictions}
            />
          </HStack>
        </Card>

        {/* ── 3. Màn hình & tối ưu pin ── */}
        <Text style={styles.sectionLabel}>Màn hình & tối ưu pin</Text>
        <Card style={styles.groupedCard}>
          {/* Giữ màn hình luôn sáng */}
          <HStack style={styles.settingRow}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Giữ màn hình luôn sáng khi online</Text>
              <Text style={styles.settingDesc}>
                Ngăn thiết bị tự động khóa màn hình trong lúc chờ nhận đơn và điều phối
              </Text>
            </VStack>
            <Switch
              accessibilityLabel="Giữ màn hình luôn sáng"
              onValueChange={setKeepScreenAwake}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={keepScreenAwake}
            />
          </HStack>

          {/* Chế độ tiết kiệm pin */}
          <HStack style={[styles.settingRow, styles.settingRowLast]}>
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Chế độ tiết kiệm pin thực địa</Text>
              <Text style={styles.settingDesc}>
                Tối ưu tần suất cập nhật bản đồ và hiệu ứng chuyển động khi pin dưới 20%
              </Text>
            </VStack>
            <Switch
              accessibilityLabel="Chế độ tiết kiệm pin"
              onValueChange={setBatterySaver}
              thumbColor={colors.neutral.surface}
              trackColor={SWITCH_TRACK_COLOR}
              value={batterySaver}
            />
          </HStack>
        </Card>

        {/* ── 4. Trợ giúp & hỗ trợ ── */}
        <Text style={styles.sectionLabel}>Trợ giúp & hỗ trợ</Text>
        <Card style={styles.groupedCard}>
          <Pressable
            accessibilityLabel="Tổng đài hỗ trợ đối tác"
            accessibilityRole="button"
            onPress={handleSupportCall}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.rowPressed : null]}
          >
            <VStack style={styles.textWrap}>
              <Text style={styles.settingTitle}>Tổng đài điều hành LEOPARD Driver</Text>
              <Text style={styles.settingDesc}>Hỗ trợ xử lý sự cố đơn hàng và đối soát 24/7</Text>
            </VStack>
            <IconChevronRight color={colors.neutral.subtleText} size={iconSize.sm} />
          </Pressable>

          {/* SOS Destructive Button */}
          <Pressable
            accessibilityLabel="Nút gọi khẩn cấp SOS"
            accessibilityRole="button"
            onPress={handleEmergencySOS}
            style={({ pressed }) => [styles.sosButton, pressed ? styles.rowPressed : null]}
          >
            <IconWarningShield color={colors.danger.text} size={iconSize.md} />
            <Text style={styles.sosButtonText}>Gọi cứu hộ khẩn cấp SOS (24/7)</Text>
          </Pressable>
        </Card>

        {/* Footer Build info */}
        <VStack style={styles.footerSection}>
          <Text style={styles.footerVersion}>LEOPARD Driver Cockpit · v{APP_VERSION}</Text>
          <Text style={styles.footerCopyright}>Bản quyền thuộc LEOPARD Freight Logistics Platform</Text>
        </VStack>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xs,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  resetBtn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.xxs,
  },
  resetBtnText: {
    color: colors.brand.primary,
    ...typeScale.subheadline,
    fontWeight: '600',
    textAlign: 'right',
  },

  /* Section Labels (Apple Inset Grouped Header) */
  sectionLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  groupedCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    shadowColor: colors.neutral.text,
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
    minHeight: 56,
    paddingVertical: spacing.sm,
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
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  settingDesc: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    marginTop: 2,
    lineHeight: 18,
  },

  subConfigBox: {
    backgroundColor: colors.neutral.canvas,
    borderRadius: radius.control,
    gap: spacing.xs,
    marginVertical: spacing.xs,
    padding: spacing.sm,
  },
  subConfigLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '600',
  },

  /* Apple Segmented Controls */
  segmentedControl: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: spacing.hairline,
    padding: spacing.hairline,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: radius.cardSm - spacing.hairline,
    ...iosContinuousCurve,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  segmentBtnActive: {
    backgroundColor: colors.neutral.surface,
    ...driverPrimitives.shadows.sm,
  },
  segmentBtnText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    color: colors.neutral.text,
    fontWeight: '600',
  },

  segmentedControlCompact: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.cardSm - spacing.hairline,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: spacing.hairline,
    padding: spacing.hairline,
  },
  segmentCompactBtn: {
    borderRadius: radius.cardSm - spacing.xxs,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  segmentCompactBtnActive: {
    backgroundColor: colors.neutral.surface,
    ...driverPrimitives.shadows.sm,
  },
  segmentCompactText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '500',
  },
  segmentCompactTextActive: {
    color: colors.neutral.text,
    fontWeight: '600',
  },

  sosButton: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 48,
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  sosButtonText: {
    color: colors.danger.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },

  footerSection: {
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  footerVersion: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
    fontWeight: '500',
  },
  footerCopyright: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
  },
});
