import { QueryClientProvider } from '@tanstack/react-query';
import * as ExpoRouter from 'expo-router';
import { Slot } from 'expo-router';
import { Component, memo, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Linking, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  customerPalette,
  queryClient,
  refreshSession,
  sessionStore,
  typeScale,
} from '@leopard/mobile-core';

// ── Types & Helpers ──────────────────────────────────────────────────

type RootErrorBoundaryState = {
  hasError: boolean;
};

class RootErrorBoundary extends Component<PropsWithChildren, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RootErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.boundary}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            Ứng dụng chưa thể khởi động.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Normalizes deep link URLs (e.g. leopard://..., https://...) into canonical Expo Router paths.
 * Normalizes group routes: `(public)` and `customer`.
 */
export function normalizeDeepLinkPath(url: string | null): string | null {
  if (!url) return null;
  try {
    let cleanPath: string;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      cleanPath = parsed.pathname;
    } else {
      // Strip scheme, e.g. leopard://customer/orders -> customer/orders
      const stripped = url.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
      cleanPath = stripped.startsWith('/') ? stripped : `/${stripped}`;
    }

    // Ignore empty paths
    if (cleanPath === '/' || cleanPath === '') {
      return null;
    }

    // Already in group format
    if (cleanPath.startsWith('/(public)/') || cleanPath.startsWith('/customer/')) {
      return cleanPath;
    }

    // Public routes mapping
    if (cleanPath === '/login' || cleanPath.startsWith('/login/')) {
      return '/(public)/login';
    }
    if (cleanPath === '/onboarding' || cleanPath.startsWith('/onboarding/')) {
      return '/(public)/onboarding';
    }
    if (cleanPath === '/verify-otp' || cleanPath.startsWith('/verify-otp/')) {
      return '/(public)/verify-otp';
    }
    if (cleanPath === '/customer-register' || cleanPath.startsWith('/customer-register/')) {
      return '/(public)/customer-register';
    }
    if (cleanPath === '/customer-address' || cleanPath.startsWith('/customer-address/')) {
      return '/(public)/customer-address';
    }
    if (cleanPath === '/driver-register' || cleanPath.startsWith('/driver-register/')) {
      return '/(public)/driver-register';
    }

    // Customer protected routes mapping
    if (
      cleanPath.startsWith('/orders') ||
      cleanPath.startsWith('/home') ||
      cleanPath.startsWith('/wallet') ||
      cleanPath.startsWith('/profile') ||
      cleanPath.startsWith('/tracking') ||
      cleanPath.startsWith('/deliveries') ||
      cleanPath.startsWith('/addresses') ||
      cleanPath.startsWith('/promotions') ||
      cleanPath.startsWith('/support') ||
      cleanPath.startsWith('/settings')
    ) {
      return `/customer${cleanPath}`;
    }

    return cleanPath;
  } catch {
    return null;
  }
}

/**
 * Pure route decision resolver to strictly prevent redirect loops.
 * Returns the redirection target path or null if current navigation is permitted.
 */
export function resolveSessionRedirect({
  currentPath,
  isAuthenticated,
  role,
}: {
  currentPath: string;
  isAuthenticated: boolean;
  role: string | null;
}): string | null {
  const isPublicLogin =
    currentPath === '/login' ||
    currentPath.startsWith('/login/') ||
    currentPath.startsWith('/(public)/login');
  const isPublicOnboarding =
    currentPath === '/onboarding' ||
    currentPath.startsWith('/onboarding/') ||
    currentPath === '/(public)/onboarding';

  // If not authenticated or not customer role: cannot access protected customer routes
  if (!isAuthenticated || role !== 'CUSTOMER') {
    if (currentPath.startsWith('/customer')) {
      return '/(public)/login';
    }
    return null;
  }

  // If authenticated as CUSTOMER: should not stay on login / onboarding routes
  if (isPublicLogin || isPublicOnboarding) {
    return '/customer/home';
  }

  return null;
}

/**
 * Isolated headless listener for session guard and deep link routing.
 * Safely guards against redirect loops and respects Expo Router lifecycle.
 */
function SessionAndDeepLinkRouter() {
  const router =
    typeof (ExpoRouter as any).useRouter === 'function' ? (ExpoRouter as any).useRouter() : null;
  const pathname =
    typeof (ExpoRouter as any).usePathname === 'function'
      ? (ExpoRouter as any).usePathname()
      : null;

  const [isHydrated, setIsHydrated] = useState(false);
  const lastRedirectRef = useRef<string | null>(null);

  // Hydrate session on launch
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        await sessionStore.hydrate();
        const hasRefreshToken = (await sessionStore.getRefreshToken()) !== null;
        if (hasRefreshToken && !sessionStore.getAccessToken()) {
          const refreshed = await refreshSession();
          if (!refreshed) {
            await sessionStore.clearSession();
          }
        }
      } catch {
        await sessionStore.clearSession();
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    void initSession();

    const unsubscribe = sessionStore.subscribe(() => {
      if (isMounted) {
        // Trigger re-evaluation on auth state changes
        setIsHydrated(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Safe redirect dispatcher preventing loops
  const dispatchSafeNavigation = useCallback(
    (targetPath: string, mode: 'push' | 'replace' = 'replace') => {
      if (!router) return;
      if (pathname === targetPath || lastRedirectRef.current === targetPath) {
        return;
      }
      lastRedirectRef.current = targetPath;
      if (mode === 'replace' && typeof router.replace === 'function') {
        router.replace(targetPath);
      } else if (typeof router.push === 'function') {
        router.push(targetPath);
      }
    },
    [pathname, router],
  );

  // Incoming deep link handler
  const handleIncomingUrl = useCallback(
    (incomingUrl: string) => {
      const normalizedPath = normalizeDeepLinkPath(incomingUrl);
      if (!normalizedPath) return;

      const redirectPath = resolveSessionRedirect({
        currentPath: normalizedPath,
        isAuthenticated: sessionStore.isAuthenticated(),
        role: sessionStore.getRole(),
      });

      const finalPath = redirectPath || normalizedPath;
      dispatchSafeNavigation(finalPath, 'push');
    },
    [dispatchSafeNavigation],
  );

  // Register deep link listeners
  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== 'web') {
      void Linking.getInitialURL().then((initialUrl) => {
        if (isMounted && initialUrl) {
          handleIncomingUrl(initialUrl);
        }
      });
    }

    const subscription = Linking.addEventListener('url', (event) => {
      if (isMounted && event.url) {
        handleIncomingUrl(event.url);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleIncomingUrl]);

  // Session guard routing check on path or hydration change
  useEffect(() => {
    if (!isHydrated || !pathname || !router) return;

    const redirectPath = resolveSessionRedirect({
      currentPath: pathname,
      isAuthenticated: sessionStore.isAuthenticated(),
      role: sessionStore.getRole(),
    });

    if (redirectPath) {
      dispatchSafeNavigation(redirectPath, 'replace');
    }
  }, [isHydrated, pathname, router, dispatchSafeNavigation]);

  return null;
}

const RootProviders = memo(function RootProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </QueryClientProvider>
  );
});

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootProviders>
        <StatusBar barStyle="dark-content" />
        <SessionAndDeepLinkRouter />
        <View style={styles.boundary}>
          <Slot />
        </View>
      </RootProviders>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boundary: {
    flex: 1,
    backgroundColor: customerPalette.canvas,
  },
  errorText: {
    ...typeScale.body,
    color: customerPalette.textSlateDark,
    textAlign: 'center',
    marginTop: 40,
  },
});
