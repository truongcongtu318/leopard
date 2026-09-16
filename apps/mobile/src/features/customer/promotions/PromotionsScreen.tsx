import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  httpClient,
  layout,
  radius,
  spacing,
  typography,
  Button,
  FormField,
  ScreenScaffold,
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
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
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

    setPromoCodeInput(normalizedCode);
    setIsApplying(true);
    setFeedbackMessage(null);

    try {
      const res = await httpClient.post<ValidateVoucherResponse>('/promotions/validate', {
        code: normalizedCode,
        orderAmountVnd: 500_000,
      });

      if (res?.valid) {
        setAppliedCode(normalizedCode);
        setFeedbackMessage({
          text: `Áp dụng thành công! Giảm ${res.discountVnd.toLocaleString('vi-VN')} ₫`,
          isError: false,
        });
      } else {
        setFeedbackMessage({
          text: 'Mã không hợp lệ hoặc không đủ điều kiện',
          isError: true,
        });
      }
    } catch (err: any) {
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
      onBack={() => router.back()}
      subtitle="Mã giảm giá và ưu đãi cước vận chuyển khả dụng."
      title="Khuyến mãi"
    >
      <View style={styles.container}>
        <View style={styles.doubleBezelOuter}>
          <View style={styles.inputCardInner}>
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <FormField
                  autoCapitalize="characters"
                  label="Nhập mã khuyến mãi"
                  onChangeText={(val) => {
                    setPromoCodeInput(val);
                    setFeedbackMessage(null);
                  }}
                  placeholder="VD: LEOPARD20"
                  value={promoCodeInput}
                />
              </View>
            </View>

            {feedbackMessage && (
              <Text
                style={[
                  styles.feedbackText,
                  feedbackMessage.isError ? styles.feedbackError : styles.feedbackSuccess,
                ]}
              >
                {feedbackMessage.text}
              </Text>
            )}

            <Button
              disabled={!promoCodeInput.trim() || isApplying}
              label={
                isApplying
                  ? 'Đang kiểm tra...'
                  : appliedCode === promoCodeInput.trim().toUpperCase()
                    ? 'Đã áp dụng'
                    : 'Áp dụng mã'
              }
              onPress={() => handleApply(promoCodeInput.trim().toUpperCase())}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>MÃ KHUYẾN MÃI CÓ SẴN</Text>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.brand.background} size="small" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={promotions}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isApplied = appliedCode === item.code;
              return (
                <View style={styles.doubleBezelOuter}>
                  <View style={[styles.promoCardInner, isApplied ? styles.promoCardApplied : null]}>
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
                        hitSlop={8}
                        onPress={() => handleApply(item.code)}
                        style={styles.applyBtn}
                      >
                        <Text style={styles.applyBtnText}>{isApplied ? 'Đang dùng' : 'Sử dụng'}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  doubleBezelOuter: {
    backgroundColor: 'rgba(11, 30, 66, 0.04)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  inputCardInner: {
    backgroundColor: colors.neutral.background,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputWrap: {
    flex: 1,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -spacing.xxs,
  },
  feedbackSuccess: {
    color: '#059669',
  },
  feedbackError: {
    color: '#DC2626',
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: spacing.xxs,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  promoCardInner: {
    backgroundColor: colors.neutral.background,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  promoCardApplied: {
    backgroundColor: '#F0F4F9',
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
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountText: {
    color: '#D97706',
    fontSize: typeScale.subheadline.fontSize,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  promoTitle: {
    color: colors.neutral.titleText,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  promoDesc: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
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
    fontSize: typeScale.caption1.fontSize,
    fontVariant: ['tabular-nums'],
  },
  applyBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 70,
    paddingHorizontal: 12,
  },
  applyBtnText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '700',
  },
});
