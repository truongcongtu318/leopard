import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, spacing } from '@leopard/mobile-core';

/** Palette mirrored from `app/(public)/driver-register.tsx` for visual continuity. */
const scene = {
  surface: '#FFFFFF',
  fieldBg: '#F8FAFC',
  ink: '#0B1F3A',
  muted: '#5B6B80',
  border: '#CAD9EB',
  ctaTop: '#2E6FD6',
  ctaBottom: '#1E5BB8',
  danger: '#B91C1C',
} as const;

export interface DriverContractPreview {
  readonly version: string;
  readonly pdfUrl: string;
}

interface DriverContractSectionProps {
  contract: DriverContractPreview | null;
  isLoading: boolean;
  loadError: string | null;
  isPdfOpening: boolean;
  onViewContract: () => void;
  consentChecked: boolean;
  onToggleConsent: () => void;
  signatureName: string;
  onChangeSignature: (value: string) => void;
  isSignatureFocused: boolean;
  onFocusSignature: () => void;
  onBlurSignature: () => void;
  isSubmitting: boolean;
}

/**
 * Contract review + consent + typed-signature step of driver registration.
 * Presentational only — `app/(public)/driver-register.tsx` owns all state
 * (fetching `/driver/contract`, opening the PDF, form values) and passes it
 * down, keeping the route file focused.
 */
export function DriverContractSection({
  contract,
  isLoading,
  loadError,
  isPdfOpening,
  onViewContract,
  consentChecked,
  onToggleConsent,
  signatureName,
  onChangeSignature,
  isSignatureFocused,
  onFocusSignature,
  onBlurSignature,
  isSubmitting,
}: DriverContractSectionProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>HỢP ĐỒNG TÀI XẾ</Text>

      {isLoading ? (
        <Text style={styles.hintText}>Đang tải hợp đồng...</Text>
      ) : contract ? (
        <>
          <View style={styles.contractRow}>
            <Text style={styles.hintText}>Phiên bản hợp đồng: {contract.version}</Text>
            <Pressable
              accessibilityLabel="Xem hợp đồng"
              accessibilityRole="link"
              disabled={isPdfOpening}
              hitSlop={8}
              onPress={onViewContract}
              style={({ pressed }) => [styles.contractLink, pressed && styles.pressed]}
            >
              <Text style={styles.contractLinkText}>
                {isPdfOpening ? 'Đang mở hợp đồng...' : 'Xem hợp đồng ↗'}
              </Text>
            </Pressable>
          </View>
          {/* Opening the (auth-guarded) PDF can fail independently of the
              contract descriptor fetch above — surface that failure here. */}
          {loadError ? <Text style={styles.errorHintText}>{loadError}</Text> : null}
        </>
      ) : (
        <Text style={styles.errorHintText}>
          {loadError ?? 'Không thể tải hợp đồng, vui lòng thử lại'}
        </Text>
      )}

      <Pressable
        accessibilityLabel="Tôi đã đọc và đồng ý với hợp đồng tài xế"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentChecked }}
        onPress={onToggleConsent}
        style={({ pressed }) => [styles.consentRow, pressed && styles.consentRowPressed]}
        testID="driver-contract-consent"
      >
        <View style={[styles.checkbox, consentChecked && styles.checkboxOn]}>
          {consentChecked ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>
          Tôi đã đọc và đồng ý với hợp đồng tài xế của LEOPARD.
        </Text>
      </Pressable>

      <View style={styles.field}>
        <Text style={styles.inputLabel}>Chữ ký xác nhận (họ tên)</Text>
        <View
          style={[styles.inputWrap, isSignatureFocused && styles.inputWrapFocused]}
        >
          <TextInput
            accessibilityLabel="Chữ ký xác nhận"
            editable={!isSubmitting}
            maxLength={120}
            onBlur={onBlurSignature}
            onChangeText={onChangeSignature}
            onFocus={onFocusSignature}
            placeholder="Nhập họ tên để xác nhận chữ ký"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={signatureName}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  contractRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  hintText: { color: scene.muted, fontSize: 12.5, flexShrink: 1 },
  errorHintText: { color: scene.danger, fontSize: 12.5 },
  contractLink: {
    borderColor: scene.ctaTop,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contractLinkText: { color: scene.ctaTop, fontSize: 12.5, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  consentRow: {
    alignItems: 'flex-start',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  consentRowPressed: { backgroundColor: scene.fieldBg },
  checkbox: {
    alignItems: 'center',
    backgroundColor: scene.surface,
    borderColor: scene.border,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxOn: { backgroundColor: scene.ctaBottom, borderColor: scene.ctaBottom },
  checkboxTick: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  consentText: { color: scene.ink, flex: 1, fontSize: 13, lineHeight: 19 },
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
});
