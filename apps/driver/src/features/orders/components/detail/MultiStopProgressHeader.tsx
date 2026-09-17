import React, { memo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type StopItem = Readonly<{
  id: string;
  title: string;
  status: 'completed' | 'active' | 'pending';
}>;

export type MultiStopProgressHeaderProps = Readonly<{
  stops: StopItem[];
}>;

export const MultiStopProgressHeader = memo(function MultiStopProgressHeader({
  stops,
}: MultiStopProgressHeaderProps) {
  return (
    <View style={styles.container} testID="multi-stop-progress-header">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stops.map((stop, index) => {
          const isCompleted = stop.status === 'completed';
          const isActive = stop.status === 'active';

          return (
            <React.Fragment key={stop.id}>
              <View
                style={[
                  styles.stopChip,
                  isCompleted
                    ? styles.stopChipCompleted
                    : isActive
                      ? styles.stopChipActive
                      : styles.stopChipPending,
                ]}
                testID={`stop-chip-${stop.id}`}
              >
                <Text
                  style={[
                    styles.stopChipText,
                    isCompleted
                      ? styles.stopTextCompleted
                      : isActive
                        ? styles.stopTextActive
                        : styles.stopTextPending,
                  ]}
                >
                  {isCompleted ? '✓ ' : isActive ? '● ' : '○ '}
                  {stop.title}
                </Text>
              </View>

              {index < stops.length - 1 ? (
                <View style={styles.separator}>
                  <Text style={styles.separatorLine}>──</Text>
                </View>
              ) : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
  },
  stopChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stopChipCompleted: {
    backgroundColor: '#E8F8EE',
    borderColor: '#34C759',
  },
  stopChipActive: {
    backgroundColor: '#0B2545',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  stopChipPending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  stopChipText: {
    ...typeScale.footnote,
    fontWeight: '700',
  },
  stopTextCompleted: {
    color: '#008038',
  },
  stopTextActive: {
    color: '#FFFFFF',
  },
  stopTextPending: {
    color: '#94A3B8',
  },
  separator: {
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorLine: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
});
