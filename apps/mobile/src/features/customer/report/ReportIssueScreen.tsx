import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  colors,
  spacing,
  Button,
  FormField,
  IconCamera,
  IconCheck,
  IconPlus,
  IconSecurityShield,
  ScreenScaffold,
} from '@leopard/mobile-core';

const issueCategories = [
  { id: 'damaged', label: 'Hàng vỡ hỏng' },
  { id: 'delayed', label: 'Giao trễ' },
  { id: 'driver_unreachable', label: 'Tài xế không liên lạc được' },
  { id: 'wrong_fee', label: 'Sai cước phí' },
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
      eyebrow={`ORDER · ${id ?? 'LP-260815-001'}`}
      onBack={() => router.back()}
      subtitle="Báo cáo khiếu nại để bộ phận CSKH hỗ trợ xử lý và bồi thường."
      title="Báo cáo sự cố"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {submitted ? (
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <View style={styles.successIconBox}>
                <IconSecurityShield color="#16A34A" size={32} strokeWidth={2} />
              </View>
              <Text style={styles.successTitle}>Đã tiếp nhận sự cố</Text>
              <Text style={styles.ticketCode}>#TK-260815</Text>
              <Text style={styles.successMessage}>
                Khiếu nại của bạn đã được chuyển đến bộ phận CSKH và bảo hiểm hàng hóa LEOPARD. Đội ngũ xử lý sẽ liên hệ với bạn trong vòng 2 giờ làm việc.
              </Text>
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
                  <IconCheck color="#16A34A" size={24} strokeWidth={2.5} />
                ) : (
                  <IconCamera color="#0B1E42" size={24} strokeWidth={2} />
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
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Category Card (Double-Bezel: 24px outer, 18px inner) ──
  categoryCardOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardInner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderBottomColor: '#E2E8F0',
  },
  categoryItemLast: {
    borderBottomWidth: 0,
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: '#0B1E42',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B1E42',
  },
  categoryText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#0B1E42',
    fontWeight: '700',
  },

  // ── Photo Upload Box (>= 44px) ────────────────────
  photoUploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    minHeight: 110,
    padding: spacing.md,
    gap: 6,
  },
  photoUploadBoxAttached: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderStyle: 'solid',
  },
  photoUploadIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  photoUploadSub: {
    color: '#64748B',
    fontSize: 11,
  },

  // ── Success State (Double-Bezel) ──────────────────
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
  ticketCode: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
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
