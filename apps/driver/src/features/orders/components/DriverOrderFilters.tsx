import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, IconRadarPulse, IconSettings, iosContinuousCurve } from '@leopard/mobile-core';

export type DriverOrderFiltersProps = Readonly<{
  selectedFilter?: string;
  onSelectFilter?: (filter: string) => void;
  filters?: readonly string[];
  totalCount: number;
  waitingCount?: number;
  onOpenSettings?: () => void;
  onSimulateOffer?: () => void;
  hasActiveTrip?: boolean;
  radiusKm?: string;
  showDebugActions?: boolean;
}>;

const DEFAULT_FILTERS: readonly string[] = [];

export function DriverOrderFilters({
  filters = DEFAULT_FILTERS,
  hasActiveTrip = false,
  onOpenSettings,
  onSelectFilter,
  onSimulateOffer,
  radiusKm = '5',
  selectedFilter,
  showDebugActions = false,
  totalCount,
  waitingCount = 0,
}: DriverOrderFiltersProps) {
  return (
    <View style={styles.container}>
      {/* Radar Live Strip (hidden during active trip) */}
      {!hasActiveTrip ? (
        <View style={styles.radarLiveStrip}>
          <View style={styles.radarLeftGroup}>
            <View style={styles.radarIconOuter}>
              <IconRadarPulse color="#0B1E42" size={15} />
            </View>
            <View style={styles.radarTextGroup}>
              <Text style={styles.radarSubtitleText}>Đang tìm cuốc xe gần bạn...</Text>
              <Text style={styles.radarLiveText}>
                Radar đang quét bán kính{' '}
                <Text style={styles.radarLiveHighlight}>{radiusKm} km</Text> ·{' '}
                <Text style={styles.radarLiveHighlight}>
                  {waitingCount > 0 ? `${waitingCount} đơn phù hợp` : '0 đơn phù hợp'}
                </Text>
              </Text>
            </View>
          </View>
          {showDebugActions && onSimulateOffer ? (
            <Pressable
              accessibilityHint="Mở modal đơn nổ để thử nghiệm giao diện tiếp nhận"
              accessibilityLabel="Mô phỏng nổ đơn"
              accessibilityRole="button"
              onPress={onSimulateOffer}
              style={({ pressed }) => [styles.radarSimulateBtn, pressed ? styles.pressed : null]}
            >
              <IconRadarPulse color="#0B1E42" size={13} />
              <Text style={styles.radarSimulateBtnText}>Thử nổ đơn</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Section Header: Title + Subtitle + Settings Action */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Đơn có thể nhận
          </Text>
          <Text style={styles.sectionSubtitle}>
            {totalCount > 0 ? `${totalCount} đơn phù hợp gần bạn` : 'Chưa có đơn phù hợp'}
          </Text>
        </View>

        {onOpenSettings ? (
          <Pressable
            accessibilityLabel="Mở bộ lọc nhận đơn"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.settingsBtn, pressed ? styles.pressed : null]}
          >
            <IconSettings color="#0B1E42" size={14} />
            <Text style={styles.settingsBtnText}>Thiết lập</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filter chips (rendered only if explicitly provided) */}
      {filters && filters.length > 0 ? (
        <View style={styles.chipsRow}>
          {filters.map((chip) => {
            const isSelected = selectedFilter === chip;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={chip}
                onPress={() => onSelectFilter?.(chip)}
                style={({ pressed }) => [
                  styles.filterChip,
                  isSelected ? styles.filterChipActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextActive : null,
                  ]}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },

  // Radar Live Strip
  radarLiveStrip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  radarLeftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
  },
  radarTextGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  radarSubtitleText: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  radarIconOuter: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    marginRight: 8,
    width: 28,
  },
  radarLiveText: {
    color: '#475569',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  radarLiveHighlight: {
    color: '#0B1E42',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  radarSimulateBtn: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  radarSimulateBtnText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Header Row
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flex: 1,
  },
  sectionTitle: {
    color: '#0B1E42',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  settingsBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  settingsBtnText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },

  // Chips Row
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  filterChipText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
