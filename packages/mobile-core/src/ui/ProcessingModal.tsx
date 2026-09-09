import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { leopardElevation, leopardPalette, leopardRadius, spacing } from '../theme/tokens';
import { TruckLoader } from './TruckLoader';

export type ProcessingModalProps = Readonly<{
  visible: boolean;
  onCancel?: () => void;
  onSuccessDemo?: () => void;
  stepMessage?: string;
}>;

const steps = [
  'Đang quét tài xế xe tải trong bán kính 3 km...',
  'AI dự báo ETA & tối ưu ghép hàng VRP...',
  'Đang gửi tín hiệu chuyến đi đến tài xế gần nhất...',
  'Đã tìm thấy tài xế phù hợp! Đang kết nối...',
];

export function ProcessingModal({
  onCancel,
  onSuccessDemo,
  stepMessage,
  visible,
}: ProcessingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setCurrentStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const displayMessage = stepMessage ?? steps[currentStepIndex];

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.animationArea}>
            <TruckLoader size="sm" />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>Đang tìm xe & ghép tuyến</Text>
            <Text style={styles.message}>{displayMessage}</Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStepIndex + 1) / steps.length) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.actionsRow}>
            {onCancel ? (
              <Pressable
                accessibilityLabel="Hủy tìm xe"
                accessibilityRole="button"
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.cancelText}>Hủy tìm kiếm</Text>
              </Pressable>
            ) : null}

            {onSuccessDemo ? (
              <Pressable
                accessibilityLabel="Kết nối ngay (Demo)"
                accessibilityRole="button"
                onPress={onSuccessDemo}
                style={({ pressed }) => [styles.demoButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.demoText}>Ghép xe ngay (Demo)</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    ...leopardElevation.modal,
  },
  animationArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  textBlock: {
    alignItems: 'center',

    gap: 4,
  },
  title: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 18,
    minHeight: 36,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: leopardRadius.pill,
    backgroundColor: leopardPalette.bgMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: leopardPalette.primary,
    borderRadius: leopardRadius.pill,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.bgMuted,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  cancelText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '600',
  },
  demoButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.ecoGreen,
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
