import React, { useEffect, type PropsWithChildren } from 'react';
import { type AccessibilityRole, Modal, Platform, StyleSheet, View } from 'react-native';

export type DriverModalSurfaceProps = PropsWithChildren<{
  visible: boolean;
  onRequestClose?: () => void;
  animationType?: 'none' | 'slide' | 'fade';
  transparent?: boolean;
  statusBarTranslucent?: boolean;
  hardwareAccelerated?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}>;

export function DriverModalSurface({
  accessibilityLabel,
  accessibilityRole,
  animationType = 'none',
  children,
  hardwareAccelerated,
  onRequestClose,
  statusBarTranslucent,
  testID,
  transparent = true,
  visible,
}: DriverModalSurfaceProps): React.JSX.Element | null {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !onRequestClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onRequestClose();
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible, onRequestClose]);

  if (Platform.OS !== 'web') {
    return (
      <Modal
        accessibilityLabel={accessibilityLabel}
        animationType={animationType}
        hardwareAccelerated={hardwareAccelerated}
        onRequestClose={onRequestClose}
        statusBarTranslucent={statusBarTranslucent}
        testID={testID}
        transparent={transparent}
        visible={visible}
      >
        {children}
      </Modal>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityViewIsModal={true}
      aria-modal={true}
      style={[StyleSheet.absoluteFill, styles.webModalSurface]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  webModalSurface: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
