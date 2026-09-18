import React from 'react';
import {
  Modal as RNModal,
  ModalProps as RNModalProps,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from 'react-native';
import { radius, colors, iosContinuousCurve, spacing } from '../../theme/tokens';

export interface ActionsheetProps extends RNModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const ActionsheetContext = React.createContext<{ onClose: () => void }>({ onClose: () => {} });

export const Actionsheet: React.FC<ActionsheetProps> & {
  Backdrop: React.FC<ViewProps>;
  Content: React.FC<ViewProps>;
  DragIndicator: React.FC<ViewProps>;
  Item: React.FC<PressableProps & { children: React.ReactNode }>;
  ItemText: React.FC<{ children: React.ReactNode; style?: any }>;
} = ({
  isOpen,
  onClose,
  animationType = 'slide',
  children,
  ...props
}) => {
  return (
    <RNModal
      animationType={animationType}
      onRequestClose={onClose}
      transparent
      visible={isOpen}
      {...props}
    >
      <ActionsheetContext.Provider value={{ onClose }}>
        <View style={styles.overlay}>
          {children}
        </View>
      </ActionsheetContext.Provider>
    </RNModal>
  );
};

const ActionsheetBackdrop: React.FC<ViewProps> = ({ style, ...props }) => {
  const { onClose } = React.useContext(ActionsheetContext);
  return (
    <Pressable
      onPress={onClose}
      style={[StyleSheet.absoluteFill, styles.backdrop, style]}
      {...props}
    />
  );
};

const ActionsheetContent: React.FC<ViewProps> = ({ style, children, ...props }) => {
  return (
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={[styles.content, style]}
      {...props}
    >
      <View style={styles.dragIndicatorWrapper}>
        <View style={styles.dragIndicator} />
      </View>
      <View>{children}</View>
    </Pressable>
  );
};

const ActionsheetDragIndicator: React.FC<ViewProps> = ({ style, ...props }) => {
  return <View style={[styles.dragIndicator, style]} {...props} />;
};

type PressableProps = React.ComponentProps<typeof Pressable>;

const ActionsheetItem: React.FC<PressableProps & { children: React.ReactNode }> = ({
  onPress,
  style,
  children,
  ...props
}) => {
  const { onClose } = React.useContext(ActionsheetContext);

  return (
    <Pressable
      onPress={(e) => {
        onPress?.(e);
        onClose();
      }}
      style={({ pressed }) => [
        styles.item,
        pressed ? styles.itemPressed : null,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};

const ActionsheetItemText: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  return <Text style={[styles.itemText, style]}>{children}</Text>;
};

Actionsheet.Backdrop = ActionsheetBackdrop;
Actionsheet.Content = ActionsheetContent;
Actionsheet.DragIndicator = ActionsheetDragIndicator;
Actionsheet.Item = ActionsheetItem;
Actionsheet.ItemText = ActionsheetItemText;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    width: '100%',
    backgroundColor: colors.neutral.surface,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '80%',
  },
  dragIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.control,
  },
  itemPressed: {
    backgroundColor: colors.neutral.surfaceMuted,
  },
  itemText: {
    fontSize: 16,
    color: colors.neutral.text,
  },
});
