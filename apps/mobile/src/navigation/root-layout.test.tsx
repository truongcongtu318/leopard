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
    const { default: RootLayout } = require('../../app/_layout');
    expect(() => render(<RootLayout />)).not.toThrow();
    expect(mockState.capturedClient).toBeDefined();
  });
});

describe('RootLayout Deep Link & Session Guard Normalization', () => {
  const {
    normalizeDeepLinkPath,
    resolveSessionRedirect,
  } = require('../../app/_layout');

  describe('normalizeDeepLinkPath', () => {
    it('normalizes customer routes with scheme and aliases', () => {
      expect(
        normalizeDeepLinkPath('leopard://customer/orders/LP-240902'),
      ).toBe('/customer/orders/LP-240902');
      expect(normalizeDeepLinkPath('leopard://orders')).toBe('/customer/orders');
      expect(normalizeDeepLinkPath('leopard://tracking')).toBe('/customer/tracking');
      expect(normalizeDeepLinkPath('leopard://wallet')).toBe('/customer/wallet');
      expect(normalizeDeepLinkPath('leopard://home')).toBe('/customer/home');
    });

    it('normalizes public routes with scheme and aliases', () => {
      expect(normalizeDeepLinkPath('leopard://login')).toBe('/(public)/login');
      expect(normalizeDeepLinkPath('leopard://onboarding')).toBe('/(public)/onboarding');
      expect(normalizeDeepLinkPath('leopard://(public)/login')).toBe('/(public)/login');
      expect(normalizeDeepLinkPath('leopard://verify-otp')).toBe('/(public)/verify-otp');
      expect(normalizeDeepLinkPath('leopard://customer-register')).toBe('/(public)/customer-register');
    });

    it('handles null and empty URLs gracefully', () => {
      expect(normalizeDeepLinkPath(null)).toBeNull();
      expect(normalizeDeepLinkPath('')).toBeNull();
      expect(normalizeDeepLinkPath('leopard://')).toBeNull();
    });
  });

  describe('resolveSessionRedirect (Loop Prevention)', () => {
    it('prevents redirect loops when unauthenticated user is on login', () => {
      const redirect = resolveSessionRedirect({
        currentPath: '/(public)/login',
        isAuthenticated: false,
        role: null,
      });
      expect(redirect).toBeNull();
    });

    it('redirects unauthenticated user accessing customer routes to login', () => {
      const redirect = resolveSessionRedirect({
        currentPath: '/customer/home',
        isAuthenticated: false,
        role: null,
      });
      expect(redirect).toBe('/(public)/login');
    });

    it('redirects authenticated customer on login to customer home', () => {
      const redirect = resolveSessionRedirect({
        currentPath: '/(public)/login',
        isAuthenticated: true,
        role: 'CUSTOMER',
      });
      expect(redirect).toBe('/customer/home');
    });

    it('prevents redirect loops when authenticated customer is on customer routes', () => {
      const redirect = resolveSessionRedirect({
        currentPath: '/customer/home',
        isAuthenticated: true,
        role: 'CUSTOMER',
      });
      expect(redirect).toBeNull();

      const ordersRedirect = resolveSessionRedirect({
        currentPath: '/customer/orders',
        isAuthenticated: true,
        role: 'CUSTOMER',
      });
      expect(ordersRedirect).toBeNull();
    });

    it('redirects non-customer roles (DRIVER, ADMIN) away from customer routes to login', () => {
      const driverRedirect = resolveSessionRedirect({
        currentPath: '/customer/orders',
        isAuthenticated: true,
        role: 'DRIVER',
      });
      expect(driverRedirect).toBe('/(public)/login');

      const adminRedirect = resolveSessionRedirect({
        currentPath: '/customer/home',
        isAuthenticated: true,
        role: 'ADMIN',
      });
      expect(adminRedirect).toBe('/(public)/login');
    });
  });
});
