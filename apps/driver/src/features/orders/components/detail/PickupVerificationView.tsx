import React, { memo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  IconCamera,
  IconCheck,
  IconClose,
  driverHapticMatrix,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type PickupVerificationViewProps = Readonly<{
  orderCode?: string;
  senderPhotoReferenceUrl?: string;
  initialPackageCount?: number;
  photos: string[];
  onCapturePhoto: () => void;
  onConfirmPickup: (data: { photos: string[]; packageCount: number; notes: string }) => void;
  onCancel?: () => void;
}>;

const PRESET_NOTES = [
  'Vỏ thùng nguyên vẹn, không móp méo',
  'Hàng đã chằng buộc cẩn thận',
  'Kiểm đếm đúng số lượng',
];

export const PickupVerificationView = memo(function PickupVerificationView({
  initialPackageCount = 24,
  onCancel,
  onCapturePhoto,
  onConfirmPickup,
  orderCode = '#LP-8921',
  photos = [],
  senderPhotoReferenceUrl,
}: PickupVerificationViewProps) {
  const [packageCount, setPackageCount] = useState(initialPackageCount);
  const [selectedNote, setSelectedNote] = useState(PRESET_NOTES[0]);

  const hasPhoto = photos.length > 0;

  const handleIncrement = () => {
    setPackageCount((c) => c + 1);
    driverHapticMatrix.actionHeavy();
  };

  const handleDecrement = () => {
    setPackageCount((c) => Math.max(1, c - 1));
    driverHapticMatrix.actionHeavy();
  };

  const handleConfirm = () => {
    if (!hasPhoto) return;
    driverHapticMatrix.swipeSuccess();
    onConfirmPickup({
      photos,
      packageCount,
      notes: selectedNote,
    });
  };

  return (
    <View style={styles.container} testID="pickup-verification-view">
      {/* Top Bar */}
      <View style={styles.topBar}>
        {onCancel ? (
          <Pressable
            accessibilityLabel="Hủy xác nhận lấy hàng"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.cancelBtn}
          >
            <IconClose color="#475569" size={20} />
          </Pressable>
        ) : (
          <View style={styles.cancelPlaceholder} />
        )}
        <Text style={styles.topBarTitle}>CHỤP ẢNH HÀNG HÓA ({photos.length}/3)</Text>
        <Text style={styles.topBarBadge}>{orderCode}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Capture & Reference Section */}
        <View style={styles.photoContainer}>
          {hasPhoto ? (
            <View style={styles.capturedPhotoWrapper}>
              <Image source={{ uri: photos[0] }} style={styles.capturedImage} />
              <Pressable
                accessibilityLabel="Chụp lại ảnh"
                accessibilityRole="button"
                onPress={onCapturePhoto}
                style={styles.retakeBtn}
              >
                <Text style={styles.retakeBtnText}>🔄 Chụp lại</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Chụp ảnh hàng hóa"
              accessibilityRole="button"
              onPress={onCapturePhoto}
              style={styles.capturePlaceholder}
              testID="btn-capture-photo"
            >
              <View style={styles.cameraIconBox}>
                <IconCamera color="#F59E0B" size={30} />
              </View>
              <Text style={styles.capturePrompt}>+ Chụp ảnh hàng hóa</Text>
              <Text style={styles.captureSubprompt}>
                Bắt buộc tối thiểu 1 ảnh rõ kiện hàng tại thùng xe
              </Text>
            </Pressable>
          )}

          {/* Reference photo from sender if provided */}
          {senderPhotoReferenceUrl ? (
            <View style={styles.referenceBox} testID="sender-reference-box">
              <Image source={{ uri: senderPhotoReferenceUrl }} style={styles.referenceImage} />
              <View style={styles.referenceTag}>
                <Text style={styles.referenceTagText}>ẢNH KHÁCH ĐẶT</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Package Counter */}
        <View style={styles.counterCard}>
          <Text style={styles.sectionLabel}>SỐ KIỆN HÀNG THỰC TẾ</Text>
          <View style={styles.counterRow}>
            <Pressable
              accessibilityLabel="Giảm số kiện hàng"
              accessibilityRole="button"
              onPress={handleDecrement}
              style={styles.counterBtn}
              testID="btn-decrement-pkg"
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <Text style={styles.counterValueText} testID="counter-value-text">{packageCount}</Text>
            <Pressable
              accessibilityLabel="Tăng số kiện hàng"
              accessibilityRole="button"
              onPress={handleIncrement}
              style={styles.counterBtn}
              testID="btn-increment-pkg"
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Note Tags */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionLabel}>TÌNH TRẠNG HÀNG HÓA</Text>
          <View style={styles.tagsWrapper}>
            {PRESET_NOTES.map((note) => {
              const isSelected = selectedNote === note;
              return (
                <Pressable
                  key={note}
                  accessibilityRole="button"
                  onPress={() => setSelectedNote(note)}
                  style={[styles.tagPill, isSelected ? styles.tagPillActive : null]}
                >
                  <Text style={[styles.tagText, isSelected ? styles.tagTextActive : null]}>
                    {note}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Primary CTA Button (>=56pt, disabled until >= 1 photo) */}
      <View style={styles.footerContainer}>
        <Pressable
          accessibilityLabel="Xác nhận đã lấy hàng"
          accessibilityRole="button"
          disabled={!hasPhoto}
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.primaryCta,
            hasPhoto ? styles.primaryCtaActive : styles.primaryCtaDisabled,
            pressed && hasPhoto ? styles.btnPressed : null,
          ]}
          testID="btn-confirm-pickup"
        >
          <Text style={[styles.primaryCtaText, hasPhoto ? styles.textWhite : styles.textDisabled]}>
            {hasPhoto ? 'Xác nhận đã lấy hàng (Bắt đầu đi)' : 'Cần chụp ít nhất 1 ảnh'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarBadge: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelBtn: {
    padding: spacing.xs,
  },
  cancelPlaceholder: {
    width: 24,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  photoContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  capturePlaceholder: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0B2545',
    borderStyle: 'dashed',
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  cameraIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  capturePrompt: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#0B2545',
  },
  captureSubprompt: {
    ...typeScale.caption2,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  capturedPhotoWrapper: {
    flex: 1,
    height: 200,
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: spacing.xs,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    ...typeScale.caption1,
    fontWeight: '700',
  },
  referenceBox: {
    width: 84,
    height: 200,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  referenceImage: {
    width: '100%',
    height: '100%',
  },
  referenceTag: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#F59E0B',
    paddingVertical: 2,
    alignItems: 'center',
  },
  referenceTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: spacing.xs,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xs,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD9EB',
  },
  counterBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B2545',
  },
  counterValueText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'center',
  },
  notesSection: {
    marginBottom: spacing.md,
  },
  tagsWrapper: {
    gap: spacing.xs,
  },
  tagPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagPillActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  tagText: {
    ...typeScale.subheadline,
    color: '#475569',
  },
  tagTextActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryCta: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  primaryCtaActive: {
    backgroundColor: '#0B2545',
  },
  primaryCtaDisabled: {
    backgroundColor: '#E2E8F0',
  },
  primaryCtaText: {
    ...typeScale.headline,
    fontWeight: '700',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#94A3B8',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
