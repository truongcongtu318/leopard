import React from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  ViewProps,
} from 'react-native';
import { radius, colors, iosContinuousCurve, spacing, typeScale } from '../../theme/tokens';

export interface TextareaProps extends ViewProps {
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isInvalid?: boolean;
  children?: React.ReactNode;
}

export interface TextareaInputProps extends TextInputProps {}

export const Textarea: React.FC<TextareaProps> & {
  Input: React.ForwardRefExoticComponent<TextareaInputProps & React.RefAttributes<TextInput>>;
} = ({
  size = 'md',
  isDisabled = false,
  isInvalid = false,
  style,
  children,
  ...props
}) => {
  return (
    <View
      style={[
        styles.container,
        isInvalid && styles.invalid,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const TextareaInput = React.forwardRef<TextInput, TextareaInputProps>(
  ({ style, numberOfLines = 4, editable = true, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        editable={editable}
        multiline
        numberOfLines={numberOfLines}
        placeholderTextColor={colors.neutral.subtleText}
        style={[styles.input, style]}
        textAlignVertical="top"
        {...props}
      />
    );
  }
);

TextareaInput.displayName = 'TextareaInput';

Textarea.Input = TextareaInput;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    padding: spacing.sm,
    minHeight: 100,
  },
  invalid: {
    borderColor: colors.danger.text,
  },
  disabled: {
    backgroundColor: colors.neutral.surfaceMuted,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: colors.neutral.text,
    ...typeScale.body,
    padding: 0,
  },
});
