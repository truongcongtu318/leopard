import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import {
  Card,
  IconChevronRight,
  IconClose,
  IconPlus,
  IconRoute,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { RouteStop } from '../booking-schema';
import { BookingLocationSearchOverlay } from './BookingLocationSearchOverlay';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number };
}

export interface BookingRouteSectionProps {
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
  /** Real routed distance; undefined until the estimate resolves. */
  distanceKm?: number;
  /** Real routed duration; undefined until the estimate resolves. */
  etaMinutes?: number;
  isEstimating?: boolean;
  onPressPickup?: () => void;
  onPressDropoff?: () => void;
  onUpdatePickup?: (address: string, coords?: { lat: number; lng: number }) => void;
  onUpdateDropoff?: (address: string, coords?: { lat: number; lng: number }) => void;
  onUpdateStop?: (stopId: string, address: string, coords?: { lat: number; lng: number }) => void;
  onAddStop: () => void;
  onRemoveStop: (stopId: string) => void;
  onPickOnMap?: () => void;
  onSearchStateChange?: (isSearching: boolean) => void;
  routeError?: string;
  initialActiveTarget?: 'pickup' | 'dropoff' | null;
}

/**
 * Parses a raw geocoded or user address into clean, Apple HIG 2-tier typography:
 * Line 1: Main place name or street (e.g. "Kho Tổng Đại Phát" or "Xã Cát Sơn")
 * Line 2: Detailed ward, district, city (e.g. "120 Song Hành, P. Tân Hưng Thuận, Q.12")
 */
/**
 * Splits an address into a title and subtitle for display.
 *
 * An empty address returns empty strings. It must never substitute a stock
 * address: a placeholder like "Kho VLXD Đại Phát" made an unchosen pickup look
 * like a real selected location.
 */
export function formatAddressForDisplay(rawAddress: string): { title: string; subtitle: string } {
  if (!rawAddress || !rawAddress.trim()) {
    return { title: '', subtitle: '' };
  }
  let clean = rawAddress.trim();
  clean = clean.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}\s*,?\s*/i, '');

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return {
      title: parts[0]?.trim() || '',
      subtitle: parts.slice(1).join(' - ').trim(),
    };
  }

  const commaIndex = clean.indexOf(',');
  if (commaIndex !== -1) {
    return {
      title: clean.slice(0, commaIndex).trim(),
      subtitle: clean.slice(commaIndex + 1).trim(),
    };
  }

  return { title: clean, subtitle: '' };
}

