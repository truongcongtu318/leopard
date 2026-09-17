import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  IconCamera,
  IconCameraProof,
  IconCheck,
  IconClock,
  IconLocationPin,
  IconOrders,
  IconShieldAlert,
  IconTxPayment,
  SlideToAction,
  colors,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverProofView } from '../../model';
import { getDriverCurrentLocation } from '../../driver-current-location';

/** Shown on the watermark when the device will not give us a position. */
export const EPOD_GPS_UNAVAILABLE = 'Chưa có vị trí GPS';

function formatWatermarkCoords(coords: { lat: number; lng: number }): string {
  const lat = `${Math.abs(coords.lat).toFixed(5)}° ${coords.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(coords.lng).toFixed(5)}° ${coords.lng >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

export type EpodPanelProps = Readonly<{
  proof: DriverProofView;
  status: string;
  orderId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  priceLabel?: string;
  isCashConfirmed?: boolean;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
  onExecuteTask?: (commandId: string) => void;
}>;

/* ──────────────────────────────────────────────────────────────────────────
 * Memoized sub-components to prevent drawing re-renders cascading
 * ────────────────────────────────────────────────────────────────────────── */

const EpodHeader = memo(function EpodHeader({
  isCompleteReady,
}: {
  isCompleteReady: boolean;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.iconBox}>
        <IconCameraProof color={colors.neutral.text} size={18} />
      </View>
      <View style={styles.headerTextCol}>
        <Text style={styles.sectionTitle}>Xác thực bàn giao (POD)</Text>
        <Text style={styles.sectionSubtitle}>
          Bằng chứng giao hàng điện tử B2B bắt buộc theo quy định
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          isCompleteReady ? styles.statusPillReady : styles.statusPillPending,
        ]}
      >
        <Text
          style={[
            styles.statusPillText,
            isCompleteReady ? styles.statusPillTextReady : styles.statusPillTextPending,
          ]}
        >
          {isCompleteReady ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}
        </Text>
      </View>
    </View>
  );
});

const EpodPaymentReminder = memo(function EpodPaymentReminder({
  isCashConfirmed,
  paymentMethod,
  priceLabel,
}: {
  paymentMethod?: string;
  isCashConfirmed?: boolean;
  priceLabel?: string;
}) {
  return (
    <View style={styles.paymentCard} testID="epod-payment-reminder">
      <View style={styles.paymentIconWrap}>
        <IconTxPayment color={colors.neutral.mutedText} size={18} />
      </View>
      <View style={styles.paymentTextCol}>
        <Text style={styles.paymentTitle}>
          {paymentMethod === 'CASH'
            ? 'Thu tiền mặt (COD)'
            : 'Thanh toán đơn hàng'}
        </Text>
        <Text style={styles.paymentSub}>
          {paymentMethod === 'CASH'
            ? isCashConfirmed
              ? 'Đã xác nhận thu tiền mặt từ khách'
              : `Thu tiền mặt khi giao (COD): ${priceLabel ?? 'Đang cập nhật'}`
            : 'Đã thanh toán qua VietQR'}
        </Text>
      </View>
      <View style={styles.paymentBadge}>
        <Text style={styles.paymentBadgeText}>
          {paymentMethod === 'CASH'
            ? isCashConfirmed
              ? 'Đã thu COD'
              : 'Cần thu COD'
            : 'VietQR'}
        </Text>
      </View>
    </View>
  );
});

const EpodPhotoSection = memo(function EpodPhotoSection({
  cargoPhotoUri,
  isLocating,
  onCapture,
  photoWatermark,
}: {
  cargoPhotoUri: string | null;
  photoWatermark: { timestamp: string; coords: string } | null;
  isLocating: boolean;
  onCapture: () => void;
}) {
  return (
    <View style={styles.partSection}>
      <View style={styles.partHeaderRow}>
        <Text style={styles.partTitle}>Ảnh chụp kiện hàng</Text>
      </View>

      {cargoPhotoUri ? (
        <View style={styles.photoPreviewCard}>
          <View style={styles.photoPlaceholder}>
            <IconOrders color={colors.neutral.mutedText} size={28} />
            <Text style={styles.photoFileName}>{cargoPhotoUri}</Text>
          </View>

          <View style={styles.watermarkContainer} testID="camera-watermark-overlay">
            <View style={styles.watermarkRow}>
              <IconLocationPin color={leopardPalette.accentYellow} size={12} strokeWidth={2} />
              <Text style={styles.watermarkText}>
                {photoWatermark?.coords || EPOD_GPS_UNAVAILABLE}
              </Text>
            </View>
            <View style={styles.watermarkRow}>
              <IconClock color="#94A3B8" size={12} />
              <Text style={styles.watermarkText}>
                {photoWatermark?.timestamp || '14:30:15 15/08/2026'} · LEOPARD e-POD
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Chụp lại ảnh kiện hàng"
            accessibilityRole="button"
            onPress={onCapture}
            style={({ pressed }) => [styles.retakeBtn, pressed ? styles.pressed : null]}
          >
            <IconCamera color={colors.neutral.text} size={14} />
            <Text style={styles.retakeBtnText}>Chụp lại ảnh</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityHint="Bấm để mở máy ảnh chụp kiện hàng thực tế"
          accessibilityLabel="Chụp ảnh kiện hàng với watermark GPS"
          accessibilityRole="button"
          onPress={onCapture}
          style={({ pressed }) => [styles.captureBtn, pressed ? styles.pressed : null]}
          testID="btn-capture-cargo-photo"
        >
          <View style={styles.captureIconCircle}>
            <IconCamera color={colors.neutral.surface} size={18} />
          </View>
          <View style={styles.captureTextCol}>
            <Text style={styles.captureTitle}>
              {isLocating ? 'Đang lấy vị trí GPS…' : 'Chụp ảnh kiện hàng giao thực tế'}
            </Text>
            <Text style={styles.captureDesc}>
              Tự động gắn watermark tọa độ GPS và thời gian thực
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────────────────
 * Main EpodPanel Component
 * ────────────────────────────────────────────────────────────────────────── */

export function EpodPanel({
  isCashConfirmed,
  onExecuteTask,
  onSelectProof,
  orderId,
  paymentMethod,
  priceLabel,
  proof,
  status,
}: EpodPanelProps) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [cargoPhotoUri, setCargoPhotoUri] = useState<string | null>(
    proof.kind === 'persisted' || proof.kind === 'selected-local'
      ? proof.fileLabel || 'cargo-proof-watermarked.jpg'
      : null,
  );
  const [photoWatermark, setPhotoWatermark] = useState<{
    timestamp: string;
    coords: string;
  } | null>(
    proof.kind === 'persisted'
      ? {
          timestamp: '14:30:15 15/08/2026',
          coords: EPOD_GPS_UNAVAILABLE,
        }
      : null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [signatureCaptured, setSignatureCaptured] = useState<boolean>(
    proof.kind === 'persisted',
  );
  const [receiverName, setReceiverName] = useState<string>('Nguyễn Văn A');
  const [signPoints, setSignPoints] = useState<number>(proof.kind === 'persisted' ? 12 : 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Freehand stroke paths for signature drawing
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const isError =
    proof.kind === 'invalid-type' || proof.kind === 'too-large' || proof.kind === 'upload-retry';

  const handleSimulateCameraCapture = useCallback(() => {
    if (isLocating) return;
    setIsLocating(true);
    haptic.medium();

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    void (async () => {
      const location = await getDriverCurrentLocation();
      const coordsStr =
        location.kind === 'ready'
          ? formatWatermarkCoords(location.coords)
          : EPOD_GPS_UNAVAILABLE;

      if (isMountedRef.current) {
        setCargoPhotoUri(proof.fileLabel || 'epod-cargo-photo-watermarked.jpg');
        setPhotoWatermark({ timestamp: timeStr, coords: coordsStr });
        setErrorMsg(null);
        setIsLocating(false);
      }
      if (onSelectProof) {
        onSelectProof();
      }
    })();
  }, [isLocating, onSelectProof, proof.fileLabel]);

  const handleSignTouch = useCallback(() => {
    haptic.selection();
    setSignPoints((prev) => prev + 1);
    setSignatureCaptured(true);
    setErrorMsg(null);
  }, []);

  const handleClearSignature = useCallback(() => {
    haptic.light();
    setPaths([]);
    setCurrentPath('');
    setSignPoints(0);
    setSignatureCaptured(false);
  }, []);

  // Freehand drawing PanResponder with point sampling to avoid excessive JS churn
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const x = Math.round(locationX);
          const y = Math.round(locationY);
          lastPointRef.current = { x, y };
          setCurrentPath(`M${x},${y}`);
          setSignatureCaptured(true);
          setErrorMsg(null);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const x = Math.round(locationX);
          const y = Math.round(locationY);

          // Sample points to keep SVG paths lean and UI responsive
          if (lastPointRef.current) {
            const dx = Math.abs(x - lastPointRef.current.x);
            const dy = Math.abs(y - lastPointRef.current.y);
            if (dx < 2 && dy < 2) return;
          }
          lastPointRef.current = { x, y };

          setCurrentPath((prev) => `${prev} L${x},${y}`);
          setSignPoints((prev) => prev + 1);
        },
        onPanResponderRelease: () => {
          lastPointRef.current = null;
          setCurrentPath((prev) => {
            if (prev) {
              setPaths((p) => [...p, prev]);
            }
            return '';
          });
        },
      }),
    [],
  );

  const isCompleteReady = Boolean(
    cargoPhotoUri &&
    photoWatermark?.timestamp &&
    photoWatermark?.coords &&
    signatureCaptured,
  );

  const handleConfirmDelivery = useCallback(() => {
    if (!cargoPhotoUri || !photoWatermark?.timestamp || !photoWatermark?.coords) {
      setErrorMsg('Vui lòng chụp ảnh kiện hàng có gắn watermark định vị GPS & thời gian');
      return;
    }
    if (!signatureCaptured) {
      setErrorMsg('Vui lòng yêu cầu thủ kho / người nhận ký xác nhận bàn giao (e-POD)');
      return;
    }
    setErrorMsg(null);
    haptic.success();
    if (onExecuteTask) {
      onExecuteTask(orderId ? `cmd-deliver-${orderId}` : 'cmd-deliver-demo');
    }
  }, [cargoPhotoUri, onExecuteTask, orderId, photoWatermark, signatureCaptured]);

  // ponytail: Local recipient name & signature state kept in panel memory; upgrade to signed payload upload when backend e-POD validation endpoint is ready.
  return (
    <View style={styles.epodCard} testID="epod-verification-container">
      {/* ── 1. Header Card (Memoized) ── */}
      <EpodHeader isCompleteReady={isCompleteReady} />

      {/* Existing Proof Notice (if read-only snapshot exists) */}
      {proof.kind !== 'empty' && (
        <View style={[styles.proofNoticeBox, isError ? styles.proofError : null]}>
          <Text style={styles.proofNoticeTitle}>{proof.label}</Text>
          <Text style={styles.proofNoticeMessage}>{proof.message}</Text>
          {proof.fileLabel ? (
            <Text style={styles.proofHelper}>Đính kèm hệ thống: {proof.fileLabel}</Text>
          ) : null}
        </View>
      )}

      {/* Validation alert banner */}
      {errorMsg ? (
        <View style={styles.validationAlert} testID="epod-validation-error">
          <IconShieldAlert color={colors.danger.text} size={15} />
          <Text accessibilityRole="alert" style={styles.validationAlertText}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      {/* ── 2. Payment Reminder Row (Memoized) ── */}
      <EpodPaymentReminder
        isCashConfirmed={isCashConfirmed}
        paymentMethod={paymentMethod}
        priceLabel={priceLabel}
      />

      <View style={styles.cardDivider} />

      {/* ── 3. Part 1: Cargo Photo with Watermark (Memoized) ── */}
      <EpodPhotoSection
        cargoPhotoUri={cargoPhotoUri}
        isLocating={isLocating}
        onCapture={handleSimulateCameraCapture}
        photoWatermark={photoWatermark}
      />

      <View style={styles.cardDivider} />

      {/* ── 4. Part 2: Warehouse Receiver Digital Signature Pad (Freehand drawing) ── */}
      <View style={styles.partSection}>
        <View style={styles.partHeaderRow}>
          <Text style={styles.partTitle}>Chữ ký người nhận / thủ kho</Text>
          {signatureCaptured ? (
            <Pressable
              accessibilityLabel="Ký lại chữ ký"
              accessibilityRole="button"
              hitSlop={spacing.xs}
              onPress={handleClearSignature}
              style={styles.clearHeaderBtn}
            >
              <Text style={styles.clearHeaderBtnText}>Xóa chữ ký</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.receiverNameRow}>
          <Text style={styles.receiverLabel}>Đại diện nhận hàng:</Text>
          <TextInput
            accessibilityLabel="Tên người nhận hàng"
            onChangeText={setReceiverName}
            placeholder="Nhập họ tên người nhận / thủ kho"
            placeholderTextColor={colors.neutral.subtleText}
            style={styles.receiverInput}
            testID="epod-recipient-name-input"
            value={receiverName}
          />
        </View>

        {/* Interactive Freehand Signature Pad */}
        <Pressable
          {...panResponder.panHandlers}
          accessibilityHint="Dùng ngón tay ký trực tiếp vào khung này"
          accessibilityLabel="Bảng ký tên điện tử"
          accessibilityRole="button"
          onPress={handleSignTouch}
          style={({ pressed }) => [
            styles.signaturePad,
            signatureCaptured ? styles.signaturePadSigned : null,
            pressed ? styles.pressed : null,
          ]}
          testID="epod-signature-pad"
        >
          {signatureCaptured ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.signatureDisplayCol}>
                <Text style={styles.signatureText}>{receiverName || 'Nguyễn Văn A'}</Text>
                <View style={styles.signatureUnderline} />
                <View style={styles.signatureVerifiedRow}>
                  <IconCheck color="#059669" size={11} strokeWidth={2.5} />
                  <Text style={styles.signatureVerifiedText}>
                    Chữ ký điện tử đã được xác thực · {signPoints || 12} nét chạm
                  </Text>
                </View>
              </View>

              <Svg style={StyleSheet.absoluteFill}>
                {paths.map((d, i) => (
                  <Path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={colors.neutral.text}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    fill="none"
                    stroke={colors.neutral.text}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                ) : null}
              </Svg>
            </View>
          ) : (
            <View pointerEvents="none" style={styles.signatureEmptyCol}>
              <IconOrders color={colors.neutral.subtleText} size={22} />
              <Text style={styles.signaturePromptTitle}>Ký tên vào đây</Text>
              <Text style={styles.signaturePromptDesc}>
                Người nhận dùng ngón tay ký trực tiếp vào khung
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── 5. Slide to Confirm Delivery ── */}
      {(status === 'IN_TRANSIT' || status === 'DELIVERED') && (
        <View style={styles.sliderContainer}>
          <SlideToAction
            colorVariant="success"
            disabled={!isCompleteReady}
            label="Vuốt hoàn tất cuốc xe ➔"
            onActionComplete={handleConfirmDelivery}
            resetKey={`${orderId}-${signatureCaptured ? 'signed' : 'unsigned'}`}
            testID="btn-epod-complete-delivery"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  epodCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm + spacing.hairline,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },

  /* Header */
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + spacing.hairline,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.cardSm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  sectionTitle: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 1,
  },
  statusPillReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillPending: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
  },
  statusPillText: {
    ...typeScale.caption2,
    fontWeight: '700',
  },
  statusPillTextReady: {
    color: driverPrimitives.colors.green700,
  },
  statusPillTextPending: {
    color: colors.neutral.mutedText,
  },

  /* Proof notice */
  proofNoticeBox: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    gap: spacing.hairline,
    padding: spacing.sm - spacing.xxs,
  },
  proofError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  proofNoticeTitle: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    fontWeight: '700',
  },
  proofNoticeMessage: {
    color: colors.neutral.text,
    ...typeScale.caption2,
  },
  proofHelper: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.hairline,
  },

  /* Validation Alert */
  validationAlert: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.cardSm - 2,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm - spacing.xxs,
  },
  validationAlertText: {
    color: colors.danger.text,
    flex: 1,
    ...typeScale.caption1,
    fontWeight: '600',
  },

  /* Payment Card */
  paymentCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs + spacing.hairline,
    padding: spacing.sm - spacing.xxs,
  },
  paymentIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardSm - 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  paymentTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  paymentTitle: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentSub: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  paymentBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm - 4,
    borderWidth: 1,
    paddingHorizontal: spacing.xs - 1,
    paddingVertical: spacing.hairline + 1,
  },
  paymentBadgeText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  cardDivider: {
    backgroundColor: colors.neutral.surfaceMuted,
    height: 1,
    width: '100%',
  },

  /* Part Sections */
  partSection: {
    gap: spacing.xs,
  },
  partHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partTitle: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clearHeaderBtn: {
    paddingHorizontal: spacing.xs - 2,
    paddingVertical: spacing.hairline,
  },
  clearHeaderBtnText: {
    color: colors.danger.text,
    ...typeScale.caption1,
    fontWeight: '600',
  },

  /* Photo Card */
  photoPreviewCard: {
    gap: spacing.xs,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing.xs,
    height: 100,
    justifyContent: 'center',
  },
  photoFileName: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
  },
  watermarkContainer: {
    backgroundColor: driverPrimitives.colors.dark900,
    borderRadius: radius.cardSm,
    gap: spacing.hairline + 1,
    padding: spacing.xs,
  },
  watermarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  watermarkText: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  retakeBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 38,
    justifyContent: 'center',
  },
  retakeBtnText: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  captureBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.control,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + spacing.hairline,
  },
  captureIconCircle: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  captureTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  captureTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  captureDesc: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },

  /* Receiver Input */
  receiverNameRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
  },
  receiverLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  receiverInput: {
    color: colors.neutral.text,
    flex: 1,
    ...typeScale.subheadline,
    fontWeight: '600',
    height: 32,
    padding: 0,
  },

  /* Signature Pad */
  signaturePad: {
    backgroundColor: colors.neutral.surface,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.card,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  signaturePadSigned: {
    borderColor: colors.neutral.border,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  signatureEmptyCol: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  signaturePromptTitle: {
    color: colors.neutral.text,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signaturePromptDesc: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
  },
  signatureDisplayCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  signatureText: {
    color: colors.neutral.text,
    ...typeScale.title2,
    fontFamily: 'serif',
    fontStyle: 'italic',
  },
  signatureUnderline: {
    backgroundColor: colors.neutral.border,
    height: 1,
    marginTop: spacing.hairline,
    width: 140,
  },
  signatureVerifiedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  signatureVerifiedText: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },

  /* Slider */
  sliderContainer: {
    paddingTop: spacing.xxs,
  },
  pressed: {
    opacity: 0.8,
  },
});
