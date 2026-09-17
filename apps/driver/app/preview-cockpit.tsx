import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenScaffold, colors, leopardPalette, spacing, typeScale } from '@leopard/mobile-core';
import { DriverOrderDetailScreen } from '../src/features/orders/DriverOrderDetailScreen';
import { createDriverDetailFixture } from '../src/features/orders/fixtures';
import type { DriverDetailScenarioId } from '../src/features/orders/fixtures';

const SCENARIOS: readonly { id: DriverDetailScenarioId; label: string }[] = [
  { id: 'D-DETAIL-ACCEPTED', label: '1. Nhận đơn (ACCEPTED)' },
  { id: 'D-DETAIL-PICKING-UP', label: '2. Lấy hàng (PICKING_UP)' },
  { id: 'D-DETAIL-IN-TRANSIT', label: '3. Vận chuyển (IN_TRANSIT)' },
  { id: 'D-DETAIL-PROOF-REQUIRED', label: '4. Cần ảnh e-POD (DELIVERING)' },
  { id: 'D-DETAIL-READY-DELIVER', label: '5. Đã đủ ảnh/ký (READY TO COMPLETE)' },
  { id: 'D-DETAIL-TERMINAL-DELIVERED', label: '6. Đã giao hàng (DELIVERED)' },
];

export default function DriverPreviewCockpitPage() {
  const params = useLocalSearchParams<{ scenario?: string }>();
  const [selectedScenario, setSelectedScenario] = useState<DriverDetailScenarioId>(
    (params.scenario as DriverDetailScenarioId) || 'D-DETAIL-ACCEPTED',
  );
  const [showPicker, setShowPicker] = useState(false);

  const fixtureView = createDriverDetailFixture(selectedScenario);

  return (
    <View style={styles.root}>
      {/* Khung xem chi tiết đơn Cockpit */}
      <View style={styles.cockpitContainer}>
        <DriverOrderDetailScreen
          onBack={() => {}}
          onConfirmCashPayment={() => alert('Đã xác nhận thu tiền mặt')}
          onExecuteTask={(cmd) => alert(`Thực hiện lệnh: ${cmd}`)}
          onOpenIncidentModal={() => alert('Mở popup báo sự cố')}
          onOpenLocationSettings={() => alert('Mở cài đặt vị trí')}
          onRetryProof={() => alert('Thử lại upload')}
          onSelectProof={() => alert('Mở máy ảnh / chọn ảnh e-POD')}
          view={fixtureView}
        />
      </View>

      {/* Floating Scenario Switcher Bar */}
      <View style={styles.floatingScenarioBar}>
        <Pressable
          onPress={() => setShowPicker(!showPicker)}
          style={styles.scenarioToggleBtn}
        >
          <Text style={styles.scenarioLabel}>
            🔍 Kịch bản: <Text style={styles.scenarioActiveText}>{selectedScenario}</Text> ({showPicker ? 'Đóng ▲' : 'Đổi kịch bản ▼'})
          </Text>
        </Pressable>

        {showPicker && (
          <View style={styles.scenarioMenu}>
            {SCENARIOS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSelectedScenario(s.id);
                  setShowPicker(false);
                }}
                style={[
                  styles.scenarioMenuItem,
                  selectedScenario === s.id ? styles.scenarioMenuItemActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.scenarioMenuItemText,
                    selectedScenario === s.id ? styles.scenarioMenuItemTextActive : null,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  cockpitContainer: {
    flex: 1,
  },
  floatingScenarioBar: {
    bottom: 85,
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 9999,
  },
  scenarioToggleBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  scenarioLabel: {
    color: '#94A3B8',
    ...typeScale.caption2,
    fontWeight: '600',
    textAlign: 'center',
  },
  scenarioActiveText: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  scenarioMenu: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    padding: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  scenarioMenuItem: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scenarioMenuItemActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.25)',
  },
  scenarioMenuItemText: {
    color: '#E2E8F0',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  scenarioMenuItemTextActive: {
    color: leopardPalette.primary,
    fontWeight: '800',
  },
});
