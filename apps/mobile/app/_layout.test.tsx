import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

const mockState = { capturedClient: null as unknown };

jest.mock('expo-router', () => {
  const React = require('react');
  const { useQueryClient } = require('@tanstack/react-query');
  const { Text } = require('react-native');
  return {
    Slot: () => {
      mockState.capturedClient = useQueryClient();
      return <Text>SlotContent</Text>;
    },
  };
});

describe('RootLayout providers', () => {
  it('wraps children in QueryClientProvider so useQuery is available', () => {
    const { default: RootLayout } = require('./_layout');
    expect(() => render(<RootLayout />)).not.toThrow();
    expect(mockState.capturedClient).toBeDefined();
  });
});
