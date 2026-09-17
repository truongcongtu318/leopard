import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  colors,
  customerPalette,
  leopardPalette,
  spacing,
  Button,
  FormField,
  IconCheck,
  IconRoleDriver,
  IconStar,
  ScreenScaffold,
  httpClient,
  typeScale,
} from '@leopard/mobile-core';

export interface OrderReviewScreenProps {
  orderId?: string;
  assignedDriver?: {
    name?: string | null;
    licensePlate?: string | null;
    vehicleType?: string | null;
  } | null;
}

const feedbackTags = [
  'Đúng giờ',
  'Cẩn thận',
  'Thân thiện',
  'Lái xe an toàn',
];

const tipOptions = [10000, 20000, 50000];

export function OrderReviewScreen(props?: OrderReviewScreenProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    id?: string;
    driverName?: string;
    licensePlate?: string;
    vehicleType?: string;
  }>();

  const orderId = props?.orderId ?? searchParams.id;
  const driverName =
    props?.assignedDriver?.name ??
    searchParams.driverName ??
    'Nguyễn Văn Hùng';
  const licensePlate =
    props?.assignedDriver?.licensePlate ??
    searchParams.licensePlate ??
    '59C-882.14';
  const vehicleType =
    props?.assignedDriver?.vehicleType ??
    searchParams.vehicleType ??
    'Xe tải 2.5T';

  const vehicleBadgeText = [vehicleType, licensePlate].filter(Boolean).join(' · ');

  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Đúng giờ', 'Cẩn thận']);
  const [selectedTip, setSelectedTip] = useState<number | null>(20000);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const formattedComment = [
        selectedTags.length > 0 ? selectedTags.join(', ') : '',
        comment.trim(),
      ]
        .filter(Boolean)
        .join(' - ');

      await httpClient.post(`/orders/${orderId ?? 'LP-260815-001'}/reviews`, {
        rating,
        comment: formattedComment || undefined,
        tipVnd: selectedTip ?? 0,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Gửi đánh giá thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${orderId ?? 'LP-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Chia sẻ trải nghiệm dịch vụ để giúp chúng tôi nâng cao chất lượng."
      title="Đánh giá chuyến đi"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <View style={styles.successIconBox}>
                <IconCheck color={leopardPalette.ecoGreen} size={32} strokeWidth={2.5} />
              </View>
              <Text style={styles.successTitle}>Cảm ơn bạn đã đánh giá!</Text>
              <Text style={styles.successMessage}>
                Phản hồi của bạn đã được gửi đến tài xế và hệ thống điều phối LEOPARD.
              </Text>
              <Button
                label="Quay lại chi tiết đơn hàng"
                onPress={() => router.replace(orderId ? `/customer/orders/${orderId}` : '/customer/orders')}
              />
            </View>
          </View>
        ) : (
          <>
            {/* ── Driver VIP Card (Double-Bezel: 24px outer, 18px inner) ── */}
            <View style={styles.driverCardOuter}>
              <View style={styles.driverCardInner}>
                <View style={styles.avatarBox}>
                  <IconRoleDriver color={customerPalette.textSlateDark} size={26} />
                </View>
                <Text style={styles.driverName}>{driverName}</Text>
                {vehicleBadgeText ? (
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{vehicleBadgeText}</Text>
                  </View>
                ) : null}

                {/* 1-5 Star SVG Rating (Touch targets >= 44x44px, Zero Emoji) */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      accessibilityLabel={`Đánh giá ${star} sao`}
                      accessibilityRole="button"
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starTouchTarget}
                    >
                      <IconStar
                        color={star <= rating ? leopardPalette.accentYellow : colors.neutral.subtleBorder}
                        fill={star <= rating ? leopardPalette.accentYellow : 'none'}
                        size={32}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.ratingLabel}>
                  {rating === 5
                    ? 'Tuyệt vời!'
                    : rating === 4
                      ? 'Rất tốt'
                      : rating === 3
                        ? 'Bình thường'
                        : rating === 2
                          ? 'Chưa hài lòng'
                          : 'Rất tệ'}
                </Text>
              </View>
            </View>

            {/* ── Quick Tags (Touch targets >= 44px) ───────────── */}
            <Text style={styles.sectionLabel}>ĐIỂM NỔI BẬT</Text>
            <View style={styles.tagGrid}>
              {feedbackTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    accessibilityLabel={`Tiêu chí: ${tag}`}
                    accessibilityRole="button"
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={({ pressed }) => [
                      styles.tagChip,
                      isSelected ? styles.tagChipSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.tagText, isSelected ? styles.tagTextSelected : null]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Tip Options (Touch targets >= 44px, Tabular Nums) ── */}
            <Text style={styles.sectionLabel}>TIP CHO TÀI XẾ (TÙY CHỌN)</Text>
            <View style={styles.tipGrid}>
              {tipOptions.map((tip) => {
                const isSelected = selectedTip === tip;
                return (
                  <Pressable
                    accessibilityLabel={`Tip ${formatCurrency(tip)}`}
                    accessibilityRole="button"
                    key={tip}
                    onPress={() => setSelectedTip(isSelected ? null : tip)}
                    style={({ pressed }) => [
                      styles.tipChip,
                      isSelected ? styles.tipChipSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.tipText, isSelected ? styles.tipTextSelected : null]}>
                      +{formatCurrency(tip)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Comment Note ─────────────────────────────────── */}
            <FormField
              label="Ý kiến đóng góp thêm"
              multiline
              onChangeText={setComment}
              placeholder="Nhập cảm nhận của bạn về chuyến giao hàng này..."
              value={comment}
            />

            {/* ── Submit Review Button (>= 48px) ───────────────── */}
            {errorMessage ? (
              <Text style={{ color: colors.danger.text, fontSize: typeScale.subheadline.fontSize }}>{errorMessage}</Text>
            ) : null}
            <Button
              disabled={submitting}
              label={
                submitting
                  ? 'Đang gửi...'
                  : selectedTip
                    ? `Gửi đánh giá & Tip ${formatCurrency(selectedTip)}`
                    : 'Gửi đánh giá'
              }
              onPress={handleSubmit}
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

  // ── Driver Card (Double-Bezel: 24px outer, 18px inner) ──
  driverCardOuter: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 10,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  driverCardInner: {
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.md,
    gap: 6,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  driverName: {
    color: customerPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '600',
  },
  plateBadge: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  plateText: {
    color: customerPalette.textSubtle,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  starTouchTarget: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabel: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Section Label ─────────────────────────────────
  sectionLabel: {
    color: customerPalette.textSlateDark,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Tags Grid (>= 44px) ───────────────────────────
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tagChipSelected: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  tagText: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: customerPalette.surfaceWhite,
  },

  // ── Tip Grid (>= 44px, Tabular Nums) ──────────────
  tipGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  tipChip: {
    flex: 1,
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipChipSelected: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  tipText: {
    color: customerPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tipTextSelected: {
    color: customerPalette.surfaceWhite,
  },

  // ── Success Card (Double-Bezel) ───────────────────
  successOuter: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 10,
  },
  successInner: {
    alignItems: 'center',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: leopardPalette.ecoGreenBorder,
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
    color: leopardPalette.ecoGreen,
    fontSize: 16,
    fontWeight: '700',
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
