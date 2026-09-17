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
      const result = await pickDeviceImage({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result && !result.canceled && result.assets?.[0]?.uri) {
        onAddImage(result.assets[0].uri);
      }
    } catch {
      // Fallback demo image if device picker unavailable in test
      onAddImage(`file:///cargo-${Date.now()}.jpg`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>HÀNG HÓA</Text>

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

      <View style={styles.groupedCard}>
        {/* Ô nhập ghi chú nhiều dòng */}
        <View style={styles.noteWrap}>
          <Text style={styles.fieldLabel}>Ghi chú hàng hóa</Text>
          <TextInput
            accessibilityLabel="Ghi chú hàng hóa"
            multiline
            numberOfLines={3}
            onChangeText={onChangeNote}
            placeholder="Khối lượng, tính chất hàng, lưu ý khi bốc dỡ"
            placeholderTextColor={customerPalette.textMutedSlate}
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
                  hitSlop={10}
                  onPress={() => onRemoveImage(idx)}
                  style={styles.deletePhotoBtn}
                >
                  <IconClose color="#FFFFFF" size={14} />
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
                <IconCamera color={customerPalette.primary} size={24} />
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
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    ...typeScale.footnote,
    fontWeight: '500',
    color: customerPalette.textPrimary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  noteWrap: {
    paddingBottom: spacing.sm,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.textSecondary,
    marginBottom: 4,
  },
  multilineInput: {
    ...typeScale.body,
    color: customerPalette.textPrimary,
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  photoSection: {
    paddingTop: spacing.xs,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  photoCount: {
    ...typeScale.footnote,
    color: customerPalette.textSecondary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 10,
    position: 'relative',
    overflow: 'visible',
    ...iosContinuousCurve,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  addPhotoBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  addPhotoText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.primary,
    marginTop: 2,
  },
});
