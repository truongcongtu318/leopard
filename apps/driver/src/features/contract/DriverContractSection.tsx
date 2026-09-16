import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  colors,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { IconCheck, iconSize } from '@leopard/mobile-core';

/** Palette mirrored from `app/(public)/driver-register.tsx` for visual continuity. */
const scene = {
  surface: '#0F2347',
  fieldBg: '#132B52',
  ink: colors.neutral.surface,
  muted: leopardPalette.inputBorder,
  subtle: '#94A3B8',
  border: 'rgba(255, 255, 255, 0.12)',
  ctaTop: '#0284C7',
  ctaBottom: '#0284C7',
  ctaCyan: '#38BDF8',
  danger: '#F87171',
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
          {consentChecked ? <IconCheck color={colors.neutral.surface} size={iconSize.sm} /> : null}
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
            placeholderTextColor={colors.neutral.subtleText}
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
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionLabel: {
    color: scene.ctaCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  contractRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  hintText: { color: scene.muted, fontSize: typeScale.footnote.fontSize, flexShrink: 1 },
  errorHintText: { color: scene.danger, fontSize: typeScale.footnote.fontSize },
  contractLink: {
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.40)',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contractLinkText: { color: scene.ctaCyan, fontSize: typeScale.footnote.fontSize, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  consentRow: {
    alignItems: 'flex-start',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  consentRowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  checkbox: {
    alignItems: 'center',
    backgroundColor: scene.fieldBg,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxOn: { backgroundColor: scene.ctaBottom, borderColor: scene.ctaCyan },
  consentText: {
    color: colors.neutral.border,
    flex: 1,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
  },
  field: { gap: spacing.xs },
  inputLabel: {
    color: scene.ink,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
  },
  inputWrap: {
    backgroundColor: scene.fieldBg,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    backgroundColor: '#163566',
    borderColor: scene.ctaCyan,
    shadowColor: scene.ctaBottom,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    color: scene.ink,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
});

