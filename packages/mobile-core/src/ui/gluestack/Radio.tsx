import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewProps } from 'react-native';
import { radius, colors, iosContinuousCurve, spacing } from '../../theme/tokens';

export interface RadioGroupProps extends ViewProps {
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface RadioProps extends ViewProps {
  value: string;
  isDisabled?: boolean;
  children: React.ReactNode;
}

const RadioGroupContext = React.createContext<{
  selectedValue?: string;
  onChange?: (value: string) => void;
}>({});

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, onChange, style, children, ...props }) => {
  return (
    <RadioGroupContext.Provider value={{ selectedValue: value, onChange }}>
      <View style={[styles.group, style]} {...props}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
};

export const Radio: React.FC<RadioProps> & {
  Indicator: React.FC<ViewProps>;
  Icon: React.FC<ViewProps>;
  Label: React.FC<{ children: React.ReactNode; style?: any }>;
} = ({ value, isDisabled = false, style, children, ...props }) => {
  const { selectedValue, onChange } = React.useContext(RadioGroupContext);
  const isSelected = selectedValue === value;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={() => onChange?.(value)}
      style={[styles.radioRow, isDisabled && styles.disabled, style]}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { isSelected });
        }
        return child;
      })}
    </Pressable>
  );
};

const RadioIndicator: React.FC<ViewProps & { isSelected?: boolean }> = ({ isSelected, style, children, ...props }) => {
  return (
    <View
      style={[
        styles.indicator,
        isSelected && styles.indicatorSelected,
        style,
      ]}
      {...props}
    >
      {isSelected ? children || <View style={styles.iconDot} /> : null}
    </View>
  );
};

const RadioIcon: React.FC<ViewProps> = ({ style, ...props }) => {
  return <View style={[styles.iconDot, style]} {...props} />;
};

const RadioLabel: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  return <Text style={[styles.label, style]}>{children}</Text>;
};

Radio.Indicator = RadioIndicator;
Radio.Icon = RadioIcon;
Radio.Label = RadioLabel;

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.subtleBorder,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    borderColor: colors.brand.primary,
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary,
  },
  label: {
    color: colors.neutral.text,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
