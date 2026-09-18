import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Alert,
  AppText,
  Badge,
  Box,
  Card,
  colors,
  control,
  customerPalette,
  haptic,
  hitSlop,
  httpClient,
  IconCheck,
  IconSecurityShield,
  IconTag,
  iosContinuousCurve,
  layout,
  leopardElevation,
  leopardPalette,
  radius,
  ScreenScaffold,
  spacing,
  Spinner,
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
      onBack={() => {
        haptic.selection();
        router.back();
      }}
      subtitle="Ưu đãi cước vận chuyển & Voucher VIP"
      title="Khuyến mãi"
    >
      <View style={styles.container}>
        {/* Banner phản hồi trạng thái áp dụng voucher */}
        {feedbackMessage ? (
          <View
            style={[
              styles.feedbackBanner,
              feedbackMessage.isError ? styles.feedbackBannerError : styles.feedbackBannerSuccess,
            ]}
          >
            {!feedbackMessage.isError ? (
              <View style={styles.feedbackIconCircle}>
                <IconCheck color={customerPalette.surfaceWhite} size={14} strokeWidth={2.5} />
              </View>
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

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Mã khuyến mãi có sẵn</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{promotions.length} mã ưu đãi</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <Spinner color={customerPalette.primary} size="small" />
            <Text style={styles.loadingText}>Đang tải danh sách ưu đãi...</Text>
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <IconTag color={customerPalette.accent} size={36} />
            </View>
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
                <View
                  style={[
                    styles.ticketCardOuter,
                    isApplied && styles.ticketCardApplied,
                  ]}
                >
                  {/* Cột Trái: Cuống vé Cheetah Amber (#F59E0B) */}
                  <View
                    style={[
                      styles.ticketStub,
                      isApplied && styles.ticketStubApplied,
                    ]}
                  >
                    <View style={styles.stubIconBox}>
                      <IconTag color={customerPalette.surfaceWhite} size={18} />
                    </View>
                    <Text numberOfLines={2} style={styles.stubDiscountText}>
                      {item.discount}
                    </Text>
                    <Text style={styles.stubLabel}>LEOPARD</Text>
                  </View>

                  {/* Rãnh khuyết xé vé (Ticket Notches) & Đường kẻ đứt nét */}
                  <View style={styles.notchContainer}>
                    <View style={styles.notchTop} />
                    <View style={styles.perforatedLine} />
                    <View style={styles.notchBottom} />
                  </View>

                  {/* Cột Phải: Thân vé thông tin chi tiết */}
                  <View style={styles.ticketBody}>
                    <View style={styles.ticketTopRow}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{item.code}</Text>
                      </View>
                      <Text style={styles.minOrderText}>{item.minOrder}</Text>
                    </View>

                    <Text numberOfLines={1} style={styles.promoTitle}>
                      {item.title}
                    </Text>

                    {item.description ? (
                      <Text numberOfLines={2} style={styles.promoDesc}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.ticketFooterRow}>
                      <Text style={styles.expiryText}>HSD: {item.expiresAt}</Text>

                      <Pressable
                        accessibilityLabel={isApplied ? 'Đang dùng mã' : `Sử dụng mã ${item.code}`}
                        accessibilityRole="button"
                        hitSlop={hitSlop(32, control.minimumTouchHeight)}
                        onPress={() => handleApply(item.code)}
                        style={({ pressed }) => [
                          styles.applyBtn,
                          isApplied && styles.applyBtnActive,
                          pressed && styles.applyBtnPressed,
                        ]}
                      >
                        {isApplied ? (
                          <View style={styles.applyBtnInner}>
                            <IconCheck color={customerPalette.surfaceWhite} size={13} strokeWidth={2.5} />
                            <Text style={styles.applyBtnTextActive}>Đang dùng</Text>
                          </View>
                        ) : (
                          <Text style={styles.applyBtnText}>Áp dụng</Text>
                        )}
                      </Pressable>
                    </View>
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
  },
  feedbackBannerError: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  feedbackIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    ...typeScale.footnote,
    fontWeight: '700',
    flex: 1,
  },
  feedbackSuccess: {
    color: colors.success.text,
  },
  feedbackError: {
    color: colors.danger.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
    marginTop: spacing.xxs,
    marginBottom: spacing.xxs,
  },
  sectionLabel: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textSubtle,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  loadingText: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance + spacing.lg,
    paddingTop: spacing.xxs,
  },
  // Thẻ Voucher chuẩn phiếu vé (Ticket Card)
  ticketCardOuter: {
    flexDirection: 'row',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
    minHeight: 124,
  },
  ticketCardApplied: {
    borderColor: customerPalette.primary,
    borderWidth: 1.5,
    shadowColor: customerPalette.primary,
    shadowOpacity: 0.12,
  },
  // Cuống vé màu Cheetah Amber (#F59E0B)
  ticketStub: {
    width: 96,
    backgroundColor: customerPalette.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketStubApplied: {
    backgroundColor: customerPalette.primary,
  },
  stubIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stubDiscountText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  stubLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    ...typeScale.caption2,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Rãnh khuyết xé vé bán nguyệt & đường đứt nét
  notchContainer: {
    width: 14,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    marginLeft: -7,
    marginRight: -7,
    zIndex: 10,
  },
  notchTop: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  perforatedLine: {
    width: 1,
    height: '68%',
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.12)',
    borderStyle: 'dashed',
  },
  notchBottom: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  // Thân vé bên phải
  ticketBody: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
    gap: spacing.xxs,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  codeBadgeText: {
    color: customerPalette.accent,
    ...typeScale.caption2,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  minOrderText: {
    color: customerPalette.textSubtle,
    ...typeScale.caption2,
    fontWeight: '500',
  },
  promoTitle: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '700',
    marginTop: 2,
  },
  promoDesc: {
    color: customerPalette.textSubtle,
    ...typeScale.footnote,
    lineHeight: 17,
  },
  ticketFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: customerPalette.cardBorder,
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
  },
  expiryText: {
    color: customerPalette.textSubtle,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    height: 32,
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.15)',
  },
  applyBtnActive: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  applyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applyBtnText: {
    color: customerPalette.primary,
    ...typeScale.caption1,
    fontWeight: '700',
  },
  applyBtnTextActive: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption1,
    fontWeight: '700',
  },
  applyBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyTitle: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  emptySubtitle: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    textAlign: 'center',
  },
});
