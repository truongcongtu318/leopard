import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCamera,
  IconCheck,
  IconClose,
  colors,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type ProofCaptureSheetProps = Readonly<{
  /** Real on-device URI of the just-captured photo. */
  photoUri: string;
  capturedAt: Date | null;
  watermarkCoords: string | null;
  title: string;
  isUploading?: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}>;

function formatStamp(date: Date | null): string | null {
  if (!date) return null;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(
    date.getDate(),
  )}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Compact review step shown right after a proof photo is captured. It exists
 * only so the driver can confirm or retake evidence before it is uploaded — it
 * is deliberately not a full screen, so the map is never buried under a second
 * layer of chrome.
 */
export const ProofCaptureSheet = memo(function ProofCaptureSheet({
  capturedAt,
  isUploading,
  onCancel,
  onConfirm,
  onRetake,
  photoUri,
  title,
  watermarkCoords,
}: ProofCaptureSheetProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Reset the spinner whenever a new photo replaces the current one.
  useEffect(() => {
    setIsImageLoading(true);
  }, [photoUri]);

  const stamp = formatStamp(capturedAt);

  return (
    <View style={styles.root} testID="proof-capture-sheet">
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityLabel="Đóng xác nhận ảnh"
            accessibilityRole="button"
            disabled={isUploading}
            hitSlop={spacing.xs}
            onPress={onCancel}
            style={styles.closeBtn}
            testID="btn-cancel-proof-sheet"
          >
            <IconClose color={colors.neutral.mutedText} size={20} />
          </Pressable>
        </View>

        <View style={styles.photoFrame}>
          <Image
            accessibilityLabel="Ảnh bằng chứng vừa chụp"
            onLoadEnd={() => setIsImageLoading(false)}
            resizeMode="cover"
            source={{ uri: photoUri }}
            style={styles.photo}
            testID="proof-capture-photo"
          />
          {isImageLoading ? (
            <View style={styles.photoLoading} pointerEvents="none">
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}

          <View style={styles.watermark} pointerEvents="none" testID="proof-capture-watermark">
            <Text style={styles.watermarkText}>{watermarkCoords || 'Chưa có vị trí GPS'}</Text>
            {stamp ? <Text style={styles.watermarkText}>{stamp}</Text> : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Chụp lại ảnh khác"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={onRetake}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed ? styles.pressed : null,
            ]}
            testID="btn-retake-proof"
          >
            <IconCamera color={leopardPalette.primary} size={16} />
            <Text style={styles.secondaryBtnText}>Chụp lại</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Xác nhận ảnh và tải lên"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.primaryBtn,
              isUploading ? styles.primaryBtnBusy : null,
              pressed && !isUploading ? styles.pressed : null,
            ]}
            testID="btn-confirm-proof"
          >
            {isUploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconCheck color="#FFFFFF" size={16} strokeWidth={2.5} />
                <Text style={styles.primaryBtnText}>Xác nhận</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardXl,
    gap: spacing.sm,
    padding: spacing.md,
    ...iosContinuousCurve,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.neutral.text,
    flex: 1,
    ...typeScale.headline,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  photoFrame: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.card,
    height: 190,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  photoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 37, 69, 0.78)',
    gap: spacing.hairline,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  watermarkText: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    ...iosContinuousCurve,
  },
  secondaryBtnText: {
    color: leopardPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.cardLg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  primaryBtnBusy: {
    opacity: 0.8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    ...typeScale.headline,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
