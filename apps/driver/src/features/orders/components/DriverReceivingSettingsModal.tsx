import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconClose,
  colors,
  iosContinuousCurve,
  leopardPalette,
} from '@leopard/mobile-core';

export const DRIVER_RADIUS_OPTIONS: readonly string[] = ['3', '5', '10', '15'];

export type DriverReceivingSettingsModalProps = Readonly<{
  visible: boolean;
  radiusKm: string;
  onClose: () => void;
  onSave: (radius: string) => void;
}>;

/** Dispatch radius picker for the idle load board. */
export function DriverReceivingSettingsModal({
  onClose,
  onSave,
  radiusKm,
  visible,
}: DriverReceivingSettingsModalProps) {
  const [selectedRadius, setSelectedRadius] = useState(radiusKm);

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="driver-receiving-settings">
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Thiết lập nhận đơn
            </Text>
            <Pressable
              accessibilityLabel="Đóng thiết lập"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressed : null]}
            >
              <IconClose color={colors.neutral.subtleText} size={18} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionLabel}>BÁN KÍNH QUÉT ĐƠN (KM)</Text>
            <View style={styles.optionsRow}>
              {DRIVER_RADIUS_OPTIONS.map((radius) => {
                const isSelected = selectedRadius === radius;
                return (
                  <Pressable
                    accessibilityLabel={`Bán kính ${radius} km`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={radius}
                    onPress={() => setSelectedRadius(radius)}
                    style={({ pressed }) => [
                      styles.optionPill,
                      isSelected ? styles.optionPillActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        isSelected ? styles.optionPillTextActive : null,
                      ]}
                    >
                      {radius} km
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityLabel="Lưu cấu hình"
              accessibilityRole="button"
              onPress={() => {
                onSave(selectedRadius);
                onClose();
              }}
              style={({ pressed }) => [styles.saveBtn, pressed ? styles.pressed : null]}
              testID="driver-save-receiving-settings"
            >
              <Text style={styles.saveBtnText}>ÁP DỤNG CẤU HÌNH</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...iosContinuousCurve,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: leopardPalette.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  body: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.neutral.subtleText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  optionPillActive: {
    backgroundColor: leopardPalette.primary,
    borderColor: leopardPalette.primary,
  },
  optionPillText: {
    color: colors.neutral.mutedText,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  optionPillTextActive: {
    color: colors.neutral.surface,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 14,
    ...iosContinuousCurve,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  saveBtnText: {
    color: colors.neutral.surface,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