export function BookingRouteSection({
  pickupAddress,
  dropoffAddress,
  stops,
  distanceKm,
  etaMinutes,
  isEstimating,
  onPressPickup,
  onPressDropoff,
  onUpdatePickup,
  onUpdateDropoff,
  onUpdateStop,
  onAddStop,
  onRemoveStop,
  onPickOnMap,
  onSearchStateChange,
  routeError,
  initialActiveTarget = null,
}: BookingRouteSectionProps) {
  const [activeTarget, setActiveTarget] = useState<string | null>(initialActiveTarget);

  // The distance chip only appears once a real routed distance exists, so the
  // customer never reads a placeholder kilometre figure as their real trip.
  const hasRoute = typeof distanceKm === 'number' && distanceKm > 0;

  const handleOpenSearch = (target: string) => {
    haptic.light();
    setActiveTarget(target);
    onSearchStateChange?.(true);
    if (target === 'pickup' && onPressPickup) onPressPickup();
    if (target === 'dropoff' && onPressDropoff) onPressDropoff();
  };

  const handleCloseSearch = () => {
    setActiveTarget(null);
    onSearchStateChange?.(false);
  };

  const handleSelectLocation = (address: string, coords?: { lat: number; lng: number }) => {
    haptic.selection();
    if (activeTarget === 'pickup') {
      onUpdatePickup?.(address, coords);
    } else if (activeTarget === 'dropoff') {
      onUpdateDropoff?.(address, coords);
    } else if (activeTarget) {
      onUpdateStop?.(activeTarget, address, coords);
    }
    handleCloseSearch();
  };

  const handleAddStop = () => {
    haptic.light();
    onAddStop();
  };

  const handleRemoveStop = (stopId: string) => {
    haptic.light();
    onRemoveStop(stopId);
  };

  const isIdentical =
    pickupAddress.trim().length > 0 &&
    pickupAddress.trim().toLowerCase() === dropoffAddress.trim().toLowerCase();

  const pickupParsed = formatAddressForDisplay(pickupAddress);
  const dropoffParsed = formatAddressForDisplay(dropoffAddress);

  const currentSearchValue =
    activeTarget === 'pickup'
      ? pickupAddress
      : activeTarget === 'dropoff'
        ? dropoffAddress
        : stops.find((s) => s.id === activeTarget)?.address || '';

  return (
    <View style={styles.container}>
      <Card
        size="sm"
        style={styles.card}
        variant="elevated"
      >
        {/* Điểm lấy hàng */}
        <Pressable
          accessibilityLabel={`Điểm lấy hàng: ${pickupAddress || 'Chưa chọn'}`}
          accessibilityRole="button"
          onPress={() => handleOpenSearch('pickup')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
            style={styles.indicatorCol}
          >
            <View style={styles.greenHalo}>
              <View style={styles.greenInnerDot} />
            </View>
            <View style={styles.connectorLine} />
          </View>
          <View style={styles.addressTextCol}>
            <Text numberOfLines={1} style={styles.addressLine1}>
              {pickupParsed.title || 'Chọn điểm lấy hàng'}
            </Text>
            {pickupParsed.subtitle ? (
              <Text numberOfLines={1} style={styles.addressLine2}>
                {pickupParsed.subtitle}
              </Text>
            ) : null}
          </View>
          <IconChevronRight color={customerPalette.offlineGray} size={13} />
        </Pressable>

        {/* Điểm dừng trung gian (nếu có) */}
        {stops.map((stop, index) => {
          const stopParsed = formatAddressForDisplay(stop.address);
          return (
            <React.Fragment key={stop.id}>
              <View style={styles.separator} />
              <View style={styles.stopRow}>
                <Pressable
                  accessibilityLabel={`Điểm dừng ${index + 1}: ${stop.address || 'Chưa chọn'}`}
                  accessibilityRole="button"
                  onPress={() => handleOpenSearch(stop.id)}
                  style={({ pressed }) => [styles.stopPressArea, pressed && styles.rowPressed]}
                >
                  <View
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                    style={styles.indicatorCol}
                  >
                    <View style={styles.orangeHalo}>
                      <View style={styles.orangeInnerDot} />
                    </View>
                    <View style={styles.connectorLine} />
                  </View>
                  <View style={styles.addressTextCol}>
                    <Text numberOfLines={1} style={styles.addressLine1}>
                      {stop.address ? stopParsed.title : `Nhập điểm dừng ${index + 1}`}
                    </Text>
                    {stopParsed.subtitle ? (
                      <Text numberOfLines={1} style={styles.addressLine2}>
                        {stopParsed.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Xóa điểm dừng ${index + 1}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => handleRemoveStop(stop.id)}
                  style={({ pressed }) => [styles.removeStopBtn, pressed && styles.rowPressed]}
                >
                  <View style={styles.removeStopCircle}>
                    <IconClose color={customerPalette.textSubtle} size={11} />
                  </View>
                </Pressable>
              </View>
            </React.Fragment>
          );
        })}

        <View style={styles.separator} />

        {/* Điểm giao hàng */}
        <Pressable
          accessibilityLabel={`Điểm giao hàng: ${dropoffAddress || 'Chưa chọn'}`}
          accessibilityRole="button"
          onPress={() => handleOpenSearch('dropoff')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
            style={styles.indicatorCol}
          >
            <View style={styles.redHalo}>
              <View style={styles.redInnerSquare} />
            </View>
          </View>
          <View style={styles.addressTextCol}>
            <Text numberOfLines={1} style={styles.addressLine1}>
              {dropoffParsed.title || 'Chọn điểm giao hàng'}
            </Text>
            {dropoffParsed.subtitle ? (
              <Text numberOfLines={1} style={styles.addressLine2}>
                {dropoffParsed.subtitle}
              </Text>
            ) : null}
          </View>
          <IconChevronRight color={customerPalette.offlineGray} size={13} />
        </Pressable>

        {/* Thêm điểm dừng (Tối đa 5 điểm dừng) - Inline text link nhỏ gọn */}
        {stops.length < 5 && (
          <View style={styles.addStopWrap}>
            <View style={styles.separator} />
            <Pressable
              accessibilityLabel="Thêm điểm dừng"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleAddStop}
              style={({ pressed }) => [styles.addStopBtn, pressed && styles.rowPressed]}
            >
              <IconPlus color={customerPalette.primary} size={13} />
              <Text style={styles.addStopBtnText}>Thêm điểm dừng</Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Footer lộ trình pill chip — only real routed numbers, never a guess. */}
      {hasRoute ? (
        <View style={styles.routeFooterChip} testID="route-distance-chip">
          <IconRoute color={customerPalette.primary} size={14} />
          <Text style={styles.routeFooter}>
            Khoảng {distanceKm!.toFixed(1).replace('.', ',')} km
            {etaMinutes !== undefined && etaMinutes > 0 ? ` · dự kiến ${etaMinutes} phút` : ''}
          </Text>
        </View>
      ) : isEstimating ? (
        <View style={styles.routeFooterChip} testID="route-distance-chip">
          <IconRoute color={customerPalette.primary} size={14} />
          <Text style={styles.routeFooter}>Đang tính lộ trình…</Text>
        </View>
      ) : null}

      {/* Dòng cảnh báo màu đỏ tinh tế phía dưới card (thay vì viền đỏ dày cả card) */}
      {(routeError || isIdentical) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {routeError || 'Điểm giao hàng không được trùng với điểm lấy hàng'}
          </Text>
        </View>
      )}

      {/* Grab-style Search Overlay Modal */}
      <BookingLocationSearchOverlay
        currentValue={currentSearchValue}
        onClose={handleCloseSearch}
        onPickOnMap={onPickOnMap}
        onSelectLocation={handleSelectLocation}
        target={activeTarget || 'pickup'}
        visible={activeTarget !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: -20,
    marginBottom: spacing.xs,
    zIndex: 10,
  },
  card: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    ...iosContinuousCurve,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
    minHeight: 40,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.hairline,
    minHeight: 38,
  },
  stopPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  rowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  indicatorCol: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenHalo: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success.text,
  },
  orangeHalo: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(242, 103, 34, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: customerPalette.accent,
  },
  redHalo: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redInnerSquare: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: colors.danger.text,
  },
  connectorLine: {
    width: 1.5,
    height: 22,
    backgroundColor: colors.operational.inkMuted,
    marginVertical: spacing.hairline,
  },
  addressTextCol: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  addressLine1: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  addressLine2: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    marginTop: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: 28,
  },
  addStopWrap: {
    marginTop: spacing.hairline,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingLeft: 28,
    minHeight: 34,
  },
  addStopBtnText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  removeStopBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeStopCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeFooterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    marginTop: spacing.xs,
    ...iosContinuousCurve,
  },
  routeFooter: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    textAlign: 'center',
  },
  errorBanner: {
    marginTop: spacing.xxs,
    alignItems: 'center',
  },
  errorText: {
    ...typeScale.footnote,
    color: colors.danger.text,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
  },
});
