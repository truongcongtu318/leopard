// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, IconClock, IconSecurityShield, IconSpeedTruck, IconStar, IconWallet, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';
import { DriverBottomNavigation } from '../navigation/DriverBottomNavigation';

export type DriverEarningsScreenProps = Readonly<{
  lifetimeDeliveredVnd: number;
  availableBalanceVnd: number;
  deliveredOrderCount: number;
  totalOrderCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: (route: string) => void;
}>;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverEarningsScreen({
  lifetimeDeliveredVnd,
  availableBalanceVnd,
  deliveredOrderCount,
  totalOrderCount,
  isLoading,
  isError,
  onRetry,
  onNavigate,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const { openDrawer } = useDriverDrawer();
  const completionRate = totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;

  return (
    <View style={styles.screenContainer}>
      <ScreenScaffold
        headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
        headerTone="plain"
        title="Thu nhập"
      >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
        {isLoading ? <ScreenState state="loading" /> : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            <View style={styles.doubleBezelOuter}>
              <View style={styles.doubleBezelInner}>
                <Text style={styles.financialEyebrow}>TỔNG THU NHẬP (TẤT CẢ ĐƠN ĐÃ GIAO)</Text>
                <Text style={styles.mainEarningsAmount}>{formatCurrency(lifetimeDeliveredVnd)}</Text>

                <View style={styles.walletQuickActionBox}>
                  <View style={styles.walletBalanceLeft}>
                    <View style={styles.walletIconCircle}>
                      <IconWallet color="#10B981" size={16} />
                    </View>
                    <View>
                      <Text style={styles.walletAvailLabel}>Số dư khả dụng để rút</Text>
                      <Text style={styles.walletAvailAmount}>{formatCurrency(availableBalanceVnd)}</Text>
                    </View>
                  </View>
                  <Text style={styles.walletLink} onPress={() => router.push('/wallet')}>
                    Đến ví →
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconSpeedTruck color="#10B981" size={15} />
                </View>
                <Text style={styles.kpiBoxValue}>{deliveredOrderCount}</Text>
                <Text style={styles.kpiBoxLabel}>Đã hoàn thành</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconSecurityShield color="#0B1E42" size={15} />
                </View>
                <Text style={styles.kpiBoxValue}>{completionRate}%</Text>
                <Text style={styles.kpiBoxLabel}>Tỷ lệ giao thành công</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconClock color="#94A3B8" size={15} />
                </View>
                <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                <Text style={styles.kpiBoxLabel}>Giờ trực tuyến</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconStar color="#94A3B8" size={14} />
                </View>
                <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                <Text style={styles.kpiBoxLabel}>Đánh giá</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenScaffold>

    <DriverBottomNavigation
      activeTab="earnings"
      onNavigate={onNavigate ?? ((route) => router.push(route))}
    />
  </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, position: 'relative' },
  scrollWrap: { flex: 1 },
  scrollContent: { gap: spacing.sm, paddingBottom: 100 },
  doubleBezelOuter: { backgroundColor: '#0B1E42', borderRadius: radius.bezelOuter, padding: 3, shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  doubleBezelInner: { backgroundColor: '#FFFFFF', borderRadius: radius.bezelInner, borderColor: '#E2E8F0', borderWidth: 1, padding: spacing.md, gap: spacing.xs + 2 },
  financialEyebrow: { color: '#0B1E42', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  mainEarningsAmount: { color: '#0B1E42', fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  walletQuickActionBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  walletBalanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  walletAvailLabel: { color: '#065F46', fontSize: 10.5, fontWeight: '600' },
  walletAvailAmount: { color: '#064E3B', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  walletLink: { color: leopardPalette.primary, fontSize: 12.5, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  kpiBox: { flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  kpiIconWrap: { marginBottom: 2 },
  kpiBoxValue: { color: '#0F172A', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiBoxValuePlaceholder: { color: '#94A3B8', fontSize: 11.5, fontWeight: '700', fontStyle: 'italic' },
  kpiBoxLabel: { color: '#64748B', fontSize: 9.5, fontWeight: '600' },
});
