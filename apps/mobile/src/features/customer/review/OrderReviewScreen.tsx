import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

const feedbackTags = [
  'Đúng giờ',
  'Giao hàng cẩn thận',
  'Tài xế thân thiện',
  'Hỗ trợ nhiệt tình',
  'Xe sạch sẽ, bảo quản tốt',
];

const tipOptions = [10000, 20000, 50000, 100000];

export function OrderReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Đúng giờ', 'Giao hàng cẩn thận']);
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${id ?? 'LP-D-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Chia sẻ trải nghiệm dịch vụ để giúp chúng tôi nâng cao chất lượng."
      title="Đánh giá chuyến đi"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Cảm ơn bạn đã đánh giá!</Text>
            <Text style={styles.successMessage}>
              Phản hồi của bạn đã được gửi đến tài xế và hệ thống. Đang quay lại chi tiết đơn hàng...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.driverCard}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>D</Text>
              </View>
              <Text style={styles.driverName}>Nguyễn Văn Tài</Text>
              <Text style={styles.vehicleInfo}>Xe van · 59D-123.45</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Text style={[styles.starText, star <= rating ? styles.starActive : null]}>
                      ★
                    </Text>
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

            <Text style={styles.sectionLabel}>ĐIỂM NỔI BẬT</Text>
            <View style={styles.tagGrid}>
              {feedbackTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tagChip, isSelected ? styles.tagChipSelected : null]}
                  >
                    <Text style={[styles.tagText, isSelected ? styles.tagTextSelected : null]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>TIP CHO TÀI XẾ (TÙY CHỌN)</Text>
            <View style={styles.tipGrid}>
              {tipOptions.map((tip) => {
                const isSelected = selectedTip === tip;
                return (
                  <Pressable
                    key={tip}
                    onPress={() => setSelectedTip(isSelected ? null : tip)}
                    style={[styles.tipChip, isSelected ? styles.tipChipSelected : null]}
                  >
                    <Text style={[styles.tipText, isSelected ? styles.tipTextSelected : null]}>
                      +{formatCurrency(tip)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <FormField
              label="Ý kiến đóng góp thêm"
              multiline
              onChangeText={setComment}
              placeholder="Nhập cảm nhận của bạn về chuyến giao hàng này..."
              value={comment}
            />

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
  driverCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: colors.active.background,
    borderRadius: radius.control,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: colors.active.text,
    fontSize: 22,
    fontWeight: '800',
  },
  driverName: {
    color: colors.neutral.titleText,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  vehicleInfo: {
    color: colors.neutral.subtleText,
    fontSize: 12.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  starText: {
    color: colors.neutral.border,
    fontSize: 36,
  },
  starActive: {
    color: '#F59E0B',
  },
  ratingLabel: {
    color: colors.neutral.titleText,
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipSelected: {
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.background,
    borderWidth: 1,
  },
  tagText: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: colors.brand.background,
  },
  tipGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tipChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    flex: 1,
    paddingVertical: 10,
  },
  tipChipSelected: {
    backgroundColor: colors.brand.background,
  },
  tipText: {
    color: colors.neutral.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
  tipTextSelected: {
    color: colors.neutral.background,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    color: colors.neutral.titleText,
    fontSize: 18,
    fontWeight: '800',
  },
  successMessage: {
    color: colors.neutral.mutedText,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
