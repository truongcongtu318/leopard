import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Linking,
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
  IconAlertTriangle,
  IconChevron,
  IconClose,
  IconFileText,
  IconPhone,
  IconSecurityShield,
  ScreenScaffold,
  VStack,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  layout,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

type FaqItem = {
  id: string;
  q: string;
  a: string;
};

const faqs: FaqItem[] = [
  {
    id: 'faq-1',
    q: 'Làm thế nào để hủy đơn hàng?',
    a: 'Bạn có thể bấm nút "Hủy đơn" trên chi tiết đơn hàng khi đơn còn ở trạng thái Đang tìm tài xế hoặc Đã nhận đơn (chưa đi lấy). Nếu tài xế đã lấy hàng, vui lòng liên hệ trực tiếp tổng đài.',
  },
  {
    id: 'faq-2',
    q: 'Cách xử lý khi hàng hóa bị hư hỏng hoặc thất lạc?',
    a: 'Vui lòng sử dụng tính năng "Báo cáo sự cố" trong chi tiết đơn hàng, đính kèm hình ảnh kiện hàng. Bộ phận CSKH sẽ tiếp nhận và xử lý đền bù theo quy định trong 24h làm việc.',
  },
  {
    id: 'faq-3',
    q: 'Thời gian hoàn tiền là bao lâu?',
    a: 'Giao dịch hoàn tiền qua VietQR / Chuyển khoản ngân hàng thường hoàn tất trong vòng 5–15 phút sau khi yêu cầu hủy đơn được phê duyệt.',
  },
  {
    id: 'faq-4',
    q: 'Dữ liệu ETA và vị trí tài xế có chính xác không?',
    a: 'Vị trí tài xế được cập nhật trực tiếp theo tọa độ GPS. Thời gian ETA dự kiến được tính toán dựa trên thuật toán định tuyến và tình trạng giao thông thực tế.',
  },
];

