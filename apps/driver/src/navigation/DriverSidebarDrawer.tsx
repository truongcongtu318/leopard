import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography, Button, IconChevronRight, IconClock, IconClose, IconEarnings, IconOrders, IconSecurityShield, IconSettings, IconSpeedTruck, IconStar, IconSupport247, IconUser, StatusBadge } from '@leopard/mobile-core';
import type { DriverAvailabilityView } from '../features/orders/model';

export type DriverSidebarDrawerProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  availability: DriverAvailabilityView;
  onSetAvailability?: (commandId: string) => void;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
}>;

const MENU_ITEMS = [
  {
    key: 'orders',
    route: '/orders',
    label: 'Buồng lái & Đơn hàng',
    description: 'Bản đồ, đơn chờ & chuyến chạy',
    icon: (active: boolean) => (
      <IconOrders color={active ? '#38BDF8' : '#94A3B8'} size={20} />
    ),
  },
  {
    key: 'earnings',
    route: '/earnings',
    label: 'Doanh thu & Ví',
    description: 'Thực nhận, thưởng & quyết toán',
    icon: (active: boolean) => (
      <IconEarnings color={active ? '#38BDF8' : '#94A3B8'} size={20} />
    ),
  },
  {
    key: 'history',
    route: '/history',
    label: 'Lịch sử chuyến đi',
    description: 'Nhật ký các cuốc đã hoàn thành',
    icon: (active: boolean) => (
      <IconClock color={active ? '#38BDF8' : '#94A3B8'} size={20} />
    ),
  },
  {
    key: 'profile',
    route: '/profile',
    label: 'Hồ sơ & Giấy tờ',
    description: 'CCCD, GPLX & thông tin xe',
    icon: (active: boolean) => (
      <IconUser color={active ? '#38BDF8' : '#94A3B8'} size={20} />
    ),
  },
  {
    key: 'settings',
    route: '/settings',
    label: 'Cài đặt ứng dụng',
    description: 'Âm thanh thông báo, dẫn đường',
    icon: (active: boolean) => (
      <IconSettings color={active ? '#38BDF8' : '#94A3B8'} size={20} />
    ),
  },
] as const;

