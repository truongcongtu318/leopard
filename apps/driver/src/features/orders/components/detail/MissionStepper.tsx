import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconCheck, leopardPalette, spacing } from '@leopard/mobile-core';

export type MissionStepperProps = Readonly<{
  status: string;
}>;

export function MissionStepper({ status }: MissionStepperProps) {
  let activeIndex = 0;
  if (status === 'PICKING_UP') activeIndex = 1;
  else if (status === 'PICKED_UP' || status === 'IN_TRANSIT') activeIndex = 2;
  else if (status === 'DELIVERED') {
    activeIndex = 3;
  }

  const steps = [
    { label: 'Nhận đơn (ACCEPTED)', index: 0 },
    { label: 'Lấy hàng (PICKING_UP)', index: 1 },
    { label: 'Vận chuyển (IN_TRANSIT)', index: 2 },
    { label: 'Giao hàng (DELIVERED)', index: 3 },
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
                  <IconCheck color="#FFFFFF" size={12} strokeWidth={2.5} />
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    backgroundColor: '#0B1E42',
    borderColor: '#F97316',
    borderWidth: 2,
  },
  stepDotPast: {
    backgroundColor: '#10B981',
  },
  stepDotFuture: {
    backgroundColor: '#E2E8F0',
  },
  stepDotNumber: {
    fontSize: 10,
    fontWeight: '800',
  },
  stepDotNumberActive: {
    color: '#FFFFFF',
  },
  stepDotNumberFuture: {
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: '#0B1E42',
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
    backgroundColor: '#E2E8F0',
  },
});
