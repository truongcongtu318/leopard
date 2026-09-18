import { describe, expect, it } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import {
  DriverMapDirectorProvider,
  useDriverMapDirector,
  useDriverMapState,
} from './DriverMapDirectorContext';

function Consumer({ label }: { label: string }) {
  const { activeConfig } = useDriverMapState();
  return (
    <Text testID="map-status">
      {activeConfig ? `${label}:${activeConfig.mode}` : 'none'}
    </Text>
  );
}

function ChildDirector({ mode, priority }: { mode: any; priority?: number }) {
  useDriverMapDirector({ mode }, priority);
  return null;
}

describe('DriverMapDirectorContext', () => {
  it('registers and coordinates camera mode according to priority', async () => {
    const screen = await render(
      <DriverMapDirectorProvider>
        <Consumer label="root" />
        <ChildDirector mode="idle" priority={0} />
      </DriverMapDirectorProvider>,
    );

    expect(screen.getByTestId('map-status').props.children).toBe('root:idle');
    await screen.unmount();
  });

  it('higher priority director overrides lower priority director', async () => {
    const screen = await render(
      <DriverMapDirectorProvider>
        <Consumer label="root" />
        <ChildDirector mode="idle" priority={0} />
        <ChildDirector mode="turn-by-turn" priority={10} />
      </DriverMapDirectorProvider>,
    );

    expect(screen.getByTestId('map-status').props.children).toBe('root:turn-by-turn');
    await screen.unmount();
  });
});
