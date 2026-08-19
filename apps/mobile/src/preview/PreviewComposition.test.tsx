import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  MOBILE_PREVIEW_BANNER_TEXT,
  MOBILE_PREVIEW_ENABLED_FLAG,
  MobilePreviewComposition,
  createMobilePreviewSelection,
  type MobilePreviewFixture,
} from '.';

const originalNodeEnv = process.env.NODE_ENV;
const originalBuildFlag = process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

beforeEach(() => {
  setEnvironment('NODE_ENV', 'test');
  setEnvironment('EXPO_PUBLIC_LEOPARD_UI_PREVIEW', MOBILE_PREVIEW_ENABLED_FLAG);
});

afterEach(() => {
  setEnvironment('NODE_ENV', originalNodeEnv);
  setEnvironment('EXPO_PUBLIC_LEOPARD_UI_PREVIEW', originalBuildFlag);
});

describe('MobilePreviewComposition', () => {
  it('renders an injected smoke fixture with the mandatory preview banner', async () => {
    const selection = await createMobilePreviewSelection({
      localPreviewEnabled: true,
      scenarioProvider: async () => 'success',
    });
    const renderRuntime = jest.fn(() => <Text>Dữ liệu runtime</Text>);
    const renderFixture = jest.fn((fixture: MobilePreviewFixture) => (
      <Text>{fixture.scenario.copy.title}</Text>
    ));
    const screen = await render(
      <MobilePreviewComposition
        selection={selection}
        renderRuntime={renderRuntime}
        renderFixture={renderFixture}
      />,
    );

    expect(screen.getByText(MOBILE_PREVIEW_BANNER_TEXT)).toBeTruthy();
    expect(screen.getByText('Dữ liệu đã sẵn sàng')).toBeTruthy();
    expect(renderFixture).toHaveBeenCalledTimes(1);
    expect(renderRuntime).not.toHaveBeenCalled();

    await screen.unmount();
  });

  it('renders only the runtime path when the trusted guard is closed', async () => {
    setEnvironment('NODE_ENV', 'production');
    const scenarioProvider = jest.fn(async () => 'success' as const);
    const selection = await createMobilePreviewSelection({
      localPreviewEnabled: true,
      scenarioProvider,
    });
    const renderRuntime = jest.fn(() => <Text>Dữ liệu runtime</Text>);
    const renderFixture = jest.fn(() => <Text>Fixture</Text>);
    const screen = await render(
      <MobilePreviewComposition
        selection={selection}
        renderRuntime={renderRuntime}
        renderFixture={renderFixture}
      />,
    );

    expect(screen.getByText('Dữ liệu runtime')).toBeTruthy();
    expect(screen.queryByText(MOBILE_PREVIEW_BANNER_TEXT)).toBeNull();
    expect(scenarioProvider).not.toHaveBeenCalled();
    expect(renderFixture).not.toHaveBeenCalled();
    expect(renderRuntime).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
