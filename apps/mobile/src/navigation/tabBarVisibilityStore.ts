import { useSyncExternalStore } from 'react';

let isHidden = false;
const listeners = new Set<() => void>();

export const tabBarVisibilityStore = {
  isHidden: () => isHidden,
  setHidden: (hidden: boolean) => {
    if (isHidden !== hidden) {
      isHidden = hidden;
      listeners.forEach((listener) => listener());
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useTabBarHidden(): boolean {
  return useSyncExternalStore(
    tabBarVisibilityStore.subscribe,
    tabBarVisibilityStore.isHidden,
    () => false,
  );
}
