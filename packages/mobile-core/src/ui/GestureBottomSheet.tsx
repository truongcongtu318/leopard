import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Animated,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

export interface GestureBottomSheetProps {
  /**
   * Array of snap points expressed as fractions of container height (e.g. [0.18, 0.52, 0.92]).
   * Must be sorted in ascending order.
   * Defaults to [0.18, 0.52, 0.92].
   */
  snapPoints?: number[];

  /**
   * Initial snap point index.
   * Defaults to 1 (i.e. 0.52 - 52%).
   */
  initialSnapIndex?: number;

  /**
   * Callback invoked when sheet settles on a snap point.
   */
  onSnapChange?: (index: number, snapPoint: number) => void;

  /**
   * Children components rendered inside bottom sheet.
   */
  children: React.ReactNode;

  /**
   * Optional test identifier.
   */
  testID?: string;

  /**
   * Optional custom container height override (defaults to window height).
   */
  containerHeight?: number;

  /**
   * Optional custom sheet container style.
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Optional custom handle container style.
   */
  handleStyle?: StyleProp<ViewStyle>;

  /**
   * Optional custom content container style.
   */
  contentStyle?: StyleProp<ViewStyle>;
}

export interface GestureBottomSheetRef {
  /**
   * Programmatically snap bottom sheet to specified index.
   */
  snapToIndex: (index: number) => void;

  /**
   * Expand bottom sheet to top-most snap point (e.g. 0.92).
   */
  expand: () => void;

  /**
   * Collapse bottom sheet to lowest snap point (e.g. 0.18).
   */
  collapse: () => void;
}

const DEFAULT_SNAP_POINTS = [0.18, 0.52, 0.92];
const DEFAULT_INITIAL_INDEX = 1;

/**
 * Primitive GestureBottomSheet
 * Pure React Native Animated + PanResponder bottom sheet with 3 snap points,
 * top 32px rounded corners, pill drag handle, and soft elevation shadow.
 *
 * Designed to cleanly pass Jest tests without native Reanimated dependencies.
 */
export const GestureBottomSheet = forwardRef<
  GestureBottomSheetRef,
  GestureBottomSheetProps
>(function GestureBottomSheet(
  {
    snapPoints = DEFAULT_SNAP_POINTS,
    initialSnapIndex = DEFAULT_INITIAL_INDEX,
    onSnapChange,
    children,
    testID = 'gesture-bottom-sheet',
    containerHeight,
    style,
    handleStyle,
    contentStyle,
  },
  ref
) {
  const { height: windowHeight } = useWindowDimensions();
  const effectiveHeight = containerHeight || windowHeight || 800;

  // Ensure snapPoints is valid and non-empty
  const safeSnapPoints = useMemo(() => {
    return snapPoints && snapPoints.length > 0
      ? snapPoints
      : DEFAULT_SNAP_POINTS;
  }, [snapPoints]);

  const activeIndexRef = useRef(
    Math.max(0, Math.min(initialSnapIndex, safeSnapPoints.length - 1))
  );

  const getTranslateYForSnap = (snapFraction: number) => {
    return effectiveHeight * (1 - snapFraction);
  };

  const currentTranslateY = useRef(
    getTranslateYForSnap(safeSnapPoints[activeIndexRef.current])
  );

  const translateYAnim = useRef(
    new Animated.Value(currentTranslateY.current)
  ).current;

  const animateToSnap = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, safeSnapPoints.length - 1));
    const targetY = getTranslateYForSnap(safeSnapPoints[clampedIndex]);

    Animated.spring(translateYAnim, {
      toValue: targetY,
      damping: 24,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: false,
    }).start(() => {
      currentTranslateY.current = targetY;
      activeIndexRef.current = clampedIndex;
      onSnapChange?.(clampedIndex, safeSnapPoints[clampedIndex]);
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      snapToIndex: (index: number) => animateToSnap(index),
      expand: () => animateToSnap(safeSnapPoints.length - 1),
      collapse: () => animateToSnap(0),
    }),
    [safeSnapPoints, effectiveHeight]
  );

  // Update position if safeSnapPoints or initialSnapIndex changes
  useEffect(() => {
    const targetIdx = Math.max(
      0,
      Math.min(initialSnapIndex, safeSnapPoints.length - 1)
    );
    activeIndexRef.current = targetIdx;
    const targetY = getTranslateYForSnap(safeSnapPoints[targetIdx]);
    currentTranslateY.current = targetY;
    translateYAnim.setValue(targetY);
  }, [safeSnapPoints, initialSnapIndex, effectiveHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          translateYAnim.stopAnimation((value) => {
            currentTranslateY.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const minY = getTranslateYForSnap(
            safeSnapPoints[safeSnapPoints.length - 1]
          );
          const maxY = getTranslateYForSnap(safeSnapPoints[0]);
          const newY = Math.max(
            minY - 30,
            Math.min(maxY + 30, currentTranslateY.current + gestureState.dy)
          );
          translateYAnim.setValue(newY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentY = currentTranslateY.current + gestureState.dy;
          const projectedY = currentY + (gestureState.vy || 0) * 50;

          let targetIndex = 0;
          let closestDist = Infinity;

          safeSnapPoints.forEach((snap, idx) => {
            const snapY = getTranslateYForSnap(snap);
            const dist = Math.abs(projectedY - snapY);
            if (dist < closestDist) {
              closestDist = dist;
              targetIndex = idx;
            }
          });

          animateToSnap(targetIndex);
        },
      }),
    [safeSnapPoints, effectiveHeight]
  );

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.sheet,
        {
          height: effectiveHeight,
          transform: [{ translateY: translateYAnim }],
        },
        style,
      ]}
    >
      {/* Drag Handle Area */}
      <View
        {...panResponder.panHandlers}
        testID={`${testID}-handle`}
        style={[styles.handleArea, handleStyle]}
      >
        <View testID={`${testID}-indicator`} style={styles.handleIndicator} />
      </View>

      {/* Content Container */}
      <View testID={`${testID}-content`} style={[styles.content, contentStyle]}>
        {children}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 40,
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: '#CBD5E1',
  },
  content: {
    flex: 1,
  },
});
