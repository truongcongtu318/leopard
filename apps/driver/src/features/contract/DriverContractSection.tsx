import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  colors,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { IconCheck, iconSize } from '@leopard/mobile-core';
import { scene } from '../registration/driver-register-scene';

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
          {consentChecked ? <IconCheck color="#FFFFFF" size={iconSize.sm} /> : null}
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
            placeholderTextColor={scene.placeholder}
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    color: leopardPalette.primary,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  contractRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  hintText: { color: scene.muted, ...typeScale.footnote, flexShrink: 1 },
  errorHintText: { color: scene.danger, ...typeScale.footnote },
  contractLink: {
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    borderColor: 'rgba(11, 37, 69, 0.20)',
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contractLinkText: { color: leopardPalette.primary, ...typeScale.footnote, fontWeight: '700' },
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
  consentRowPressed: { backgroundColor: '#F8FAFC' },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    ...iosContinuousCurve,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxOn: { backgroundColor: leopardPalette.primary, borderColor: leopardPalette.primary },
  consentText: {
    color: '#0F172A',
    flex: 1,
    ...typeScale.footnote,
    lineHeight: 20,
  },
  field: { gap: spacing.xs },
  inputLabel: {
    color: '#475569',
    ...typeScale.caption1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrap: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1.5,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: leopardPalette.primary,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
});
