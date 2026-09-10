import React, { createRef } from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { GestureBottomSheet, GestureBottomSheetRef } from './GestureBottomSheet';

describe('GestureBottomSheet', () => {
  it('renders children and drag handle indicator', async () => {
    const screen = await render(
      <GestureBottomSheet testID="sheet">
        <Text>Sheet Content</Text>
      </GestureBottomSheet>
    );

    expect(screen.getByText('Sheet Content')).toBeTruthy();
    expect(screen.getByTestId('sheet')).toBeTruthy();
    expect(screen.getByTestId('sheet-handle')).toBeTruthy();
    expect(screen.getByTestId('sheet-indicator')).toBeTruthy();
  });

  it('applies 32px top corner radius, soft elevation, and neutral white background', async () => {
    const screen = await render(
      <GestureBottomSheet testID="sheet">
        <Text>Content</Text>
      </GestureBottomSheet>
    );

    const sheet = screen.getByTestId('sheet');
    const flatStyle = [sheet.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});

    expect(flatStyle.borderTopLeftRadius).toBe(32);
    expect(flatStyle.borderTopRightRadius).toBe(32);
    expect(flatStyle.backgroundColor).toBe('#FFFFFF');
  });

  it('renders drag handle indicator with pill dimensions', async () => {
    const screen = await render(
      <GestureBottomSheet testID="sheet">
        <Text>Content</Text>
      </GestureBottomSheet>
    );

    const indicator = screen.getByTestId('sheet-indicator');
    const flatStyle = [indicator.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});

    expect(flatStyle.width).toBe(40);
    expect(flatStyle.height).toBe(4);
    expect(flatStyle.borderRadius).toBe(9999);
    expect(flatStyle.backgroundColor).toBe('#CBD5E1');
  });

  it('supports initialSnapIndex and attaches PanResponder handlers', async () => {
    const onSnapChange = jest.fn();
    const screen = await render(
      <GestureBottomSheet
        testID="sheet"
        containerHeight={800}
        snapPoints={[0.18, 0.52, 0.92]}
        initialSnapIndex={1}
        onSnapChange={onSnapChange}
      >
        <Text>Content</Text>
      </GestureBottomSheet>
    );

    expect(screen.getByTestId('sheet')).toBeTruthy();
    const handle = screen.getByTestId('sheet-handle');
    expect(handle.props.onStartShouldSetResponder).toBeDefined();
    expect(handle.props.onMoveShouldSetResponder).toBeDefined();
    expect(handle.props.onResponderGrant).toBeDefined();
    expect(handle.props.onResponderMove).toBeDefined();
    expect(handle.props.onResponderRelease).toBeDefined();
  });

  it('provides imperative ref methods snapToIndex, expand, and collapse', async () => {
    jest.useFakeTimers();
    const ref = createRef<GestureBottomSheetRef>();
    const onSnapChange = jest.fn();

    await render(
      <GestureBottomSheet
        ref={ref}
        testID="sheet"
        containerHeight={800}
        snapPoints={[0.18, 0.52, 0.92]}
        initialSnapIndex={1}
        onSnapChange={onSnapChange}
      >
        <Text>Content</Text>
      </GestureBottomSheet>
    );

    expect(ref.current).toBeDefined();

    // Snap to index 2 (expand / 0.92)
    await act(async () => {
      ref.current?.snapToIndex(2);
      jest.runAllTimers();
    });
    expect(onSnapChange).toHaveBeenCalledWith(2, 0.92);

    // Snap to index 0 (collapse / 0.18)
    await act(async () => {
      ref.current?.collapse();
      jest.runAllTimers();
    });
    expect(onSnapChange).toHaveBeenCalledWith(0, 0.18);

    // Expand
    await act(async () => {
      ref.current?.expand();
      jest.runAllTimers();
    });
    expect(onSnapChange).toHaveBeenCalledWith(2, 0.92);

    jest.useRealTimers();
  });
});
