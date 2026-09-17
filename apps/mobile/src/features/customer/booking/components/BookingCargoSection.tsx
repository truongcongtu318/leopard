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
}: BookingCargoSectionProps) {
  const handlePickImage = async () => {
    if (cargoImages.length >= 5) return;
    try {
      const result = await pickDeviceImage();
      if (result && result.uri) {
        onAddImage(result.uri);
      }
    } catch {
      onAddImage(`file:///cargo-${Date.now()}.jpg`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Hàng hóa</Text>

      {/* Chip cuộn ngang loại hàng */}
      <ScrollView
        contentContainerStyle={styles.chipsScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {CARGO_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={cat}
              onPress={() => onSelectCategory(cat)}
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
        {/* Ô nhập ghi chú nhiều dòng */}
        <View style={styles.noteWrap}>
          <Text style={styles.fieldLabel}>Ghi chú hàng hóa</Text>
          <TextInput
            accessibilityLabel="Ghi chú hàng hóa"
            multiline
            numberOfLines={3}
            onChangeText={onChangeNote}
            placeholder="Khối lượng, tính chất hàng, lưu ý khi bốc dỡ"
            placeholderTextColor="#C7C7CC"
            style={styles.multilineInput}
            value={cargoNote}
          />
        </View>

        <View style={styles.separator} />

        {/* Lưới ảnh hàng hóa */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.fieldLabel}>Ảnh hàng hóa</Text>
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
                  onPress={() => onRemoveImage(idx)}
                  style={styles.deletePhotoBtn}
                >
                  <View style={styles.deletePhotoCircle}>
                    <IconClose color="#FFFFFF" size={10} />
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
                <IconCamera color={customerPalette.primary} size={22} />
                <Text style={styles.addPhotoText}>+ Thêm ảnh</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  chipSelected: {
    backgroundColor: customerPalette.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    ...typeScale.footnote,
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
    padding: spacing.md,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  noteWrap: {
    paddingBottom: spacing.xxs,
  },
  fieldLabel: {
    ...typeScale.footnote,
    fontWeight: '500',
    color: customerPalette.textSubtle,
    marginBottom: spacing.xxs,
  },
  multilineInput: {
    ...typeScale.callout,
    color: colors.neutral.text,
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 20,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginVertical: spacing.sm,
  },
  photoSection: {
    paddingTop: spacing.hairline,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  photoCount: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
    fontVariant: ['tabular-nums'],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.control,
    position: 'relative',
    ...iosContinuousCurve,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: radius.control,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 44,
    height: 44,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    zIndex: 10,
  },
  deletePhotoCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  addPhotoText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.primary,
    marginTop: spacing.hairline,
  },
});
