import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radius, spacing, typography, Button, FormField, ScreenScaffold } from '@leopard/mobile-core';

const issueCategories = [
  { id: 'damaged', label: 'Hàng hóa bị hư hỏng / vỡ móp' },
  { id: 'lost', label: 'Thất lạc hàng hóa' },
  { id: 'wrong_address', label: 'Tài xế giao sai địa chỉ' },
  { id: 'wrong_price', label: 'Thu cước sai so với giá dự kiến' },
  { id: 'attitude', label: 'Thái độ phục vụ không phù hợp' },
  { id: 'other', label: 'Vấn đề khác' },
];

export function ReportIssueScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedCategory, setSelectedCategory] = useState('damaged');
  const [description, setDescription] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      router.replace(id ? `/customer/orders/${id}` : '/customer/orders');
    }, 1800);
  };

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${id ?? 'LP-D-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Báo cáo khiếu nại để bộ phận CSKH hỗ trợ xử lý và bồi thường."
      title="Báo cáo sự cố"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🛡️</Text>
            <Text style={styles.successTitle}>Đã tiếp nhận sự cố</Text>
            <Text style={styles.successMessage}>
              Mã khiếu nại của bạn là #TK-{Date.now().toString().slice(-6)}. Đội ngũ CSKH sẽ liên hệ lại với bạn qua số điện thoại đăng ký trong vòng 2 giờ làm việc.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>CHỌN LOẠI SỰ CỐ</Text>
            <View accessibilityRole="radiogroup" style={styles.categoryGroup}>
              {issueCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[styles.categoryItem, isSelected ? styles.categoryItemSelected : null]}
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

            <Text style={styles.sectionLabel}>HÌNH ẢNH MINH CHỨNG (NẾU CÓ)</Text>
            <Pressable
              accessibilityLabel="Đính kèm ảnh minh chứng"
              accessibilityRole="button"
              onPress={() => setHasPhoto(!hasPhoto)}
              style={[styles.photoUploadBox, hasPhoto ? styles.photoUploadBoxAttached : null]}
            >
              <Text style={styles.photoUploadIcon}>{hasPhoto ? '📸' : '➕'}</Text>
              <Text style={styles.photoUploadText}>
                {hasPhoto ? 'Đã đính kèm 1 ảnh minh chứng (Bấm để đổi)' : 'Tải lên hình ảnh kiện hàng bị sự cố'}
              </Text>
              <Text style={styles.photoUploadSub}>Hỗ trợ JPEG, PNG tối đa 10 MB</Text>
            </Pressable>

            <FormField
              label="Mô tả chi tiết sự cố *"
              multiline
              onChangeText={setDescription}
              placeholder="Vui lòng mô tả chi tiết hoàn cảnh, thời gian và mức độ thiệt hại..."
              value={description}
            />

            <Button
              disabled={!description.trim()}
              label="Gửi báo cáo sự cố"
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
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categoryGroup: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 4,
  },
  categoryItem: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.rowDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  categoryItemSelected: {
    backgroundColor: colors.brand.softBackground,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioCircleSelected: {
    borderColor: colors.brand.background,
  },
  radioDot: {
    backgroundColor: colors.brand.background,
    borderRadius: radius.pill,
    height: 9,
    width: 9,
  },
  categoryText: {
    color: colors.neutral.text,
    fontSize: 13.5,
  },
  categoryTextSelected: {
    color: colors.brand.background,
    fontWeight: '700',
  },
  photoUploadBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 4,
    padding: spacing.lg,
  },
  photoUploadBoxAttached: {
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.background,
    borderStyle: 'solid',
  },
  photoUploadIcon: {
    fontSize: 24,
  },
  photoUploadText: {
    color: colors.neutral.titleText,
    fontSize: 13.5,
    fontWeight: '700',
  },
  photoUploadSub: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
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
