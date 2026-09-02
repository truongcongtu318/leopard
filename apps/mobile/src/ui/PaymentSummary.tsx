import type { PaymentStatus } from '@leopard/shared';
import type { PressableProps } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, leopardElevation, leopardPalette, leopardRadius, spacing, typography } from '../theme/tokens';
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
  notice?: string | null;
  referenceLabel?: string;
  sourceLabel?: string;
  status: PaymentStatus;
}>;

type PaymentFieldProps = Readonly<{
  label: string;
  value: string;
  isAmount?: boolean;
}>;

function PaymentField({ isAmount, label, value }: PaymentFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, isAmount && styles.amountValue]}>{value}</Text>
    </View>
  );
}

export function PaymentSummary({
  action,
  amountLabel,
  expiresAtLabel,
  notice,
  referenceLabel,
  sourceLabel,
  status,
}: PaymentSummaryProps) {
  return (
    <View style={styles.container}>
      <SectionHeading title="Thanh toán" />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <StatusBadge domain="payment" status={status} />
        </View>
        <View style={styles.fields}>
          {amountLabel ? <PaymentField isAmount label="Số tiền" value={amountLabel} /> : null}
          {referenceLabel ? <PaymentField label="Mã tham chiếu" value={referenceLabel} /> : null}
          {expiresAtLabel ? <PaymentField label="Hết hạn" value={expiresAtLabel} /> : null}
          {sourceLabel ? <PaymentField label="Nguồn" value={sourceLabel} /> : null}
        </View>
        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
        {action ? (
          <View style={styles.actionContainer}>
            <Button
              disabled={action.disabled}
              isLoading={action.isLoading}
              label={action.label}
              loadingLabel={action.loadingLabel}
              onPress={action.onPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: leopardRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    ...leopardElevation.subtle,
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  fields: {
    gap: spacing.sm,
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
    color: leopardPalette.textMutedSlate,
    flexShrink: 1,
  },
  fieldValue: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    flexShrink: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontVariant: ['tabular-nums'],
    fontSize: 17,
    fontWeight: '700',
    color: leopardPalette.primary,
  },
  noticeBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    color: colors.warning.text,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
});
