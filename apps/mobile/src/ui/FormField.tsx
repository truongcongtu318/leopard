import { useId } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, control, radius, spacing, typography } from '../theme/tokens';

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
  error?: string;
};

export function FormField({ label, hint, error, ...inputProps }: FormFieldProps) {
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const accessibilityHint = [hint, error].filter(Boolean).join('. ');

  return (
    <View style={styles.container}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityHint={accessibilityHint || undefined}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {hint ? (
        <Text nativeID={hintId} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      <View style={styles.errorArea} testID="field-error-area">
        {error ? (
          <Text accessibilityRole="alert" nativeID={errorId} style={styles.error}>
            {error}
          </Text>
        ) : (
          <Text accessibilityElementsHidden style={styles.error}>
            {' '}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.neutral.text,
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputError: {
    borderColor: colors.danger.border,
  },
  hint: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  errorArea: {
    minHeight: typography.caption.lineHeight,
  },
  error: {
    ...typography.caption,
    color: colors.danger.text,
    flexShrink: 1,
  },
});
