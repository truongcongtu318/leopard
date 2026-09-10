import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const NUM_CELLS = 6;

export interface OtpSixCellInputProps {
  value: string;
  onChangeText: (code: string) => void;
  onComplete?: (code: string) => void;
  isSubmitting?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  testID?: string;
  inputTestID?: string;
}

export function OtpSixCellInput({
  value,
  onChangeText,
  onComplete,
  isSubmitting = false,
  hasError = false,
  autoFocus = true,
  editable = true,
  testID = 'otp-six-cell-input',
  inputTestID,
}: OtpSixCellInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Shake animation on error
  useEffect(() => {
    if (hasError) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 9,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(shakeAnim, {
          toValue: -9,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(shakeAnim, {
          toValue: 7,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(shakeAnim, {
          toValue: -7,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    }
  }, [hasError, shakeAnim]);

  // Subtle pulsing cursor for active cell
  useEffect(() => {
    if (isFocused && !isSubmitting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      cursorOpacity.setValue(1);
    }
  }, [isFocused, isSubmitting, cursorOpacity]);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, NUM_CELLS);
    onChangeText(cleaned);
    if (cleaned.length === NUM_CELLS) {
      onComplete?.(cleaned);
    }
  };

  const handleCellPress = () => {
    if (editable && !isSubmitting) {
      inputRef.current?.focus();
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Hidden high-performance single input capturing all keystrokes & paste */}
      <TextInput
        accessibilityLabel="Mã OTP"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={editable && !isSubmitting}
        keyboardType="number-pad"
        maxLength={NUM_CELLS}
        onBlur={() => setIsFocused(false)}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        ref={inputRef}
        style={styles.hiddenInput}
        testID={inputTestID ?? (testID ? `${testID}-input` : undefined)}
        textContentType="oneTimeCode"
        value={value}
      />

      {/* 6 Visual Cell Boxes */}
      <Animated.View
        style={[
          styles.cellsRow,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Array.from({ length: NUM_CELLS }).map((_, index) => {
          const digit = value[index] ?? '';
          const isCellFocused = isFocused && (index === value.length || (index === NUM_CELLS - 1 && value.length === NUM_CELLS));
          const isFilled = digit !== '';

          return (
            <Pressable
              accessible={false}
              key={`otp-cell-${index}`}
              onPress={handleCellPress}
              style={[
                styles.cell,
                isFilled && styles.cellFilled,
                isCellFocused && styles.cellFocused,
                hasError && styles.cellError,
                isSubmitting && styles.cellDisabled,
              ]}
            >
              {digit ? (
                <Text
                  style={[
                    styles.cellText,
                    hasError && styles.cellTextError,
                    isSubmitting && styles.cellTextSubmitting,
                  ]}
                >
                  {digit}
                </Text>
              ) : isCellFocused ? (
                <Animated.View
                  style={[
                    styles.cursorBar,
                    { opacity: cursorOpacity },
                    hasError && styles.cursorBarError,
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    fontSize: 1,
    color: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        caretColor: 'transparent',
      } as any,
    }),
  },
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cellFilled: {
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  cellFocused: {
    borderColor: '#2E6FD6',
    backgroundColor: '#F8FAFC',
    shadowColor: '#2E6FD6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cellError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  cellDisabled: {
    opacity: 0.65,
    backgroundColor: '#F1F5F9',
  },
  cellText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1F3A',
    textAlign: 'center',
  },
  cellTextError: {
    color: '#DC2626',
  },
  cellTextSubmitting: {
    color: '#64748B',
  },
  cursorBar: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: '#2E6FD6',
  },
  cursorBarError: {
    backgroundColor: '#EF4444',
  },
});
