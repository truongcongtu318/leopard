import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import * as previewBoundary from '.';
import {
  MOBILE_PREVIEW_BANNER_TEXT,
  MOBILE_PREVIEW_ENABLED_FLAG,
  PreviewBanner,
  UI_SCENARIO_NAMES,
  createMobilePreviewSelection,
  type UiScenarioName,
} from '.';
import { resolveMobilePreviewMode } from './preview-mode';

const BUILD_FLAG_ENV = 'EXPO_PUBLIC_LEOPARD_UI_PREVIEW';
const originalNodeEnv = process.env.NODE_ENV;
const originalBuildFlag = process.env[BUILD_FLAG_ENV];

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

beforeEach(() => {
  setEnvironment('NODE_ENV', 'test');
  setEnvironment(BUILD_FLAG_ENV, MOBILE_PREVIEW_ENABLED_FLAG);
});

afterEach(() => {
  setEnvironment('NODE_ENV', originalNodeEnv);
  setEnvironment(BUILD_FLAG_ENV, originalBuildFlag);
});

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
    async (scenarioName) => {
      const firstProvider = jest.fn(async () => scenarioName);
      const secondProvider = jest.fn(async () => scenarioName);
      const first = await createMobilePreviewSelection({
        localPreviewEnabled: true,
        scenarioProvider: firstProvider,
      });
      const second = await createMobilePreviewSelection({
        localPreviewEnabled: true,
        scenarioProvider: secondProvider,
      });

      expect(firstProvider).toHaveBeenCalledTimes(1);
      expect(secondProvider).toHaveBeenCalledTimes(1);
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

  it('freezes the fixture and every nested object exposed to preview consumers', async () => {
    const selection = await createMobilePreviewSelection({
      localPreviewEnabled: true,
      scenarioProvider: async () => 'success',
    });

    expect(selection.mode).toBe('fixtures');

    if (selection.mode !== 'fixtures') {
      throw new Error('Expected a guarded fixture selection in test mode.');
    }

    const { fixture } = selection;

    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.scenario)).toBe(true);
    expect(Object.isFrozen(fixture.scenario.copy)).toBe(true);
    expect(Reflect.set(fixture.scenario.copy, 'title', 'Đã bị thay đổi')).toBe(false);
  });

  it.each(['production', 'staging', undefined])(
    'never invokes the lazy fixture provider when trusted environment is %s',
    async (environment) => {
      setEnvironment('NODE_ENV', environment);
      const scenarioProvider = jest.fn(async () => 'success' as const);

      const selection = await createMobilePreviewSelection({
        localPreviewEnabled: true,
        scenarioProvider,
      });

      expect(selection).toEqual({
        mode: 'runtime',
        fixture: null,
        bannerRequired: false,
      });
      expect(scenarioProvider).not.toHaveBeenCalled();
      expect(Object.isFrozen(selection)).toBe(true);
    },
  );

  it('never invokes the lazy fixture provider without trusted build opt in', async () => {
    setEnvironment(BUILD_FLAG_ENV, undefined);
    const scenarioProvider = jest.fn(async () => 'success' as const);

    const selection = await createMobilePreviewSelection({
      localPreviewEnabled: true,
      scenarioProvider,
    });

    expect(selection).toEqual({
      mode: 'runtime',
      fixture: null,
      bannerRequired: false,
    });
    expect(scenarioProvider).not.toHaveBeenCalled();
  });

  it('does not expose raw factories or the pure resolver from the public boundary', () => {
    expect(previewBoundary).not.toHaveProperty('createMobilePreviewFixture');
    expect(previewBoundary).not.toHaveProperty('createUiScenario');
    expect(previewBoundary).not.toHaveProperty('resolveMobilePreviewMode');
  });
});

describe('mobile preview mode resolution', () => {
  it.each(['development', 'test'])(
    'allows fixtures in %s with build and local opt in',
    (environment) => {
      expect(
        resolveMobilePreviewMode({
          environment,
          buildPreviewFlag: MOBILE_PREVIEW_ENABLED_FLAG,
          localPreviewEnabled: true,
        }),
      ).toBe('fixtures');
    },
  );

  it.each([
    {
      environment: 'development',
      buildPreviewFlag: MOBILE_PREVIEW_ENABLED_FLAG,
      localPreviewEnabled: false,
    },
    { environment: 'test', buildPreviewFlag: undefined, localPreviewEnabled: true },
    {
      environment: 'production',
      buildPreviewFlag: MOBILE_PREVIEW_ENABLED_FLAG,
      localPreviewEnabled: true,
    },
    {
      environment: 'staging',
      buildPreviewFlag: MOBILE_PREVIEW_ENABLED_FLAG,
      localPreviewEnabled: true,
    },
    {
      environment: undefined,
      buildPreviewFlag: MOBILE_PREVIEW_ENABLED_FLAG,
      localPreviewEnabled: true,
    },
  ])('fails closed for $environment with explicit opt ins', (input) => {
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
