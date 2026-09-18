import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewProps,
  Pressable,
} from 'react-native';
import { colors, radius, spacing, typeScale, iosContinuousCurve } from '../../theme/tokens';

export interface InputProps extends ViewProps {
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  children?: React.ReactNode;
}

export interface InputFieldProps extends TextInputProps {}
export interface InputSlotProps extends ViewProps {
  onPress?: () => void;
  children: React.ReactNode;
}

interface InputContextValue {
  size: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isInvalid?: boolean;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
}

const InputContext = React.createContext<InputContextValue>({
  size: 'md',
  isFocused: false,
  setIsFocused: () => {},
});

/**
 * Gluestack-compatible Input compound component for LEOPARD mobile apps.
 * Supports <Input><InputSlot /><InputField /></Input> structure according to Gluestack v5 patterns.
 */
export const Input: React.FC<InputProps> & {
  Field: React.ForwardRefExoticComponent<InputFieldProps & React.RefAttributes<TextInput>>;
  Slot: React.FC<InputSlotProps>;
} = ({
  size = 'md',
  isDisabled = false,
  isInvalid = false,
  style,
  children,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = [
    styles.container,
    styles[size],
    isFocused && styles.focused,
    isInvalid && styles.invalid,
    isDisabled && styles.disabled,
    style,
  ];

  return (
    <InputContext.Provider
      value={{ size, isDisabled, isInvalid, isFocused, setIsFocused }}
    >
      <View style={containerStyle} {...props}>
        {children}
      </View>
    </InputContext.Provider>
  );
};

export const InputField = React.forwardRef<TextInput, InputFieldProps>(
  ({ style, onFocus, onBlur, editable, ...props }, ref) => {
    const { size, isDisabled, isInvalid, setIsFocused } =
      React.useContext(InputContext);

    const isEditable = editable !== undefined ? editable : !isDisabled;

    return (
      <TextInput
        ref={ref}
        editable={isEditable}
        placeholderTextColor={colors.neutral.subtleText}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.field,
          styles[`${size}Text`],
          style,
        ]}
        {...props}
      />
    );
  }
);

InputField.displayName = 'InputField';

export const InputSlot: React.FC<InputSlotProps> = ({ onPress, style, children, ...props }) => {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.slot, style]} {...props}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.slot, style]} {...props}>
      {children}
    </View>
  );
};

Input.Field = InputField;
Input.Slot = InputSlot;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    overflow: 'hidden',
  },
  sm: {
    height: 38,
    paddingHorizontal: 10,
  },
  md: {
    height: 48,
    paddingHorizontal: 14,
  },
  lg: {
    height: 54,
    paddingHorizontal: 16,
  },
  focused: {
    borderColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  invalid: {
    borderColor: colors.danger.text,
  },
  disabled: {
    backgroundColor: colors.neutral.surfaceMuted,
    opacity: 0.6,
  },
  field: {
    flex: 1,
    height: '100%',
    color: colors.neutral.text,
    paddingVertical: 0,
  },
  smText: {
    ...typeScale.footnote,
  },
  mdText: {
    ...typeScale.body,
  },
  lgText: {
    ...typeScale.headline,
  },
  slot: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxs,
  },
});
