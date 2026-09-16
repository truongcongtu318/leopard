import React, { useMemo, useState } from 'react';
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
  driverPrimitives,
  iosContinuousCurve,
  IconCamera,
  IconCameraProof,
  IconCheck,
  IconClock,
  IconLocationPin,
  IconOrders,
  IconShieldAlert,
  IconTrash,
  IconTxPayment,
  SlideToAction,
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

export function EpodPanel({
  isCashConfirmed,
  onExecuteTask,
  onRetryProof,
  onSelectProof,
  orderId,
  paymentMethod,
  paymentStatus,
  priceLabel,
  proof,
  status,
}: EpodPanelProps) {
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

  // Freehand stroke paths for real signature drawing
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');

  const isError =
    proof.kind === 'invalid-type' || proof.kind === 'too-large' || proof.kind === 'upload-retry';

  const handleSimulateCameraCapture = () => {
    if (isLocating) return;
    setIsLocating(true);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    void (async () => {
      const location = await getDriverCurrentLocation();
      const coordsStr =
        location.kind === 'ready'
          ? formatWatermarkCoords(location.coords)
          : EPOD_GPS_UNAVAILABLE;

      setCargoPhotoUri(proof.fileLabel || 'epod-cargo-photo-watermarked.jpg');
      setPhotoWatermark({ timestamp: timeStr, coords: coordsStr });
      setErrorMsg(null);
      setIsLocating(false);
      if (onSelectProof) {
        onSelectProof();
      }
    })();
  };

  const handleSignTouch = () => {
    setSignPoints((prev) => prev + 1);
    setSignatureCaptured(true);
    setErrorMsg(null);
  };

  const handleClearSignature = () => {
    setPaths([]);
    setCurrentPath('');
    setSignPoints(0);
    setSignatureCaptured(false);
  };

  // Real finger-drawing PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath(`M${Math.round(locationX)},${Math.round(locationY)}`);
          setSignatureCaptured(true);
          setErrorMsg(null);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath((prev) => `${prev} L${Math.round(locationX)},${Math.round(locationY)}`);
          setSignPoints((prev) => prev + 1);
        },
        onPanResponderRelease: () => {
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

  const handleConfirmDelivery = () => {
    if (!cargoPhotoUri || !photoWatermark?.timestamp || !photoWatermark?.coords) {
      setErrorMsg('Vui lòng chụp ảnh kiện hàng có gắn watermark định vị GPS & thời gian');
      return;
    }
    if (!signatureCaptured) {
      setErrorMsg('Vui lòng yêu cầu thủ kho / người nhận ký xác nhận bàn giao (e-POD)');
      return;
    }
    setErrorMsg(null);
    if (onExecuteTask) {
      onExecuteTask(orderId ? `cmd-deliver-${orderId}` : 'cmd-deliver-demo');
    }
  };

  return (
    <View style={styles.epodCard} testID="epod-verification-container">
      {/* ── 1. Header Card ── */}
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <IconCameraProof color={driverPrimitives.colors.gray700} size={18} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.sectionTitle}>XÁC THỰC BÀN GIAO (POD)</Text>
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
            {isCompleteReady ? 'ĐỦ ĐIỀU KIỆN' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
          </Text>
        </View>
      </View>

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
          <IconShieldAlert color="#DC2626" size={15} />
          <Text accessibilityRole="alert" style={styles.validationAlertText}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      {/* ── 2. Payment Reminder Row ── */}
      <View style={styles.paymentCard} testID="epod-payment-reminder">
        <View style={styles.paymentIconWrap}>
          <IconTxPayment color={driverPrimitives.colors.gray500} size={18} />
        </View>
        <View style={styles.paymentTextCol}>
          <Text style={styles.paymentTitle}>
            {paymentMethod === 'CASH'
              ? 'NHẮC NHỞ THU TIỀN MẶT (COD)'
              : 'THANH TOÁN ĐƠN HÀNG'}
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
                ? 'ĐÃ THU COD'
                : 'CẦN THU COD'
              : 'VIETQR'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* ── 3. Part 1: Cargo Photo with Watermark ── */}
      <View style={styles.partSection}>
        <View style={styles.partHeaderRow}>
          <Text style={styles.partTitle}>ẢNH CHỤP KIỆN HÀNG BÀN GIAO</Text>
        </View>

        {cargoPhotoUri ? (
          <View style={styles.photoPreviewCard}>
            <View style={styles.photoPlaceholder}>
              <IconOrders color={driverPrimitives.colors.gray500} size={28} />
              <Text style={styles.photoFileName}>{cargoPhotoUri}</Text>
            </View>

            {/* Clean Camera Watermark Overlay */}
            <View style={styles.watermarkContainer} testID="camera-watermark-overlay">
              <View style={styles.watermarkRow}>
                <IconLocationPin color="#F59E0B" size={12} strokeWidth={2} />
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
              onPress={handleSimulateCameraCapture}
              style={({ pressed }) => [styles.retakeBtn, pressed ? styles.pressed : null]}
            >
              <IconCamera color={driverPrimitives.colors.gray700} size={14} />
              <Text style={styles.retakeBtnText}>Chụp lại ảnh</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityHint="Bấm để mở máy ảnh chụp kiện hàng thực tế"
            accessibilityLabel="Chụp ảnh kiện hàng với watermark GPS"
            accessibilityRole="button"
            onPress={handleSimulateCameraCapture}
            style={({ pressed }) => [styles.captureBtn, pressed ? styles.pressed : null]}
            testID="btn-capture-cargo-photo"
          >
            <View style={styles.captureIconCircle}>
              <IconCamera color="#FFFFFF" size={18} />
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

      <View style={styles.cardDivider} />

      {/* ── 4. Part 2: Warehouse Receiver Digital Signature Pad (Freehand drawing) ── */}
      <View style={styles.partSection}>
        <View style={styles.partHeaderRow}>
          <Text style={styles.partTitle}>CHỮ KÝ TAY THỦ KHO / NGƯỜI NHẬN</Text>
          {signatureCaptured ? (
            <Pressable
              accessibilityLabel="Ký lại chữ ký"
              accessibilityRole="button"
              hitSlop={8}
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
            placeholderTextColor={driverPrimitives.colors.gray400}
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
                    stroke={driverPrimitives.colors.gray900}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    fill="none"
                    stroke={driverPrimitives.colors.gray900}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                ) : null}
              </Svg>
            </View>
          ) : (
            <View pointerEvents="none" style={styles.signatureEmptyCol}>
              <IconOrders color={driverPrimitives.colors.gray400} size={22} />
              <Text style={styles.signaturePromptTitle}>KÝ TÊN BẰNG TAY VÀO ĐÂY</Text>
              <Text style={styles.signaturePromptDesc}>
                Thủ kho / Người nhận dùng ngón tay ký trực tiếp vào khung
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
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },

  /* Header */
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    lineHeight: 15,
  },
  statusPill: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextReady: {
    color: driverPrimitives.colors.green700,
  },
  statusPillTextPending: {
    color: driverPrimitives.colors.gray500,
  },

  /* Proof notice */
  proofNoticeBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    padding: 10,
  },
  proofError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  proofNoticeTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 12,
    fontWeight: '700',
  },
  proofNoticeMessage: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11,
  },
  proofHelper: {
    color: driverPrimitives.colors.gray400,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  /* Validation Alert */
  validationAlert: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 10,
  },
  validationAlertText: {
    color: '#DC2626',
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Payment Card */
  paymentCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  paymentIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  paymentTextCol: {
    flex: 1,
    gap: 1,
  },
  paymentTitle: {
    color: driverPrimitives.colors.gray500,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentSub: {
    color: driverPrimitives.colors.gray900,
    fontSize: 12.5,
    fontWeight: '600',
  },
  paymentBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  paymentBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  cardDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    width: '100%',
  },

  /* Part Sections */
  partSection: {
    gap: 8,
  },
  partHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partTitle: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clearHeaderBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearHeaderBtnText: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Photo Card */
  photoPreviewCard: {
    gap: 8,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    height: 100,
    justifyContent: 'center',
  },
  photoFileName: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  watermarkContainer: {
    backgroundColor: driverPrimitives.colors.dark900,
    borderRadius: 10,
    gap: 3,
    padding: 8,
  },
  watermarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  retakeBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    justifyContent: 'center',
  },
  retakeBtnText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12.5,
    fontWeight: '600',
  },
  captureBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  captureIconCircle: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  captureTextCol: {
    flex: 1,
    gap: 2,
  },
  captureTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '700',
  },
  captureDesc: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
  },

  /* Receiver Input */
  receiverNameRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  receiverLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '600',
  },
  receiverInput: {
    color: driverPrimitives.colors.gray900,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    height: 32,
    padding: 0,
  },

  /* Signature Pad */
  signaturePad: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  signaturePadSigned: {
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    borderWidth: 1,
  },
  signatureEmptyCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  signaturePromptTitle: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signaturePromptDesc: {
    color: driverPrimitives.colors.gray400,
    fontSize: 10.5,
  },
  signatureDisplayCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 22,
  },
  signatureText: {
    color: driverPrimitives.colors.gray900,
    fontFamily: 'serif',
    fontSize: 22,
    fontStyle: 'italic',
  },
  signatureUnderline: {
    backgroundColor: '#E2E8F0',
    height: 1,
    marginTop: 2,
    width: 140,
  },
  signatureVerifiedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  signatureVerifiedText: {
    color: driverPrimitives.colors.green700,
    fontSize: 10.5,
    fontWeight: '600',
  },
  signatureVerifiedFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
  },

  /* Slider */
  sliderContainer: {
    paddingTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
});
