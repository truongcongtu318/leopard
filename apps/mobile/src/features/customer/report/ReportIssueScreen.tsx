import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  colors,
  customerPalette,
  spacing,
  Button,
  FormField,
  IconCamera,
  IconCheck,
  IconPlus,
  IconSecurityShield,
  ScreenScaffold,
  httpClient,
  typeScale,
} from '@leopard/mobile-core';

export interface ReportIssueScreenProps {
  orderId?: string;
}

type CreateReportResponse = {
  id: string;
  ticketCode?: string;
};

const issueCategories = [
  { id: 'damaged', label: 'Hàng vỡ hỏng' },
  { id: 'delayed', label: 'Giao trễ' },
  { id: 'driver_unreachable', label: 'Tài xế không liên lạc được' },
  { id: 'wrong_fee', label: 'Sai cước phí' },
];

export function ReportIssueScreen(props?: ReportIssueScreenProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id?: string }>();
  const orderId = props?.orderId ?? searchParams.id;
  const [selectedCategory, setSelectedCategory] = useState('damaged');
  const [description, setDescription] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await httpClient.post<CreateReportResponse>(
        `/orders/${orderId ?? 'LP-260815-001'}/reports`,
        {
          category: selectedCategory,
          description: description.trim(),
          hasPhoto,
        },
      );
      const code = res?.ticketCode ?? res?.id ?? 'TK-PENDING';
      setTicketCode(code.startsWith('#') ? code : `#${code}`);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Gửi báo cáo sự cố thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${orderId ?? 'LP-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Báo cáo khiếu nại để bộ phận CSKH hỗ trợ xử lý và bồi thường."
      title="Báo cáo sự cố"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <View style={styles.successIconBox}>
                <IconSecurityShield color={colors.success.text} size={32} strokeWidth={2} />
              </View>
              <Text style={styles.successTitle}>Đã tiếp nhận sự cố</Text>
              <Text style={styles.ticketCode}>{ticketCode ?? '#TK-PENDING'}</Text>
              <Text style={styles.successMessage}>
                Khiếu nại của bạn đã được chuyển đến bộ phận CSKH và bảo hiểm hàng hóa LEOPARD. Đội ngũ xử lý sẽ liên hệ với bạn trong vòng 2 giờ làm việc.
              </Text>
              <Button
                label="Quay lại chi tiết đơn hàng"
                onPress={() => router.replace(orderId ? `/customer/orders/${orderId}` : '/customer/orders')}
              />
            </View>
          </View>
        ) : (
          <>
            {/* ── Category Selector (Double-Bezel: 24px outer, 18px inner) ── */}
            <Text style={styles.sectionLabel}>CHỌN LOẠI SỰ CỐ</Text>
            <View style={styles.categoryCardOuter}>
              <View accessibilityRole="radiogroup" style={styles.categoryCardInner}>
                {issueCategories.map((cat, index) => {
                  const isSelected = selectedCategory === cat.id;
                  const isLast = index === issueCategories.length - 1;
                  return (
                    <Pressable
                      accessibilityLabel={`Loại sự cố: ${cat.label}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={({ pressed }) => [
                        styles.categoryItem,
                        isSelected ? styles.categoryItemSelected : null,
                        isLast ? styles.categoryItemLast : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <View style={[styles.radioCircle, isSelected ? styles.radioCircleSelected : null]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[styles.categoryText, isSelected ? styles.categoryTextSelected : null]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Photo Upload Box (>= 44px touch target, Zero Emoji) ── */}
            <Text style={styles.sectionLabel}>HÌNH ẢNH MINH CHỨNG (NẾU CÓ)</Text>
            <Pressable
              accessibilityLabel="Đính kèm ảnh minh chứng sự cố"
              accessibilityRole="button"
              onPress={() => setHasPhoto(!hasPhoto)}
              style={({ pressed }) => [
                styles.photoUploadBox,
                hasPhoto ? styles.photoUploadBoxAttached : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.photoUploadIconBox}>
                {hasPhoto ? (
                  <IconCheck color={colors.success.text} size={24} strokeWidth={2.5} />
                ) : (
                  <IconCamera color={customerPalette.textSlateDark} size={24} strokeWidth={2} />
                )}
              </View>
              <Text style={styles.photoUploadText}>
                {hasPhoto
                  ? 'Đã đính kèm ảnh minh chứng (Bấm để đổi ảnh)'
                  : 'Tải lên hình ảnh kiện hàng bị sự cố'}
              </Text>
              <Text style={styles.photoUploadSub}>Hỗ trợ JPEG, PNG tối đa 10 MB</Text>
            </Pressable>

            {/* ── Detail Description Note ──────────────────────── */}
            <FormField
              label="Mô tả chi tiết sự cố *"
              multiline
              onChangeText={setDescription}
              placeholder="Vui lòng mô tả chi tiết hoàn cảnh, thời gian và mức độ thiệt hại..."
              value={description}
            />

            {/* ── Submit Button (>= 48px) ───────────────────────── */}
            {errorMessage ? (
              <Text style={{ color: colors.danger.text, fontSize: typeScale.subheadline.fontSize }}>{errorMessage}</Text>
            ) : null}
            <Button
              disabled={!description.trim() || submitting}
              label={submitting ? 'Đang gửi...' : 'Gửi báo cáo sự cố'}
              onPress={handleSubmit}
              variant="destructive"
            />
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    color: customerPalette.textSlateDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Category Card (Double-Bezel: 24px outer, 18px inner) ──
  categoryCardOuter: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 8,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardInner: {
    backgroundColor: colors.neutral.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  categoryItemLast: {
    borderBottomWidth: 0,
  },
  categoryItemSelected: {
    backgroundColor: colors.info.background,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.subtleBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surface,
  },
  radioCircleSelected: {
    borderColor: customerPalette.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: customerPalette.primary,
  },
  categoryText: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },

  // ── Photo Upload Box (>= 44px) ────────────────────
  photoUploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    minHeight: 110,
    padding: spacing.md,
    gap: 6,
  },
  photoUploadBoxAttached: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderStyle: 'solid',
  },
  photoUploadIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    color: customerPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  photoUploadSub: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },

  // ── Success State (Double-Bezel) ──────────────────
  successOuter: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 10,
  },
  successInner: {
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.success.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: colors.success.text,
    fontSize: 16,
    fontWeight: '800',
  },
  ticketCode: {
    color: colors.success.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.success.background,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  successMessage: {
    color: colors.success.text,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
