import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCamera,
  IconCheck,
  IconClose,
  colors,
  driverJourneyTokens,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
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
  orderReference?: string | null;
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
 * is deliberately a modal bottom sheet with Apple HIG styling and Emil Kowalski
 * interaction polish.
 */
export const ProofCaptureSheet = memo(function ProofCaptureSheet({
  capturedAt,
  isUploading,
  onCancel,
  onConfirm,
  onRetake,
  orderReference,
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

  const handleRetake = () => {
    if (isUploading) return;
    haptic.light();
    onRetake();
  };

  const handleConfirm = () => {
    if (isUploading) return;
    haptic.medium();
    onConfirm();
  };

  const handleCancel = () => {
    if (isUploading) return;
    haptic.light();
    onCancel();
  };

  return (
    <View style={styles.scrim} testID="proof-capture-sheet">
      <Pressable
        accessibilityLabel="Đóng xác nhận ảnh"
        accessibilityRole="button"
        disabled={isUploading}
        onPress={handleCancel}
        style={styles.scrimBackdrop}
      />
      <View style={styles.sheetCard}>
        {/* Apple HIG Sheet Grabber */}
        <View style={styles.grabberContainer} pointerEvents="none">
          <View style={styles.grabber} />
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityLabel="Đóng xác nhận ảnh"
            accessibilityRole="button"
            disabled={isUploading}
            hitSlop={spacing.xs}
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && !isUploading ? styles.pressedClose : null,
            ]}
            testID="btn-cancel-proof-sheet"
          >
            <IconClose color={colors.neutral.mutedText} size={18} />
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

          {/* Logistics Watermark HUD */}
          <View style={styles.watermark} pointerEvents="none" testID="proof-capture-watermark">
            <View style={styles.watermarkHeaderRow}>
              <View style={styles.watermarkBadge}>
                <View style={styles.watermarkLiveDot} />
                <Text style={styles.watermarkLiveText}>E-POD LIVE</Text>
              </View>
              {orderReference ? (
                <Text style={styles.watermarkRefText} numberOfLines={1}>
                  #{orderReference}
                </Text>
              ) : null}
            </View>
            <View style={styles.watermarkDetailsRow}>
              <Text style={styles.watermarkText}>{watermarkCoords || 'Chưa có vị trí GPS'}</Text>
              {stamp ? <Text style={styles.watermarkText}>{stamp}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Chụp lại ảnh khác"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={handleRetake}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && !isUploading ? styles.pressedSecondary : null,
            ]}
            testID="btn-retake-proof"
          >
            <IconCamera color={driverPrimitives.colors.gray700} size={18} />
            <Text style={styles.secondaryBtnText}>Chụp lại</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Xác nhận ảnh và tải lên"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.primaryBtn,
              isUploading ? styles.primaryBtnBusy : null,
              pressed && !isUploading ? styles.pressedPrimary : null,
            ]}
            testID="btn-confirm-proof"
          >
            {isUploading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <IconCheck color="#FFFFFF" size={18} strokeWidth={2.5} />
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
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 21, 38, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  scrimBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    backgroundColor: colors.neutral.surface,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  grabber: {
    backgroundColor: driverPrimitives.colors.gray300,
    borderRadius: 2.5,
    height: 5,
    width: 36,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  title: {
    color: driverPrimitives.colors.gray900,
    flex: 1,
    ...typeScale.headline,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressedClose: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  photoFrame: {
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    height: 220,
    overflow: 'hidden',
    position: 'relative',
    ...iosContinuousCurve,
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
    backgroundColor: 'rgba(11, 21, 38, 0.45)',
  },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 21, 38, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    gap: spacing.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  watermarkHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  watermarkBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  watermarkLiveDot: {
    backgroundColor: '#10B981',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  watermarkLiveText: {
    color: '#10B981',
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  watermarkRefText: {
    color: 'rgba(255, 255, 255, 0.85)',
    ...typeScale.caption2,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  watermarkDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  watermarkText: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray300,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...iosContinuousCurve,
  },
  secondaryBtnText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  pressedSecondary: {
    backgroundColor: driverPrimitives.colors.gray100,
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.orange500,
    borderRadius: radius.cardLg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    justifyContent: 'center',
    shadowColor: driverPrimitives.colors.orange500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    ...iosContinuousCurve,
  },
  primaryBtnBusy: {
    opacity: 0.75,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    ...typeScale.headline,
    fontWeight: '700',
  },
  pressedPrimary: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
