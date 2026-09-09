import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography, Button, FormField, ScreenScaffold } from '@leopard/mobile-core';

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

  const handleCallHotline = () => {
    Linking.openURL('tel:19006868');
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
  };

  return (
    <ScreenScaffold
      onBack={() => router.back()}
      subtitle="Tổng đài hỗ trợ vận hành, trợ giúp khẩn cấp và giải đáp thắc mắc."
      title="Trợ giúp & SOS"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hotlineCard}>
          <View style={styles.hotlineLeft}>
            <Text style={styles.hotlineIcon}>📞</Text>
            <View>
              <Text style={styles.hotlineLabel}>TỔNG ĐÀI HỖ TRỢ 24/7</Text>
              <Text style={styles.hotlineNumber}>1900 6868</Text>
            </View>
          </View>
          <Pressable onPress={handleCallHotline} style={styles.callBtn}>
            <Text style={styles.callBtnText}>Gọi ngay</Text>
          </Pressable>
        </View>

        <View style={styles.sosCard}>
          <Text style={styles.sosTitle}>🚨 Báo cáo khẩn cấp (SOS)</Text>
          <Text style={styles.sosDesc}>
            Dành cho các trường hợp tai nạn, tranh chấp nghiêm trọng trên đường hoặc sự cố khẩn cấp cần can thiệp ngay.
          </Text>
          <Button
            label="Kích hoạt trợ giúp SOS khẩn cấp"
            onPress={handleCallHotline}
            variant="destructive"
          />
        </View>

        <Text style={styles.sectionLabel}>CÂU HỎI THƯỜNG GẶP (FAQ)</Text>

        <View style={styles.faqList}>
          {faqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <Pressable
                key={faq.id}
                onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                style={styles.faqCard}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Text style={styles.faqChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded ? <Text style={styles.faqAnswer}>{faq.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>GỬI Ý KIẾN ĐÓNG GÓP</Text>

        <View style={styles.feedbackCard}>
          {feedbackSent ? (
            <View style={styles.feedbackSuccess}>
              <Text style={styles.feedbackSuccessText}>✓ Cảm ơn bạn đã gửi đóng góp ý kiến!</Text>
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
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance,
  },
  hotlineCard: {
    alignItems: 'center',
    backgroundColor: colors.operational.ink,
    borderRadius: radius.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  hotlineLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hotlineIcon: {
    fontSize: 24,
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
    fontWeight: '800',
  },
  callBtn: {
    backgroundColor: colors.brand.background,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: {
    color: colors.neutral.background,
    fontSize: 13,
    fontWeight: '700',
  },
  sosCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.danger.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sosTitle: {
    color: colors.danger.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sosDesc: {
    color: colors.neutral.text,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  faqList: {
    gap: spacing.xs,
  },
  faqCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
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
  faqChevron: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  faqAnswer: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  feedbackSuccess: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  feedbackSuccessText: {
    color: colors.brand.background,
    fontSize: 13.5,
    fontWeight: '700',
  },
});
