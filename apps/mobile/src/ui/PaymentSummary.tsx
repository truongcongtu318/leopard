import type { PaymentStatus } from '@leopard/shared';
import type { PressableProps } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';
import { Button } from './Button';
import { SectionHeading } from './ScreenScaffold';
import { StatusBadge } from './StatusBadge';

export type PaymentAction = Readonly<{
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  loadingLabel?: string;
  onPress: PressableProps['onPress'];
}>;

export type PaymentSummaryProps = Readonly<{
  action?: PaymentAction;
  amountLabel?: string;
  expiresAtLabel?: string;
  referenceLabel?: string;
  sourceLabel?: string;
  status: PaymentStatus;
}>;

type PaymentFieldProps = Readonly<{
  label: string;
  value: string;
}>;

function PaymentField({ label, value }: PaymentFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function PaymentSummary({
  action,
  amountLabel,
  expiresAtLabel,
  referenceLabel,
  sourceLabel,
  status,
}: PaymentSummaryProps) {
  return (
    <View style={styles.container}>
      <SectionHeading title="Thanh toán" />
      <StatusBadge domain="payment" status={status} />
      <View style={styles.fields}>
        {amountLabel ? <PaymentField label="Số tiền" value={amountLabel} /> : null}
        {referenceLabel ? <PaymentField label="Mã tham chiếu" value={referenceLabel} /> : null}
        {expiresAtLabel ? <PaymentField label="Hết hạn" value={expiresAtLabel} /> : null}
        {sourceLabel ? <PaymentField label="Nguồn" value={sourceLabel} /> : null}
      </View>
      {action ? (
        <Button
          disabled={action.disabled}
          isLoading={action.isLoading}
          label={action.label}
          loadingLabel={action.loadingLabel}
          onPress={action.onPress}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    borderTopColor: colors.neutral.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  fields: {
    gap: spacing.xs,
  },
  field: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  fieldValue: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
    textAlign: 'right',
  },
});
