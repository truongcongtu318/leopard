import { describe, expect, it } from '@jest/globals';

import { createDriverPreviewView } from './catalogue';

describe('Driver preview catalogue', () => {
  it('uses action-first defaults for list and detail', () => {
    expect(createDriverPreviewView('list', null).scenarioId).toBe('D-LIST-ACTIVE-REQUESTED');
    expect(createDriverPreviewView('detail', null).scenarioId).toBe('D-DETAIL-PROOF-REQUIRED');
  });

  it('rejects unknown and cross-screen scenarios', () => {
    expect(() => createDriverPreviewView('list', 'D-DETAIL-PROOF-REQUIRED')).toThrow(
      'Unsupported Driver preview scenario',
    );
    expect(() => createDriverPreviewView('detail', '__proto__')).toThrow(
      'Unsupported Driver preview scenario',
    );
  });
});
