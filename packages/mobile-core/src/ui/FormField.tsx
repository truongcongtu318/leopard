import { useId } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, control, leopardPalette, radius, spacing, typeScale } from '../theme/tokens';
import { AppText } from './AppText';

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
      <AppText nativeID={labelId} variant="subheadline" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        {...inputProps}
        accessibilityHint={accessibilityHint || undefined}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {hint ? (
        <AppText nativeID={hintId} variant="caption1" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
      <View style={styles.errorArea} testID="field-error-area">
        {error ? (
          <AppText accessibilityRole="alert" nativeID={errorId} variant="caption1" style={styles.error}>
            {error}
          </AppText>
        ) : (
          <AppText accessibilityElementsHidden variant="caption1" style={styles.error}>
            {' '}
          </AppText>
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
    // HIG Subheadline size with the semibold emphasis a field label needs.
    fontWeight: '600',
    color: leopardPalette.textSlateDark,
    flexShrink: 1,
  },
  input: {
    ...typeScale.body,
    backgroundColor: leopardPalette.inputBg,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.control,
    borderWidth: 1,
    color: leopardPalette.textSlateDark,
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputError: {
    borderColor: colors.danger.border,
    backgroundColor: colors.danger.background,
  },
  hint: {
    ...typeScale.caption1,
    color: leopardPalette.textMutedSlate,
    flexShrink: 1,
  },
  errorArea: {
    minHeight: typeScale.caption1.lineHeight,
  },
  error: {
    ...typeScale.caption1,
    color: colors.danger.text,
    flexShrink: 1,
  },
});
