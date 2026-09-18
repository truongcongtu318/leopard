import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewProps } from 'react-native';
import { radius, colors, iosContinuousCurve, spacing } from '../../theme/tokens';

export interface CheckboxProps extends ViewProps {
  value: string;
  isChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
  children?: React.ReactNode;
}

const CheckboxContext = React.createContext<{
  isChecked: boolean;
  isDisabled: boolean;
}>({
  isChecked: false,
  isDisabled: false,
});

export const Checkbox: React.FC<CheckboxProps> & {
  Indicator: React.FC<ViewProps>;
  Icon: React.FC<{ children?: React.ReactNode }>;
  Label: React.FC<{ children: React.ReactNode; style?: any }>;
} = ({
  isChecked = false,
  onChange,
  isDisabled = false,
  isInvalid = false,
  style,
  children,
  ...props
}) => {
  return (
    <CheckboxContext.Provider value={{ isChecked, isDisabled }}>
      <Pressable
        disabled={isDisabled}
        onPress={() => onChange?.(!isChecked)}
        style={[styles.container, isDisabled && styles.disabled, style]}
        {...props}
      >
        {children}
      </Pressable>
    </CheckboxContext.Provider>
  );
};

const CheckboxIndicator: React.FC<ViewProps> = ({ style, children, ...props }) => {
  const { isChecked } = React.useContext(CheckboxContext);

  return (
    <View
      style={[
        styles.indicator,
        isChecked && styles.indicatorChecked,
        style,
      ]}
      {...props}
    >
      {isChecked ? children || <Text style={styles.checkMark}>✓</Text> : null}
    </View>
  );
};

const CheckboxIcon: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <>{children || <Text style={styles.checkMark}>✓</Text>}</>;
};

const CheckboxLabel: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  return <Text style={[styles.label, style]}>{children}</Text>;
};

Checkbox.Indicator = CheckboxIndicator;
Checkbox.Icon = CheckboxIcon;
Checkbox.Label = CheckboxLabel;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1.5,
    borderColor: colors.neutral.subtleBorder,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    color: colors.neutral.text,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
