import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { httpClient } from '../../src/api/http-client';
import { ApiError } from '../../src/api/api-error';
import { sessionStore } from '../../src/auth/session-store';
import {
  pickDeviceImage,
  type DeviceImageAsset,
} from '../../src/media/device-image-picker';
import { radius, spacing } from '../../src/theme/tokens';
import { LeopardEmblem, LeopardMobileLogo } from '../../src/ui/icons/CoreIcons';

/** Palette synchronized with the login screen. */
const scene = {
  canvas: '#EEF3F9',
  surface: '#FFFFFF',
  fieldBg: '#F8FAFC',
  ink: '#0B1F3A',
  muted: '#5B6B80',
  border: '#CAD9EB',
  ctaTop: '#2E6FD6',
  ctaBottom: '#1E5BB8',
  success: '#16A34A',
  successBg: '#DCFCE7',
} as const;

type VehicleType = 'VAN' | 'TRUCK' | 'MOTORBIKE';

const VEHICLES: readonly { readonly value: VehicleType; readonly label: string }[] = [
  { value: 'VAN', label: 'Xe van' },
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'MOTORBIKE', label: 'Ba gác / Máy' },
];

type DocType = 'LICENSE' | 'VEHICLE_REGISTRATION' | 'ID_CARD';

const DOC_SLOTS: readonly { readonly type: DocType; readonly label: string; readonly hint: string }[] = [
  { type: 'LICENSE', label: 'Giấy phép lái xe (GPLX)', hint: 'Ảnh mặt trước, rõ nét' },
  { type: 'VEHICLE_REGISTRATION', label: 'Cà-vẹt / Đăng ký xe', hint: 'Giấy đăng ký phương tiện' },
  { type: 'ID_CARD', label: 'CCCD / CMND', hint: 'Mặt trước căn cước' },
];

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export default function RegisterScreen() {
  const router = useRouter();
  const isAuthenticated = sessionStore.getAccessToken() != null;

  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('VAN');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [docs, setDocs] = useState<Partial<Record<DocType, DeviceImageAsset>>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const refreshStatus = async () => {
    try {
      const app = await httpClient.get<{
        status: string;
        rejectionReason: string | null;
      }>('/driver/application');
      setAppStatus(app.status);
      setRejectionReason(app.rejectionReason ?? null);
    } catch {
      // transient errors ignored
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    await refreshStatus();
    setIsCheckingStatus(false);
  };

  const resetForReapply = () => {
    setSuccess(false);
    setAppStatus(null);
    setRejectionReason(null);
    setDocs({});
    setErrorMsg(null);
  };

  const requiredDocsReady = DOC_SLOTS.every((slot) => docs[slot.type]);
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(licensePlate.trim()) &&
    Boolean(licenseNumber.trim()) &&
    requiredDocsReady &&
    !isSubmitting;

  const pickDoc = async (type: DocType) => {
    const asset = await pickDeviceImage();
    if (asset) {
      setDocs((prev) => ({ ...prev, [type]: asset }));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await httpClient.post('/driver/apply', {
        name: name.trim(),
        vehicleType,
        licensePlate: licensePlate.trim(),
        licenseNumber: licenseNumber.trim(),
      });

      for (const slot of DOC_SLOTS) {
        const asset = docs[slot.type];
        if (!asset) continue;
        const form = new FormData();
        form.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType,
        } as unknown as Blob);
        form.append('type', slot.type);
        form.append('clientRequestId', newRequestId());
        await httpClient.postForm('/driver/documents', form);
      }

      setSuccess(true);
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;
      if (statusCode === 401) {
        setErrorMsg('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      } else if (err instanceof ApiError && statusCode >= 400 && statusCode < 500) {
        setErrorMsg(message ?? 'Thông tin đăng ký chưa hợp lệ');
      } else {
        setErrorMsg(message ?? 'Đã xảy ra lỗi khi gửi hồ sơ, vui lòng thử lại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
    >
      <View style={styles.masthead}>
        <View style={styles.topRow}>
          <Pressable hitSlop={8} onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Quay lại</Text>
          </Pressable>
          <View style={styles.brandRow}>
            <LeopardEmblem width={32} />
            <LeopardMobileLogo height={24} width={110} />
          </View>
        </View>
        <Text accessibilityRole="header" style={styles.headline}>
          Đăng ký tài xế đối tác
        </Text>
        <Text style={styles.subline}>
          Hoàn tất hồ sơ để LEOPARD xét duyệt và bắt đầu nhận đơn.
        </Text>
      </View>

      <View style={styles.body}>
        {!isAuthenticated ? (
          <View style={styles.card}>
            <Text style={styles.gateTitle}>Cần đăng nhập trước</Text>
            <Text style={styles.gateText}>
              Vui lòng đăng nhập bằng số điện thoại, sau đó quay lại để đăng ký làm tài xế.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(public)/login')}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <View pointerEvents="none" style={styles.btnGloss} />
              <Text style={styles.primaryBtnText}>Đăng nhập</Text>
            </Pressable>
          </View>
        ) : success ? (
          <View style={[styles.card, styles.successCard]} testID="register-success">
            {appStatus === 'ACTIVE' ? (
              <>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Hồ sơ đã được duyệt!</Text>
                <Text style={styles.successText}>
                  Bạn có thể bắt đầu nhận đơn ngay bây giờ.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/driver/orders')}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>Bắt đầu nhận đơn</Text>
                </Pressable>
              </>
            ) : appStatus === 'REJECTED' ? (
              <>
                <Text style={styles.successIcon}>⚠️</Text>
                <Text style={styles.successTitle}>Hồ sơ bị từ chối</Text>
                <Text style={styles.successText}>
                  {rejectionReason ?? 'Vui lòng kiểm tra lại giấy tờ và nộp lại.'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={resetForReapply}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>Nộp lại hồ sơ</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>Đã gửi hồ sơ!</Text>
                <Text style={styles.successText}>
                  Hồ sơ tài xế đang chờ LEOPARD duyệt. Nhấn "Kiểm tra lại" để cập nhật kết quả.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isCheckingStatus}
                  onPress={handleCheckStatus}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>
                    {isCheckingStatus ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.replace('/')}
                >
                  <Text style={styles.loginLink}>Về trang chính</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <>
            {errorMsg ? (
              <View style={styles.errorBox} testID="register-error">
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* Thông tin cá nhân + phương tiện */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>THÔNG TIN TÀI XẾ</Text>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Họ và tên</Text>
                <View
                  style={[
                    styles.inputWrap,
                    focusedField === 'name' && styles.inputWrapFocused,
                  ]}
                >
                  <TextInput
                    accessibilityLabel="Họ và tên"
                    editable={!isSubmitting}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    placeholder="VD: Nguyễn Văn A"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={name}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Loại phương tiện</Text>
                <View style={styles.chipRow}>
                  {VEHICLES.map((v) => {
                    const active = vehicleType === v.value;
                    return (
                      <Pressable
                        key={v.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setVehicleType(v.value)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {v.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Biển số xe</Text>
                <View
                  style={[
                    styles.inputWrap,
                    focusedField === 'plate' && styles.inputWrapFocused,
                  ]}
                >
                  <TextInput
                    accessibilityLabel="Biển số xe"
                    autoCapitalize="characters"
                    editable={!isSubmitting}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setLicensePlate}
                    onFocus={() => setFocusedField('plate')}
                    placeholder="VD: 59D-123.45"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={licensePlate}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Số GPLX (giấy phép lái xe)</Text>
                <View
                  style={[
                    styles.inputWrap,
                    focusedField === 'gplx' && styles.inputWrapFocused,
                  ]}
                >
                  <TextInput
                    accessibilityLabel="Số GPLX"
                    autoCapitalize="characters"
                    editable={!isSubmitting}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setLicenseNumber}
                    onFocus={() => setFocusedField('gplx')}
                    placeholder="VD: 590123456789"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={licenseNumber}
                  />
                </View>
              </View>
            </View>

            {/* Giấy tờ KYC */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>GIẤY TỜ XÁC MINH</Text>
              {DOC_SLOTS.map((slot) => {
                const asset = docs[slot.type];
                return (
                  <View key={slot.type} style={styles.docSlot}>
                    <View style={styles.docInfo}>
                      <Text style={styles.docLabel}>{slot.label}</Text>
                      <Text style={styles.docHint}>
                        {asset ? asset.name : slot.hint}
                      </Text>
                    </View>
                    {asset ? (
                      <Image source={{ uri: asset.uri }} style={styles.docThumb} />
                    ) : null}
                    <Pressable
                      accessibilityLabel={`Chọn ảnh ${slot.label}`}
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => void pickDoc(slot.type)}
                      style={[styles.docBtn, asset && styles.docBtnDone]}
                    >
                      <Text style={[styles.docBtnText, asset && styles.docBtnTextDone]}>
                        {asset ? 'Đổi ảnh' : 'Tải ảnh'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Pressable
              accessibilityLabel="Gửi hồ sơ đăng ký"
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <View pointerEvents="none" style={styles.btnGloss} />
              <Text style={styles.primaryBtnText}>
                {isSubmitting ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ đăng ký'}
              </Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginHelper}>Đã là tài xế?</Text>
              <Pressable hitSlop={8} onPress={() => router.replace('/(public)/login')}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: scene.canvas, flex: 1 },
  container: { flexGrow: 1 },
  masthead: {
    backgroundColor: scene.surface,
    borderBottomColor: scene.border,
    borderBottomWidth: 1,
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    backgroundColor: scene.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backBtnText: { color: scene.ink, fontSize: 12.5, fontWeight: '700' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  headline: { color: scene.ink, fontSize: 22, fontWeight: '800', marginTop: 4 },
  subline: { color: scene.muted, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  body: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: scene.surface,
    borderColor: scene.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: 'rgba(15, 23, 42, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionLabel: {
    color: scene.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  field: { gap: spacing.xs },
  inputLabel: { color: scene.ink, fontSize: 13, fontWeight: '700' },
  inputWrap: {
    backgroundColor: scene.fieldBg,
    borderColor: scene.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  inputWrapFocused: {
    backgroundColor: scene.surface,
    borderColor: scene.ctaTop,
    shadowColor: scene.ctaTop,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  input: { color: scene.ink, fontSize: 14.5, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    alignItems: 'center',
    backgroundColor: scene.fieldBg,
    borderColor: scene.border,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: scene.ctaBottom, borderColor: scene.ctaBottom },
  chipText: { color: scene.ink, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  docSlot: {
    alignItems: 'center',
    borderTopColor: scene.canvas,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { color: scene.ink, fontSize: 13.5, fontWeight: '700' },
  docHint: { color: scene.muted, fontSize: 11.5 },
  docThumb: {
    borderColor: scene.border,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    width: 40,
  },
  docBtn: {
    backgroundColor: scene.fieldBg,
    borderColor: scene.ctaTop,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  docBtnDone: { backgroundColor: scene.successBg, borderColor: scene.success },
  docBtnText: { color: scene.ctaTop, fontSize: 12.5, fontWeight: '700' },
  docBtnTextDone: { color: '#15803D' },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: scene.ctaBottom,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: scene.ctaBottom,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnDisabled: { backgroundColor: '#94A3B8', elevation: 0, shadowOpacity: 0 },
  btnGloss: {
    backgroundColor: scene.ctaTop,
    height: '50%',
    left: 0,
    opacity: 0.5,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  loginHelper: { color: scene.muted, fontSize: 13, fontWeight: '500' },
  loginLink: {
    color: scene.ctaTop,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  gateTitle: { color: scene.ink, fontSize: 16, fontWeight: '800' },
  gateText: { color: scene.muted, fontSize: 13, lineHeight: 19 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  errorText: { color: '#B91C1C', fontSize: 12.5, fontWeight: '600' },
  successCard: { alignItems: 'center', borderColor: '#86EFAC' },
  successIcon: { fontSize: 44 },
  successTitle: { color: scene.ink, fontSize: 18, fontWeight: '800' },
  successText: {
    color: scene.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
