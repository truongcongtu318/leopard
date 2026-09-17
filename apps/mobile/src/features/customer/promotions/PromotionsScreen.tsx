import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  ScreenScaffold,
  colors,
  control,
  customerPalette,
  haptic,
  hitSlop,
  httpClient,
  iosContinuousCurve,
  layout,
  leopardElevation,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type PromotionItem = Readonly<{
  code: string;
  title: string;
  description?: string | null;
  expiresAt?: string | null;
  minOrder?: string;
  discount: string;
}>;

export interface PromotionVoucherResponse {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscountVnd?: number | null;
  minOrderAmountVnd: number;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface ValidateVoucherResponse {
  valid: boolean;
  discountVnd: number;
  voucher: PromotionVoucherResponse;
}

function formatVoucher(v: PromotionVoucherResponse): PromotionItem {
  let discount = '';
  if (v.discountType === 'PERCENT') {
    discount = `${v.discountValue}%`;
    if (v.maxDiscountVnd) {
      discount += ` (Tối đa ${v.maxDiscountVnd.toLocaleString('vi-VN')} ₫)`;
    }
  } else {
    discount = `${v.discountValue.toLocaleString('vi-VN')} ₫`;
  }

  let minOrder = 'Không giới hạn';
  if (v.minOrderAmountVnd > 0) {
    minOrder = `Đơn từ ${v.minOrderAmountVnd.toLocaleString('vi-VN')} ₫`;
  }

  let formattedExpires = 'Không giới hạn';
  if (v.expiresAt) {
    const d = new Date(v.expiresAt);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      formattedExpires = `${day}/${month}/${year}`;
    }
  }

  return {
    code: v.code,
    title: v.title,
    description: v.description || '',
    expiresAt: formattedExpires,
    minOrder,
    discount,
  };
}

export function PromotionsScreen() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<readonly PromotionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [, setIsApplying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchPromotions() {
      setIsLoading(true);
      try {
        const res = await httpClient.get<PromotionVoucherResponse[]>('/promotions');
        if (isMounted && Array.isArray(res)) {
          setPromotions(res.map(formatVoucher));
        }
      } catch {
        if (isMounted) {
          setPromotions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchPromotions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApply = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;

    haptic.selection();
    setIsApplying(true);
    setFeedbackMessage(null);

    try {
      const res = await httpClient.post<ValidateVoucherResponse>('/promotions/validate', {
        code: normalizedCode,
        orderAmountVnd: 500_000,
      });

      if (res?.valid) {
        haptic.success();
        setAppliedCode(normalizedCode);
        setFeedbackMessage({
          text: `Đã áp dụng mã ${normalizedCode}! Giảm ${res.discountVnd.toLocaleString('vi-VN')} ₫`,
          isError: false,
        });
      } else {
        haptic.warning();
        setFeedbackMessage({
          text: 'Mã không hợp lệ hoặc không đủ điều kiện',
          isError: true,
        });
      }
    } catch (err: any) {
      haptic.error();
      const msg = err?.message || 'Không thể áp dụng mã khuyến mãi';
      setFeedbackMessage({
        text: msg,
        isError: true,
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => router.back()}
      title="Khuyến mãi"
    >
      <View style={styles.container}>
        {feedbackMessage ? (
          <View
            style={[
              styles.bannerBox,
              feedbackMessage.isError ? styles.bannerBoxError : styles.bannerBoxSuccess,
            ]}
          >
            {!feedbackMessage.isError ? (
              <IconCheck color={colors.success.text} size={16} />
            ) : null}
            <Text
              style={[
                styles.feedbackText,
                feedbackMessage.isError ? styles.feedbackError : styles.feedbackSuccess,
              ]}
            >
              {feedbackMessage.text}
            </Text>
          </View>
        ) : null}

        {/* Available Vouchers Section */}
        <Text style={styles.sectionLabel}>Mã khuyến mãi có sẵn</Text>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={customerPalette.primary} size="small" />
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Chưa có mã khuyến mãi</Text>
            <Text style={styles.emptySubtitle}>Các mã ưu đãi mới sẽ được cập nhật sớm.</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            contentInsetAdjustmentBehavior="automatic"
            data={promotions}
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
                  {item.description ? <Text style={styles.promoDesc}>{item.description}</Text> : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.expiryText}>HSD: {item.expiresAt}</Text>
                    <Pressable
                      accessibilityLabel={isApplied ? 'Đang dùng mã' : `Sử dụng mã ${item.code}`}
                      accessibilityRole="button"
                      hitSlop={hitSlop(32, control.minimumTouchHeight)}
                      onPress={() => handleApply(item.code)}
                      style={({ pressed }) => [
                        styles.applyBtn,
                        isApplied ? styles.applyBtnActive : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={[styles.applyBtnText, isApplied ? styles.applyBtnTextActive : null]}>
                        {isApplied ? 'Đang dùng' : 'Sử dụng'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  bannerBoxSuccess: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
  },
  bannerBoxError: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  feedbackText: {
    ...typeScale.footnote,
    fontWeight: '600',
    flex: 1,
  },
  feedbackSuccess: {
    color: colors.success.text,
  },
  feedbackError: {
    color: colors.danger.text,
  },
  sectionLabel: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.hairline,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance + spacing.lg,
  },
  promoCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...leopardElevation.subtle,
  },
  promoCardApplied: {
    borderColor: customerPalette.primary,
    borderWidth: 1.5,
    backgroundColor: customerPalette.primaryBg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeTag: {
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  codeText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  discountText: {
    color: customerPalette.accent,
    ...typeScale.subheadline,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  promoTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  promoDesc: {
    color: customerPalette.textMutedSlate,
    ...typeScale.footnote,
    lineHeight: 18,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: customerPalette.cardBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  expiryText: {
    color: customerPalette.textSubtle,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    minHeight: 32,
  },
  applyBtnActive: {
    backgroundColor: customerPalette.primary,
  },
  applyBtnText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  applyBtnTextActive: {
    color: customerPalette.surfaceWhite,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  emptySubtitle: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
  },
  pressed: {
    opacity: 0.8,
  },
});