export function DriverSidebarDrawer({
  activeRoute = '/orders',
  availability,
  isOpen,
  onClose,
  onNavigate,
  onSetAvailability,
}: DriverSidebarDrawerProps) {
  if (!isOpen) return null;

  const isOnline = availability.status === 'AVAILABLE';
  const action = availability.action;
  const pending = action?.isPending ?? false;
  const disabled = pending || (action?.disabled ?? false) || !action;

  return (
    <View
      accessibilityElementsHidden={!isOpen}
      importantForAccessibility={isOpen ? 'yes' : 'no-hide-descendants'}
      pointerEvents={isOpen ? 'auto' : 'box-none'}
      style={[
        styles.drawerContainer,
        !isOpen ? styles.drawerContainerClosed : null,
      ]}
      testID="driver-sidebar-container"
    >
      {/* Backdrop Scrim */}
      {isOpen ? (
        <Pressable
          accessibilityHint="Nhấn vào nền để đóng menu"
          accessibilityLabel="Đóng menu"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
          testID="driver-sidebar-backdrop"
        />
      ) : null}

      {/* Left Drawer Panel */}
      <View
        style={[
          styles.drawerPanel,
          isOpen ? styles.drawerPanelOpen : styles.drawerPanelClosed,
        ]}
        testID="driver-sidebar-drawer"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
            {/* 1. Header with Brand & Close Button */}
            <View style={styles.drawerTopRow}>
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>LEOPARD</Text>
                </View>
                <Text style={styles.brandSubtitle}>DRIVER PILOT</Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng menu bên trái"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
                testID="driver-sidebar-close-btn"
              >
                <IconClose color="#94A3B8" size={18} />
              </Pressable>
            </View>

            {/* Utility Navigation Links */}
            <View style={styles.navMenuSection}>
              <Text style={styles.menuHeading}>TIỆN ÍCH & CÀI ĐẶT</Text>
              {MENU_ITEMS.map((item) => {
                const isActive =
                  activeRoute.startsWith(item.route) ||
                  (item.key === 'earnings' && activeRoute.startsWith('/wallet')) ||
                  (item.key === 'profile' &&
                    (activeRoute.startsWith('/profile-edit') ||
                      activeRoute.startsWith('/kyc') ||
                      activeRoute.startsWith('/performance')));
                return (
                  <Pressable
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    key={item.key}
                    onPress={() => {
                      onClose();
                      if (onNavigate) {
                        onNavigate(item.route);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      isActive ? styles.menuItemActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.menuItemIconBox}>{item.icon(isActive)}</View>
                    <View style={styles.menuItemTextBox}>
                      <Text
                        style={[
                          styles.menuItemLabel,
                          isActive ? styles.menuItemLabelActive : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.menuItemDesc}>{item.description}</Text>
                    </View>
                    <IconChevronRight
                      color={isActive ? '#38BDF8' : '#475569'}
                      size={16}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* 6. Footer & SOS Support */}
            <View style={styles.drawerFooter}>
              <View style={styles.supportCard}>
                <IconSupport247 color="#38BDF8" size={18} />
                <View style={styles.supportTextBox}>
                  <Text style={styles.supportTitle}>Điều phối khẩn cấp 24/7</Text>
                  <Text style={styles.supportHotline}>Hotline: 1900-LEOPARD</Text>
                </View>
              </View>
              <Text style={styles.versionText}>LEOPARD Driver Pilot · v1.0.4</Text>
            </View>
          </ScrollView>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  drawerContainerClosed: {
    pointerEvents: 'box-none',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  drawerPanel: {
    width: 320,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#0F172A',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1001,
  },
  drawerPanelOpen: {
    transform: [{ translateX: 0 }],
  },
  drawerPanelClosed: {
    transform: [{ translateX: -400 }],
  },
  scrollContent: {
    paddingTop: spacing.lg + 10,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },

  /* Header */
  drawerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Profile Card */
  driverProfileCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0B1E42',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameGroup: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierText: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '600',
  },
  vehicleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  vehiclePlate: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '700',
  },
  vehicleDivider: {
    color: '#64748B',
    fontSize: 12,
  },
  vehicleType: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },

  /* Availability Cockpit */
  availabilityCockpit: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  availabilityTitleBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  pulseDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotOnlineOuter: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
  },
  pulseDotOfflineOuter: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  pulseDotInner: {
    borderRadius: radius.pill,
    height: 9,
    width: 9,
  },
  dotOnline: {
    backgroundColor: '#16A34A',
  },
  dotOffline: {
    backgroundColor: colors.neutral.subtleText,
  },
  availabilityTextGroup: {
    flex: 1,
  },
  availabilitySectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  availabilitySectionSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: radius.control,
    padding: spacing.xs,
  },
  dangerText: {
    ...typography.caption,
    color: '#FCA5A5',
    fontWeight: '600',
  },

  /* Mini Stats */
  miniStatsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statCol: {
    flex: 1,
    gap: 2,
  },
  statSeparator: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  statValuePositive: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  /* Navigation Menu */
  navMenuSection: {
    gap: 4,
    marginTop: 4,
  },
  menuHeading: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  menuItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextBox: {
    flex: 1,
    gap: 2,
  },
  menuItemLabel: {
    color: '#CBD5E1',
    fontSize: 13.5,
    fontWeight: '600',
  },
  menuItemLabelActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  menuItemDesc: {
    color: '#64748B',
    fontSize: 10.5,
  },

  /* Footer */
  drawerFooter: {
    marginTop: spacing.md,
    gap: 12,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 10,
    gap: 10,
  },
  supportTextBox: {
    flex: 1,
  },
  supportTitle: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '700',
  },
  supportHotline: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  versionText: {
    color: '#475569',
    fontSize: 10.5,
    textAlign: 'center',
  },
});
