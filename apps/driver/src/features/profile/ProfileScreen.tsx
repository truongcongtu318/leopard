import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, leopardPalette, radius, spacing, typography, Button, ScreenScaffold, ScreenState, StatusBadge, IconCheck, IconChevron, IconClock, IconIdCard, IconInsuranceDoc, IconLicense, IconPhone, IconSecurityShield, IconSpeedTruck, IconStar, IconSupport247, IconTrophy, IconUser, IconWallet } from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';
import type { DriverProfileView } from './model';

export type DriverProfileScreenProps = Readonly<{
  view: DriverProfileView;
  onLogout?: () => void;
  onRetry?: () => void;
}>;

type ProfileTab = 'personal' | 'documents' | 'settings';

function InfoRow({
  icon,
  label,
  value,
  badge,
  isLast = false,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: React.ReactNode;
  isLast?: boolean;
}>) {
  return (
    <View style={[styles.infoRow, isLast ? styles.infoRowLast : null]}>
      <View style={styles.infoRowIconChip}>{icon}</View>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <View style={styles.infoRowRight}>
        {value ? <Text style={styles.infoRowValue}>{value}</Text> : null}
        {badge}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  isLast = false,
  label,
  onPress,
  sublabel,
}: Readonly<{
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  isLast?: boolean;
}>) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        isLast ? styles.menuRowLast : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.menuLeft}>
        {icon ? <View style={styles.menuIconWrap}>{icon}</View> : null}
        <View style={styles.menuTextCol}>
          <Text style={styles.menuLabel}>{label}</Text>
          {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
        </View>
      </View>
      <IconChevron color={leopardPalette.textSubtle} direction="right" size={16} />
    </Pressable>
  );
}

