import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  colors,
  IconCheck,
  IconExternalLink,
  IconFileText,
  IconOrders,
  IconSecurityShield,
  IconTrash,
  leopardPalette,
  radius,
  ScreenScaffold,
  spacing,
} from '@leopard/mobile-core';
import { openDriverContractPdf } from './contract-pdf';

export type DriverContractScreenProps = Readonly<{
  onComplete?: () => void;
  onDownloadPdf?: () => void;
  defaultSigned?: boolean;
}>;

export function DriverContractScreen({
  defaultSigned = false,
  onComplete,
  onDownloadPdf,
}: DriverContractScreenProps) {
  const router = useRouter();
  const [hasSigned, setHasSigned] = useState(defaultSigned);
  const [signPoints, setSignPoints] = useState(defaultSigned ? 18 : 0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleSignTouch = () => {
    setSignPoints((prev) => prev + 1);
    setHasSigned(true);
  };

  const handleClearSignature = () => {
    setSignPoints(0);
    setHasSigned(false);
  };

  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    setIsDownloading(true);
    try {
      await openDriverContractPdf('/driver/contract/pdf?version=v1', null);
      setDownloadSuccess(true);
    } catch {
      // Gracefully notify or fallback for simulator/testing
      Alert.alert(
        'Tải hợp đồng',
        'Không thể mở tệp PDF trực tiếp. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleComplete = () => {
    if (!hasSigned) return;
    if (onComplete) {
      onComplete();
    } else {
      router.replace('/orders');
    }
  };

  return (
    <ScreenScaffold
      eyebrow="LEOPARD · B2B PARTNERSHIP"
      headerTone="ink"
      onBack={() => router.back()}
      stickyFooter={
        <View style={styles.footerContainer}>
          <Button
            disabled={!hasSigned}
            disabledLabel="Vui lòng ký hợp đồng để kích hoạt tài xế"
            label="Ký hợp đồng & Kích hoạt tài xế"
            onPress={handleComplete}
            size="driver-primary"
            variant="primary"
          />
        </View>
      }
      title="Hợp đồng đối tác số hóa"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="contract-screen-scroll"
      >
        {/* 1. Contract Overview Card - Double Bezel */}
        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            <View style={styles.overviewHeader}>
              <View style={styles.overviewIconBadge}>
                <IconFileText color="#1D4ED8" size={20} />
              </View>
              <View style={styles.overviewTextCol}>
                <Text style={styles.contractCodeLabel}>MÃ HỢP ĐỒNG ĐIỆN TỬ</Text>
                <Text style={styles.contractCodeValue}>LP-CTR-2026-B2B</Text>
              </View>
              <View style={styles.statusPillActive}>
                <IconCheck color="#16A34A" size={12} strokeWidth={2.5} />
                <Text style={styles.statusPillText}>SẴN SÀNG KÝ</Text>
              </View>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Bên A (Nền tảng):</Text>
                <Text style={styles.metaValue}>CÔNG TY CP LOGISTICS LEOPARD</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Bên B (Tài xế):</Text>
                <Text style={styles.metaValue}>NGUYỄN VĂN TUẤN · DRV-88924</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Legal Terms Viewer */}
        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <IconSecurityShield color="#0B1E42" size={18} />
              </View>
              <View style={styles.sectionTitleCol}>
                <Text style={styles.sectionTitle}>ĐIỀU KHOẢN HỢP ĐỒNG ĐỐI TÁC</Text>
                <Text style={styles.sectionSubtitle}>
                  Vui lòng đọc kỹ các quy chế và cam kết trách nhiệm trước khi ký
                </Text>
              </View>
            </View>

            {/* Term 1: Quy chế đối tác tài xế LEOPARD */}
            <View style={styles.termBox}>
              <Text style={styles.termNumber}>ĐIỀU 1</Text>
              <Text style={styles.termTitle}>Quy chế đối tác tài xế LEOPARD</Text>
              <Text style={styles.termContent}>
                Đối tác tài xế cam kết tuân thủ đầy đủ quy trình tiếp nhận, vận chuyển và bàn giao hàng hóa
                theo tiêu chuẩn chất lượng LEOPARD B2B. Đảm bảo phương tiện vận tải đủ điều kiện lưu hành,
                giấy tờ pháp lý hợp lệ và duy trì tỷ lệ chấp nhận đơn tối thiểu 90%.
              </Text>
            </View>

            {/* Term 2: Trách nhiệm bảo quản hàng hóa B2B */}
            <View style={styles.termBox}>
              <Text style={styles.termNumber}>ĐIỀU 2</Text>
              <Text style={styles.termTitle}>Trách nhiệm bảo quản hàng hóa B2B</Text>
              <Text style={styles.termContent}>
                Đối tác có trách nhiệm kiểm tra số lượng, tình trạng bao bì, niêm phong kiện hàng tại điểm
                lấy hàng (A) và bảo quản nguyên vẹn hàng hóa trong suốt lộ trình di chuyển. Bắt buộc thực
                hiện chụp ảnh xác thực e-POD có watermark GPS và thu thập chữ ký số của thủ kho tại điểm
                giao hàng (B). Mọi mất mát, hư hỏng do lỗi chủ quan sẽ được đối soát và xử lý theo quy định bảo hiểm.
              </Text>
            </View>

            {/* Term 3: Tỷ lệ phân chia doanh thu 90/10 */}
            <View style={styles.termBoxHighlight}>
              <View style={styles.revenueHeaderRow}>
                <Text style={styles.termNumberHighlight}>ĐIỀU 3</Text>
                <View style={styles.ratePill}>
                  <Text style={styles.ratePillText}>90% / 10%</Text>
                </View>
              </View>
              <Text style={styles.termTitleHighlight}>Tỷ lệ phân chia doanh thu 90/10</Text>
              <Text style={styles.termContent}>
                Đối tác tài xế hưởng <Text style={styles.boldText}>90% tổng cước phí</Text> thực nhận của mỗi chuyến
                hàng hoàn tất thành công. Nền tảng LEOPARD giữ <Text style={styles.boldText}>10%</Text> chi phí vận hành
                công nghệ, kết nối đơn hàng và bảo hiểm chuyến đi. Tiền cước sau khấu trừ được chuyển vào ví tài xế
                ngay tức thì và có thể rút về tài khoản ngân hàng 24/7.
              </Text>
            </View>

            {/* Download PDF button */}
            <Pressable
              accessibilityHint="Mở bản hợp đồng đầy đủ định dạng tệp PDF"
              accessibilityLabel="Tải tệp hợp đồng PDF"
              accessibilityRole="button"
              disabled={isDownloading}
              onPress={handleDownloadPdf}
              style={({ pressed }) => [styles.downloadPdfBtn, pressed ? styles.pressed : null]}
              testID="btn-download-contract-pdf"
            >
              <IconFileText color="#1D4ED8" size={16} />
              <Text style={styles.downloadPdfText}>
                {isDownloading ? 'Đang tải tệp hợp đồng...' : 'Tải tệp hợp đồng PDF'}
              </Text>
              <IconExternalLink color="#1D4ED8" size={14} />
            </Pressable>
            {downloadSuccess ? (
              <View style={styles.downloadSuccessNotice}>
                <IconCheck color="#16A34A" size={12} strokeWidth={2.5} />
                <Text style={styles.downloadSuccessText}>Đã xuất tệp PDF hợp đồng thành công</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 3. Signature Area - Double Bezel */}
        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            <View style={styles.signatureHeaderRow}>
              <View style={styles.signatureHeaderLeft}>
                <View style={styles.signatureIconBadge}>
                  <IconOrders color="#0B1E42" size={18} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>CHỮ KÝ ĐIỆN TỬ ĐỐI TÁC</Text>
                  <Text style={styles.sectionSubtitle}>Dùng ngón tay ký trực tiếp vào khung dưới đây</Text>
                </View>
              </View>
              {hasSigned ? (
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

            <View style={styles.signerIdentityBox}>
              <Text style={styles.signerIdentityLabel}>Người ký cam kết:</Text>
              <Text style={styles.signerIdentityName}>Nguyễn Văn Tuấn (Số CCCD: 079090******)</Text>
            </View>

            {/* Signature Canvas Pad */}
            <Pressable
              accessibilityHint="Chạm hoặc vẽ bằng tay vào khu vực này để ký chữ ký điện tử hợp đồng"
              accessibilityLabel="Bảng ký hợp đồng điện tử"
              accessibilityRole="button"
              onPress={handleSignTouch}
              style={({ pressed }) => [
                styles.signaturePadArea,
                hasSigned ? styles.signaturePadActive : null,
                pressed ? styles.pressed : null,
              ]}
              testID="contract-signature-pad"
            >
              {hasSigned ? (
                <View style={styles.signatureContentPreview}>
                  <View style={styles.signatureStrokeWrap}>
                    <Text style={styles.signatureHandwritten}>Nguyễn Văn Tuấn</Text>
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
                  <IconFileText color="#94A3B8" size={24} />
                  <Text style={styles.signaturePromptTitle}>KÝ TÊN VÀO KHUNG NÀY</Text>
                  <Text style={styles.signaturePromptDesc}>
                    Chạm hoặc vẽ ngón tay vào đây để hoàn tất ký kết điện tử
                  </Text>
                </View>
              )}
            </Pressable>

            {hasSigned ? (
              <View style={styles.signatureActionsRow}>
                <Pressable
                  accessibilityHint="Xóa chữ ký hiện tại để ký lại"
                  accessibilityLabel="Ký lại chữ ký"
                  accessibilityRole="button"
                  onPress={handleClearSignature}
                  style={({ pressed }) => [styles.clearSignBtn, pressed ? styles.pressed : null]}
                  testID="contract-signature-clear"
                >
                  <IconTrash color="#DC2626" size={13} />
                  <Text style={styles.clearSignBtnText}>Ký lại</Text>
                </Pressable>
                <Text style={styles.signatureSecurityNotice}>
                  Chứng thư điện tử LEOPARD B2B · Giá trị pháp lý tương đương chữ ký tay
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  footerContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },

  /* Double-Bezel Card Architecture (24px outer hairline, 18px inner container) */
  cardOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: radius.bezelOuter,
    borderWidth: 1.5,
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    backgroundColor: '#FAFCFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },

  /* Overview Card */
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  overviewIconBadge: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  overviewTextCol: {
    flex: 1,
    gap: 2,
  },
  contractCodeLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  contractCodeValue: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  statusPillActive: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  overviewDivider: {
    backgroundColor: '#E2E8F0',
    height: 1,
  },
  metaRow: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  metaValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Terms Viewer */
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sectionIconBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionTitleCol: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 10.5,
    lineHeight: 14,
  },
  termBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  termBoxHighlight: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
    padding: 12,
  },
  revenueHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratePill: {
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  termNumber: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  termNumberHighlight: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  termTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  termTitleHighlight: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },
  termContent: {
    color: '#334155',
    fontSize: 11.5,
    lineHeight: 17,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  downloadPdfBtn: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  downloadPdfText: {
    color: '#1D4ED8',
    fontSize: 12.5,
    fontWeight: '800',
  },
  downloadSuccessNotice: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  downloadSuccessText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Signature Section */
  signatureHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  signatureIconBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  badgeSuccess: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeSuccessText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeRequired: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeRequiredText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  signerIdentityBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  signerIdentityLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  signerIdentityName: {
    color: '#0B1E42',
    fontSize: 10.5,
    fontWeight: '800',
  },
  signaturePadArea: {
    alignItems: 'center',
    backgroundColor: '#FAFCFF',
    borderColor: '#94A3B8',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 130,
    justifyContent: 'center',
    width: '100%',
  },
  signaturePadActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  signaturePromptCol: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  signaturePromptTitle: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  signaturePromptDesc: {
    color: '#64748B',
    fontSize: 10.5,
    textAlign: 'center',
  },
  signatureContentPreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
    width: '100%',
  },
  signatureStrokeWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  signatureHandwritten: {
    color: '#0B1E42',
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  signatureBaseline: {
    backgroundColor: '#CBD5E1',
    height: 1,
    marginTop: 4,
    width: 160,
  },
  signatureMetadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  signatureMetaText: {
    color: '#059669',
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
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearSignBtnText: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '700',
  },
  signatureSecurityNotice: {
    color: '#94A3B8',
    fontSize: 9.5,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});
