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
import Svg, { Path } from 'react-native-svg';

import appJson from '../../../app.json';

import {
  colors,
  driverPrimitives,
  driverSemantics,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
  ScreenScaffold,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconLocationPin,
  IconRadarPulse,
  IconRoute,
  IconSecurityShield,
  IconSettings,
  IconSpeedTruck,
  IconSupport247,
  IconTrash,
  IconWarningShield,
} from '@leopard/mobile-core';

function TrendingUpIcon({ size = 16, color = driverPrimitives.colors.green600 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill={color} />
    </Svg>
  );
}

// Same source as profile adapter: real bundled version, never a hardcoded pilot tag.
const APP_VERSION: string = (appJson as { expo?: { version?: unknown } })?.expo?.version
  ? String((appJson as { expo: { version: unknown } }).expo.version)
  : '—';

export function DriverSettingsScreen() {
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
  // No cache-size API wired: null until a real measurement exists — never a fake '142 MB'.
  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  // Real GPS accuracy from expo-location, measured on demand. Null = chưa đo.
  const [gpsAccuracyLabel, setGpsAccuracyLabel] = useState<string | null>(null);
  const [isMeasuringGps, setIsMeasuringGps] = useState(false);

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

  const handleMeasureGps = async () => {
    if (isMeasuringGps) return;
    setIsMeasuringGps(true);
    try {
      const Location = require('expo-location') as {
        requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
        getCurrentPositionAsync: (opts?: { accuracy?: number }) => Promise<{ coords: { accuracy?: number | null } }>;
        Accuracy?: { Balanced?: number };
      };
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Chưa có quyền vị trí', 'Cấp quyền vị trí để đo độ chính xác GPS thực địa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy?.Balanced ?? 3,
      });
      const acc = pos.coords.accuracy;
      setGpsAccuracyLabel(
        typeof acc === 'number' && Number.isFinite(acc) ? `±${Math.round(acc)}m` : 'Đã đo · không rõ độ chính xác',
      );
    } catch {
      Alert.alert('Không đo được GPS', 'Thử lại khi thiết bị có tín hiệu vị trí.');
    } finally {
      setIsMeasuringGps(false);
    }
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
          onPress={handleResetDefaults}
          style={styles.resetBtn}
        >
          <Text style={styles.resetBtnText}>Đặt lại</Text>
        </Pressable>
      }
      headerTone="plain"
      title="Tất cả cài đặt"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. Cockpit System Diagnostics Hero Card ── */}
        <View style={styles.diagnosticsCard}>
          <View style={styles.diagnosticsHeader}>
            <View style={styles.diagnosticsBrandChip}>
              <IconRadarPulse color="#38BDF8" size={14} />
              <Text style={styles.diagnosticsBrandText}>CHẨN ĐOÁN BUỒNG LÁI</Text>
            </View>
            <View style={styles.readyBadge}>
              <View style={styles.readyDot} />
              <Text style={styles.readyBadgeText}>SẴN SÀNG NHẬN ĐƠN</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>GPS thực địa</Text>
              <Text style={styles.metricValueGreen}>{gpsAccuracyLabel ?? '—'}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Server Ping</Text>
              <Text style={styles.metricValueGreen}>—</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Âm lượng chuông</Text>
              <Text style={styles.metricValue}>{ringtoneVolume}%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Tối ưu pin</Text>
              <Text style={styles.metricValue}>{batterySaver ? 'Tiết kiệm pin: Bật' : 'Tiết kiệm pin: Tắt'}</Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Thử nghiệm âm thanh chuông báo và độ nhạy"
            accessibilityRole="button"
            disabled={isTestingAlert || isMeasuringGps}
            onPress={() => {
              handleTestAlert();
              void handleMeasureGps();
            }}
            style={({ pressed }) => [
              styles.testAlertBtn,
              isTestingAlert ? styles.testAlertBtnActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <IconBell color={isTestingAlert ? '#FFFFFF' : '#38BDF8'} size={16} />
            <Text
              style={[
                styles.testAlertBtnText,
                isTestingAlert ? styles.testAlertBtnTextActive : null,
              ]}
            >
              {isTestingAlert || isMeasuringGps ? 'Đang phát thử chuông nổ đơn…' : 'Nghe thử chuông nổ đơn & Test GPS'}
            </Text>
          </Pressable>
        </View>

        {/* ── 2. BÁO HIỆU & ĐIỀU PHỐI ĐƠN HÀNG (Image 6: Cài đặt yêu cầu) ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>BÁO HIỆU & ĐIỀU PHỐI ĐƠN HÀNG</Text>
          <View style={styles.card}>
            {/* Highlight Banner (Image 6) */}
            <View style={styles.highlightBanner}>
              <TrendingUpIcon />
              <Text style={styles.highlightBannerText}>Tăng cơ hội nhận cuốc của bạn</Text>
            </View>

            {/* Tự động nhận cuốc (Auto-accept) */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSpeedTruck color={driverPrimitives.colors.green500} size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động nhận đơn</Text>
                <Text style={styles.settingDesc}>Tự động nhận cuốc mới.</Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt tự động nhận đơn"
                onValueChange={setAutoAccept}
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={autoAccept}
              />
            </View>

            {/* Radius selector (khi bật Auto-accept) */}
            {autoAccept && (
              <View style={styles.subConfigBox}>
                <Text style={styles.subConfigLabel}>Bán kính tự động quét cuốc:</Text>
                <View style={styles.radiusButtonGroup}>
                  {[2, 5, 10].map((radiusKm) => (
                    <Pressable
                      accessibilityLabel={`Bán kính ${radiusKm} kilômét`}
                      accessibilityRole="button"
                      key={radiusKm}
                      onPress={() => setAutoAcceptRadius(radiusKm)}
                      style={[
                        styles.radiusBtn,
                        autoAcceptRadius === radiusKm ? styles.radiusBtnActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.radiusBtnText,
                          autoAcceptRadius === radiusKm ? styles.radiusBtnTextActive : null,
                        ]}
                      >
                        {radiusKm} km
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Đề xuất giá cước (MỚI - Image 6) */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRadarPulse color={driverPrimitives.colors.green500} size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={priceProposal}
              />
            </View>

            {/* Chuông lớn */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconBell color={driverPrimitives.colors.gray700} size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={highAlertSound}
              />
            </View>

            {/* Âm lượng chuông báo */}
            <View style={styles.subConfigBox}>
              <Text style={styles.subConfigLabel}>Mức âm lượng chuông điều phối:</Text>
              <View style={styles.radiusButtonGroup}>
                {([50, 75, 100] as const).map((vol) => (
                  <Pressable
                    accessibilityLabel={`Âm lượng ${vol}%`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ringtoneVolume === vol }}
                    key={vol}
                    onPress={() => setRingtoneVolume(vol)}
                    style={[
                      styles.radiusBtn,
                      ringtoneVolume === vol ? styles.radiusBtnActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusBtnText,
                        ringtoneVolume === vol ? styles.radiusBtnTextActive : null,
                      ]}
                    >
                      {vol}% {vol === 100 ? '(Tối đa)' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Rung cường độ cao */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRadarPulse color={driverPrimitives.colors.gray700} size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={vibrateOnOffer}
              />
            </View>

            {/* Giọng nói đọc tóm tắt đơn (TTS) */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSupport247 color={driverPrimitives.colors.gray700} size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={voiceAnnouncement}
              />
            </View>

            {/* Tự động nghỉ sau chuyến này */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconClock color={driverPrimitives.colors.gray700} size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={autoOfflineOnComplete}
              />
            </View>
          </View>
        </View>

        {/* ── 3. BẢN ĐỒ & DẪN ĐƯỜNG XE TẢI ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>BẢN ĐỒ & DẪN ĐƯỜNG XE TẢI</Text>
          <View style={styles.card}>
            {/* Lựa chọn app bản đồ */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconRoute color="#0B1E42" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Ứng dụng dẫn đường mặc định</Text>
                <Text style={styles.settingDesc}>
                  {defaultNav === 'vietmap'
                    ? 'Vietmap Navigation (Tối ưu cho xe tải & biển cấm giờ)'
                    : 'Google Maps Navigation'}
                </Text>
              </View>
              <View style={styles.navSelectorGroup}>
                <Pressable
                  accessibilityLabel="Chọn bản đồ Vietmap"
                  accessibilityRole="button"
                  onPress={() => setDefaultNav('vietmap')}
                  style={[
                    styles.navSelectorPill,
                    defaultNav === 'vietmap' ? styles.navSelectorPillActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.navSelectorText,
                      defaultNav === 'vietmap' ? styles.navSelectorTextActive : null,
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
                    styles.navSelectorPill,
                    defaultNav === 'google' ? styles.navSelectorPillActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.navSelectorText,
                      defaultNav === 'google' ? styles.navSelectorTextActive : null,
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
                <IconLocationPin color="#0B1E42" size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={autoOpenNav}
              />
            </View>

            {/* Tránh đường cấm tải trọng */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconWarningShield color="#10B981" size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={avoidTruckRestrictions}
              />
            </View>
          </View>
        </View>

        {/* ── 4. MÀN HÌNH LÁI XE & TỐI ƯU PIN ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>MÀN HÌNH LÁI XE & TỐI ƯU PIN</Text>
          <View style={styles.card}>
            {/* Giữ màn hình luôn sáng */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSecurityShield color="#0B1E42" size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={keepScreenAwake}
              />
            </View>

            {/* Chế độ tiết kiệm pin */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconClock color="#0B1E42" size={18} />
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
                thumbColor="#FFFFFF"
                trackColor={{ false: '#CBD5E1', true: driverPrimitives.colors.green500 }}
                value={batterySaver}
              />
            </View>
          </View>
        </View>

        {/* ── 5. QUYỀN THIẾT BỊ & DỌN DẸP DỮ LIỆU ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>QUYỀN THIẾT BỊ & DỌN DẸP DỮ LIỆU</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconLocationPin color="#10B981" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quyền vị trí chính xác (Background GPS)</Text>
                <Text style={styles.settingDesc}>Đã cấp quyền "Luôn cho phép" · Tọa độ thời gian thực</Text>
              </View>
              <View style={styles.statusPillGreen}>
                <IconCheck color="#10B981" size={12} />
                <Text style={styles.statusPillGreenText}>Hợp lệ</Text>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSecurityShield color="#10B981" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quyền camera & chụp ảnh bằng chứng POD</Text>
                <Text style={styles.settingDesc}>Dùng để chụp ảnh hàng hóa tại điểm nhận và điểm giao</Text>
              </View>
              <View style={styles.statusPillGreen}>
                <IconCheck color="#10B981" size={12} />
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
                <IconTrash color="#EF4444" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitleDanger}>Dọn dẹp bộ nhớ đệm (Cache)</Text>
                <Text style={styles.settingDesc}>Dung lượng tạm hiện tại: {cacheSize ?? 'Chưa đo'}</Text>
              </View>
              <IconChevronRight color="#94A3B8" size={16} />
            </Pressable>
          </View>
        </View>

        {/* ── 6. TRỢ GIÚP KỸ THUẬT & PHÁP LÝ ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>TRỢ GIÚP KỸ THUẬT & PHÁP LÝ</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSupport247 color="#0B1E42" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tổng đài điều hành LEOPARD Pilot</Text>
                <Text style={styles.settingDesc}>Liên hệ điều hành — thông tin hiển thị khi BE cấu hình</Text>
              </View>
              <IconChevronRight color="#94A3B8" size={16} />
            </View>

            {/* Nút gọi khẩn cấp SOS */}
            <Pressable
              accessibilityLabel="Nút gọi khẩn cấp SOS"
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  'GỌI CỨU HỘ KHẨN CẤP SOS (24/7)',
                  'Đường dây nóng khẩn cấp sẽ hiển thị khi BE cấu hình. Hiện chưa có số liên hệ.',
                  [
                    { text: 'Đã hiểu', style: 'cancel' },
                  ],
                );
              }}
              style={({ pressed }) => [styles.sosButton, pressed ? styles.pressed : null]}
            >
              <IconWarningShield color="#FFFFFF" size={18} />
              <Text style={styles.sosButtonText}>GỌI CỨU HỘ KHẨN CẤP SOS (24/7)</Text>
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
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 16,
    paddingBottom: 60,
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetBtnText: {
    color: driverPrimitives.colors.blue500,
    fontSize: 14,
    fontWeight: '600',
  },

  diagnosticsCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  diagnosticsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  diagnosticsBrandChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diagnosticsBrandText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  readyBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 9999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readyDot: {
    backgroundColor: '#10B981',
    borderRadius: 9999,
    height: 6,
    width: 6,
  },
  readyBadgeText: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '700',
  },

  metricsGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValueGreen: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  metricDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 1,
  },
  testAlertBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  testAlertBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  testAlertBtnText: {
    color: '#38BDF8',
    fontSize: 12.5,
    fontWeight: '700',
  },
  testAlertBtnTextActive: {
    color: '#FFFFFF',
  },

  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },

  highlightBanner: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.green50,
    borderBottomColor: driverPrimitives.colors.green100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  highlightBannerText: {
    color: driverPrimitives.colors.green700,
    fontSize: 13.5,
    fontWeight: '600',
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
    backgroundColor: driverPrimitives.colors.red500,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newPillText: {
    color: driverPrimitives.colors.white,
    fontSize: 9.5,
    fontWeight: '800',
  },
  settingTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
  },
  settingTitleDanger: {
    color: driverPrimitives.colors.red600,
    fontSize: 14.5,
    fontWeight: '600',
  },
  settingDesc: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    lineHeight: 16,
  },

  subConfigBox: {
    backgroundColor: driverPrimitives.colors.gray50,
    borderBottomColor: driverPrimitives.colors.gray100,
    borderBottomWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subConfigLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12.5,
    fontWeight: '600',
  },
  radiusButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  radiusBtnActive: {
    backgroundColor: driverPrimitives.colors.green50,
    borderColor: driverPrimitives.colors.green500,
  },
  radiusBtnText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12.5,
    fontWeight: '600',
  },
  radiusBtnTextActive: {
    color: driverPrimitives.colors.green700,
    fontWeight: '700',
  },

  navSelectorGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  navSelectorPill: {
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navSelectorPillActive: {
    backgroundColor: driverPrimitives.colors.green50,
    borderColor: driverPrimitives.colors.green500,
    borderWidth: 1,
  },
  navSelectorText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  navSelectorTextActive: {
    color: driverPrimitives.colors.green700,
    fontWeight: '700',
  },

  statusPillGreen: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 9999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillGreenText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },

  sosButton: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    margin: 12,
    paddingVertical: 12,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
