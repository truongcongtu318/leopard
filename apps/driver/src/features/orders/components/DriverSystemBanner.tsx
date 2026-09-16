import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, IconAlertTriangle, IconShieldAlert } from '@leopard/mobile-core';
import type { IdlePingHealth } from '../idle-location-ping';

export type DriverSystemBannerProps = Readonly<{
  idlePingHealth?: IdlePingHealth;
  isOnline?: boolean;
  hasActiveTrip?: boolean;
  networkError?: string | null;
  onRetry?: () => void;
}>;

export function DriverSystemBanner({
  hasActiveTrip = false,
  idlePingHealth = 'healthy',
  isOnline = false,
  networkError = null,
  onRetry,
}: DriverSystemBannerProps) {
  const isRadarUnhealthy =
    isOnline &&
    !hasActiveTrip &&
    (idlePingHealth === 'permission-denied' || idlePingHealth === 'stale');

  if (!isRadarUnhealthy && !networkError) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      {/* Radar health warning */}
      {isRadarUnhealthy ? (
        <Pressable
          accessibilityHint={
            idlePingHealth === 'permission-denied'
              ? 'Mở cài đặt để cấp quyền vị trí'
              : undefined
          }
          accessibilityLabel={
            idlePingHealth === 'permission-denied'
              ? 'Chưa cấp quyền vị trí — bạn đang ẩn khỏi radar điều phối'
              : 'Tín hiệu vị trí gián đoạn — bạn có thể đang ẩn khỏi radar điều phối'
          }
          accessibilityRole="button"
          onPress={
            idlePingHealth === 'permission-denied'
              ? () => {
                  try {
                    void Linking.openSettings();
                  } catch {
                    // safe fallback
                  }
                }
              : undefined
          }
          style={styles.radarWarningBanner}
          testID="radar-health-warning"
        >
          <IconShieldAlert color="#DC2626" size={16} />
          <Text style={styles.radarWarningText}>
            {idlePingHealth === 'permission-denied'
              ? 'Chưa cấp quyền vị trí — bạn đang ẩn khỏi radar. Chạm để mở cài đặt.'
              : 'Tín hiệu vị trí gián đoạn — bạn có thể đang ẩn khỏi radar điều phối.'}
          </Text>
        </Pressable>
      ) : null}

      {/* Network / refetch error banner */}
      {networkError ? (
        <View accessibilityRole="alert" style={styles.networkErrorBanner}>
          <View style={styles.networkErrorLeft}>
            <IconAlertTriangle color="#D97706" size={16} />
            <Text style={styles.networkErrorText}>
              Mất kết nối — dữ liệu có thể chưa được cập nhật
            </Text>
          </View>
          {onRetry ? (
            <Pressable
              accessibilityLabel="Thử lại kết nối"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onRetry}
              style={({ pressed }) => [styles.retryBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginBottom: 12,
  },
  radarWarningBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radarWarningText: {
    color: '#991B1B',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  networkErrorBanner: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  networkErrorLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  networkErrorText: {
    color: '#92400E',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  retryBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FDE68A',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  retryBtnText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
