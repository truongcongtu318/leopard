import React from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';
import { render, act, fireEvent } from '@testing-library/react-native';
import { SlideToAction } from './SlideToAction';

describe('SlideToAction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders label, container pill shape and draggable thumb with IconChevron', async () => {
    const onActionComplete = jest.fn();
    const screen = await render(
      <SlideToAction
        label="Vuốt để nhận cuốc ➔"
        onActionComplete={onActionComplete}
        testID="slide-action"
      />
    );

    expect(screen.getByText('Vuốt để nhận cuốc ➔')).toBeTruthy();
    const container = screen.getByTestId('slide-action');
    expect(container).toBeTruthy();

    const flatContainerStyle = StyleSheet.flatten(container.props.style);
    expect(flatContainerStyle.height).toBe(56);
    expect(flatContainerStyle.borderRadius).toBe(9999);

    const thumb = screen.getByTestId('slide-action-thumb');
    expect(thumb).toBeTruthy();
    const flatThumbStyle = StyleSheet.flatten(thumb.props.style);
    expect(flatThumbStyle.borderRadius).toBe(9999);

    expect(screen.getByTestId('slide-action-chevron')).toBeTruthy();
  });

  it('renders color variants correctly', async () => {
    const screen1 = await render(
      <SlideToAction
        label="Slide"
        onActionComplete={jest.fn()}
        colorVariant="brand"
        testID="slider"
      />
    );
    let style = StyleSheet.flatten(screen1.getByTestId('slider').props.style);
    expect(style.backgroundColor).toBe('#0B1E42');

    const screen2 = await render(
      <SlideToAction
        label="Slide"
        onActionComplete={jest.fn()}
        colorVariant="success"
        testID="slider"
      />
    );
    style = StyleSheet.flatten(screen2.getByTestId('slider').props.style);
    expect(style.backgroundColor).toBe('#16A34A');

    const screen3 = await render(
      <SlideToAction
        label="Slide"
        onActionComplete={jest.fn()}
        colorVariant="warning"
        testID="slider"
      />
    );
    style = StyleSheet.flatten(screen3.getByTestId('slider').props.style);
    expect(style.backgroundColor).toBe('#D97706');
  });

  it('triggers onActionComplete when dragged past 75% threshold', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    const springSpy = jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    const onActionComplete = jest.fn();

    const screen = await render(
      <SlideToAction
        label="Vuốt để nhận cuốc"
        onActionComplete={onActionComplete}
        testID="slider"
      />
    );

    // Trigger onLayout with width 300
    fireEvent(screen.getByTestId('slider'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 56, x: 0, y: 0 } },
    });

    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    expect(panConfig.onPanResponderRelease).toBeDefined();

    // Max drag = 300 - 48 (thumb) - 8 (padding) = 244. 75% = 183.
    // Drag past 75% (dx = 200 > 183)
    panConfig.onPanResponderGrant?.();
    panConfig.onPanResponderMove?.({}, { dx: 200, dy: 0 });
    panConfig.onPanResponderRelease?.({}, { dx: 200, dy: 0 });

    expect(springSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 244 })
    );
    expect(onActionComplete).toHaveBeenCalledTimes(1);
  });

  it('springs back to 0 when released before 75% threshold and does not trigger onActionComplete', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    const springSpy = jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    const onActionComplete = jest.fn();

    const screen = await render(
      <SlideToAction
        label="Vuốt để nhận cuốc"
        onActionComplete={onActionComplete}
        testID="slider"
      />
    );

    fireEvent(screen.getByTestId('slider'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 56, x: 0, y: 0 } },
    });

    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];

    // Drag below 75% (dx = 100 < 183)
    panConfig.onPanResponderGrant?.();
    panConfig.onPanResponderMove?.({}, { dx: 100, dy: 0 });
    panConfig.onPanResponderRelease?.({}, { dx: 100, dy: 0 });

    expect(onActionComplete).not.toHaveBeenCalled();
    expect(springSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 })
    );
  });

  it('blocks gestures and shows muted appearance when disabled', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    const onActionComplete = jest.fn();

    const screen = await render(
      <SlideToAction
        label="Đã khóa"
        onActionComplete={onActionComplete}
        disabled={true}
        testID="slider"
      />
    );

    const container = screen.getByTestId('slider');
    const style = StyleSheet.flatten(container.props.style);
    expect(style.backgroundColor).toBe('#E2E8F0');

    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    const canStart = panConfig.onStartShouldSetPanResponder?.();
    const canMove = panConfig.onMoveShouldSetPanResponder?.({}, { dx: 10, dy: 0 });
    expect(canStart).toBe(false);
    expect(canMove).toBe(false);
  });

  it('exposes accessibility attributes on container and thumb', async () => {
    const screen = await render(
      <SlideToAction
        label="Trượt để xác nhận"
        onActionComplete={jest.fn()}
        disabled={false}
        testID="slider"
      />
    );

    const container = screen.getByTestId('slider');
    expect(container.props.accessibilityRole).toBe('adjustable');
    expect(container.props.accessibilityLabel).toBe('Trượt để xác nhận');
    expect(container.props.accessibilityState).toEqual({ disabled: false });

    const thumb = screen.getByTestId('slider-thumb');
    expect(thumb.props.accessibilityRole).toBe('adjustable');
    expect(thumb.props.accessibilityLabel).toBe('Trượt để xác nhận');
    expect(thumb.props.accessibilityState).toEqual({ disabled: false });
  });

  it('resets position and completed state when resetKey changes', async () => {
    const springSpy = jest.spyOn(Animated, 'spring');
    const onActionComplete = jest.fn();

    const screen = await render(
      <SlideToAction
        label="Vuốt để nhận cuốc"
        onActionComplete={onActionComplete}
        resetKey="initial"
        testID="slider"
      />
    );

    springSpy.mockClear();

    // Rerender with unchanged resetKey -> should not trigger spring
    await screen.rerender(
      <SlideToAction
        label="Vuốt để nhận cuốc"
        onActionComplete={onActionComplete}
        resetKey="initial"
        testID="slider"
      />
    );
    expect(springSpy).not.toHaveBeenCalled();

    // Rerender with changed resetKey -> triggers reset animation to 0
    await screen.rerender(
      <SlideToAction
        label="Vuốt để nhận cuốc"
        onActionComplete={onActionComplete}
        resetKey="reset-1"
        testID="slider"
      />
    );

    expect(springSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 })
    );
  });

  it('unmounts cleanly without errors', async () => {
    const screen = await render(
      <SlideToAction
        label="Trượt"
        onActionComplete={jest.fn()}
        testID="slider"
      />
    );

    await screen.unmount();
    expect(screen.queryByTestId('slider')).toBeNull();
  });
});
