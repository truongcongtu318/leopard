import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

export type PromotionItem = Readonly<{
  code: string;
  title: string;
  description: string;
  expiresAt: string;
  minOrder: string;
  discount: string;
}>;

const mockPromotions: readonly PromotionItem[] = [
  {
    code: 'LEOPARD20',
    title: 'Giảm 20% chuyến hàng đầu tiên',
    description: 'Áp dụng cho mọi loại xe với đơn hàng đầu tiên của khách hàng mới.',
    expiresAt: '31/08/2026',
    minOrder: 'Không giới hạn',
    discount: '20% (Tối đa 50.000 ₫)',
  },
  {
    code: 'VAN50K',
    title: 'Ưu đãi xe van 50.000 ₫',
    description: 'Giảm trực tiếp 50k khi đặt chuyến xe van vận chuyển hàng hóa.',
    expiresAt: '15/09/2026',
    minOrder: 'Đơn từ 200.000 ₫',
    discount: '50.000 ₫',
  },
  {
    code: 'TRUCK100',
    title: 'Giảm 100.000 ₫ xe tải liên tỉnh',
    description: 'Hỗ trợ cước vận chuyển liên tỉnh cho doanh nghiệp và xưởng may.',
    expiresAt: '30/09/2026',
    minOrder: 'Đơn từ 500.000 ₫',
    discount: '100.000 ₫',
  },
];

export function PromotionsScreen() {
  const router = useRouter();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const handleApply = (code: string) => {
    setAppliedCode(code);
    setPromoCodeInput(code);
  };

  return (
    <ScreenScaffold
      onBack={() => router.back()}
      subtitle="Mã giảm giá và ưu đãi cước vận chuyển khả dụng."
      title="Khuyến mãi"
    >
      <View style={styles.container}>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <FormField
                autoCapitalize="characters"
                label="Nhập mã khuyến mãi"
                onChangeText={setPromoCodeInput}
                placeholder="VD: LEOPARD20"
                value={promoCodeInput}
              />
            </View>
          </View>
          <Button
            disabled={!promoCodeInput.trim()}
            label={appliedCode === promoCodeInput.trim().toUpperCase() ? '✓ Đã áp dụng' : 'Áp dụng mã'}
            onPress={() => handleApply(promoCodeInput.trim().toUpperCase())}
          />
        </View>

        <Text style={styles.sectionLabel}>MÃ KHUYẾN MÃI CÓ SẴN</Text>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={mockPromotions}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => {
            const isApplied = appliedCode === item.code;
            return (
              <View style={[styles.promoCard, isApplied ? styles.promoCardApplied : null]}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeTag}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <Text style={styles.discountText}>{item.discount}</Text>
                </View>
                <Text style={styles.promoTitle}>{item.title}</Text>
                <Text style={styles.promoDesc}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.expiryText}>HSD: {item.expiresAt}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleApply(item.code)}
                    style={styles.applyBtn}
                  >
                    <Text style={styles.applyBtnText}>{isApplied ? 'Đang dùng' : 'Sử dụng'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputWrap: {
    flex: 1,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: spacing.xxs,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  promoCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  promoCardApplied: {
    backgroundColor: '#F0F9FF',
    borderColor: colors.brand.background,
    borderWidth: 1.5,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeTag: {
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountText: {
    color: colors.brand.background,
    fontSize: 14,
    fontWeight: '800',
  },
  promoTitle: {
    color: colors.neutral.titleText,
    fontSize: 14.5,
    fontWeight: '700',
  },
  promoDesc: {
    color: colors.neutral.text,
    fontSize: 12.5,
    lineHeight: 17,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: colors.neutral.rowDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  expiryText: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
  },
  applyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  applyBtnText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '700',
  },
});
