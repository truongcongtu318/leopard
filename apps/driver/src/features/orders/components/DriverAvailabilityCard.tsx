import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DriverAvailabilityView } from '../model';

export type DriverAvailabilityCardProps = Readonly<{
  availability: DriverAvailabilityView;
  onSetAvailability?: (commandId: string) => void;
}>;

export function DriverAvailabilityCard({
  availability,
  onSetAvailability,
}: DriverAvailabilityCardProps) {
  const isOnline = availability.status === 'AVAILABLE';
  const action = availability.action;
  const isPending = action?.isPending === true;
  const isDisabled = (action?.disabled === true) || isPending || !action;

  const handleToggle = () => {
    if (!isDisabled && action && onSetAvailability) {
      onSetAvailability(action.id);
    }
  };

  const toggleAccessibilityLabel = isPending
    ? 'Đang cập nhật trạng thái nhận đơn'
    : isOnline
      ? 'Tắt sẵn sàng'
      : 'Bật sẵn sàng';

  return (
    <View style={styles.container}>
      <Text style={styles.dutyLabel}>Trạng thái nhận đơn</Text>
      <Pressable
        accessibilityLabel={toggleAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isPending, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.capsuleBtn,
          isOnline ? styles.capsuleOnline : styles.capsuleOffline,
          pressed && !isDisabled ? styles.pressed : null,
        ]}
        testID="driver-availability-toggle"
      >
        <View
          style={[
            styles.statusDot,
            isOnline ? styles.statusDotOnline : styles.statusDotOffline,
            isPending ? styles.statusDotPending : null,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            isOnline ? styles.statusTextOnline : styles.statusTextOffline,
          ]}
        >
          {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
        </Text>
      </Pressable>
      {availability.error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {availability.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dutyLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  capsuleBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 38,
    paddingHorizontal: 12,
  },
  capsuleOnline: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  capsuleOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  statusDotOnline: {
    backgroundColor: '#16A34A',
  },
  statusDotOffline: {
    backgroundColor: '#94A3B8',
  },
  statusDotPending: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  statusTextOnline: {
    color: '#15803D',
  },
  statusTextOffline: {
    color: '#475569',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 10,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
