import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  HStack,
  IconCameraProof,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconIdCard,
  IconInsuranceDoc,
  IconLicense,
  IconSecurityShield,
  IconSpeedTruck,
  ScreenScaffold,
  ScreenState,
  VStack,
  colors,
  customerPalette,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import {
  DOCUMENT_TITLE,
  REQUIRED_DOCUMENT_TYPES,
  type DriverDocumentItem,
  type DriverDocumentType,
} from './adapter';

export type DriverKycScreenProps = Readonly<{
  documents: readonly DriverDocumentItem[];
  isLoading: boolean;
  isError?: boolean;
  onBack?: () => void;
  onRetry?: () => void;
  onRequestUpdate?: () => void;
}>;

function getDocIcon(title: string) {
  if (title.includes('CCCD') || title.includes('Căn cước')) {
    return <IconIdCard color={colors.brand.primary} size={20} />;
  }
  if (title.includes('GPLX') || title.includes('Giấy phép lái xe')) {
    return <IconLicense color={colors.brand.primary} size={20} />;
  }
  if (title.includes('đăng ký xe') || title.includes('Cà vẹt')) {
    return <IconSpeedTruck color={colors.brand.primary} size={20} />;
  }
  if (title.includes('Bảo hiểm')) {
    return <IconInsuranceDoc color={colors.brand.primary} size={20} />;
  }
  return <IconSecurityShield color={colors.brand.primary} size={20} />;
}

function formatDocDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function DriverKycScreen({
  documents,
  isError = false,
  isLoading = false,
  onBack,
  onRetry,
  onRequestUpdate,
}: DriverKycScreenProps) {
  const [selectedDoc, setSelectedDoc] = useState<DriverDocumentItem | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const uploadedTypes = new Set(documents.map((doc) => doc.type));
  const missingRequiredTypes = REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type));
  const isKycComplete = missingRequiredTypes.length === 0;

  const handleUpdatePress = () => {
    if (onRequestUpdate) {
      onRequestUpdate();
    } else {
      setShowUpdateModal(true);
    }
  };

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      title="Hồ sơ & Giấy tờ KYC"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            {/* ── 1. Hero KYC Status Card (Midnight Navy Brand Hero) ── */}
            <Card style={styles.heroCard}>
              <HStack style={styles.heroHeaderRow}>
                <Box style={styles.heroIconBadge}>
                  <IconSecurityShield color="#34D399" size={24} />
                </Box>
                <VStack style={styles.heroTitleCol}>
                  <Text style={styles.heroTitle}>Hồ sơ đối tác đã nộp</Text>
                  <Text style={styles.heroSub}>
                    {isKycComplete
                      ? 'Đã xác minh đầy đủ giấy tờ hợp lệ'
                      : 'Đang kiểm duyệt và bổ sung hồ sơ'}
                  </Text>
                </VStack>
                <Badge
                  action={isKycComplete ? 'success' : 'warning'}
                  size="sm"
                  style={[
                    styles.heroStatusPill,
                    isKycComplete ? styles.heroStatusPillOk : styles.heroStatusPillWarning,
                  ]}
                >
                  <Badge.Text
                    style={[
                      styles.heroStatusPillText,
                      isKycComplete ? styles.heroStatusPillTextOk : styles.heroStatusPillTextWarning,
                    ]}
                  >
                    {isKycComplete ? 'Đã duyệt' : 'Chưa đủ'}
                  </Badge.Text>
                </Badge>
              </HStack>

              <Divider style={styles.heroDivider} />

              <HStack style={styles.heroStatsRow}>
                <VStack style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{documents.length} / 4</Text>
                  <Text style={styles.heroStatLabel}>Giấy tờ đã nộp</Text>
                </VStack>
                <Divider orientation="vertical" style={styles.heroStatDivider} />
                <VStack style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{isKycComplete ? 'Hợp lệ' : 'Cần bổ sung'}</Text>
                  <Text style={styles.heroStatLabel}>Trạng thái pháp lý</Text>
                </VStack>
                <Divider orientation="vertical" style={styles.heroStatDivider} />
                <VStack style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>Tự động</Text>
                  <Text style={styles.heroStatLabel}>Gia hạn hồ sơ</Text>
                </VStack>
              </HStack>
            </Card>

            {/* ── 2. Checklist Giấy tờ bắt buộc (Apple Inset Grouped) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Trạng thái giấy tờ bắt buộc</Text>

              <Card
                style={styles.checklistCard}
                testID="kyc-document-checklist"
              >
                {REQUIRED_DOCUMENT_TYPES.map((type, index) => {
                  const hasType = uploadedTypes.has(type);
                  return (
                    <React.Fragment key={type}>
                      {index > 0 ? <Divider style={styles.rowDivider} /> : null}
                      <HStack style={styles.checklistRow}>
                        <HStack style={styles.checklistLeft}>
                          {hasType ? (
                            <Box style={styles.checkIconBadge}>
                              <IconCheck color="#16A34A" size={13} strokeWidth={2.5} />
                            </Box>
                          ) : (
                            <Box style={styles.missingIconBadge}>
                              <IconClose color="#DC2626" size={13} strokeWidth={2.5} />
                            </Box>
                          )}
                          <Text style={[styles.checklistLabel, !hasType && styles.checklistLabelMissing]}>
                            {DOCUMENT_TITLE[type]}
                          </Text>
                        </HStack>
                        <Text style={hasType ? styles.badgeTextOk : styles.badgeTextMissing}>
                          {hasType ? 'Đã có' : 'Thiếu'}
                        </Text>
                      </HStack>
                    </React.Fragment>
                  );
                })}
              </Card>
            </VStack>

            {/* ── 3. Danh sách Giấy tờ đã nộp (Apple Inset Grouped với xem ảnh) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Giấy tờ đã tải lên</Text>

              {documents.length === 0 ? (
                <Card style={styles.emptyDocBox}>
                  <IconSecurityShield color={colors.neutral.mutedText} size={28} />
                  <Text style={styles.emptyDocText}>Chưa có giấy tờ nào được nộp.</Text>
                </Card>
              ) : (
                <Card style={styles.docListGroupCard}>
                  {documents.map((doc, index) => (
                    <React.Fragment key={doc.id}>
                      {index > 0 ? <Divider style={styles.rowDividerWithMargin} /> : null}
                      <Pressable
                        accessibilityHint="Nhấn để xem chi tiết ảnh tài liệu"
                        accessibilityLabel={`Xem giấy tờ ${doc.title}`}
                        accessibilityRole="button"
                        onPress={() => setSelectedDoc(doc)}
                        style={({ pressed }) => [styles.docItemRow, pressed ? styles.itemPressed : null]}
                      >
                        <Box style={styles.docIconBox}>{getDocIcon(doc.title)}</Box>

                        <VStack style={styles.docContentCol}>
                          <Text style={styles.docTitle}>{doc.title}</Text>
                          <Text style={styles.docSub}>
                            {doc.createdAt ? `Ngày nộp: ${formatDocDate(doc.createdAt)} · ` : ''}Đã kiểm duyệt
                          </Text>
                        </VStack>

                        <HStack style={styles.docTrailingRow}>
                          <Badge action="success" size="sm" style={styles.verifiedMiniBadge}>
                            <IconCheck color="#16A34A" size={11} strokeWidth={2.5} />
                            <Badge.Text style={styles.verifiedMiniText}>Đã duyệt</Badge.Text>
                          </Badge>
                          <IconChevronRight color={driverPrimitives.colors.gray400} size={15} />
                        </HStack>
                      </Pressable>
                    </React.Fragment>
                  ))}
                </Card>
              )}
            </VStack>

            {/* ── 4. Cập nhật & Bổ sung giấy tờ (Help Card) ── */}
            <VStack style={styles.sectionBlock}>
              <Card style={styles.updateCard}>
                <HStack style={styles.updateHeaderRow}>
                  <Box style={styles.updateIconWrap}>
                    <IconCameraProof color={colors.brand.primary} size={20} />
                  </Box>
                  <VStack style={styles.updateTextCol}>
                    <Text style={styles.updateTitle}>Cập nhật giấy tờ mới?</Text>
                    <Text style={styles.updateDesc}>
                      Khi giấy tờ sắp hết hạn hoặc bạn đổi phương tiện mới, hãy gửi bản chụp tài liệu mới để kiểm duyệt.
                    </Text>
                  </VStack>
                </HStack>

                <Button
                  label="Gửi giấy tờ bổ sung / cập nhật"
                  onPress={handleUpdatePress}
                  variant="secondary"
                />
              </Card>
            </VStack>
          </>
        )}
      </ScrollView>

      {/* ── Modal Xem ảnh chứng từ KYC ── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedDoc(null)}
        transparent
        visible={Boolean(selectedDoc)}
      >
        <Pressable onPress={() => setSelectedDoc(null)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <IconSecurityShield color={colors.brand.primary} size={18} />
                <Text numberOfLines={1} style={styles.modalTitle}>
                  {selectedDoc?.title || 'Chứng từ KYC'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setSelectedDoc(null)}
              >
                <IconClose color={colors.neutral.subtleText} size={20} />
              </Pressable>
            </View>

            {selectedDoc ? (
              <View style={styles.modalBody}>
                {/* Image display or Preview box */}
                <View style={styles.imagePreviewBox}>
                  {selectedDoc.url && !selectedDoc.url.startsWith('/files') ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: selectedDoc.url }}
                      style={styles.docImage}
                    />
                  ) : (
                    <View style={styles.placeholderDocView}>
                      <IconCameraProof color={colors.brand.primary} size={40} />
                      <Text style={styles.watermarkText}>LEOPARD KYC · ĐÃ XÁC THỰC</Text>
                      <Text style={styles.docIdText}>Mã hồ sơ: {selectedDoc.id}</Text>
                    </View>
                  )}
                </View>

                {/* Metadata Details */}
                <View style={styles.modalMetaCard}>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Loại giấy tờ:</Text>
                    <Text style={styles.modalMetaValue}>{selectedDoc.title}</Text>
                  </View>
                  <View style={styles.modalMetaDivider} />
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Ngày tải lên:</Text>
                    <Text style={styles.modalMetaValue}>
                      {formatDocDate(selectedDoc.createdAt) || '01/08/2026'}
                    </Text>
                  </View>
                  <View style={styles.modalMetaDivider} />
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Trạng thái kiểm duyệt:</Text>
                    <Text style={styles.modalMetaValueGreen}>✓ Đã phê duyệt chính thức</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Hướng dẫn cập nhật giấy tờ ── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
        transparent
        visible={showUpdateModal}
      >
        <Pressable onPress={() => setShowUpdateModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật giấy tờ đối tác</Text>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setShowUpdateModal(false)}
              >
                <IconClose color={colors.neutral.subtleText} size={20} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.updateModalDesc}>
                Để thay đổi giấy tờ đăng ký (GPLX, Cà vẹt xe mới, CCCD), vui lòng liên hệ đội ngũ Hỗ trợ Đối tác LEOPARD qua hotline để được mở lại quyền tải tài liệu:
              </Text>

              <View style={styles.hotlineBox}>
                <Text style={styles.hotlineLabel}>Hotline Hỗ trợ Đối tác 24/7</Text>
                <Text style={styles.hotlineNumber}>1900 6868</Text>
              </View>

              <Button
                label="Đã hiểu"
                onPress={() => setShowUpdateModal(false)}
                variant="primary"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    paddingBottom: 48,
  },
  itemPressed: {
    backgroundColor: driverPrimitives.colors.gray50,
  },

  /* 1. Hero KYC Status Card */
  heroCard: {
    backgroundColor: colors.brand.primary,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  heroIconBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heroTitleCol: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    ...typeScale.headline,
    fontWeight: '700',
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    ...typeScale.caption2,
  },
  heroStatusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroStatusPillOk: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  heroStatusPillWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  heroStatusPillText: {
    ...typeScale.caption2,
    fontWeight: '700',
  },
  heroStatusPillTextOk: {
    color: '#34D399',
  },
  heroStatusPillTextWarning: {
    color: '#FBBF24',
  },
  heroDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    height: 1,
  },
  heroStatsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 2,
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  heroStatValue: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    ...typeScale.caption2,
    textAlign: 'center',
  },
  heroStatDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    height: '65%',
    width: 1,
  },

  /* Section block */
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    paddingHorizontal: spacing.xxs,
  },

  /* 2. Checklist Card */
  checklistCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  checklistRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  checklistLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  checkIconBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  missingIconBadge: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checklistLabel: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  checklistLabelMissing: {
    color: colors.neutral.mutedText,
    fontWeight: '400',
  },
  badgeTextOk: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  badgeTextMissing: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  rowDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: spacing.md,
  },
  rowDividerWithMargin: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 62,
  },

  /* 3. Document List Group */
  docListGroupCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  docItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  docIconBox: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: 'rgba(11, 37, 69, 0.08)',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  docContentCol: {
    flex: 1,
    gap: 3,
  },
  docTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  docSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  docTrailingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  verifiedMiniBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedMiniText: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  emptyDocBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyDocText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
  },

  /* 4. Update Card */
  updateCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },
  updateHeaderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  updateIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    height: 38,
    justifyContent: 'center',
    marginTop: 2,
    width: 38,
  },
  updateTextCol: {
    flex: 1,
    gap: 3,
  },
  updateTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  updateDesc: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    lineHeight: 18,
  },

  /* Modals */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    gap: spacing.md,
    maxWidth: 380,
    padding: spacing.md + 4,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginRight: spacing.xs,
  },
  modalTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.headline,
    fontWeight: '600',
  },
  modalBody: {
    gap: spacing.sm + 2,
  },
  imagePreviewBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 180,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  docImage: {
    height: '100%',
    width: '100%',
  },
  placeholderDocView: {
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  watermarkText: {
    color: colors.brand.primary,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docIdText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  modalMetaCard: {
    backgroundColor: colors.neutral.canvas,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    gap: spacing.xs,
    padding: spacing.sm + 2,
  },
  modalMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalMetaLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  modalMetaValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  modalMetaValueGreen: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  modalMetaDivider: {
    backgroundColor: colors.neutral.border,
    height: 1,
  },
  updateModalDesc: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    lineHeight: 20,
  },
  hotlineBox: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: 'rgba(11, 37, 69, 0.15)',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 4,
    paddingVertical: spacing.md,
  },
  hotlineLabel: {
    color: colors.brand.primary,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  hotlineNumber: {
    color: colors.brand.primary,
    ...typeScale.title2,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
});
