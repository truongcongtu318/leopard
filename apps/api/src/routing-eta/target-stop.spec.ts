import { deriveTargetStop } from './target-stop.js';

describe('deriveTargetStop', () => {
  it('returns the lowest-sequence stop that is not COMPLETED', () => {
    const stops = [
      { id: 'pickup', sequence: 0, progress: 'COMPLETED' as const },
      { id: 'stop-1', sequence: 1, progress: 'ARRIVED' as const },
      { id: 'dropoff', sequence: 2, progress: 'PENDING' as const },
    ];
    expect(deriveTargetStop(stops)).toBe('stop-1');
  });

  it('returns null when every stop is COMPLETED', () => {
    const stops = [{ id: 'dropoff', sequence: 0, progress: 'COMPLETED' as const }];
    expect(deriveTargetStop(stops)).toBeNull();
  });
});
