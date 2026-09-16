import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
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
  spacing,
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
  proof,
  status,
  orderId,
  paymentMethod,
  paymentStatus,
  priceLabel,
  isCashConfirmed,
  onSelectProof,
  onRetryProof,
  onExecuteTask,
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

  const isError =
    proof.kind === 'invalid-type' || proof.kind === 'too-large' || proof.kind === 'upload-retry';

  const handleSimulateCameraCapture = () => {
    if (isLocating) return;
    setIsLocating(true);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    void (async () => {
      // The watermark must carry the driver's real position, or say plainly that
      // there is none. It used to stamp a fixed Ho Chi Minh City coordinate with
      // a fabricated "GPS lock ±3m", which put an authoritative-looking but
      // wrong location on delivery evidence.
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
    setSignPoints(0);
    setSignatureCaptured(false);
  };

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
    <View style={styles.epodDoubleBezelOuter} testID="epod-verification-container">
      <View style={styles.epodDoubleBezelInner}>
        {/* Header with Emerald Accent */}
        <View style={styles.epodHeaderRow}>
          <View style={styles.epodIconBadge}>
            <IconCameraProof color="#10B981" size={20} />
          </View>
          <View style={styles.epodHeaderTextCol}>
            <Text style={styles.epodSectionTitle}>XÁC THỰC BÀN GIAO (POD)</Text>
            <Text style={styles.epodSectionSubtitle}>
              Bằng chứng giao hàng điện tử B2B bắt buộc theo quy định
            </Text>
          </View>
          <View
            style={[
              styles.epodStatusPill,
              isCompleteReady ? styles.epodStatusPillReady : styles.epodStatusPillPending,
            ]}
          >
            <Text
              style={[
                styles.epodStatusPillText,
                isCompleteReady ? styles.epodStatusPillTextReady : styles.epodStatusPillTextPending,
              ]}
            >
              {isCompleteReady ? 'ĐỦ ĐIỀU KIỆN' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
            </Text>
          </View>
        </View>

        {/* Existing Proof notice if any */}
        {proof.kind !== 'empty' && (
          <View style={[styles.proofNoticeBox, isError ? styles.proofError : null]}>
            <Text style={styles.proofNoticeTitle}>{proof.label}</Text>
            <Text style={styles.proofNoticeMessage}>{proof.message}</Text>
            {proof.fileLabel ? (
              <Text style={styles.proofHelper}>Đính kèm hệ thống: {proof.fileLabel}</Text>
            ) : null}
          </View>
        )}

        {/* Error banner if validation fails */}
        {errorMsg ? (
          <View style={styles.epodValidationAlert} testID="epod-validation-error">
            <IconShieldAlert color="#B91C1C" size={15} />
            <Text accessibilityRole="alert" style={styles.epodValidationAlertText}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* Payment Collection Reminder */}
        <View style={styles.paymentReminderCard} testID="epod-payment-reminder">
          <View style={styles.paymentReminderIconWrap}>
            <IconTxPayment
              color={paymentMethod === 'CASH' && !isCashConfirmed ? '#D97706' : '#10B981'}
              size={18}
            />
          </View>
          <View style={styles.paymentReminderCol}>
            <Text style={styles.paymentReminderTitle}>
              {paymentMethod === 'CASH'
                ? 'NHẮC NHỞ THU TIỀN MẶT (COD)'
                : 'THANH TOÁN ĐƠN HÀNG'}
            </Text>
            <Text style={styles.paymentReminderText}>
              {paymentMethod === 'CASH'
                ? isCashConfirmed
                  ? 'Đã xác nhận thu tiền mặt từ khách'
                  : `Thu tiền mặt khi giao (COD): ${priceLabel ?? 'Đang cập nhật'}`
                : 'Đã thanh toán qua VietQR'}
            </Text>
          </View>
          <View
            style={[
              styles.paymentBadge,
              paymentMethod === 'CASH' && !isCashConfirmed
                ? styles.paymentBadgePending
                : styles.paymentBadgeSuccess,
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                paymentMethod === 'CASH' && !isCashConfirmed
                  ? styles.paymentBadgeTextPending
                  : styles.paymentBadgeTextSuccess,
              ]}
            >
              {paymentMethod === 'CASH'
                ? isCashConfirmed
                  ? 'ĐÃ THU COD'
                  : 'CẦN THU COD'
                : 'VIETQR'}
            </Text>
          </View>
        </View>

        {/* Part 1: Cargo Delivery Photo with Watermark */}
        <View style={styles.epodCardSection}>
          <View style={styles.epodSubHeaderRow}>
            <Text style={styles.epodSubTitle}>1. ẢNH CHỤP KIỆN HÀNG BÀN GIAO</Text>
            {cargoPhotoUri ? (
              <View style={styles.badgeSuccess}>
                <IconCheck color="#10B981" size={13} strokeWidth={2.5} />
                <Text style={styles.badgeSuccessText}>Đã chụp</Text>
              </View>
            ) : (
              <View style={styles.badgeRequired}>
                <Text style={styles.badgeRequiredText}>Bắt buộc</Text>
              </View>
            )}
          </View>

          {cargoPhotoUri ? (
            <View style={styles.cargoPhotoCard}>
              <View style={styles.cargoPhotoPlaceholder}>
                <IconOrders color="#0B1E42" size={32} />
                <Text style={styles.cargoPhotoFileName}>{cargoPhotoUri}</Text>
              </View>

              {/* Camera Watermark Overlay (GPS coordinates + timestamp) */}
              <View style={styles.watermarkOverlay} testID="camera-watermark-overlay">
                <View style={styles.watermarkRow}>
                  <IconLocationPin color="#F59E0B" size={12} strokeWidth={2} />
                  <Text style={styles.watermarkText}>
                    {photoWatermark?.coords || EPOD_GPS_UNAVAILABLE}
                  </Text>
                </View>
                <View style={styles.watermarkRow}>
                  <IconClock color="#FFFFFF" size={12} />
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
                <IconCamera color="#0B1E42" size={13} />
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
              <View style={styles.captureBtnIconCircle}>
                <IconCamera color="#FFFFFF" size={20} />
              </View>
              <View style={styles.captureBtnTextCol}>
                <Text style={styles.captureBtnTitle}>
                  {isLocating ? 'Đang lấy vị trí GPS…' : 'Chụp ảnh kiện hàng giao thực tế'}
                </Text>
                <Text style={styles.captureBtnDesc}>
                  Tự động gắn watermark tọa độ GPS và thời gian thực
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Part 2: Warehouse Receiver Digital Signature Pad */}
        <View style={styles.epodCardSection}>
          <View style={styles.epodSubHeaderRow}>
            <Text style={styles.epodSubTitle}>2. CHỮ KÝ SỐ THỦ KHO / NGƯỜI NHẬN</Text>
            {signatureCaptured ? (
              <View style={styles.badgeSuccess}>
                <IconCheck color="#10B981" size={13} strokeWidth={2.5} />
                <Text style={styles.badgeSuccessText}>Đã ký</Text>
              </View>
            ) : (
              <View style={styles.badgeRequired}>
                <Text style={styles.badgeRequiredText}>Bắt buộc</Text>
              </View>
            )}
          </View>

          <View style={styles.signatureReceiverBox}>
            <Text style={styles.signatureReceiverLabel}>Đại diện nhận hàng:</Text>
            <TextInput
              accessibilityLabel="Tên người nhận hàng"
              onChangeText={setReceiverName}
              placeholder="Nhập họ tên người nhận / thủ kho"
              placeholderTextColor="#94A3B8"
              style={styles.signatureReceiverInput}
              testID="epod-recipient-name-input"
              value={receiverName}
            />
          </View>

          {/* Interactive Signature Pad Canvas */}
          <Pressable
            accessibilityHint="Chạm hoặc vẽ bằng tay vào khu vực này để ký chữ ký điện tử"
            accessibilityLabel="Bảng ký tên điện tử"
            accessibilityRole="button"
            onPress={handleSignTouch}
            style={({ pressed }) => [
              styles.signaturePadArea,
              signatureCaptured ? styles.signaturePadActive : null,
              pressed ? styles.pressed : null,
            ]}
            testID="epod-signature-pad"
          >
            {signatureCaptured ? (
              <View style={styles.signatureContentPreview}>
                {/* Visual signature stroke representation */}
                <View style={styles.signatureStrokeWrap}>
                  <Text style={styles.signatureHandwritten}>Nguyễn Văn A</Text>
                  <View style={styles.signatureBaseline} />
                </View>
                <View style={styles.signatureMetadataRow}>
                  <IconCheck color="#10B981" size={13} strokeWidth={2.5} />
                  <Text style={styles.signatureMetaText}>
                    Chữ ký điện tử đã được xác thực · {signPoints} nét chạm
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.signaturePromptCol}>
                <IconOrders color="#64748B" size={24} />
                <Text style={styles.signaturePromptTitle}>KÝ TÊN XÁC NHẬN VÀO ĐÂY</Text>
                <Text style={styles.signaturePromptDesc}>
                  Thủ kho / Người nhận dùng ngón tay ký trực tiếp vào khung
                </Text>
              </View>
            )}
          </Pressable>

          {signatureCaptured ? (
            <View style={styles.signatureActionsRow}>
              <Pressable
                accessibilityLabel="Ký lại chữ ký"
                accessibilityRole="button"
                onPress={handleClearSignature}
                style={({ pressed }) => [styles.clearSignBtn, pressed ? styles.pressed : null]}
              >
                <IconTrash color="#DC2626" size={13} />
                <Text style={styles.clearSignBtnText}>Ký lại</Text>
              </Pressable>
              <Text style={styles.signatureSecurityNotice}>
                Bảo chứng e-POD an toàn theo chuẩn LEOPARD B2B
              </Text>
            </View>
          ) : null}
        </View>

        {/* Step 4 Completion / Confirmation Trigger if inside e-POD section */}
        {(status === 'IN_TRANSIT' || status === 'DELIVERED') && (
          <View style={styles.epodCompleteSection}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  epodDoubleBezelOuter: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
  },
  epodDoubleBezelInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  epodHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  epodIconBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  epodHeaderTextCol: {
    flex: 1,
    gap: 2,
  },
  epodSectionTitle: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  epodSectionSubtitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  epodStatusPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  epodStatusPillReady: {
    backgroundColor: '#DCFCE7',
  },
  epodStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  epodStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  epodStatusPillTextReady: {
    color: '#15803D',
  },
  epodStatusPillTextPending: {
    color: '#B45309',
  },
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
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  proofNoticeMessage: {
    color: '#475569',
    fontSize: 11,
  },
  proofHelper: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 2,
  },
  epodValidationAlert: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  epodValidationAlertText: {
    color: '#991B1B',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  epodCardSection: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  epodSubHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  epodSubTitle: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeSuccess: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeSuccessText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
  },
  badgeRequired: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeRequiredText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '800',
  },
  cargoPhotoCard: {
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
  },
  cargoPhotoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    gap: 6,
    height: 140,
    justifyContent: 'center',
  },
  cargoPhotoFileName: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  watermarkOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 8,
    gap: 4,
    padding: 8,
  },
  watermarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  watermarkText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  retakeBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  retakeBtnText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  captureBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  captureBtnIconCircle: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  captureBtnTextCol: {
    flex: 1,
    gap: 2,
  },
  captureBtnTitle: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '800',
  },
  captureBtnDesc: {
    color: '#64748B',
    fontSize: 10.5,
  },
  signatureReceiverBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signatureReceiverLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  signatureReceiverValue: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '800',
  },
  signatureReceiverInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0B1E42',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentReminderCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  paymentReminderIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  paymentReminderCol: {
    flex: 1,
    gap: 2,
  },
  paymentReminderTitle: {
    color: '#0B1E42',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  paymentReminderText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '700',
  },
  paymentBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  paymentBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  paymentBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  paymentBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  paymentBadgeTextPending: {
    color: '#B45309',
  },
  paymentBadgeTextSuccess: {
    color: '#15803D',
  },
  signaturePadArea: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 130,
    justifyContent: 'center',
    padding: 10,
  },
  signaturePadActive: {
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  signaturePromptCol: {
    alignItems: 'center',
    gap: 6,
  },
  signaturePromptTitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  signaturePromptDesc: {
    color: '#94A3B8',
    fontSize: 10,
  },
  signatureContentPreview: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  signatureStrokeWrap: {
    alignItems: 'center',
    gap: 2,
    width: '80%',
  },
  signatureHandwritten: {
    color: '#0F172A',
    fontFamily: 'serif',
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  signatureBaseline: {
    backgroundColor: '#CBD5E1',
    height: 1,
    width: '100%',
  },
  signatureMetadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  signatureMetaText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  signatureActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearSignBtn: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearSignBtnText: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '700',
  },
  signatureSecurityNotice: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
  epodCompleteSection: {
    marginTop: 6,
  },
  pressed: {
    opacity: 0.75,
  },
});
