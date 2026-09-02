import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { httpClient } from '../../src/api/http-client';
import { ApiError } from '../../src/api/api-error';
import { sessionStore } from '../../src/auth/session-store';

interface MeResponse {
  phone: string | null;
  email: string | null;
  name: string | null;
  role: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentService, setConsentService] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await httpClient.get<MeResponse>('/me');
        if (!active) return;
        setPhone(me.phone);
        if (me.name) setName(me.name);
        if (me.email) setEmail(me.email);
      } catch {
        // giữ form trống nếu prefill lỗi
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSubmit =
    Boolean(name.trim()) &&
    isValidEmail(email) &&
    Boolean(phone) &&
    consentTerms &&
    consentService &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await httpClient.patch<{ role: string }>('/users/me', {
        name: name.trim(),
        email: email.trim(),
        consentTerms: true,
        consentService: true,
        consentMarketing,
        consentThirdParty,
      });
      await sessionStore.setSession(
        sessionStore.getAccessToken() ?? '',
        (await sessionStore.getRefreshToken()) ?? '',
        (res.role as never) ?? 'CUSTOMER',
      );
      router.replace('/customer/home');
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;
      if (statusCode === 401) setErrorMsg('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      else if ((ApiError.isApiError(err) || err instanceof ApiError) && statusCode >= 400 && statusCode < 500)
        setErrorMsg(message ?? 'Thông tin chưa hợp lệ');
      else setErrorMsg(message ?? 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Consent = ({
    testID, checked, onToggle, label,
  }: { testID: string; checked: boolean; onToggle: () => void; label: string }) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.consentRow}
      testID={testID}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.headline}>Hoàn tất hồ sơ</Text>
      <Text style={styles.subline}>Chỉ một bước nữa để bắt đầu đặt đơn cùng LEOPARD.</Text>

      {errorMsg ? (
        <View style={styles.errorBox} testID="cr-error">
          <Text accessibilityRole="alert" style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Số điện thoại</Text>
        <View style={[styles.inputWrap, styles.inputLocked]}>
          <Text style={styles.lockedText}>{phone ?? '—'}</Text>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          accessibilityLabel="Họ và tên"
          editable={!isSubmitting}
          onChangeText={setName}
          placeholder="VD: Nguyễn Văn A"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          testID="cr-name"
          value={name}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          editable={!isSubmitting}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="VD: an@example.com"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          testID="cr-email"
          value={email}
        />
      </View>

      <View style={styles.card}>
        <Consent testID="cr-consent-terms" checked={consentTerms} onToggle={() => setConsentTerms((v) => !v)}
          label="Tôi đã đọc và đồng ý với Điều khoản & Chính sách của LEOPARD." />
        <Consent testID="cr-consent-service" checked={consentService} onToggle={() => setConsentService((v) => !v)}
          label="Cho phép LEOPARD xử lý dữ liệu cá nhân để thực hiện đơn hàng và cung cấp dịch vụ." />
        <Consent testID="cr-consent-marketing" checked={consentMarketing} onToggle={() => setConsentMarketing((v) => !v)}
          label="Nhận thông tin ưu đãi, marketing từ LEOPARD. (Tùy chọn)" />
        <Consent testID="cr-consent-third" checked={consentThirdParty} onToggle={() => setConsentThirdParty((v) => !v)}
          label="Cho phép chia sẻ dữ liệu cho đối tác thứ ba liên quan. (Tùy chọn)" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled, pressed && styles.pressed]}
        testID="cr-submit"
      >
        <Text style={styles.primaryBtnText}>{isSubmitting ? 'Đang lưu...' : 'Hoàn tất'}</Text>
      </Pressable>

      <Pressable hitSlop={8} onPress={() => router.push('/(public)/driver-register')} style={styles.driverLink}>
        <Text style={styles.driverLinkText}>Đăng ký làm tài xế đối tác →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: '#F8FAFC' },
  headline: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subline: { fontSize: 14, color: '#475569' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#0F172A' },
  inputWrap: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputLocked: { backgroundColor: '#F1F5F9' },
  lockedText: { fontSize: 15, color: '#0F172A' },
  lockIcon: { fontSize: 14 },
  consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxTick: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  primaryBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#93C5FD' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  driverLink: { alignItems: 'center', paddingVertical: 8 },
  driverLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
