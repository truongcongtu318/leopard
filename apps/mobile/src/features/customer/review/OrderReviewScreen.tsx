import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  colors,
  spacing,
  Button,
  FormField,
  IconCheck,
  IconRoleDriver,
  IconStar,
  ScreenScaffold,
} from '@leopard/mobile-core';

const feedbackTags = [
  'Đúng giờ',
  'Cẩn thận',
  'Thân thiện',
  'Lái xe an toàn',
];

const tipOptions = [10000, 20000, 50000];

export function OrderReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Đúng giờ', 'Cẩn thận']);
  const [selectedTip, setSelectedTip] = useState<number | null>(20000);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      router.replace(id ? `/customer/orders/${id}` : '/customer/orders');
    }, 1500);
  };

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${id ?? 'LP-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Chia sẻ trải nghiệm dịch vụ để giúp chúng tôi nâng cao chất lượng."
      title="Đánh giá chuyến đi"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <View style={styles.successIconBox}>
                <IconCheck color="#16A34A" size={32} strokeWidth={2.5} />
              </View>
              <Text style={styles.successTitle}>Cảm ơn bạn đã đánh giá!</Text>
              <Text style={styles.successMessage}>
                Phản hồi của bạn đã được gửi đến tài xế và hệ thống điều phối LEOPARD. Đang quay lại chi tiết đơn hàng...
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* ── Driver VIP Card (Double-Bezel: 24px outer, 18px inner) ── */}
            <View style={styles.driverCardOuter}>
              <View style={styles.driverCardInner}>
                <View style={styles.avatarBox}>
                  <IconRoleDriver color="#0B1E42" size={26} />
                </View>
                <Text style={styles.driverName}>Nguyễn Văn Hùng</Text>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>Xe tải 2.5T · 59C-882.14</Text>
                </View>

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
                        color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                        fill={star <= rating ? '#F59E0B' : 'none'}
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
            <Button
              label={
                selectedTip
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  driverCardInner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 6,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  driverName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  plateBadge: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  plateText: {
    color: '#64748B',
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
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── Section Label ─────────────────────────────────
  sectionLabel: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Tags Grid (>= 44px) ───────────────────────────
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tagChipSelected: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  tagText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },

  // ── Tip Grid (>= 44px, Tabular Nums) ──────────────
  tipGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  tipChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipChipSelected: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  tipText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tipTextSelected: {
    color: '#FFFFFF',
  },

  // ── Success Card (Double-Bezel) ───────────────────
  successOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 10,
  },
  successInner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#15803D',
    fontSize: 16,
    fontWeight: '800',
  },
  successMessage: {
    color: '#166534',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