export function DriverProfileScreen({ onLogout, onRetry, view }: DriverProfileScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const { openDrawer } = useDriverDrawer();

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold
        headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
        headerTone="plain"
        title="Hồ sơ"
      >
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử lại' : undefined}
          message={view.message}
          onAction={onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  const driverName = view.name ?? 'Nguyễn Văn Tuấn';
  const vehicleName = view.vehicleLabel ?? '51C-889.24 · Xe tải 2.5T';

  return (
    <ScreenScaffold
      headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
      headerTone="plain"
      title="Hồ sơ tài xế"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Executive Driver Cockpit ID Hero Card */}
        <View style={styles.heroCard}>
          {/* Top Brand & Status Line */}
          <View style={styles.heroTopLine}>
            <View style={styles.heroBrandChip}>
              <IconSpeedTruck color="#38BDF8" size={14} />
              <Text style={styles.heroBrandText}>LEOPARD COCKPIT ID</Text>
            </View>
            <View style={styles.heroKycBadge}>
              <IconSecurityShield color="#10B981" size={13} />
              <Text style={styles.heroKycText}>✓ ĐÃ XÁC THỰC KYC</Text>
            </View>
          </View>

          {/* Center Identity Section */}
          <View style={styles.heroMainRow}>
            <View style={styles.avatarContainer}>
              {view.avatarUrl ? (
                <Image source={{ uri: view.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{driverName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.driverInfoCol}>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <View style={styles.idCodeChip}>
                <Text style={styles.idCodeText}>MÃ TX: DRV-88924</Text>
              </View>
              <View style={styles.vehicleRow}>
                <IconSpeedTruck color="#94A3B8" size={13} />
                <Text numberOfLines={1} style={styles.vehicleRowText}>
                  {vehicleName}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Chỉnh sửa hồ sơ"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/driver/profile-edit')}
                style={styles.editProfileBtn}
              >
                <Text style={styles.editProfileText}>Chỉnh sửa hồ sơ</Text>
                <IconChevron color="#38BDF8" direction="right" size={12} />
              </Pressable>
            </View>
          </View>

          {/* Bottom Cockpit Metrics Strip */}
          <View style={styles.heroDivider} />
          <View style={styles.heroMetricsStrip}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>128</Text>
              <Text style={styles.metricLbl}>Chuyến xe</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <View style={styles.ratingValRow}>
                <Text style={[styles.metricVal, styles.metricValGold]}>4.95</Text>
                <IconStar color="#F59E0B" fill="#F59E0B" size={12} />
              </View>
              <Text style={styles.metricLbl}>Hạng Vàng</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, styles.metricValGreen]}>98.5%</Text>
              <Text style={styles.metricLbl}>Đúng giờ</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>1.5 năm</Text>
              <Text style={styles.metricLbl}>Gắn bó</Text>
            </View>
          </View>
        </View>

        {/* 2. Modern 3-Tab Segmented Selector */}
        <View accessibilityRole="tablist" style={styles.tabContainer}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'personal' }}
            onPress={() => setActiveTab('personal')}
            style={[styles.tabButton, activeTab === 'personal' ? styles.tabButtonActive : null]}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'personal' ? styles.tabTextActive : null]}
            >
              Cá nhân & Xe
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'documents' }}
            onPress={() => setActiveTab('documents')}
            style={[styles.tabButton, activeTab === 'documents' ? styles.tabButtonActive : null]}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'documents' ? styles.tabTextActive : null]}
            >
              Giấy tờ & KYC
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'settings' }}
            onPress={() => setActiveTab('settings')}
            style={[styles.tabButton, activeTab === 'settings' ? styles.tabButtonActive : null]}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'settings' ? styles.tabTextActive : null]}
            >
              Tiện ích & Ví
            </Text>
          </Pressable>
        </View>

        {/* 3. Tab Contents */}
        {activeTab === 'personal' && (
          <View style={styles.tabPane}>
            {/* Contact & Identity Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>THÔNG TIN LIÊN LẠC & ĐỊNH DANH</Text>
              <View style={styles.cardContainer}>
                <InfoRow
                  icon={<IconPhone color={colors.brand.background} size={16} />}
                  label="Số điện thoại"
                  value={view.phone}
                />
                <InfoRow
                  icon={<IconPhone color={colors.brand.background} size={16} />}
                  label="SĐT khẩn cấp"
                  value="0909 113 115"
                />
                <InfoRow
                  icon={<IconUser color={colors.brand.background} size={16} />}
                  label="Vai trò hệ thống"
                  value={view.roleLabel}
                />
                <InfoRow
                  icon={<IconClock color={colors.brand.background} size={16} />}
                  label="Ca làm việc"
                  value="Toàn thời gian (06:00 - 22:00)"
                />
                <InfoRow
                  badge={<StatusBadge domain="user" status="ACTIVE" />}
                  icon={<IconSecurityShield color={colors.brand.background} size={16} />}
                  isLast
                  label="Trạng thái tài khoản"
                />
              </View>
            </View>

            {/* Assigned Vehicle Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>PHƯƠNG TIỆN PHÂN CÔNG (FLEET)</Text>
              <View style={styles.cardContainer}>
                <InfoRow
                  icon={<IconSpeedTruck color={colors.brand.background} size={16} />}
                  label="Phương tiện"
                  value={vehicleName}
                />
                <InfoRow
                  icon={<IconLicense color={colors.brand.background} size={16} />}
                  label="Biển kiểm soát"
                  value="51C-889.24 (TP.HCM)"
                />
                <InfoRow
                  icon={<IconIdCard color={colors.brand.background} size={16} />}
                  label="Đội xe chủ quản"
                  value="Fleet Tân Bình (Pilot)"
                />
                <InfoRow
                  icon={<IconSupport247 color={colors.brand.background} size={16} />}
                  label="Hỗ trợ Fleet Owner"
                  value="0912 345 678"
                />
                <InfoRow
                  icon={<IconSecurityShield color={colors.brand.background} size={16} />}
                  isLast
                  label="Tải trọng cho phép"
                  value="2.490 kg · 14 m³"
                />
              </View>
            </View>

            {/* Quick Edit CTA */}
            <Pressable
              accessibilityLabel="Chỉnh sửa hồ sơ tài xế"
              accessibilityRole="button"
              onPress={() => router.push('/driver/profile-edit')}
              style={({ pressed }) => [styles.editActionCard, pressed ? styles.pressed : null]}
            >
              <Text style={styles.editActionCardText}>Chỉnh sửa thông tin hồ sơ & hình đại diện →</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={styles.tabPane}>
            {/* Compliance Banner */}
            <View style={styles.complianceCard}>
              <View style={styles.complianceIconWrap}>
                <IconSecurityShield color="#10B981" size={20} />
              </View>
              <View style={styles.complianceTextCol}>
                <Text style={styles.complianceTitle}>Hồ sơ pháp lý hợp chuẩn</Text>
                <Text style={styles.complianceDesc}>
                  Đã xác thực đầy đủ 4/4 giấy tờ vận tải theo quy định Bộ GTVT.
                </Text>
              </View>
            </View>

            {/* Documents List */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>DANH MỤC GIẤY TỜ BẮT BUỘC</Text>
              <View style={styles.cardContainer}>
                <View style={styles.docItemRow}>
                  <View style={styles.docIconWrap}>
                    <IconIdCard color="#0B1E42" size={18} />
                  </View>
                  <View style={styles.docTextCol}>
                    <Text style={styles.docTitle}>Căn cước công dân gắn chip (CCCD)</Text>
                    <Text style={styles.docMeta}>Số: 07920100**** · Cục CS QLHC cấp</Text>
                  </View>
                  <View style={styles.docVerifiedPill}>
                    <Text style={styles.docVerifiedText}>✓ Đã duyệt</Text>
                  </View>
                </View>

                <View style={styles.docItemRow}>
                  <View style={styles.docIconWrap}>
                    <IconLicense color="#0B1E42" size={18} />
                  </View>
                  <View style={styles.docTextCol}>
                    <Text style={styles.docTitle}>Giấy phép lái xe Hạng C (GPLX)</Text>
                    <Text style={styles.docMeta}>Số: 79015829**** · Giá trị đến 10/2030</Text>
                  </View>
                  <View style={styles.docVerifiedPill}>
                    <Text style={styles.docVerifiedText}>✓ Hợp lệ</Text>
                  </View>
                </View>

                <View style={styles.docItemRow}>
                  <View style={styles.docIconWrap}>
                    <IconSpeedTruck color="#0B1E42" size={18} />
                  </View>
                  <View style={styles.docTextCol}>
                    <Text style={styles.docTitle}>Cà vẹt & Đăng kiểm xe tải 2.5T</Text>
                    <Text style={styles.docMeta}>Biển số: 51C-889.24 · Hạn kiểm định 12/2026</Text>
                  </View>
                  <View style={styles.docVerifiedPill}>
                    <Text style={styles.docVerifiedText}>✓ Còn hạn</Text>
                  </View>
                </View>

                <View style={[styles.docItemRow, styles.docItemRowLast]}>
                  <View style={styles.docIconWrap}>
                    <IconInsuranceDoc color="#0B1E42" size={18} />
                  </View>
                  <View style={styles.docTextCol}>
                    <Text style={styles.docTitle}>Bảo hiểm trách nhiệm dân sự bắt buộc</Text>
                    <Text style={styles.docMeta}>Bảo hiểm Bảo Việt · Hạn đến 08/2027</Text>
                  </View>
                  <View style={styles.docVerifiedPill}>
                    <Text style={styles.docVerifiedText}>✓ Đã nộp</Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Mở màn hình quản lý hồ sơ KYC"
              accessibilityRole="button"
              onPress={() => router.push('/driver/kyc')}
              style={({ pressed }) => [styles.editActionCard, pressed ? styles.pressed : null]}
            >
              <Text style={styles.editActionCardText}>Xem chi tiết & Cập nhật hồ sơ KYC ›</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.tabPane}>
            {/* Connected Services */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>DỊCH VỤ VẬN HÀNH & TÀI CHÍNH</Text>
              <View style={styles.cardContainer}>
                <MenuRow
                  icon={<IconWallet color="#0B1E42" size={18} />}
                  label="Ví tài xế & Quyết toán"
                  onPress={() => router.push('/driver/wallet')}
                  sublabel="Số dư khả dụng 1.450.000 ₫ · MB Bank"
                />
                <MenuRow
                  icon={<IconTrophy color="#F59E0B" size={18} />}
                  label="Báo cáo điểm hiệu suất"
                  onPress={() => router.push('/driver/performance')}
                  sublabel="Điểm 4.8 ★ · Xếp hạng Vàng"
                />
                <MenuRow
                  icon={<IconSecurityShield color="#10B981" size={18} />}
                  label="Hồ sơ KYC & Pháp lý"
                  onPress={() => router.push('/driver/kyc')}
                  sublabel="4/4 giấy tờ đã kiểm duyệt hợp lệ"
                />
                <MenuRow
                  icon={<IconClock color="#475569" size={18} />}
                  isLast
                  label="Cài đặt chuông báo & GPS"
                  onPress={() => router.push('/driver/settings')}
                  sublabel="Chuông to, Vietmap Nav"
                />
              </View>
            </View>

            {/* Emergency Hotline SOS 24/7 */}
            <View style={styles.sosCard}>
              <View style={styles.sosLeft}>
                <View style={styles.sosIconWrap}>
                  <IconSupport247 color="#DC2626" size={20} />
                </View>
                <View style={styles.sosTextCol}>
                  <Text style={styles.sosTitle}>Đội cứu hộ khẩn cấp LEOPARD 24/7</Text>
                  <Text style={styles.sosDesc}>Sự cố phương tiện & tai nạn trên đường</Text>
                </View>
              </View>
              <Text style={styles.sosPhone}>1900-LEOPARD</Text>
            </View>

            {/* App Info & Logout */}
            <View style={styles.appInfoRow}>
              <Text style={styles.appVersionText}>
                Phiên bản ứng dụng: {view.appVersion}
              </Text>
            </View>

            <View style={styles.logoutWrapper}>
              <Button
                disabledLabel="Đăng xuất"
                isLoading={view.isLoggingOut}
                label="Đăng xuất tài khoản"
                loadingLabel="Đang đăng xuất…"
                onPress={onLogout}
                variant="destructive"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl * 1.5,
  },

  // Executive Cockpit ID Card
  heroCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  heroTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroBrandChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBrandText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroKycBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroKycText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  heroMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#F59E0B',
    borderRadius: 36,
    borderWidth: 2,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
  },
  avatarImage: {
    borderColor: '#F59E0B',
    borderRadius: 36,
    borderWidth: 2,
    height: 72,
    width: 72,
  },
  onlineBadge: {
    backgroundColor: '#10B981',
    borderColor: '#0F172A',
    borderRadius: 7,
    borderWidth: 2,
    bottom: 2,
    height: 14,
    position: 'absolute',
    right: 2,
    width: 14,
  },
  driverInfoCol: {
    flex: 1,
    gap: 3,
  },
  driverNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  idCodeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 4,
    marginTop: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  idCodeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vehicleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  vehicleRowText: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '600',
  },
  editProfileBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    marginTop: 2,
  },
  editProfileText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingValRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  heroDivider: {
    backgroundColor: '#334155',
    height: 1,
    marginVertical: 14,
  },
  heroMetricsStrip: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricValGold: {
    color: '#F59E0B',
  },
  metricValGreen: {
    color: '#10B981',
  },
  metricLbl: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    backgroundColor: '#334155',
    height: 22,
    width: 1,
  },

  // 3-Tab Segmented Selector
  tabContainer: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.brand.background,
    elevation: 2,
    shadowColor: colors.brand.background,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabButtonText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Tab Panes & Section Blocks
  tabPane: {
    gap: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  cardContainer: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowIconChip: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  infoRowLabel: {
    color: leopardPalette.textMutedSlate,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  infoRowRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoRowValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  editActionCard: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.border,
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editActionCardText: {
    color: colors.brand.background,
    fontSize: 13,
    fontWeight: '700',
  },

  // Compliance & Documents
  complianceCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  complianceIconWrap: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  complianceTextCol: {
    flex: 1,
    gap: 2,
  },
  complianceTitle: {
    color: '#065F46',
    fontSize: 13.5,
    fontWeight: '700',
  },
  complianceDesc: {
    color: '#047857',
    fontSize: 12,
    lineHeight: 17,
  },
  docItemRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  docItemRowLast: {
    borderBottomWidth: 0,
  },
  docIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  docTextCol: {
    flex: 1,
    gap: 2,
  },
  docTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
  },
  docMeta: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
  },
  docVerifiedPill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  docVerifiedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },

  // Connected Services Menu
  menuRow: {
    alignItems: 'center',
    borderBottomColor: leopardPalette.subtleDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  menuIconWrap: {
    alignItems: 'center',
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuSublabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
  },
  menuChevron: {
    color: leopardPalette.textSubtle,
    fontSize: 18,
    fontWeight: '700',
  },

  // Emergency SOS Card
  sosCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  sosLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  sosIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sosTextCol: {
    flex: 1,
    gap: 2,
  },
  sosTitle: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
  },
  sosDesc: {
    color: '#B91C1C',
    fontSize: 11,
  },
  sosPhone: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },

  // Footer App Info & Actions
  appInfoRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  appVersionText: {
    color: leopardPalette.textSubtle,
    fontSize: 12,
  },
  logoutWrapper: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
});
