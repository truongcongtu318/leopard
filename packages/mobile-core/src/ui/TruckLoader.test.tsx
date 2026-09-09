import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { TruckLoader } from './TruckLoader';

describe('TruckLoader', () => {
  it('renders correctly with accessibility attributes', async () => {
    const screen = await render(
      <TruckLoader
        message="Vui lòng chờ trong giây lát"
        showRoad
        showText
        size="md"
        title="Đang tìm xe"
      />,
    );

    const loader = screen.getByTestId('truck-loader');
    expect(loader).toBeTruthy();
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityLiveRegion).toBe('polite');
    expect(loader.props.accessibilityState).toEqual({ busy: true });

    expect(screen.getByText('Đang tìm xe')).toBeTruthy();
    expect(screen.getByText('Vui lòng chờ trong giây lát')).toBeTruthy();

    await screen.unmount();
  });

  it('renders different size variants without crashing', async () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const screen = await render(<TruckLoader size={size} />);
      expect(screen.getByTestId('truck-loader')).toBeTruthy();
      await screen.unmount();
    }
  });
});
