import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import {
  MOBILE_PREVIEW_BANNER_TEXT,
  PreviewBanner,
  UI_SCENARIO_NAMES,
  createMobilePreviewSelection,
  resolveMobilePreviewMode,
  type UiScenarioName,
} from '.';

describe('mobile preview scenario boundary', () => {
  it('defines the complete typed static-preview vocabulary', () => {
    const expectedScenarios: readonly UiScenarioName[] = [
      'loading',
      'empty',
      'error',
      'success',
      'permission-denied',
      'offline',
    ];

    expect(UI_SCENARIO_NAMES).toEqual(expectedScenarios);
  });

  it.each(['loading', 'empty', 'error', 'success', 'permission-denied', 'offline'] as const)(
    'creates deterministic fresh objects for %s',
    (scenarioName) => {
      const input = {
        environment: 'test',
        localPreviewEnabled: true,
        scenarioName,
      } as const;
      const first = createMobilePreviewSelection(input);
      const second = createMobilePreviewSelection(input);

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(first.mode).toBe('fixtures');
      expect(first.bannerRequired).toBe(true);

      if (first.mode !== 'fixtures' || second.mode !== 'fixtures') {
        throw new Error('Expected guarded fixture selections in test mode.');
      }

      expect(first.fixture).not.toBe(second.fixture);
      expect(first.fixture.scenario).not.toBe(second.fixture.scenario);
      expect(first.fixture.scenario.copy).not.toBe(second.fixture.scenario.copy);
    },
  );

  it('freezes the fixture and every nested object exposed to preview consumers', () => {
    const selection = createMobilePreviewSelection({
      environment: 'development',
      localPreviewEnabled: true,
      scenarioName: 'success',
    });

    expect(selection.mode).toBe('fixtures');

    if (selection.mode !== 'fixtures') {
      throw new Error('Expected a guarded fixture selection in development mode.');
    }

    const { fixture } = selection;

    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.scenario)).toBe(true);
    expect(Object.isFrozen(fixture.scenario.copy)).toBe(true);
    expect(Reflect.set(fixture.scenario.copy, 'title', 'Đã bị thay đổi')).toBe(false);
  });

  it.each(['production', 'staging', undefined])(
    'never exposes fixtures when environment is %s',
    (environment) => {
      const selection = createMobilePreviewSelection({
        environment,
        localPreviewEnabled: true,
        scenarioName: 'success',
      });

      expect(selection).toEqual({
        mode: 'runtime',
        fixture: null,
        bannerRequired: false,
      });
      expect(Object.isFrozen(selection)).toBe(true);
    },
  );
});

describe('mobile preview mode resolution', () => {
  it.each(['development', 'test'])(
    'allows fixtures in %s with an explicit local flag',
    (environment) => {
      expect(
        resolveMobilePreviewMode({
          environment,
          localPreviewEnabled: true,
        }),
      ).toBe('fixtures');
    },
  );

  it.each([
    { environment: 'development', localPreviewEnabled: false },
    { environment: 'test', localPreviewEnabled: false },
    { environment: 'production', localPreviewEnabled: true },
    { environment: 'production', localPreviewEnabled: false },
    { environment: 'staging', localPreviewEnabled: true },
    { environment: undefined, localPreviewEnabled: true },
  ])('fails closed for $environment with local flag $localPreviewEnabled', (input) => {
    expect(resolveMobilePreviewMode(input)).toBe('runtime');
  });
});

describe('PreviewBanner', () => {
  it('clearly announces that preview content is simulated', async () => {
    const screen = await render(<PreviewBanner />);
    const banner = screen.getByRole('summary');

    expect(screen.getByText('Bản xem trước giao diện — dữ liệu mô phỏng')).toBeTruthy();
    expect(MOBILE_PREVIEW_BANNER_TEXT).toBe('Bản xem trước giao diện — dữ liệu mô phỏng');
    expect(banner.props.accessibilityLabel).toBe(MOBILE_PREVIEW_BANNER_TEXT);

    await screen.unmount();
  });

  it('uses existing semantic tokens and keeps long text wrappable', async () => {
    const screen = await render(<PreviewBanner />);
    const banner = screen.getByRole('summary');
    const label = screen.getByText(MOBILE_PREVIEW_BANNER_TEXT);

    expect(StyleSheet.flatten(banner.props.style)).toMatchObject({
      backgroundColor: colors.info.background,
      borderColor: colors.info.border,
      borderRadius: radius.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    });
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      color: colors.info.text,
      flexShrink: 1,
      fontSize: typography.label.fontSize,
    });
    expect(label.props.numberOfLines).toBeUndefined();

    await screen.unmount();
  });
});
