import { QueryClient } from '@tanstack/react-query';

/**
 * Pre-configured TanStack Query client instance.
 *
 * Defaults:
 * - staleTime: 30 seconds (data considered fresh for 30s)
 * - retry: 2 attempts (for transient failures)
 * - refetchOnWindowFocus: false (mobile apps don't have "window focus" in a meaningful way)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
