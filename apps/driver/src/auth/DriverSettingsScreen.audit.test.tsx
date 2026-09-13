import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render } from '@testing-library/react-native';
import { DriverSettingsScreen } from '../features/settings/DriverSettingsScreen';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverSettingsScreen audit: end-of-shift auto-offline control', () => {
  afterEach(() => cleanup());

  it('exposes a switch to automatically go OFFLINE after the current trip completes', async () => {
    const rendered = await render(<DriverSettingsScreen />);

    expect(
      rendered.getByRole('switch', { name: /tự động nghỉ sau chuyến này/i }),
    ).toBeTruthy();
  });
});
