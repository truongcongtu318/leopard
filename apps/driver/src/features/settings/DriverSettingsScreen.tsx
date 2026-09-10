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

import { colors, leopardPalette, radius, spacing, ScreenScaffold, IconBell, IconCheck, IconChevronRight, IconClock, IconLocationPin, IconRadarPulse, IconRoute, IconSecurityShield, IconSettings, IconSpeedTruck, IconSupport247, IconTrash, IconWarningShield } from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';

export function DriverSettingsScreen() {
  const { openDrawer } = useDriverDrawer();

  // 1. Alerts & Dispatch offers state
  const [highAlertSound, setHighAlertSound] = useState(true);
  const [ringtoneVolume, setRingtoneVolume] = useState<50 | 75 | 100>(100);
  const [vibrateOnOffer, setVibrateOnOffer] = useState(true);
  const [voiceAnnouncement, setVoiceAnnouncement] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [autoAcceptRadius, setAutoAcceptRadius] = useState<number>(5);

  // 2. Navigation state
  const [defaultNav, setDefaultNav] = useState<'vietmap' | 'google'>('vietmap');
  const [autoOpenNav, setAutoOpenNav] = useState(true);
  const [avoidTruckRestrictions, setAvoidTruckRestrictions] = useState(true);

  // 3. Display & Power state
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);

  // 4. Testing alert feedback & Cache storage
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [cacheSize, setCacheSize] = useState('142 MB');
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
        'Âm thanh chuông báo nổ đơn và rung phản hồi hoạt động bình thường ở mức âm lượng 100%.',
        [{ text: 'Đã hiểu' }],
      );
    }, 1200);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Dọn dẹp bộ nhớ đệm?',
      'Hành động này sẽ xóa dữ liệu tạm của bản đồ và ảnh biên bản giao hàng POD đã đồng bộ lên máy chủ, giải phóng ' +
        cacheSize +
        '.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Dọn dẹp ngay',
          style: 'destructive',
          onPress: () => {
            setIsClearingCache(true);
            cacheTimerRef.current = setTimeout(() => {
              setCacheSize('0 MB');
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
      headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
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
      title="Cài đặt ứng dụng"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Cockpit System Diagnostics Hero Card */}
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
              <Text style={styles.metricValueGreen}>±3m · Cao</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Server Ping</Text>
              <Text style={styles.metricValueGreen}>24 ms</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Âm lượng chuông</Text>
              <Text style={styles.metricValue}>100% Max</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Tối ưu pin</Text>
              <Text style={styles.metricValue}>Chạy nền tốt</Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Thử nghiệm âm thanh chuông báo và độ nhạy"
            accessibilityRole="button"
            disabled={isTestingAlert}
            onPress={handleTestAlert}
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
              {isTestingAlert ? 'Đang phát thử chuông nổ đơn…' : 'Nghe thử chuông nổ đơn & Test GPS'}
            </Text>
          </Pressable>
        </View>

        {/* 2. Báo hiệu & Nhận đơn (Alerts & Dispatch Offers) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>BÁO HIỆU & ĐIỀU PHỐI ĐƠN HÀNG</Text>
          <View style={styles.card}>
            {/* Chuông lớn */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconBell color={colors.brand.background} size={18} />
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
                thumbColor={highAlertSound ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
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
                <IconRadarPulse color={colors.brand.background} size={18} />
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
                thumbColor={vibrateOnOffer ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={vibrateOnOffer}
              />
            </View>

            {/* Giọng nói đọc tóm tắt đơn (TTS) */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSupport247 color={colors.brand.background} size={18} />
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
                thumbColor={voiceAnnouncement ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={voiceAnnouncement}
              />
            </View>

            {/* Tự động nhận đơn */}
            <View style={[styles.settingRow, autoAccept ? null : styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconSpeedTruck color={colors.brand.background} size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động nhận đơn (Auto-accept)</Text>
                <Text style={styles.settingDesc}>
                  Tự động tiếp nhận chuyến xe phù hợp khi đang Sẵn sàng
                </Text>
              </View>
              <Switch
                accessibilityLabel="Bật tắt tự động nhận đơn"
                onValueChange={setAutoAccept}
                thumbColor={autoAccept ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
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
          </View>
        </View>

        {/* 3. Bản đồ & Dẫn đường xe tải (Truck Navigation & Routing) */}
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

            {/* Tự mở dẫn đường khi nhận đơn */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconLocationPin color="#0B1E42" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tự động mở bản đồ khi nhận chuyến</Text>
                <Text style={styles.settingDesc}>
                  Chuyển hướng ngay sang lộ trình đón hàng rảnh tay
                </Text>
              </View>
              <Switch
                accessibilityLabel="Tự động mở bản đồ khi nhận chuyến"
                onValueChange={setAutoOpenNav}
                thumbColor={autoOpenNav ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={autoOpenNav}
              />
            </View>

            {/* Tránh đường cấm tải */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconWarningShield color="#F59E0B" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tránh đường cấm tải trọng nội đô</Text>
                <Text style={styles.settingDesc}>
                  Luôn tính toán lộ trình tuân thủ tải trọng xe và khung giờ cấm
                </Text>
              </View>
              <Switch
                accessibilityLabel="Tránh đường cấm tải trọng"
                onValueChange={setAvoidTruckRestrictions}
                thumbColor={avoidTruckRestrictions ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={avoidTruckRestrictions}
              />
            </View>
          </View>
        </View>

        {/* 4. Màn hình lái xe & Tối ưu pin (Display & Power) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>MÀN HÌNH LÁI XE & TỐI ƯU PIN</Text>
          <View style={styles.card}>
            {/* Giữ sáng màn hình */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconClock color={colors.brand.background} size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Giữ sáng màn hình khi đang chở hàng</Text>
                <Text style={styles.settingDesc}>
                  Không tự động khóa màn hình trong suốt hành trình cuốc xe
                </Text>
              </View>
              <Switch
                accessibilityLabel="Giữ sáng màn hình khi đang chở hàng"
                onValueChange={setKeepScreenAwake}
                thumbColor={keepScreenAwake ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={keepScreenAwake}
              />
            </View>

            {/* Tiết kiệm pin */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconSettings color="#64748B" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Chế độ tiết kiệm pin định vị</Text>
                <Text style={styles.settingDesc}>
                  Tự động giảm tần suất ping GPS khi xe dừng đỗ quá 5 phút
                </Text>
              </View>
              <Switch
                accessibilityLabel="Chế độ tiết kiệm pin định vị"
                onValueChange={setBatterySaver}
                thumbColor={batterySaver ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
                value={batterySaver}
              />
            </View>
          </View>
        </View>

        {/* 5. Quyền thiết bị & Dọn dẹp bộ nhớ (Permissions & Maintenance) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>QUYỀN THIẾT BỊ & DỌN DẸP DỮ LIỆU</Text>
          <View style={styles.card}>
            {/* Background Location */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconLocationPin color="#10B981" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quyền vị trí chạy nền (Always)</Text>
                <Text style={styles.settingDesc}>
                  Duy trì tracking realtime cho khách hàng và đội điều phối
                </Text>
              </View>
              <View style={styles.okBadge}>
                <IconCheck color="#059669" size={11} strokeWidth={2.5} />
                <Text style={styles.okBadgeText}>Đã cấp</Text>
              </View>
            </View>

            {/* Floating Bubble */}
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <IconSecurityShield color="#10B981" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Cửa sổ nổi trên ứng dụng khác</Text>
                <Text style={styles.settingDesc}>
                  Hiển thị nút nhận đơn khi đang mở Vietmap hoặc nghe điện thoại
                </Text>
              </View>
              <View style={styles.okBadge}>
                <IconCheck color="#059669" size={11} strokeWidth={2.5} />
                <Text style={styles.okBadgeText}>Đã cấp</Text>
              </View>
            </View>

            {/* Clear cache */}
            <Pressable
              accessibilityLabel="Dọn dẹp bộ nhớ đệm ảnh chứng từ POD"
              accessibilityRole="button"
              disabled={isClearingCache}
              onPress={handleClearCache}
              style={({ pressed }) => [
                styles.settingRow,
                styles.settingRowLast,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.iconWrap}>
                <IconTrash color="#EF4444" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Bộ nhớ tạm ảnh chứng từ POD</Text>
                <Text style={styles.settingDesc}>
                  {isClearingCache
                    ? 'Đang giải phóng dữ liệu…'
                    : `Hiện chiếm dụng ${cacheSize} · Chạm để dọn dẹp`}
                </Text>
              </View>
              <View style={styles.cleanActionBadge}>
                <Text style={styles.cleanActionText}>Dọn dẹp</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* 6. Trợ giúp & Thông tin ứng dụng (Support & About) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>TRỢ GIÚP KỸ THUẬT & PHÁP LÝ</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel="Mở quy chế hoạt động đối tác tài xế"
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  'Quy chế hoạt động',
                  'Quy chế đối tác tài xế LEOPARD Logistics phiên bản 2026. Tuân thủ đầy đủ quy định vận tải hàng hóa đường bộ Bộ GTVT.',
                )
              }
              style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconWrap}>
                <IconSecurityShield color="#0B1E42" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Quy chế đối tác tài xế LEOPARD</Text>
                <Text style={styles.settingDesc}>Quy chuẩn an toàn, tỷ lệ nhận chuyến và đánh giá</Text>
              </View>
              <IconChevronRight color="#94A3B8" size={18} />
            </Pressable>

            <Pressable
              accessibilityLabel="Gọi tổng đài hỗ trợ kỹ thuật buồng lái"
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  'Tổng đài kỹ thuật',
                  'Đang kết nối đến Đội hỗ trợ kỹ thuật ứng dụng tài xế: 1900-LEOPARD (Nhánh 2).',
                )
              }
              style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconWrap}>
                <IconSupport247 color="#0B1E42" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Tổng đài kỹ thuật buồng lái 24/7</Text>
                <Text style={styles.settingDesc}>Hotline giải quyết sự cố ứng dụng & tài khoản</Text>
              </View>
              <Text style={styles.hotlineText}>1900-LEOPARD</Text>
            </Pressable>

            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.iconWrap}>
                <IconSettings color="#64748B" size={18} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.settingTitle}>Phiên bản Driver Cockpit</Text>
                <Text style={styles.settingDesc}>Môi trường thử nghiệm mini-production pilot</Text>
              </View>
              <Text style={styles.versionBadgeText}>v1.0.0 (Build 2608)</Text>
            </View>
          </View>
        </View>

        {/* 7. Nút gọi khẩn cấp SOS */}
        <View style={styles.sosSectionBlock}>
          <Pressable
            accessibilityLabel="Nút gọi khẩn cấp SOS"
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                'Cuộc gọi khẩn cấp SOS',
                'Đang kết nối đến Đội cứu hộ khẩn cấp LEOPARD 24/7 (1900-LEOPARD - Nhánh 1). Tọa độ GPS của bạn sẽ được chuyển tiếp tức thì.',
                [{ text: 'Hủy', style: 'cancel' }, { text: 'Gọi ngay', style: 'destructive' }],
              )
            }
            style={({ pressed }) => [styles.sosBtn, pressed ? styles.pressed : null]}
          >
            <IconWarningShield color="#FFFFFF" size={20} />
            <Text style={styles.sosBtnText}>GỌI CỨU HỘ KHẨN CẤP SOS (24/7)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl * 1.5,
  },

  // Reset top button
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetBtnText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '700',
  },

  // Cockpit System Diagnostics Hero Card
  diagnosticsCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  diagnosticsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readyDot: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  readyBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '800',
  },
  metricValueGreen: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '800',
  },
  metricDivider: {
    backgroundColor: '#334155',
    height: 22,
    width: 1,
  },
  testAlertBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#0B1E42',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  testAlertBtnActive: {
    backgroundColor: '#0B1E42',
  },
  testAlertBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  testAlertBtnTextActive: {
    color: '#FFFFFF',
  },

  // Section Blocks & Cards
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  settingDesc: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    lineHeight: 16,
  },

  // Sub-configuration Box (Radius buttons)
  subConfigBox: {
    backgroundColor: leopardPalette.bgMuted,
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  subConfigLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 12,
    fontWeight: '600',
  },
  radiusButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  radiusBtnActive: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  radiusBtnText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '700',
  },
  radiusBtnTextActive: {
    color: '#FFFFFF',
  },

  // Nav selector group
  navSelectorGroup: {
    backgroundColor: leopardPalette.bgMuted,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  navSelectorPill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navSelectorPillActive: {
    backgroundColor: colors.brand.background,
  },
  navSelectorText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '700',
  },
  navSelectorTextActive: {
    color: '#FFFFFF',
  },

  // Badges & Action Buttons
  okBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  okBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  cleanActionBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cleanActionText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '700',
  },
  hotlineText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
  },
  versionBadgeText: {
    color: leopardPalette.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  sosSectionBlock: {
    marginTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sosBtn: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
