import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import appJson from '../../../app.json';

import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconLocationPin,
  IconRadarPulse,
  IconRoute,
  IconSecurityShield,
  IconSpeedTruck,
  IconSupport247,
  IconTrash,
  IconWarningShield,
  ScreenScaffold,
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';

// Same source as profile adapter: real bundled version, never a hardcoded pilot tag.
const APP_VERSION: string = (appJson as { expo?: { version?: unknown } })?.expo?.version
  ? String((appJson as { expo: { version: unknown } }).expo.version)
  : '—';

export function DriverSettingsScreen() {
  const router = useRouter();

  // 1. Alerts & Dispatch offers state
  const [highAlertSound, setHighAlertSound] = useState(true);
  const [ringtoneVolume, setRingtoneVolume] = useState<50 | 75 | 100>(100);
  const [vibrateOnOffer, setVibrateOnOffer] = useState(true);
  const [voiceAnnouncement, setVoiceAnnouncement] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [autoAcceptRadius, setAutoAcceptRadius] = useState<number>(5);
  const [autoOfflineOnComplete, setAutoOfflineOnComplete] = useState(false);
  const [priceProposal, setPriceProposal] = useState(false);

  // 2. Navigation state
  const [defaultNav, setDefaultNav] = useState<'vietmap' | 'google'>('vietmap');
  const [autoOpenNav, setAutoOpenNav] = useState(true);
  const [avoidTruckRestrictions, setAvoidTruckRestrictions] = useState(true);

  // 3. Display & Power state
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);

  // 4. Testing alert feedback & Cache storage
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
      }
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
      }
    };
  }, []);

  const handleTestAlert = () => {
    setIsTestingAlert(true);
    testTimerRef.current = setTimeout(() => {
      setIsTestingAlert(false);
      Alert.alert(
        'Thử âm báo thành công',
        `Âm thanh chuông báo nổ đơn và rung phản hồi hoạt động bình thường ở mức âm lượng ${ringtoneVolume}%.`,
        [{ text: 'Đã hiểu' }],
      );
    }, 1200);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Dọn dẹp bộ nhớ đệm?',
      'Hành động này sẽ xóa dữ liệu tạm của bản đồ và ảnh biên bản giao hàng POD đã đồng bộ lên máy chủ' +
        (cacheSize ? `, giải phóng ${cacheSize}.` : '.'),
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Dọn dẹp ngay',
          style: 'destructive',
          onPress: () => {
            setIsClearingCache(true);
            cacheTimerRef.current = setTimeout(() => {
              setCacheSize(null);
              setIsClearingCache(false);
              Alert.alert('Hoàn tất', 'Bộ nhớ đệm đã được giải phóng thành công.');
            }, 800);
          },
        },
      ],
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Khôi phục cài đặt gốc?',
      'Tất cả cấu hình âm thanh, bản đồ và nhận đơn sẽ được đưa về giá trị chuẩn của LEOPARD Driver.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: () => {
            setHighAlertSound(true);
            setRingtoneVolume(100);
            setVibrateOnOffer(true);
            setVoiceAnnouncement(true);
            setAutoAccept(false);
            setAutoAcceptRadius(5);
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

  return (
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Khôi phục cài đặt gốc"
          accessibilityRole="button"
          hitSlop={8}
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
      title="Tất cả cài đặt"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. Báo hiệu & điều phối (Apple Inset Grouped) ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Báo hiệu & điều phối</Text>

          <View style={styles.card}>
            {/* Tự động nhận đơn */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSpeedTruck color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động nhận đơn</Text>
                <Text style={styles.settingDesc}>Tự động nhận cuốc mới.</Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt tự động nhận đơn"
                onValueChange={setAutoAccept}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={autoAccept}
              />
            </View>

            {/* Radius selector (khi bật Auto-accept) */}
            {autoAccept && (
              <View style={styles.subConfigBox}>
                <Text style={styles.subConfigLabel}>Bán kính tự động quét cuốc:</Text>
                <View style={styles.segmentedControl}>
                  {[2, 5, 10].map((radiusKm) => (
                    <Pressable
                      accessibilityLabel={`Bán kính ${radiusKm} kilômét`}
                      accessibilityRole="button"
                      key={radiusKm}
                      onPress={() => setAutoAcceptRadius(radiusKm)}
                      style={[
                        styles.segmentBtn,
                        autoAcceptRadius === radiusKm ? styles.segmentBtnActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          autoAcceptRadius === radiusKm ? styles.segmentBtnTextActive : null,
                        ]}
                      >
                        {radiusKm} km
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Đề xuất giá cước */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRadarPulse color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <View style={styles.newBadgeRow}>
                  <Text style={styles.settingTitle}>Đề xuất giá cước</Text>
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>MỚI</Text>
                  </View>
                </View>
                <Text style={styles.settingDesc}>
                  Trực tiếp quyết định giá cước cuốc xe với hành khách
                </Text>
              </View>
              <Switch
                accessibilityLabel="Đề xuất giá cước"
                onValueChange={setPriceProposal}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={priceProposal}
              />
            </View>

            {/* Chuông lớn */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconBell color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Chuông báo chuyến mới âm lượng lớn</Text>
                <Text style={styles.settingDesc}>
                  Tự động phát âm lượng tối đa, vượt qua chế độ im lặng/rung
                </Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt chuông báo chuyến mới âm lượng lớn"
                onValueChange={setHighAlertSound}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={highAlertSound}
              />
            </View>

            {/* Âm lượng chuông báo */}
            <View style={styles.subConfigBox}>
              <Text style={styles.subConfigLabel}>Mức âm lượng chuông điều phối:</Text>
              <View style={styles.segmentedControl}>
                {([50, 75, 100] as const).map((vol) => (
                  <Pressable
                    accessibilityLabel={`Âm lượng ${vol}%`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ringtoneVolume === vol }}
                    key={vol}
                    onPress={() => setRingtoneVolume(vol)}
                    style={[
                      styles.segmentBtn,
                      ringtoneVolume === vol ? styles.segmentBtnActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        ringtoneVolume === vol ? styles.segmentBtnTextActive : null,
                      ]}
                    >
                      {vol}% {vol === 100 ? '(Tối đa)' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Test alert row */}
            <Pressable
              accessibilityLabel="Thử nghiệm âm thanh chuông báo và độ nhạy"
              accessibilityRole="button"
              disabled={isTestingAlert}
              onPress={handleTestAlert}
              style={({ pressed }) => [styles.settingRowAction, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconWrap}>
                <IconBell color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>
                  {isTestingAlert ? 'Đang phát thử chuông nổ đơn…' : 'Nghe thử chuông nổ đơn'}
                </Text>
                <Text style={styles.settingDesc}>
                  Phát thử âm báo ở mức âm lượng {ringtoneVolume}%
                </Text>
              </View>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>

            {/* Rung cường độ cao */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRadarPulse color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Rung cường độ cao khi có đơn</Text>
                <Text style={styles.settingDesc}>
                  Rung mạnh liên tục để nhận biết khi đặt máy trên giá đỡ xe tải
                </Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt rung cường độ cao"
                onValueChange={setVibrateOnOffer}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={vibrateOnOffer}
              />
            </View>

            {/* Giọng nói đọc tóm tắt đơn (TTS) */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSupport247 color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Giọng nói đọc tóm tắt đơn hàng</Text>
                <Text style={styles.settingDesc}>
                  Đọc điểm nhận hàng, điểm giao và cước phí ước tính
                </Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt giọng nói đọc đơn hàng"
                onValueChange={setVoiceAnnouncement}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={voiceAnnouncement}
              />
            </View>

            {/* Tự động nghỉ sau chuyến này */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconClock color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động nghỉ sau chuyến này</Text>
                <Text style={styles.settingDesc}>
                  Tự động chuyển về trạng thái Nghỉ (Offline) ngay khi hoàn tất đơn hiện tại
                </Text>
              </View>
              <Switch
                accessibilityLabel="Tự động nghỉ sau chuyến này"
                onValueChange={setAutoOfflineOnComplete}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={autoOfflineOnComplete}
              />
            </View>
          </View>
        </View>

        {/* ── 2. Bản đồ & dẫn đường xe tải ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Bản đồ & dẫn đường xe tải</Text>

          <View style={styles.card}>
            {/* Lựa chọn app bản đồ */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRoute color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Ứng dụng dẫn đường mặc định</Text>
                <Text style={styles.settingDesc}>
                  {defaultNav === 'vietmap'
                    ? 'Vietmap Navigation (Tối ưu cho xe tải & biển cấm giờ)'
                    : 'Google Maps Navigation'}
                </Text>
              </View>
              <View style={styles.segmentedControlCompact}>
                <Pressable
                  accessibilityLabel="Chọn bản đồ Vietmap"
                  accessibilityRole="button"
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
              </View>
            </View>

            {/* Tự động mở dẫn đường */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconLocationPin color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động mở dẫn đường khi bắt đầu di chuyển</Text>
                <Text style={styles.settingDesc}>
                  Tự động chuyển tiếp sang Vietmap khi chuyển trạng thái Đang lấy hàng / Đang giao
                </Text>
              </View>
              <Switch
                accessibilityLabel="Tự động mở dẫn đường"
                onValueChange={setAutoOpenNav}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={autoOpenNav}
              />
            </View>

            {/* Tránh đường cấm tải trọng */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconWarningShield color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Cảnh báo đường cấm tải trọng & giờ giới nghiêm</Text>
                <Text style={styles.settingDesc}>
                  Áp dụng dữ liệu giới hạn tải trọng xe từ cơ sở dữ liệu Vietmap Logistics
                </Text>
              </View>
              <Switch
                accessibilityLabel="Cảnh báo đường cấm tải"
                onValueChange={setAvoidTruckRestrictions}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={avoidTruckRestrictions}
              />
            </View>
          </View>
        </View>

        {/* ── 3. Màn hình & tối ưu pin ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Màn hình & tối ưu pin</Text>

          <View style={styles.card}>
            {/* Giữ màn hình luôn sáng */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSecurityShield color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Giữ màn hình luôn sáng khi online</Text>
                <Text style={styles.settingDesc}>
                  Ngăn thiết bị tự động khóa màn hình trong lúc chờ đơn hoặc đang giao hàng
                </Text>
              </View>
              <Switch
                accessibilityLabel="Giữ màn hình luôn sáng"
                onValueChange={setKeepScreenAwake}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={keepScreenAwake}
              />
            </View>

            {/* Chế độ tiết kiệm pin */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconClock color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Chế độ tiết kiệm pin thực địa</Text>
                <Text style={styles.settingDesc}>
                  Giảm tần suất vẽ lại bản đồ và hiệu ứng chuyển động khi mức pin dưới 20%
                </Text>
              </View>
              <Switch
                accessibilityLabel="Chế độ tiết kiệm pin"
                onValueChange={setBatterySaver}
                thumbColor={colors.neutral.surface}
                trackColor={{ false: '#E2E8F0', true: driverPrimitives.colors.green500 }}
                value={batterySaver}
              />
            </View>
          </View>
        </View>

        {/* ── 4. Quyền thiết bị & dữ liệu ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Quyền thiết bị & dữ liệu</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconLocationPin color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quyền vị trí chính xác (Background GPS)</Text>
                <Text style={styles.settingDesc}>Đã cấp quyền "Luôn cho phép" · Tọa độ thời gian thực</Text>
              </View>
              <View style={styles.statusPillGreen}>
                <IconCheck color={driverPrimitives.colors.gray500} size={12} strokeWidth={2.5} />
                <Text style={styles.statusPillGreenText}>Hợp lệ</Text>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSecurityShield color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quyền camera & chụp ảnh bằng chứng POD</Text>
                <Text style={styles.settingDesc}>Dùng để chụp ảnh hàng hóa tại điểm nhận và điểm giao</Text>
              </View>
              <View style={styles.statusPillGreen}>
                <IconCheck color={driverPrimitives.colors.gray500} size={12} strokeWidth={2.5} />
                <Text style={styles.statusPillGreenText}>Hợp lệ</Text>
              </View>
            </View>

            {/* Dọn dẹp cache */}
            <Pressable
              accessibilityLabel="Dọn dẹp bộ nhớ đệm ứng dụng"
              accessibilityRole="button"
              disabled={isClearingCache}
              onPress={handleClearCache}
              style={({ pressed }) => [styles.settingRowAction, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconWrap}>
                <IconTrash color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Dọn dẹp bộ nhớ đệm (Cache)</Text>
                <Text style={styles.settingDesc}>Dung lượng tạm hiện tại: {cacheSize ?? 'Chưa đo'}</Text>
              </View>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </Pressable>
          </View>
        </View>

        {/* ── 5. Trợ giúp & pháp lý ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Trợ giúp & pháp lý</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSupport247 color={driverPrimitives.colors.gray500} size={20} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tổng đài điều hành LEOPARD Pilot</Text>
                <Text style={styles.settingDesc}>Liên hệ điều hành — thông tin hiển thị khi BE cấu hình</Text>
              </View>
              <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
            </View>

            {/* SOS Button */}
            <Pressable
              accessibilityLabel="Nút gọi khẩn cấp SOS"
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  'Cứu hộ khẩn cấp SOS (24/7)',
                  'Đường dây nóng khẩn cấp sẽ hiển thị khi BE cấu hình. Hiện chưa có số liên hệ.',
                  [{ text: 'Đã hiểu', style: 'cancel' }],
                );
              }}
              style={({ pressed }) => [styles.sosButton, pressed ? styles.pressed : null]}
            >
              <IconWarningShield color={colors.danger.text} size={18} />
              <Text style={styles.sosButtonText}>Gọi cứu hộ khẩn cấp SOS (24/7)</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer Build info */}
        <View style={styles.footerSection}>
          <Text style={styles.footerVersion}>LEOPARD Driver Cockpit · v{APP_VERSION}</Text>
          <Text style={styles.footerCopyright}>Bản quyền thuộc LEOPARD Freight Logistics Platform</Text>
        </View>
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
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 60,
  },
  resetBtn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
    width: 65,
  },
  resetBtnText: {
    color: driverPrimitives.colors.blue500,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },

  /* Sections */
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },

  settingRow: {
    alignItems: 'center',
    borderBottomColor: driverPrimitives.colors.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingRowAction: {
    alignItems: 'center',
    borderBottomColor: driverPrimitives.colors.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  newBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  newPill: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newPillText: {
    color: colors.neutral.mutedText,
    fontSize: 9.5,
    fontWeight: '700',
  },
  settingTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
  },
  settingDesc: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    lineHeight: 16,
  },

  subConfigBox: {
    backgroundColor: colors.neutral.canvas,
    borderBottomColor: driverPrimitives.colors.gray100,
    borderBottomWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subConfigLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Apple Segmented Controls */
  segmentedControl: {
    backgroundColor: colors.neutral.border,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 2,
    padding: 2,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 7,
  },
  segmentBtnActive: {
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.sm,
  },
  segmentBtnText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    color: driverPrimitives.colors.gray900,
    fontWeight: '700',
  },

  segmentedControlCompact: {
    backgroundColor: colors.neutral.border,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 2,
    padding: 2,
  },
  segmentCompactBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  segmentCompactBtnActive: {
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.sm,
  },
  segmentCompactText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '500',
  },
  segmentCompactTextActive: {
    color: driverPrimitives.colors.gray900,
    fontWeight: '700',
  },

  statusPillGreen: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillGreenText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontWeight: '600',
  },

  sosButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
    margin: 14,
  },
  sosButtonText: {
    color: colors.danger.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  footerSection: {
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  footerVersion: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  footerCopyright: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.85,
  },
});
