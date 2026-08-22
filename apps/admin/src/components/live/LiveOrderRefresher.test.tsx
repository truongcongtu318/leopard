import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// NOTE: no hoisting in this toolchain – import dynamically after assertions
// are set up. The component dispatches window events instead of using a hook.
const refreshSpy = jest.fn<() => void>();

type ComponentModule = typeof import('./LiveOrderRefresher');

let LiveOrderRefresher: ComponentModule['LiveOrderRefresher'];

describe('LiveOrderRefresher', () => {
  const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    refreshSpy.mockReset();
    setVisibility('visible');
    ({ LiveOrderRefresher } = await import('./LiveOrderRefresher'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (originalVisibility) {
      Object.defineProperty(document, 'visibilityState', originalVisibility);
    }
  });

  it('renders the freshness copy and refreshes on the configured interval', async () => {
    const onRefresh = () => refreshSpy();
    window.addEventListener('leopard:live-refresh', onRefresh);
    render(<LiveOrderRefresher intervalMs={15000} />);

    expect(screen.getByText(/Tự động cập nhật dữ liệu mỗi 15 giây/)).toBeTruthy();

    jest.advanceTimersByTime(31000);
    // 15s and 30s ticks.
    expect(refreshSpy).toHaveBeenCalledTimes(2);
    window.removeEventListener('leopard:live-refresh', onRefresh);
  });

  it('skips ticks while the tab is hidden and catches up on return', async () => {
    const onRefresh = () => refreshSpy();
    window.addEventListener('leopard:live-refresh', onRefresh);
    render(<LiveOrderRefresher intervalMs={10000} />);

    setVisibility('hidden');
    jest.advanceTimersByTime(30000);
    expect(refreshSpy).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener('leopard:live-refresh', onRefresh);
  });

  it('renders nothing when disabled (terminal orders)', () => {
    const { container } = render(<LiveOrderRefresher enabled={false} />);

    expect(container.textContent).toBe('');
    jest.advanceTimersByTime(60000);
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
