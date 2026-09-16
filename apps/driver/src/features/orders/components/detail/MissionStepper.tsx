import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  IconCheck,
  colors,
  leopardPalette,
  spacing,
} from '@leopard/mobile-core';

export type MissionStepperProps = Readonly<{
  status: string;
}>;

export function MissionStepper({ status }: MissionStepperProps) {
  let activeIndex = 0;
  if (status === 'PICKING_UP') activeIndex = 1;
  else if (status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'RETURNING') activeIndex = 2;
  else if (status === 'DELIVERED' || status === 'RETURNED') {
    activeIndex = 3;
  }

  const isReturningFlow = status === 'RETURNING' || status === 'RETURNED';
  const steps = [
    { label: 'Nhận đơn (ACCEPTED)', index: 0 },
    { label: 'Lấy hàng (PICKING_UP)', index: 1 },
    { label: isReturningFlow ? 'Hoàn hàng (RETURNING)' : 'Vận chuyển (IN_TRANSIT)', index: 2 },
    { label: isReturningFlow ? 'Đã hoàn (RETURNED)' : 'Giao hàng (DELIVERED)', index: 3 },
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, idx) => {
        const isCurrent = idx === activeIndex;
        const isPast = idx < activeIndex;
        return (
          <React.Fragment key={step.index}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isCurrent
                    ? styles.stepDotCurrent
                    : isPast
                      ? styles.stepDotPast
                      : styles.stepDotFuture,
                ]}
              >
                {isPast ? (
                  <IconCheck color={colors.neutral.surface} size={12} strokeWidth={2.5} />
                ) : (
                  <Text
                    style={[
                      styles.stepDotNumber,
                      isCurrent || isPast
                        ? styles.stepDotNumberActive
                        : styles.stepDotNumberFuture,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent
                    ? styles.stepLabelCurrent
                    : isPast
                      ? styles.stepLabelPast
                      : styles.stepLabelFuture,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  idx < activeIndex ? styles.stepLineActive : styles.stepLineFuture,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  stepDotCurrent: {
    backgroundColor: leopardPalette.primary,
    borderColor: '#F97316',
    borderWidth: 2,
  },
  stepDotPast: {
    backgroundColor: '#10B981',
  },
  stepDotFuture: {
    backgroundColor: colors.neutral.border,
  },
  stepDotNumber: {
    fontSize: 10,
    fontWeight: '800',
  },
  stepDotNumberActive: {
    color: colors.neutral.surface,
  },
  stepDotNumberFuture: {
    color: colors.neutral.subtleText,
  },
  stepLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: leopardPalette.primary,
    fontWeight: '800',
  },
  stepLabelPast: {
    color: '#10B981',
  },
  stepLabelFuture: {
    color: '#94A3B8',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginTop: -16,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  stepLineFuture: {
    backgroundColor: colors.neutral.border,
  },
});
