import React from 'react';
import {
  Modal as RNModal,
  ModalProps as RNModalProps,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
  Platform,
} from 'react-native';
import { radius, colors, iosContinuousCurve, spacing, typeScale } from '../../theme/tokens';

export interface ModalProps extends RNModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children?: React.ReactNode;
}

const ModalContext = React.createContext<{ onClose: () => void }>({ onClose: () => {} });

export const Modal: React.FC<ModalProps> & {
  Backdrop: React.FC<ViewProps>;
  Content: React.FC<ViewProps>;
  Header: React.FC<ViewProps>;
  Body: React.FC<ViewProps>;
  Footer: React.FC<ViewProps>;
  CloseButton: React.FC<{ children?: React.ReactNode }>;
} = ({
  isOpen,
  onClose,
  size = 'md',
  animationType = 'fade',
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
      <ModalContext.Provider value={{ onClose }}>
        <View style={styles.overlay}>
          {children}
        </View>
      </ModalContext.Provider>
    </RNModal>
  );
};

const ModalBackdrop: React.FC<ViewProps> = ({ style, ...props }) => {
  const { onClose } = React.useContext(ModalContext);
  return (
    <Pressable
      onPress={onClose}
      style={[StyleSheet.absoluteFill, styles.backdrop, style]}
      {...props}
    />
  );
};

const ModalContent: React.FC<ViewProps> = ({ style, children, ...props }) => {
  return (
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={[styles.content, style]}
      {...props}
    >
      {children}
    </Pressable>
  );
};

const ModalHeader: React.FC<ViewProps> = ({ style, children, ...props }) => {
  return <View style={[styles.header, style]} {...props}>{children}</View>;
};

const ModalBody: React.FC<ViewProps> = ({ style, children, ...props }) => {
  return <View style={[styles.body, style]} {...props}>{children}</View>;
};

const ModalFooter: React.FC<ViewProps> = ({ style, children, ...props }) => {
  return <View style={[styles.footer, style]} {...props}>{children}</View>;
};

const ModalCloseButton: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { onClose } = React.useContext(ModalContext);
  return (
    <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
      {children || <Text style={styles.closeBtnText}>✕</Text>}
    </Pressable>
  );
};

Modal.Backdrop = ModalBackdrop;
Modal.Content = ModalContent;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.CloseButton = ModalCloseButton;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.neutral.mutedText,
    fontWeight: 'bold',
  },
});
