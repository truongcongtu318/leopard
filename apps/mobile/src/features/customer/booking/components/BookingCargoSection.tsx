import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  IconCamera,
  IconClose,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  pickDeviceImage,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { CargoCategory } from '../booking-schema';

export interface BookingCargoSectionProps {
  selectedCategory: CargoCategory;
  onSelectCategory: (category: CargoCategory) => void;
  cargoNote?: string;
  onChangeNote: (note: string) => void;
  cargoImages: string[];
  onAddImage: (uri: string) => void;
  onRemoveImage: (index: number) => void;
  imageError?: string;
}

const CARGO_CATEGORIES: CargoCategory[] = [
  'Kiện hàng',
  'May mặc',
  'Vật liệu XD',
  'Nội thất',
  'Khác',
];

export function BookingCargoSection({
  selectedCategory,
  onSelectCategory,
  cargoNote = '',
  onChangeNote,
  cargoImages,
  onAddImage,
  onRemoveImage,
  imageError,
}: BookingCargoSectionProps) {
  const handleSelectCategory = (cat: CargoCategory) => {
    haptic.selection();
    onSelectCategory(cat);
  };

  const handlePickImage = async () => {
    if (cargoImages.length >= 5) return;
    haptic.light();
    try {
      const result = await pickDeviceImage();
      if (result && result.uri) {
        onAddImage(result.uri);
      }
    } catch {
      onAddImage(`file:///cargo-${Date.now()}.jpg`);
    }
  };

  const handleRemove = (idx: number) => {
    haptic.light();
    onRemoveImage(idx);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Hàng hóa</Text>

      {/* Chip cuộn ngang loại hàng dạng pill compact */}
      <ScrollView
        contentContainerStyle={styles.chipsScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {CARGO_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              accessibilityLabel={`Loại hàng ${cat}${isSelected ? ', đã chọn' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={cat}
              onPress={() => handleSelectCategory(cat)}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.insetGroupedCard}>
        {/* Ô nhập ghi chú nhiều dòng gọn gàng */}
        <View style={styles.noteWrap}>
          <Text style={styles.fieldLabel}>Ghi chú hàng hóa</Text>
          <TextInput
            accessibilityLabel="Ghi chú hàng hóa"
            multiline
            numberOfLines={2}
            onChangeText={onChangeNote}
            placeholder="Khối lượng, tính chất hàng, lưu ý khi bốc dỡ"
            placeholderTextColor={customerPalette.offlineGray}
            style={styles.multilineInput}
            value={cargoNote}
          />
        </View>

        <View style={styles.separator} />

        {/* Lưới ảnh hàng hóa */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <View style={styles.photoLabelRow}>
              <Text style={styles.fieldLabel}>Ảnh hàng hóa</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <Text style={styles.photoCount}>{cargoImages.length}/5 ảnh</Text>
          </View>

          <View style={styles.photoGrid}>
            {cargoImages.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.thumbnailWrapper}>
                <Image source={{ uri }} style={styles.thumbnailImage} />
                <Pressable
                  accessibilityLabel={`Xóa ảnh ${idx + 1}`}
                  accessibilityRole="button"
                  hitSlop={12}
                  onPress={() => handleRemove(idx)}
                  style={styles.deletePhotoBtn}
                >
                  <View style={styles.deletePhotoCircle}>
                    <IconClose color="#FFFFFF" size={9} />
                  </View>
                </Pressable>
              </View>
            ))}

            {cargoImages.length < 5 && (
              <Pressable
                accessibilityLabel="Thêm ảnh hàng hóa"
                accessibilityRole="button"
                onPress={handlePickImage}
                style={({ pressed }) => [
                  styles.addPhotoBox,
                  pressed && styles.chipPressed,
                ]}
              >
                <View
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no"
                >
                  <IconCamera color={customerPalette.primary} size={18} />
                </View>
                <Text style={styles.addPhotoText}>Thêm ảnh</Text>
              </Pressable>
            )}
          </View>

          {imageError ? (
            <Text style={styles.errorText}>{imageError}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm + 2,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxs + 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xxs + 2,
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
    ...iosContinuousCurve,
  },
  chipSelected: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.965 }],
  },
  chipText: {
    ...typeScale.caption1,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  chipTextSelected: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },
  insetGroupedCard: {
    marginHorizontal: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    ...iosContinuousCurve,
  },
  noteWrap: {
    paddingBottom: spacing.hairline,
  },
  fieldLabel: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginBottom: 2,
  },
  multilineInput: {
    ...typeScale.subheadline,
    color: colors.neutral.text,
    minHeight: 48,
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 18,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginVertical: spacing.xs,
  },
  photoSection: {
    paddingTop: spacing.hairline,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs + 2,
  },
  photoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  requiredStar: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: colors.danger.text,
  },
  photoCount: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    fontVariant: ['tabular-nums'],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: radius.cardSm,
    position: 'relative',
    ...iosContinuousCurve,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: radius.cardSm,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    zIndex: 10,
  },
  deletePhotoCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBox: {
    width: 60,
    height: 60,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: customerPalette.primaryBorder,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  addPhotoText: {
    ...typeScale.caption2,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    color: customerPalette.primary,
    marginTop: 2,
  },
  errorText: {
    ...typeScale.caption2,
    color: colors.danger.text,
    marginTop: spacing.xxs + 2,
  },
});
