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
  colors,
  layout,
  radius,
  spacing,
  typography,
  Button,
  FormField,
  IconAlertTriangle,
  IconChevron,
  IconClose,
  IconFileText,
  IconPhone,
  IconSecurityShield,
  ScreenScaffold,
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
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Legal Modal state
  const [legalModalTitle, setLegalModalTitle] = useState<string | null>(null);
  const [legalModalContent, setLegalModalContent] = useState<string | null>(null);

  const handleCallHotline = () => {
    Linking.openURL('tel:19006868');
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
  };

  const openTerms = () => {
    setLegalModalTitle('Điều khoản dịch vụ vận chuyển LEOPARD');
    setLegalModalContent(
      '1. QUY ĐỊNH CHUNG\nLEOPARD cung cấp nền tảng công nghệ kết nối vận tải giữa Người gửi hàng (Khách hàng B2B/Cá nhân) và Đối tác tài xế có đầy đủ giấy phép kinh doanh vận tải.\n\n2. TRÁCH NHIỆM BẢO HIỂM HÀNG HÓA\nMọi chuyến hàng trên nền tảng LEOPARD đều được bảo hiểm trách nhiệm hàng hóa tự động lên đến 50.000.000 ₫ cho các rủi ro va chạm, hư hỏng trong quá trình vận chuyển.\n\n3. ĐỐI SOÁT CÔNG NỢ B2B\nDoanh nghiệp sử dụng hạn mức tín dụng B2B thực hiện đối soát tự động vào ngày 25 hàng tháng và thanh toán chậm nhất vào ngày 30 (kỳ T+30).'
    );
  };

  const openPrivacy = () => {
    setLegalModalTitle('Chính sách bảo mật & Quyền riêng tư');
    setLegalModalContent(
      '1. THU THẬP VÀ SỬ DỤNG DỮ LIỆU\nLEOPARD cam kết thu thập tối thiểu thông tin cần thiết phục vụ vận chuyển: Tọa độ điểm giao nhận, số điện thoại liên lạc người gửi/nhận, mã số thuế doanh nghiệp để xuất hóa đơn VAT.\n\n2. BẢO MẬT DỮ LIỆU ĐỊA ĐIỂM\nDữ liệu vị trí thời gian thực (GPS tracking) chỉ được kích hoạt trong thời gian chuyến xe đang vận hành và tự động ngừng chia sẻ khi cuốc xe hoàn tất.\n\n3. QUYỀN XÓA TÀI KHOẢN (APPLE GUIDELINE 5.1.1)\nNgười dùng có quyền yêu cầu xóa vĩnh viễn tài khoản và toàn bộ dữ liệu cá nhân tại mục Cài đặt > Bảo mật tài khoản bất kỳ lúc nào.'
    );
  };

  return (
    <ScreenScaffold
      onBack={() => router.back()}
      subtitle="Tổng đài hỗ trợ vận hành, trợ giúp khẩn cấp và giải đáp thắc mắc."
      title="Trợ giúp & SOS"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. HOTLINE CARD (DOUBLE-BEZEL) */}
        <View style={styles.hotlineCardOuter}>
          <View style={styles.hotlineCardInner}>
            <View style={styles.hotlineLeft}>
              <View style={styles.hotlineIconBox}>
                <IconPhone color="#38BDF8" size={22} />
              </View>
              <View>
                <Text style={styles.hotlineLabel}>TỔNG ĐÀI HỖ TRỢ 24/7</Text>
                <Text style={styles.hotlineNumber}>1900 6868</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Gọi hotline tổng đài 1900 6868"
              accessibilityRole="button"
              onPress={handleCallHotline}
              style={({ pressed }) => [styles.callBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.callBtnText}>Gọi ngay</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. SOS EMERGENCY CARD (DOUBLE-BEZEL) */}
        <View style={styles.sosCardOuter}>
          <View style={styles.sosCardInner}>
            <View style={styles.sosHeaderRow}>
              <View style={styles.sosIconBox}>
                <IconAlertTriangle color="#DC2626" size="md" />
              </View>
              <Text style={styles.sosTitle}>Báo cáo khẩn cấp (SOS)</Text>
            </View>
            <Text style={styles.sosDesc}>
              Dành cho các trường hợp tai nạn, tranh chấp nghiêm trọng trên đường hoặc sự cố khẩn cấp cần can thiệp ngay lập tức từ điều phối viên LEOPARD.
            </Text>
            <Button
              label="Kích hoạt trợ giúp SOS khẩn cấp"
              onPress={handleCallHotline}
              variant="destructive"
            />
          </View>
        </View>

        {/* 3. FAQ ACCORDION (DOUBLE-BEZEL CARDS) */}
        <Text style={styles.sectionLabel}>CÂU HỎI THƯỜNG GẶP (FAQ)</Text>
        <View style={styles.faqList}>
          {faqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <View key={faq.id} style={styles.doubleBezelOuter}>
                <Pressable
                  accessibilityLabel={faq.q}
                  accessibilityRole="button"
                  onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                  style={styles.faqCardInner}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <IconChevron
                      color={colors.neutral.subtleText}
                      direction={isExpanded ? 'up' : 'down'}
                      size="sm"
                    />
                  </View>
                  {isExpanded ? <Text style={styles.faqAnswer}>{faq.a}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 4. TERMS OF SERVICE & PRIVACY POLICY (DOUBLE-BEZEL CARD) */}
        <Text style={styles.sectionLabel}>ĐIỀU KHOẢN DỊCH VỤ & CHÍNH SÁCH BẢO MẬT</Text>
        <View style={styles.doubleBezelOuter}>
          <View style={styles.legalCardInner}>
            <Pressable
              accessibilityLabel="Xem Điều khoản dịch vụ vận chuyển"
              accessibilityRole="button"
              onPress={openTerms}
              style={styles.legalRow}
            >
              <View style={styles.legalRowLeft}>
                <View style={styles.legalIconBox}>
                  <IconFileText color={colors.brand.primary} size={18} />
                </View>
                <View style={styles.legalTextCol}>
                  <Text style={styles.legalTitle}>Điều khoản dịch vụ vận chuyển LEOPARD</Text>
                  <Text style={styles.legalSubtitle}>Quy định quyền lợi, trách nhiệm bảo hiểm & cước phí</Text>
                </View>
              </View>
              <IconChevron color={colors.neutral.subtleText} direction="right" size="md" />
            </Pressable>

            <View style={styles.legalDivider} />

            <Pressable
              accessibilityLabel="Xem Chính sách bảo mật dữ liệu"
              accessibilityRole="button"
              onPress={openPrivacy}
              style={styles.legalRow}
            >
              <View style={styles.legalRowLeft}>
                <View style={styles.legalIconBox}>
                  <IconSecurityShield color={colors.brand.primary} size={18} />
                </View>
                <View style={styles.legalTextCol}>
                  <Text style={styles.legalTitle}>Chính sách bảo mật & Quyền riêng tư</Text>
                  <Text style={styles.legalSubtitle}>Bảo mật vị trí GPS & Tiêu chuẩn Apple Guideline 5.1.1</Text>
                </View>
              </View>
              <IconChevron color={colors.neutral.subtleText} direction="right" size="md" />
            </Pressable>
          </View>
        </View>

        {/* 5. FEEDBACK SECTION (DOUBLE-BEZEL CARD) */}
        <Text style={styles.sectionLabel}>GỬI Ý KIẾN ĐÓNG GÓP</Text>
        <View style={styles.doubleBezelOuter}>
          <View style={styles.feedbackCardInner}>
            {feedbackSent ? (
              <View style={styles.feedbackSuccess}>
                <IconSecurityShield color="#059669" size={20} />
                <Text style={styles.feedbackSuccessText}>Cảm ơn bạn đã gửi đóng góp ý kiến!</Text>
              </View>
            ) : (
              <>
                <FormField
                  label="Nội dung ý kiến hoặc yêu cầu hỗ trợ"
                  multiline
                  onChangeText={setFeedbackText}
                  placeholder="Nhập thông tin chi tiết bạn cần hỗ trợ..."
                  value={feedbackText}
                />
                <Button
                  disabled={!feedbackText.trim()}
                  label="Gửi phản hồi"
                  onPress={handleSendFeedback}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* LEGAL MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setLegalModalTitle(null)}
        transparent
        visible={Boolean(legalModalTitle)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardOuter}>
            <View style={styles.modalCardInner}>
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
                  <IconClose color="#475569" size="md" />
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
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance + 20,
  },
  pressed: {
    opacity: 0.8,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: spacing.xxs,
  },
  doubleBezelOuter: {
    backgroundColor: 'rgba(11, 30, 66, 0.04)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  /* 1. Hotline */
  hotlineCardOuter: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderColor: 'rgba(15, 23, 42, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  hotlineCardInner: {
    alignItems: 'center',
    backgroundColor: colors.operational.ink,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  hotlineLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hotlineIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hotlineLabel: {
    color: colors.operational.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hotlineNumber: {
    color: colors.brand.softBackground,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  callBtn: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: 16,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  /* 2. SOS Emergency */
  sosCardOuter: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  sosCardInner: {
    backgroundColor: colors.neutral.background,
    borderColor: '#FECACA',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sosHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sosIconBox: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sosTitle: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
  sosDesc: {
    color: colors.neutral.text,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  /* 3. FAQ */
  faqList: {
    gap: spacing.xs,
  },
  faqCardInner: {
    backgroundColor: colors.neutral.background,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  faqHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    color: colors.neutral.titleText,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    paddingRight: 8,
  },
  faqAnswer: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  /* 4. Legal */
  legalCardInner: {
    backgroundColor: colors.neutral.background,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 10,
  },
  legalRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  legalIconBox: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  legalTextCol: {
    flex: 1,
  },
  legalTitle: {
    color: colors.neutral.titleText,
    fontSize: 13.5,
    fontWeight: '700',
  },
  legalSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
    marginTop: 2,
  },
  legalDivider: {
    backgroundColor: colors.neutral.rowDivider,
    height: 1,
  },
  /* 5. Feedback */
  feedbackCardInner: {
    backgroundColor: colors.neutral.background,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md,
  },
  feedbackSuccess: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
  },
  feedbackSuccessText: {
    color: '#059669',
    fontSize: 13.5,
    fontWeight: '700',
  },
  /* Modal */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCardOuter: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(11, 30, 66, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: '80%',
    maxWidth: 500,
    padding: 6,
    width: '100%',
  },
  modalCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: spacing.md,
    padding: spacing.md,
  },
  modalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalHeading: {
    color: colors.neutral.titleText,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 8,
  },
  modalCloseBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modalScrollBody: {
    maxHeight: 300,
  },
  modalContentText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
});