export function SupportSosScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Legal Modal state
  const [legalModalTitle, setLegalModalTitle] = useState<string | null>(null);
  const [legalModalContent, setLegalModalContent] = useState<string | null>(null);

  const handleCallHotline = () => {
    haptic.selection();
    Linking.openURL('tel:19006868');
  };

  const openTerms = () => {
    haptic.selection();
    setLegalModalTitle('Điều khoản dịch vụ vận chuyển LEOPARD');
    setLegalModalContent(
      '1. QUY ĐỊNH CHUNG\nLEOPARD cung cấp nền tảng công nghệ kết nối vận tải giữa Người gửi hàng (Khách hàng B2B/Cá nhân) và Đối tác tài xế có đầy đủ giấy phép kinh doanh vận tải.\n\n2. TRÁCH NHIỆM BẢO HIỂM HÀNG HÓA\nMọi chuyến hàng trên nền tảng LEOPARD đều được bảo hiểm trách nhiệm hàng hóa tự động lên đến 50.000.000 ₫ cho các rủi ro va chạm, hư hỏng trong quá trình vận chuyển.\n\n3. ĐỐI SOÁT CÔNG NỢ B2B\nDoanh nghiệp sử dụng hạn mức tín dụng B2B thực hiện đối soát tự động vào ngày 25 hàng tháng và thanh toán chậm nhất vào ngày 30 (kỳ T+30).'
    );
  };

  const openPrivacy = () => {
    haptic.selection();
    setLegalModalTitle('Chính sách bảo mật & Quyền riêng tư');
    setLegalModalContent(
      '1. THU THẬP VÀ SỬ DỤNG DỮ LIỆU\nLEOPARD cam kết thu thập tối thiểu thông tin cần thiết phục vụ vận chuyển: Tọa độ điểm giao nhận, số điện thoại liên lạc người gửi/nhận, mã số thuế doanh nghiệp để xuất hóa đơn VAT.\n\n2. BẢO MẬT DỮ LIỆU ĐỊA ĐIỂM\nDữ liệu vị trí thời gian thực (GPS tracking) chỉ được kích hoạt trong thời gian chuyến xe đang vận hành và tự động ngừng chia sẻ khi cuốc xe hoàn tất.\n\n3. QUYỀN XÓA TÀI KHOẢN (APPLE GUIDELINE 5.1.1)\nNgười dùng có quyền yêu cầu xóa vĩnh viễn tài khoản và toàn bộ dữ liệu cá nhân tại mục Cài đặt > Bảo mật tài khoản bất kỳ lúc nào.'
    );
  };

  return (
    <ScreenScaffold
      hasFloatingNavBar
      headerTone="plain"
      onBack={() => router.back()}
      title="Trợ giúp & SOS"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HOTLINE 24/7 HERO CARD ── */}
        <Card style={styles.hotlineCard}>
          <HStack style={styles.hotlineHeader}>
            <Badge action="success" size="sm" style={styles.hotlineBadge}>
              <Box style={styles.livePulseDot} />
              <Badge.Text style={styles.hotlineBadgeText}>Trực tuyến 24/7</Badge.Text>
            </Badge>
            <Box style={styles.hotlineIconBadge}>
              <IconPhone color="#FFFFFF" size={16} />
            </Box>
          </HStack>

          <VStack style={styles.hotlineBody}>
            <Text style={styles.hotlineTitle}>Tổng đài điều hành</Text>
            <Text style={styles.hotlineNumber}>1900 6868</Text>
            <Text style={styles.hotlineDesc}>Hỗ trợ xử lý đơn hàng, điều phối xe và cước phí</Text>
          </VStack>

          <Pressable
            accessibilityLabel="Gọi hotline tổng đài 1900 6868"
            accessibilityRole="button"
            onPress={handleCallHotline}
            style={({ pressed }) => [styles.callActionBtn, pressed ? styles.actionPressed : null]}
          >
            <IconPhone color="#FFFFFF" size={16} />
            <Text style={styles.callActionBtnText}>Gọi ngay</Text>
          </Pressable>
        </Card>

        {/* ── 2. SOS EMERGENCY ACTION (COMPACT) ── */}
        <Card style={styles.sosCard}>
          <HStack style={styles.sosRow}>
            <Box style={styles.sosIconBadge}>
              <IconAlertTriangle color={colors.danger.text} size="md" />
            </Box>
            <VStack style={styles.sosContentCol}>
              <Text style={styles.sosTitle}>Báo cáo khẩn cấp (SOS)</Text>
              <Text style={styles.sosDesc}>
                Hỗ trợ xử lý tai nạn, va chạm hoặc sự cố nghiêm trọng trên đường.
              </Text>
            </VStack>
          </HStack>

          <Pressable
            accessibilityLabel="Kích hoạt trợ giúp SOS khẩn cấp"
            accessibilityRole="button"
            onPress={handleCallHotline}
            style={({ pressed }) => [styles.sosActionBtn, pressed ? styles.actionPressed : null]}
          >
            <IconAlertTriangle color="#FFFFFF" size={16} />
            <Text style={styles.sosActionBtnText}>Kích hoạt trợ giúp SOS khẩn cấp</Text>
          </Pressable>
        </Card>

        {/* ── 3. FAQ ACCORDION (APPLE INSET GROUPED TABLE) ── */}
        <VStack style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>Câu hỏi thường gặp</Text>
          <Card style={styles.groupedCard}>
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === faq.id;
              const isLast = index === faqs.length - 1;
              return (
                <View key={faq.id}>
                  <Pressable
                    accessibilityLabel={faq.q}
                    accessibilityRole="button"
                    onPress={() => {
                      haptic.selection();
                      setExpandedFaq(isExpanded ? null : faq.id);
                    }}
                    style={({ pressed }) => [
                      styles.faqRow,
                      isExpanded ? styles.faqRowActive : null,
                      pressed ? styles.rowPressed : null,
                    ]}
                  >
                    <HStack style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, isExpanded ? styles.faqQuestionActive : null]}>
                        {faq.q}
                      </Text>
                      <IconChevron
                        color={isExpanded ? customerPalette.primary : '#94A3B8'}
                        direction={isExpanded ? 'up' : 'down'}
                        size="sm"
                      />
                    </HStack>
                    {isExpanded ? (
                      <Box style={styles.faqAnswerContainer}>
                        <Text style={styles.faqAnswer}>{faq.a}</Text>
                      </Box>
                    ) : null}
                  </Pressable>
                  {!isLast && <Divider style={styles.rowDivider} />}
                </View>
              );
            })}
          </Card>
        </VStack>

        {/* ── 4. LEGAL & PRIVACY POLICIES ── */}
        <VStack style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>Điều khoản dịch vụ & chính sách bảo mật</Text>
          <Card style={styles.groupedCard}>
            <Pressable
              accessibilityLabel="Xem Điều khoản dịch vụ vận chuyển"
              accessibilityRole="button"
              onPress={openTerms}
              style={({ pressed }) => [styles.legalRow, pressed ? styles.rowPressed : null]}
            >
              <HStack style={styles.legalRowLeft}>
                <Box style={[styles.legalIconBadge, { backgroundColor: customerPalette.primaryBg }]}>
                  <IconFileText color={customerPalette.primary} size={18} />
                </Box>
                <VStack style={styles.legalTextCol}>
                  <Text style={styles.legalTitle}>Điều khoản dịch vụ vận chuyển LEOPARD</Text>
                  <Text style={styles.legalSubtitle}>Quy định quyền lợi, trách nhiệm bảo hiểm & cước phí</Text>
                </VStack>
              </HStack>
              <IconChevron color="#CBD5E1" direction="right" size="sm" />
            </Pressable>

            <Divider style={styles.rowDividerIndent} />

            <Pressable
              accessibilityLabel="Xem Chính sách bảo mật dữ liệu"
              accessibilityRole="button"
              onPress={openPrivacy}
              style={({ pressed }) => [styles.legalRow, pressed ? styles.rowPressed : null]}
            >
              <HStack style={styles.legalRowLeft}>
                <Box style={[styles.legalIconBadge, { backgroundColor: customerPalette.primaryBg }]}>
                  <IconSecurityShield color={customerPalette.primary} size={18} />
                </Box>
                <VStack style={styles.legalTextCol}>
                  <Text style={styles.legalTitle}>Chính sách bảo mật & Quyền riêng tư</Text>
                  <Text style={styles.legalSubtitle}>Bảo mật vị trí GPS & Tiêu chuẩn Apple Guideline 5.1.1</Text>
                </VStack>
              </HStack>
              <IconChevron color="#CBD5E1" direction="right" size="sm" />
            </Pressable>
          </Card>
        </VStack>
      </ScrollView>

      {/* LEGAL MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setLegalModalTitle(null)}
        transparent
        visible={Boolean(legalModalTitle)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text numberOfLines={1} style={styles.modalHeading}>
                {legalModalTitle}
              </Text>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setLegalModalTitle(null)}
                style={styles.modalCloseBtn}
              >
                <IconClose color="#64748B" size="md" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              <Text style={styles.modalContentText}>{legalModalContent}</Text>
            </ScrollView>

            <Button
              label="Đã hiểu"
              onPress={() => setLegalModalTitle(null)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    paddingBottom: layout.bottomNavClearance + 44,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  actionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  /* ── 1. Hotline Hero Card ── */
  hotlineCard: {
    backgroundColor: customerPalette.primary,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  hotlineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hotlineBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  livePulseDot: {
    backgroundColor: '#34C759',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  hotlineBadgeText: {
    color: '#E2E8F0',
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hotlineIconBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  hotlineBody: {
    gap: 2,
  },
  hotlineTitle: {
    color: '#94A3B8',
    ...typeScale.caption1,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hotlineNumber: {
    color: '#FFFFFF',
    ...typeScale.title2,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hotlineDesc: {
    color: '#CBD5E1',
    ...typeScale.footnote,
    lineHeight: 18,
  },
  callActionBtn: {
    alignItems: 'center',
    backgroundColor: '#34C759',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 44,
    justifyContent: 'center',
    marginTop: spacing.xxs,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  callActionBtnText: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
  },

  /* ── 2. SOS Emergency Action (Compact) ── */
  sosCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FFE4E6',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sosRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sosIconBadge: {
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sosContentCol: {
    flex: 1,
    gap: 2,
  },
  sosTitle: {
    color: colors.danger.text,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  sosDesc: {
    color: '#64748B',
    ...typeScale.caption1,
    lineHeight: 16,
  },
  sosActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.danger.text,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 44,
    justifyContent: 'center',
    shadowColor: colors.danger.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  sosActionBtnText: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
  },

  /* ── Section Groups ── */
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionLabel: {
    color: customerPalette.textMutedSlate,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: 0.1,
    paddingHorizontal: spacing.xxs,
  },

  /* Inset Grouped Card */
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  /* FAQ Row */
  faqRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  faqRowActive: {
    backgroundColor: '#F8FAFC',
  },
  faqHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  faqQuestion: {
    color: customerPalette.textSlateDark,
    flex: 1,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  faqQuestionActive: {
    color: customerPalette.primary,
  },
  faqAnswerContainer: {
    borderLeftColor: customerPalette.cardBorder,
    borderLeftWidth: 2,
    marginLeft: spacing.xxs,
    marginTop: spacing.xxs,
    paddingLeft: spacing.sm,
  },
  faqAnswer: {
    color: '#475569',
    ...typeScale.footnote,
    lineHeight: 18,
  },
  rowDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginLeft: spacing.md,
  },

  /* Legal Row */
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  legalRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  legalIconBadge: {
    alignItems: 'center',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  legalTextCol: {
    flex: 1,
    gap: 2,
  },
  legalTitle: {
    color: colors.neutral.titleText,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  legalSubtitle: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption1,
    lineHeight: 16,
  },
  rowDividerIndent: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginLeft: 62,
  },

  /* Legal Modal */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.modal,
    ...iosContinuousCurve,
    gap: spacing.md,
    maxHeight: '80%',
    padding: spacing.lg,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalHeading: {
    color: colors.neutral.titleText,
    flex: 1,
    ...typeScale.headline,
    fontWeight: '700',
    paddingRight: spacing.sm,
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalScrollBody: {
    maxHeight: 320,
  },
  modalContentText: {
    color: '#334155',
    ...typeScale.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
