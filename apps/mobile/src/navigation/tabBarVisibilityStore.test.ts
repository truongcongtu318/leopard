import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { tabBarVisibilityStore } from './tabBarVisibilityStore';

describe('tabBarVisibilityStore', () => {
  afterEach(() => {
    tabBarVisibilityStore.setHidden(false);
  });

  it('defaults to visible (isHidden === false)', () => {
    expect(tabBarVisibilityStore.isHidden()).toBe(false);
  });

  it('updates hidden state and notifies listeners', () => {
    const listener = jest.fn();
    const unsubscribe = tabBarVisibilityStore.subscribe(listener);

    tabBarVisibilityStore.setHidden(true);
    expect(tabBarVisibilityStore.isHidden()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    // Idempotent setting does not trigger again
    tabBarVisibilityStore.setHidden(true);
    expect(listener).toHaveBeenCalledTimes(1);

    tabBarVisibilityStore.setHidden(false);
    expect(tabBarVisibilityStore.isHidden()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    tabBarVisibilityStore.setHidden(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
