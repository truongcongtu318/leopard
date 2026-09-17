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
    marginTop: 24,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    paddingHorizontal: 32,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  insetGroupedCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  noteWrap: {
    paddingBottom: 4,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 6,
  },
  multilineInput: {
    ...typeScale.body,
    fontSize: 15,
    color: '#000000',
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 20,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  photoSection: {
    paddingTop: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    position: 'relative',
    ...iosContinuousCurve,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
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
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
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
    fontSize: 11,
    fontWeight: '600',
    color: customerPalette.primary,
    marginTop: 2,
  },
});
